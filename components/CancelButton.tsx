'use client';

import { useState, useTransition } from 'react';
import { cancelReceipt } from '@/app/receipts/[id]/actions';

export default function CancelButton({ id }: { id: string }) {
  const [pending, start] = useTransition();
  const [error, setError] = useState('');

  function onClick() {
    const reason = window.prompt('เหตุผลที่ยกเลิกใบเสร็จนี้ (ยกเลิกแล้วย้อนกลับไม่ได้)');
    if (!reason?.trim()) return;
    start(async () => {
      const res = await cancelReceipt(id, reason);
      if (res.error) setError(res.error);
    });
  }
  return (
    <>
      <button className="btn danger" onClick={onClick} disabled={pending}>ยกเลิกใบเสร็จ</button>
      {error && <span className="error">{error}</span>}
    </>
  );
}
