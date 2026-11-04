import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { ReceiptSheets } from '@/components/ReceiptSheet';
import CancelButton from '@/components/CancelButton';
import PrintButton from '@/components/PrintButton';
import type { Receipt } from '@/lib/types';
import Nav from '@/components/Nav';
import AppIcon from '@/components/AppIcon';

export default async function ReceiptPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('itpc_receipt_receipts')
    .select('*, receipt_lines:itpc_receipt_receipt_lines(*)')
    .eq('id', id)
    .single();
  if (error && error.code !== 'PGRST116') throw new Error('Unable to load receipt');
  if (!data) notFound();
  const receipt = data as Receipt;

  return (
    <>
      <Nav />
      <main className="receipt-detail-page">
        <div className="receipt-detail-heading no-print">
          <div>
            <Link className="receipt-toolbar-back" href="/receipts"><AppIcon name="arrow" size={18} /> กลับไปรายการใบเสร็จ</Link>
            <p className="page-eyebrow">รายละเอียดใบเสร็จ</p>
            <h1>{receipt.receipt_no}</h1>
          </div>
          <div className="form-actions">
            <a className="btn secondary" href={`/receipts/${id}/pdf`}><AppIcon name="download" size={18} /> ดาวน์โหลด PDF</a>
            <PrintButton />
            {receipt.status === 'issued' && <CancelButton id={id} />}
          </div>
        </div>
        {receipt.status === 'cancelled' && <p className="error receipt-alert no-print">ใบเสร็จนี้ถูกยกเลิกแล้ว: {receipt.cancel_reason}</p>}
        <ReceiptSheets receipt={receipt} />
      </main>
    </>
  );
}
