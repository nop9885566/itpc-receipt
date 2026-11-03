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
  const { data } = await supabase.from('itpc_receipt_receipts').select('receipt_no').eq('id', id).single();
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
  const browser = await puppeteer.launch({
    executablePath: localChrome || (await chromium.executablePath()),
    args: localChrome ? ['--no-sandbox'] : chromium.args,
    headless: true,
  });
  try {
    const page = await browser.newPage();
    await page.setCookie(...cookies);
    // networkidle0 waits for Google Fonts + logo + signature images
    await page.goto(target, { waitUntil: 'networkidle0' });
    await page.evaluate(() => document.fonts.ready);
    const pdf = await page.pdf({ format: 'A4', printBackground: true, preferCSSPageSize: true });
    return new NextResponse(Buffer.from(pdf), {
      headers: {
        'Content-Type': 'application/pdf',
        'Cache-Control': 'no-store',
        'Content-Disposition': `attachment; filename="receipt-${data.receipt_no}.pdf"`,
      },
    });
  } finally {
    await browser.close();
  }
}
