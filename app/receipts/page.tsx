import Link from 'next/link';
import Nav from '@/components/Nav';
import { createClient } from '@/lib/supabase/server';
import { bilingualDate, money } from '@/lib/format';

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
  const { data, error } = await query;

  return (
    <>
      <Nav />
      <div className="container">
        <form style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
          <input name="q" defaultValue={q ?? ''} placeholder="ค้นหาเลขที่ / ชื่อ / รหัสผู้สมัคร" />
          <button className="btn" type="submit">ค้นหา</button>
        </form>
        {error && <p className="error">{error.message}</p>}
        <table className="list">
          <thead>
            <tr><th>เลขที่</th><th>วันที่</th><th>ผู้ชำระ</th><th>รหัส</th><th className="r">ยอดรวม</th><th>สถานะ</th></tr>
          </thead>
          <tbody>
            {(data ?? []).map((r) => (
              <tr key={r.id}>
                <td><Link href={`/receipts/${r.id}`}>{r.receipt_no}</Link></td>
                <td>{bilingualDate(r.paid_at).split(' / ')[0]}</td>
                <td>{r.payer_name}</td>
                <td>{r.applicant_code}</td>
                <td className="r">{money(r.total)}</td>
                <td><span className={`badge ${r.status}`}>{r.status === 'issued' ? 'ออกแล้ว' : 'ยกเลิก'}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
