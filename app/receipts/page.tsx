import Link from 'next/link';
import Nav from '@/components/Nav';
import { createClient } from '@/lib/supabase/server';
import { bilingualDate, money } from '@/lib/format';
import DeleteReceiptButton from '@/components/DeleteReceiptButton';
import CancelButton from '@/components/CancelButton';

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

  return (
    <>
      <Nav />
      <div className="container">
        <div className="page-heading">
          <div>
            <h2>รายการใบเสร็จ</h2>
            <p>ค้นหาและจัดการใบเสร็จที่ออกแล้ว</p>
          </div>
          <Link className="btn" href="/receipts/new">ออกใบเสร็จใหม่</Link>
        </div>
        <form className="search-bar">
          <input name="q" defaultValue={q ?? ''} placeholder="ค้นหาเลขที่ / ชื่อ / รหัสผู้สมัคร" />
          <button className="btn" type="submit">ค้นหา</button>
        </form>
        {error && <p className="error" role="alert">โหลดรายการใบเสร็จไม่สำเร็จ กรุณาลองใหม่อีกครั้ง</p>}
        {adminError && <p className="error" role="alert">ตรวจสอบสิทธิ์ผู้ดูแลไม่สำเร็จ</p>}
        {!error && !data?.length
          ? <div className="empty-state"><p>{q ? 'ไม่พบใบเสร็จที่ตรงกับคำค้นหา' : 'ยังไม่มีใบเสร็จในระบบ'}</p>{!q && <Link className="btn" href="/receipts/new">ออกใบเสร็จใหม่</Link>}</div>
          : data?.length ? (
            <div className="table-scroll">
              <table className="list">
                <thead>
                  <tr><th>เลขที่</th><th>วันที่</th><th>ผู้ชำระ</th><th>รหัส</th><th className="r">ยอดรวม</th><th>สถานะ</th><th>จัดการ</th></tr>
                </thead>
                <tbody>
                  {data.map((r) => (
                    <tr key={r.id}>
                      <td><Link href={`/receipts/${r.id}`}>{r.receipt_no}</Link></td>
                      <td>{bilingualDate(r.paid_at).split(' / ')[0]}</td>
                      <td>{r.payer_name}</td>
                      <td>{r.applicant_code || '-'}</td>
                      <td className="r">{money(r.total)}</td>
                      <td><span className={`badge ${r.status}`}>{r.status === 'issued' ? 'ออกแล้ว' : 'ยกเลิก'}</span></td>
                      <td>
                        <div className="form-actions">
                          <a className="btn" href={`/receipts/${r.id}/pdf`}>ดาวน์โหลด PDF</a>
                          {r.status === 'issued' && <CancelButton id={r.id} />}
                          {isAdmin && <DeleteReceiptButton id={r.id} receiptNo={r.receipt_no} />}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
      </div>
    </>
  );
}
