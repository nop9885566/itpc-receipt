'use client';

export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="container">
      <div className="empty-state" role="alert">
        <h2>ขออภัย โหลดข้อมูลไม่สำเร็จ</h2>
        <p>กรุณาลองอีกครั้ง หากยังพบปัญหาให้ติดต่อผู้ดูแลระบบ</p>
        <button className="btn" type="button" onClick={reset}>ลองอีกครั้ง</button>
      </div>
    </main>
  );
}
