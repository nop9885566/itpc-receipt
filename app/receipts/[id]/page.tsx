import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { ReceiptSheets } from '@/components/ReceiptSheet';
import CancelButton from '@/components/CancelButton';
import PrintButton from '@/components/PrintButton';
import type { Receipt } from '@/lib/types';

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
      <div className="toolbar no-print">
        <Link href="/receipts">กลับรายการ</Link>
        <a className="btn" href={`/receipts/${id}/pdf`}>ดาวน์โหลด PDF</a>
        <PrintButton />
        {receipt.status === 'issued' && <CancelButton id={id} />}
        {receipt.status === 'cancelled' && <span className="error">ยกเลิกแล้ว: {receipt.cancel_reason}</span>}
      </div>
      <ReceiptSheets receipt={receipt} />
    </>
  );
}
