import Link from 'next/link';

export default function NotFound() {
  return (
    <main className="container">
      <div className="empty-state">
        <h2>ไม่พบหน้าที่ต้องการ</h2>
        <p>ลิงก์อาจไม่ถูกต้อง หรือข้อมูลนี้อาจไม่มีอยู่แล้ว</p>
        <Link className="btn" href="/receipts">กลับไปหน้ารายการใบเสร็จ</Link>
      </div>
    </main>
  );
}
