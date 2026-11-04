export default function Loading() {
  return (
    <main className="loading-state" role="status" aria-live="polite">
      <span className="loading-indicator" aria-hidden="true" />
      <div>กำลังโหลดข้อมูล...</div>
    </main>
  );
}
