const TH_MONTHS_SHORT = ['ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.','ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.'];
const EN_MONTHS_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

/** "2026-03-09" -> "09 มี.ค. 2569 / 09 Mar 2026" (no timezone shifting: date-only string) */
export function bilingualDate(isoDate: string): string {
  const [y, m, d] = isoDate.slice(0, 10).split('-').map(Number);
  const dd = String(d).padStart(2, '0');
  return `${dd} ${TH_MONTHS_SHORT[m - 1]} ${y + 543} / ${dd} ${EN_MONTHS_SHORT[m - 1]} ${y}`;
}

/** Today's date in Thailand as YYYY-MM-DD */
export function todayBangkok(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Bangkok' }).format(new Date());
}

export const money = (n: number | string) =>
  Number(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
