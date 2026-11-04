'use client';

import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import type { Cashier, Item, StockBalance, Student } from '@/lib/types';
import { money } from '@/lib/format';
import { issueReceipt } from './actions';

type Line = { key: number; item_id: number | ''; size: string; qty: number };

export default function NewReceiptForm(props: {
  items: Item[];
  itemLoadError?: string;
  stockBalances: StockBalance[];
  stockLoadError?: string;
  cashiers: Cashier[];
  students: Student[];
  studentLoadError?: string;
  today: string;
  defaultSeries: string;
}) {
  const { items, cashiers, students } = props;
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState('');
  const [paidAt, setPaidAt] = useState(props.today);
  const [payerName, setPayerName] = useState('');
  const [applicantCode, setApplicantCode] = useState('');
  const [levelName, setLevelName] = useState('');
  const [studentSearch, setStudentSearch] = useState('');
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [cashierId, setCashierId] = useState(cashiers[0]?.id ?? '');
  const [series, setSeries] = useState(props.defaultSeries);
  const [lines, setLines] = useState<Line[]>([{ key: 1, item_id: '', size: '', qty: 1 }]);

  const byId = useMemo(() => new Map(items.map((i) => [i.id, i])), [items]);
  const total = lines.reduce((s, l) => s + (l.item_id ? (byId.get(l.item_id)?.price ?? 0) * l.qty : 0), 0);

  function chooseStudent(value: string) {
    setStudentSearch(value);
    const student = students.find((s) => (
      value === s.student_id
      || value === `${s.student_id} - ${s.title_th}${s.first_name_th} ${s.last_name_th}`
      || value === `${s.title_th}${s.first_name_th} ${s.last_name_th}`
      || value === `${s.first_name_th} ${s.last_name_th}`
    ));
    if (!student) {
      if (selectedStudentId) {
        setSelectedStudentId('');
        setPayerName('');
        setApplicantCode('');
        setLevelName('');
      }
      return;
    }
    setSelectedStudentId(student.student_id);
    setPayerName(`${student.title_th}${student.first_name_th} ${student.last_name_th}`);
    setApplicantCode(student.student_id);
    setLevelName(student.grade);
  }

  const update = (key: number, patch: Partial<Line>) =>
    setLines((ls) => ls.map((l) => (l.key === key ? { ...l, ...patch } : l)));

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    const valid = lines.filter((l) => l.item_id !== '');
    if (valid.length === 0) return setError('กรุณาเลือกรายการอย่างน้อย 1 รายการ');
    for (const l of valid) {
      const it = byId.get(l.item_id as number)!;
      if (it.requires_size && !l.size.trim()) return setError(`กรุณาระบุไซส์ของ "${it.name}"`);
    }
    start(async () => {
      const res = await issueReceipt({
        paidAt, payerName, applicantCode, levelName, cashierId, series,
        lines: valid.map((l) => ({ item_id: l.item_id as number, size: l.size, qty: l.qty })),
      });
      if (res.error) setError(res.error);
      else router.push(`/receipts/${res.id}`);
    });
  }

  return (
    <form onSubmit={submit}>
      <div className="card">
        {props.itemLoadError && <p className="error">โหลดรายการสินค้าไม่สำเร็จ: {props.itemLoadError}</p>}
        {props.stockLoadError && <p className="error">โหลดสต็อกไม่สำเร็จ: {props.stockLoadError}</p>}
        {props.studentLoadError && <p className="error">โหลดข้อมูลนักเรียนไม่สำเร็จ: {props.studentLoadError}</p>}
        <div className="grid2">
          <div>
            <label htmlFor="student-search">ค้นหานักเรียน (รหัสหรือชื่อ)</label>
            <input
              id="student-search"
              list="student-options"
              value={studentSearch}
              onChange={(e) => chooseStudent(e.target.value)}
              placeholder="พิมพ์รหัสนักเรียนหรือชื่อเพื่อเลือก"
            />
            <datalist id="student-options">
              {students.map((student) => (
                <option
                  key={student.student_id}
                  value={`${student.student_id} - ${student.title_th}${student.first_name_th} ${student.last_name_th}`}
                />
              ))}
            </datalist>
          </div>
          <div><label>ได้รับเงินจาก (ชื่อผู้ชำระ)</label><input value={payerName} onChange={(e) => setPayerName(e.target.value)} required /></div>
          <div><label>รหัสนักเรียน (รหัสผู้สมัคร)</label><input value={applicantCode} onChange={(e) => setApplicantCode(e.target.value)} /></div>
          <div><label>ระดับชั้น</label><input value={levelName} onChange={(e) => setLevelName(e.target.value)} placeholder="เช่น ระดับชั้นอนุบาล 1" /></div>
          <div><label>วันที่ชำระ</label><input type="date" value={paidAt} onChange={(e) => setPaidAt(e.target.value)} required /></div>
          <div>
            <label>ผู้รับเงิน</label>
            <select value={cashierId} onChange={(e) => setCashierId(e.target.value)} required>
              {cashiers.map((c) => <option key={c.id} value={c.id}>{c.name_th}</option>)}
            </select>
          </div>
          <div><label>รหัสชุดเลขที่ (ส่วนกลางของเลขที่ใบเสร็จ)</label><input value={series} onChange={(e) => setSeries(e.target.value)} required /></div>
        </div>
      </div>

      <div className="card">
        {lines.map((l) => {
          const it = l.item_id ? byId.get(l.item_id) : undefined;
          return (
            <div key={l.key} style={{ display: 'grid', gridTemplateColumns: '3fr 1fr 90px 110px 40px', gap: 8, marginBottom: 8, alignItems: 'end' }}>
              <div>
                <label>รายการ</label>
                <select value={l.item_id} onChange={(e) => update(l.key, { item_id: e.target.value ? Number(e.target.value) : '' })}>
                  <option value="">-- เลือกรายการ --</option>
                  {items.map((i) => <option key={i.id} value={i.id}>
                    {i.name} ({money(i.price)}){i.stock_tracked ? ' · ติดตามสต็อก' : ''}
                  </option>)}
                </select>
                {it?.stock_tracked && (
                  <small>
                    {it.requires_size
                      ? l.size.trim()
                        ? `คงเหลือไซส์ ${l.size.trim()}: ${props.stockBalances.find((stock) => stock.item_id === it.id && stock.size === l.size.trim())?.quantity ?? 0}`
                        : 'กรุณาระบุไซส์เพื่อดูยอดคงเหลือ'
                      : `คงเหลือ: ${props.stockBalances.find((stock) => stock.item_id === it.id && stock.size === '')?.quantity ?? 0}`}
                  </small>
                )}
                {it && !it.stock_tracked && <small>ไม่ได้ติดตามสต็อก</small>}
              </div>
              <div>
                <label>ไซส์{it?.requires_size ? ' *' : ''}</label>
                <input value={l.size} onChange={(e) => update(l.key, { size: e.target.value })} disabled={!!it && !it.requires_size} />
              </div>
              <div>
                <label>จำนวน</label>
                <input type="number" min={1} value={l.qty} onChange={(e) => update(l.key, { qty: Math.max(1, Number(e.target.value) || 1) })} />
              </div>
              <div style={{ textAlign: 'right', paddingBottom: 8 }}>{it ? money(it.price * l.qty) : '-'}</div>
              <button type="button" className="btn secondary" onClick={() => setLines((ls) => ls.length > 1 ? ls.filter((x) => x.key !== l.key) : ls)}>×</button>
            </div>
          );
        })}
        <button type="button" className="btn secondary" onClick={() => setLines((ls) => [...ls, { key: Math.max(...ls.map((x) => x.key)) + 1, item_id: '', size: '', qty: 1 }])}>
          + เพิ่มรายการ
        </button>
        <h3 style={{ textAlign: 'right' }}>รวมเงิน {money(total)} บาท</h3>
        <p style={{ fontSize: 12, color: '#666' }}>ราคาที่แสดงเป็นตัวอย่าง ระบบจะใช้ราคาจากตารางสินค้าฝั่งฐานข้อมูลตอนออกใบเสร็จจริง</p>
      </div>

      {error && <p className="error">{error}</p>}
      <button className="btn" type="submit" disabled={pending || !cashierId}>{pending ? 'กำลังบันทึก...' : 'ออกใบเสร็จ'}</button>
      {!cashierId && <p className="error">ยังไม่มีผู้รับเงินในระบบ (เพิ่มในตาราง cashiers)</p>}
    </form>
  );
}
