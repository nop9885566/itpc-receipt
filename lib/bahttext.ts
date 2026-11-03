// Thai baht amount -> Thai words and English words.

const TH_DIGITS = ['ศูนย์', 'หนึ่ง', 'สอง', 'สาม', 'สี่', 'ห้า', 'หก', 'เจ็ด', 'แปด', 'เก้า'];
const TH_POS = ['', 'สิบ', 'ร้อย', 'พัน', 'หมื่น', 'แสน'];

function thaiBelowMillion(n: number): string {
  const s = String(n);
  let out = '';
  for (let i = 0; i < s.length; i++) {
    const d = Number(s[i]);
    const pos = s.length - i - 1;
    if (d === 0) continue;
    if (pos === 0 && d === 1 && s.length > 1) out += 'เอ็ด';
    else if (pos === 1 && d === 2) out += 'ยี่สิบ';
    else if (pos === 1 && d === 1) out += 'สิบ';
    else out += TH_DIGITS[d] + TH_POS[pos];
  }
  return out;
}

function thaiInteger(n: number): string {
  if (n === 0) return TH_DIGITS[0];
  const parts: string[] = [];
  while (n > 0) {
    parts.unshift(thaiBelowMillion(n % 1_000_000));
    n = Math.floor(n / 1_000_000);
  }
  return parts.join('ล้าน');
}

/** 1500 -> "หนึ่งพันห้าร้อยบาทถ้วน", 12.5 -> "สิบสองบาทห้าสิบสตางค์" */
export function bahtTextTh(amount: number): string {
  const satangTotal = Math.round(amount * 100);
  const baht = Math.floor(satangTotal / 100);
  const satang = satangTotal % 100;
  const b = thaiInteger(baht) + 'บาท';
  return satang === 0 ? b + 'ถ้วน' : b + thaiInteger(satang) + 'สตางค์';
}

const EN_ONES = ['zero','one','two','three','four','five','six','seven','eight','nine','ten','eleven','twelve',
  'thirteen','fourteen','fifteen','sixteen','seventeen','eighteen','nineteen'];
const EN_TENS = ['', '', 'twenty','thirty','forty','fifty','sixty','seventy','eighty','ninety'];

function enBelowThousand(n: number): string {
  const parts: string[] = [];
  if (n >= 100) { parts.push(EN_ONES[Math.floor(n / 100)] + ' hundred'); n %= 100; }
  if (n > 0) {
    if (n < 20) parts.push(EN_ONES[n]);
    else parts.push(EN_TENS[Math.floor(n / 10)] + (n % 10 ? '-' + EN_ONES[n % 10] : ''));
  }
  return parts.join(' ');
}

function enInteger(n: number): string {
  if (n === 0) return 'zero';
  const scales = ['', ' thousand', ' million', ' billion'];
  const parts: string[] = [];
  let i = 0;
  while (n > 0) {
    const chunk = n % 1000;
    if (chunk) parts.unshift(enBelowThousand(chunk) + scales[i]);
    n = Math.floor(n / 1000);
    i++;
  }
  return parts.join(' ');
}

/** 1500 -> "one thousand five hundred baht" */
export function bahtTextEn(amount: number): string {
  const satangTotal = Math.round(amount * 100);
  const baht = Math.floor(satangTotal / 100);
  const satang = satangTotal % 100;
  const b = enInteger(baht) + ' baht';
  return satang === 0 ? b : `${b} and ${enInteger(satang)} satang`;
}
