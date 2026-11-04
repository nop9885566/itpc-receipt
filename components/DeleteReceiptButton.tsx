'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { deleteReceipt } from '@/app/receipts/[id]/actions';

export default function DeleteReceiptButton({ id, receiptNo }: { id: string; receiptNo: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState('');

  function onClick() {
    if (!window.confirm(`ยืนยันลบใบเสร็จ ${receiptNo} ถาวร? การลบนี้ย้อนกลับไม่ได้`)) return;
    const reason = window.prompt('ระบุเหตุผลในการลบ (บันทึกไว้ในประวัติระบบ)');
    if (!reason?.trim()) return;

    setError('');
    start(async () => {
      const result = await deleteReceipt(id, reason);
      if (result.error) {
        setError('ลบใบเสร็จไม่สำเร็จ กรุณาตรวจสอบสิทธิ์แล้วลองอีกครั้ง');
        return;
      }
      router.refresh();
    });
  }

  return (
    <>
      <button type="button" className="btn danger" onClick={onClick} disabled={pending}>
        {pending ? 'กำลังลบ...' : 'ลบถาวร'}
      </button>
      {error && <span className="error" role="alert">{error}</span>}
    </>
  );
}
