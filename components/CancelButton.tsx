'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { cancelReceipt } from '@/app/receipts/[id]/actions';

export default function CancelButton({ id }: { id: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState('');

  function onClick() {
    const reason = window.prompt('ระบุเหตุผลที่ต้องการยกเลิกใบเสร็จ');
    if (!reason?.trim()) return;
    start(async () => {
      const res = await cancelReceipt(id, reason);
      if (res.error) setError('ยกเลิกใบเสร็จไม่สำเร็จ กรุณาลองอีกครั้ง');
      else router.refresh();
    });
  }
  return (
    <>
      <button className="btn danger" onClick={onClick} disabled={pending}>ยกเลิกใบเสร็จ</button>
      {error && <span className="error" role="alert">{error}</span>}
    </>
  );
}
