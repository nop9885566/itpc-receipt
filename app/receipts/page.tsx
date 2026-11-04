import Link from 'next/link';
import Nav from '@/components/Nav';
import { createClient } from '@/lib/supabase/server';
import { bilingualDate, money } from '@/lib/format';
import DeleteReceiptButton from '@/components/DeleteReceiptButton';
import CancelButton from '@/components/CancelButton';
import PageHeader from '@/components/PageHeader';
import AppIcon from '@/components/AppIcon';

export default async function ReceiptsPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q } = await searchParams;
  const supabase = await createClient();
  let query = supabase
    .from('itpc_receipt_receipts')
    .select('id, receipt_no, paid_at, payer_name, applicant_code, total, status')
    .order('buddhist_year', { ascending: false })
    .order('seq', { ascending: false })
    .limit(200);
  if (q) {
    const safe = q.replace(/[,()%]/g, ' ');
    query = query.or(`receipt_no.ilike.%${safe}%,payer_name.ilike.%${safe}%,applicant_code.ilike.%${safe}%`);
  }
  const [{ data, error }, { data: isAdmin, error: adminError }] = await Promise.all([
    query,
    supabase.rpc('is_receipt_admin'),
  ]);
  const receipts = data ?? [];
  const issuedCount = receipts.filter((receipt) => receipt.status === 'issued').length;
  const cancelledCount = receipts.length - issuedCount;

  return (
    <>
      <Nav />
      <main className="container">
        <PageHeader
          section="งานการเงิน / ใบเสร็จ"
          title="รายการใบเสร็จ"
          description="ค้นหา ตรวจสอบ และจัดการใบเสร็จที่ออกให้ผู้ชำระ"
          icon="receipt"
          action={<Link className="btn" href="/receipts/new"><AppIcon name="plus" size={18} /> ออกใบเสร็จใหม่</Link>}
        />
        <div className="summary-grid receipt-summary-grid">
          <div className="summary-card">
            <span className="summary-icon"><AppIcon name="receipt" /></span>
            <span className="summary-copy"><span className="summary-label">ใบเสร็จที่แสดง</span><strong className="summary-value">{receipts.length}<span className="summary-unit">รายการ</span></strong></span>
          </div>
          <div className="summary-card">
            <span className="summary-icon"><AppIcon name="check" /></span>
            <span className="summary-copy"><span className="summary-label">ออกแล้ว</span><strong className="summary-value">{issuedCount}<span className="summary-unit">รายการ</span></strong></span>
          </div>
        </div>
        <form className="search-panel">
          <label className="search-field">
            <span className="sr-only">ค้นหาใบเสร็จ</span>
            <AppIcon name="search" size={19} />
            <input name="q" defaultValue={q ?? ''} placeholder="ค้นหาเลขที่ใบเสร็จ ชื่อผู้ชำระ หรือรหัสนักเรียน" />
          </label>
          <button className="btn" type="submit">ค้นหา</button>
        </form>
        {error && <p className="error" role="alert">โหลดรายการใบเสร็จไม่สำเร็จ กรุณาลองใหม่อีกครั้ง</p>}
        {adminError && <p className="error" role="alert">ตรวจสอบสิทธิ์ผู้ดูแลไม่สำเร็จ</p>}
        {!error && !data?.length
          ? <div className="empty-state">
            <span className="empty-icon"><AppIcon name="receipt" size={22} /></span>
            <h2>{q ? 'ไม่พบใบเสร็จที่ตรงกับคำค้นหา' : 'ยังไม่มีใบเสร็จในระบบ'}</h2>
            <p>{q ? 'ลองตรวจสอบคำค้นหา หรือค้นหาด้วยเลขที่ใบเสร็จและชื่อผู้ชำระ' : 'เมื่อออกใบเสร็จแล้ว รายการจะแสดงอยู่ในหน้านี้'}</p>
            {!q && <Link className="btn" href="/receipts/new"><AppIcon name="plus" size={18} /> ออกใบเสร็จใหม่</Link>}
          </div>
          : data?.length ? (
            <section className="card receipt-list-card">
              <div className="card-heading">
                <div><h2>ใบเสร็จล่าสุด</h2><p>{cancelledCount ? `ยกเลิกแล้ว ${cancelledCount} รายการ` : 'รายการเรียงตามวันที่ออกล่าสุด'}</p></div>
                <span className="result-count">แสดง {receipts.length} รายการ</span>
              </div>
              <div className="table-scroll">
              <table className="list">
                <thead>
                  <tr><th>เลขที่ใบเสร็จ</th><th>วันที่</th><th>ผู้ชำระ</th><th>รหัสนักเรียน</th><th className="r">ยอดรวม</th><th>สถานะ</th><th>จัดการ</th></tr>
                </thead>
                <tbody>
                  {data.map((r) => (
                    <tr key={r.id}>
                      <td><Link className="table-primary-link" href={`/receipts/${r.id}`}>{r.receipt_no}</Link></td>
                      <td className="receipt-date">{bilingualDate(r.paid_at).split(' / ')[0]}</td>
                      <td>{r.payer_name}</td>
                      <td>{r.applicant_code || '-'}</td>
                      <td className="r">{money(r.total)}</td>
                      <td><span className={`badge ${r.status}`}>{r.status === 'issued' ? 'ออกแล้ว' : 'ยกเลิก'}</span></td>
                      <td>
                        <div className="form-actions">
                          <a className="btn secondary" href={`/receipts/${r.id}/pdf`} aria-label={`ดาวน์โหลดใบเสร็จ ${r.receipt_no}`}>
                            <AppIcon name="download" size={17} /> PDF
                          </a>
                          {r.status === 'issued' && <CancelButton id={r.id} />}
                          {isAdmin && <DeleteReceiptButton id={r.id} receiptNo={r.receipt_no} />}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            </section>
          ) : null}
      </main>
    </>
  );
}
