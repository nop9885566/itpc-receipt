import { ISSUER } from '@/lib/config';
import { bahtTextEn, bahtTextTh } from '@/lib/bahttext';
import { bilingualDate, money } from '@/lib/format';
import type { Receipt } from '@/lib/types';

export const RECEIPT_CSS = `
@page { size: A4; margin: 0; }
* { box-sizing: border-box; }
.rc-doc { font-family: 'Sarabun', 'TH Sarabun New', 'Noto Sans Thai', sans-serif; color: #111; font-size: 13px; line-height: 1.5; }
.rc-page { position: relative; width: 210mm; height: 297mm; padding: 14mm 14mm 10mm; margin: 0 auto 8mm; background: #fff; overflow: hidden; page-break-after: always; }
.rc-page:last-child { page-break-after: auto; }
.rc-head { display: grid; grid-template-columns: 1fr 120px 1fr; align-items: start; }
.rc-head .l { font-size: 12.5px; }
.rc-head .r { font-size: 12.5px; text-align: right; }
.rc-head .r b, .rc-head .l b { font-weight: 700; }
.rc-logo { width: 100px; height: 100px; margin: 0 auto; object-fit: contain; }
.rc-title { text-align: center; font-weight: 700; font-size: 15px; margin: 6px 0 14px; }
.rc-meta { display: grid; grid-template-columns: 225px 1fr auto; row-gap: 2px; margin-bottom: 8px; }
.rc-meta .lbl { font-weight: 700; }
.rc-meta .no { text-align: right; }
.rc-table { width: 100%; border-collapse: collapse; margin-top: 8px; }
.rc-table th { text-align: left; padding: 8px 4px; border-top: 1px solid #888; border-bottom: 1px solid #888; font-weight: 700; }
.rc-table th.amt, .rc-table td.amt { text-align: right; }
.rc-table td { padding: 2px 4px; vertical-align: top; }
.rc-table td.n { width: 100px; text-align: center; }
.rc-lines { height: 150px; }
.rc-total { border-top: 1px solid #888; border-bottom: 1px solid #888; padding: 10px 4px 12px; margin-top: 8px; }
.rc-total .row { display: flex; justify-content: space-between; font-weight: 700; }
.rc-total .words-th { margin-left: 100px; }
.rc-total .words-en { margin: 14px 0 0 100px; font-weight: 700; }
.rc-sign { text-align: center; margin-top: 18px; }
.rc-sign img { height: 48px; object-fit: contain; display: block; margin: 0 auto 2px; }
.rc-sign .blank { height: 48px; }
.rc-foot { position: absolute; left: 14mm; right: 14mm; bottom: 10mm; font-size: 11px; }
.rc-foot p { margin: 3px 0; }
.rc-watermark { position: absolute; top: 40%; left: 0; right: 0; text-align: center; font-size: 72px; font-weight: 700; color: rgba(200,0,0,.18); transform: rotate(-20deg); pointer-events: none; }
@media screen { .rc-page { box-shadow: 0 1px 6px rgba(0,0,0,.25); } body { background: #e5e5e5; } }
@media print { body { background: #fff; } .no-print { display: none !important; } .rc-page { margin: 0; box-shadow: none; } }
`;

function Page({ r, copyLabel }: { r: Receipt; copyLabel: string }) {
  const lines = [...r.receipt_lines].sort((a, b) => a.line_no - b.line_no);
  const total = Number(r.total);
  return (
    <section className="rc-page">
      {r.status === 'cancelled' && <div className="rc-watermark">ยกเลิก / CANCELLED</div>}

      <div className="rc-head">
        <div className="l">
          <b>{ISSUER.nameTh}</b>
          {ISSUER.addressTh.map((t) => <div key={t}>{t}</div>)}
          <div>เลขประจำตัวผู้เสียภาษี {ISSUER.taxId}</div>
        </div>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className="rc-logo" src={ISSUER.logoPath} alt="" />
        <div className="r">
          <b>{ISSUER.unitTh[0]}</b><br />
          <b>{ISSUER.unitTh[1]}</b><br />
          <b>{ISSUER.unitTh[2]}</b>
          {ISSUER.unitAddressTh.map((t) => <div key={t}>{t}</div>)}
        </div>
      </div>

      <div className="rc-title">ใบเสร็จรับเงิน / Receipt<br />({copyLabel})</div>

      <div className="rc-meta">
        <div className="lbl">วันที่ / Date of payment :</div>
        <div>{bilingualDate(r.paid_at)}</div>
        <div className="no"><b>เลขที่ / NO. {r.receipt_no}</b></div>

        <div className="lbl">ได้รับเงินจาก / Received from :</div>
        <div>{r.payer_name}</div>
        <div className="no">{r.level_name ?? ''}</div>

        <div className="lbl" />
        <div>{r.applicant_code ? `เลขรหัสผู้สมัคร ${r.applicant_code}` : ''}</div>
        <div />

        <div className="lbl">วันที่พิมพ์ / Print Date :</div>
        <div>{bilingualDate(r.created_at.slice(0, 10))}</div>
        <div />
      </div>

      <table className="rc-table">
        <thead>
          <tr><th style={{ width: 100, whiteSpace: 'nowrap' }}>ลำดับ / NO.</th><th>รายการ / Receipt</th><th className="amt">จำนวนเงิน / Fees</th></tr>
        </thead>
        <tbody>
          {lines.map((l) => (
            <tr key={l.id}>
              <td className="n">{l.line_no}.</td>
              <td>{l.description}</td>
              <td className="amt">{money(l.line_total)}</td>
            </tr>
          ))}
          <tr><td colSpan={3} className="rc-lines" /></tr>
        </tbody>
      </table>

      <div className="rc-total">
        <div className="row">
          <span>รวมเงิน / Total :&nbsp;&nbsp;&nbsp;&nbsp;({bahtTextTh(total)})</span>
          <span>{money(total)}</span>
        </div>
        <div className="words-en">({bahtTextEn(total)})</div>
      </div>

      <div className="rc-sign">
        {r.cashier_signature_url
          // eslint-disable-next-line @next/next/no-img-element
          ? <img src={r.cashier_signature_url} alt="" />
          : <div className="blank" />}
        <div>({r.cashier_name_th} / {r.cashier_name_en})</div>
        <div>{r.cashier_title_th} / {r.cashier_title_en}</div>
        <div>วันที่ / Date : {bilingualDate(r.paid_at)}</div>
      </div>

      <div className="rc-foot">
        <p>ใบเสร็จรับเงินจะมีผลสมบูรณ์ต่อเมื่อได้รับชำระเงินเรียบร้อยแล้วและมีลายเซ็นของผู้รับเงินครบถ้วน<br />
          The receipt will be valid with payment and the signature of the collector.</p>
        <p>หมายเหตุ : มหาวิทยาลัยเชียงใหม่ได้รับอนุมัติจากกรมบัญชีกลางให้ใช้ลายเซ็นอิเล็กทรอนิกส์ในใบเสร็จรับเงินค่าใช้จ่ายเกี่ยวกับการศึกษาได้
          ตามหนังสือที่ กค 0422.3/ว.130 ลงวันที่ 19 พฤศจิกายน 2556<br />
          Refer to the comptroller General’s Department’s reference no.0422.3/c.130, dated 19 November 2013,<br />
          Chiang Mai University has been authorized to place an electronic signature onto a receipt that is relate education.</p>
      </div>
    </section>
  );
}

/** Two pages from one template: original + copy. */
export function ReceiptSheets({ receipt }: { receipt: Receipt }) {
  return (
    <div className="rc-doc">
      <style dangerouslySetInnerHTML={{ __html: RECEIPT_CSS }} />
      <Page r={receipt} copyLabel="ต้นฉบับ / Original" />
      <Page r={receipt} copyLabel="สำเนา / Copy" />
    </div>
  );
}
