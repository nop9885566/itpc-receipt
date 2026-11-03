import assert from 'node:assert/strict';
import { bahtTextTh, bahtTextEn } from './bahttext';

const th: [number, string][] = [
  [1500, 'หนึ่งพันห้าร้อยบาทถ้วน'],
  [0, 'ศูนย์บาทถ้วน'],
  [11, 'สิบเอ็ดบาทถ้วน'],
  [21, 'ยี่สิบเอ็ดบาทถ้วน'],
  [101, 'หนึ่งร้อยเอ็ดบาทถ้วน'],
  [120, 'หนึ่งร้อยยี่สิบบาทถ้วน'],
  [330, 'สามร้อยสามสิบบาทถ้วน'],
  [750, 'เจ็ดร้อยห้าสิบบาทถ้วน'],
  [1_000_000, 'หนึ่งล้านบาทถ้วน'],
  [1_000_001, 'หนึ่งล้านหนึ่งบาทถ้วน'],
  [12.5, 'สิบสองบาทห้าสิบสตางค์'],
  [0.25, 'ศูนย์บาทยี่สิบห้าสตางค์'],
];
for (const [n, s] of th) assert.equal(bahtTextTh(n), s, `th ${n}`);

assert.equal(bahtTextEn(1500), 'one thousand five hundred baht');
assert.equal(bahtTextEn(330), 'three hundred thirty baht');
assert.equal(bahtTextEn(12.5), 'twelve baht and fifty satang');
console.log('bahttext: all tests passed');
