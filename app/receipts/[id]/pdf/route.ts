import { NextResponse } from 'next/server';
import puppeteer from 'puppeteer-core';
import chromium from '@sparticuz/chromium';
import { createClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';
export const maxDuration = 30;
export const dynamic = 'force-dynamic';

// Opens the real receipt page in headless Chrome (forwarding the user's login cookies)
// and prints it to PDF. The toolbar is hidden by the @media print rules.
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const supabase = await createClient();
  const { data, error } = await supabase.from('itpc_receipt_receipts').select('receipt_no').eq('id', id).single();
  if (error && error.code !== 'PGRST116') {
    console.error('Unable to load receipt for PDF', error);
    return new NextResponse('Unable to load receipt', { status: 500 });
  }
  if (!data) return new NextResponse('Not found', { status: 404 });

  const url = new URL(request.url);
  const target = `${url.origin}/receipts/${id}`;

  const cookies = (request.headers.get('cookie') ?? '')
    .split(';')
    .map((c) => c.trim())
    .filter(Boolean)
    .map((c) => {
      const i = c.indexOf('=');
      return { name: c.slice(0, i), value: c.slice(i + 1), url: url.origin };
    });

  const localChrome = process.env.CHROME_EXECUTABLE_PATH;
  let browser: Awaited<ReturnType<typeof puppeteer.launch>> | undefined;
  try {
    browser = await puppeteer.launch({
      executablePath: localChrome || (await chromium.executablePath()),
      args: localChrome ? ['--no-sandbox'] : chromium.args,
      headless: true,
    });
    const page = await browser.newPage();
    await page.setCookie(...cookies);
    const response = await page.goto(target, { waitUntil: 'domcontentloaded', timeout: 15_000 });
    if (!response?.ok()) throw new Error(`Receipt page returned HTTP ${response?.status() ?? 'no response'}`);
    await page.waitForSelector('.rc-page', { timeout: 5_000 });
    await page.waitForFunction(
      () => Array.from(document.images).every((image) => image.complete),
      { timeout: 5_000 },
    );
    await page.evaluate(async () => {
      await Promise.race([
        document.fonts.ready,
        new Promise((resolve) => setTimeout(resolve, 5_000)),
      ]);
    });
    const pdf = await page.pdf({
      format: 'A4',
      printBackground: true,
      preferCSSPageSize: true,
      waitForFonts: false,
    });
    return new NextResponse(Buffer.from(pdf), {
      headers: {
        'Content-Type': 'application/pdf',
        'Cache-Control': 'no-store',
        'Content-Disposition': `attachment; filename="receipt-${data.receipt_no}.pdf"`,
      },
    });
  } catch (error) {
    console.error('Unable to generate receipt PDF', error);
    return new NextResponse('Unable to generate receipt PDF', { status: 500 });
  } finally {
    if (browser) {
      try {
        await browser.close();
      } catch (error) {
        console.error('Unable to close PDF browser', error);
      }
    }
  }
}
