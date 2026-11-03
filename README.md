# ระบบออกใบเสร็จรับเงิน (Next.js + Supabase + HTML→PDF)

## ติดตั้ง
1. สร้างโปรเจกต์ Supabase แล้วรันไฟล์ใน `supabase/migrations/` ตามลำดับ (001 → 005) ที่ SQL Editor ตารางจะใช้ prefix `itpc_receipt_` (แทน `itpc-receipt-` เนื่องจากชื่อ identifier ใน PostgreSQL ใช้ขีดกลางไม่ได้โดยไม่ใส่เครื่องหมายคำพูด)
2. เพิ่มผู้รับเงิน (ลายเซ็นอัปโหลดเป็นรูปใน Storage bucket แบบ public แล้วใส่ URL ใน `signature_url`):
   ```sql
   insert into public.itpc_receipt_cashiers (name_th, name_en, signature_url)
   values ('นางสาวรุ่งฟ้า สุริยา', 'MISS.RUNGFA SURIYA', 'https://.../signature.png');
   ```
3. Supabase → Authentication → Users → Add user (สร้างบัญชีเจ้าหน้าที่ อีเมล+รหัสผ่าน) และปิด public sign-ups
4. `cp .env.example .env.local` แล้วใส่ URL / anon key
   - รันในเครื่อง: ใส่ `CHROME_EXECUTABLE_PATH` เป็นพาธ Chrome (สำหรับปุ่ม "ดาวน์โหลด PDF")
5. โลโก้หัวใบเสร็จใช้ `public/logo.jpg` โลโก้ลายน้ำใช้ `public/logo2.jpg` และลายเซ็นผู้รับเงินใช้ `public/signature.jpg`
6. `npm install && npm run dev` แล้วเปิด http://localhost:3000

## ไฟล์สำคัญ
| ไฟล์ | หน้าที่ |
|---|---|
| `supabase/migrations/001_init.sql` | ตาราง, RLS, `issue_receipt()` (ออกเลขแบบ atomic), `cancel_receipt()`, trigger กันแก้/ลบ |
| `supabase/migrations/002_seed_items.sql` | สินค้า 15 รายการจาก ขายของ.xlsx |
| `supabase/migrations/003_seed_students.sql` | รายชื่อนักเรียนจาก students.pdf (คำนำหน้าเด็กหญิง/เด็กชาย ไม่เก็บเพศ) สำหรับค้นหาและเติมข้อมูลในหน้าออกใบเสร็จ |
| `supabase/migrations/004_allow_receipt_deletion.sql` | อนุญาตลบใบเสร็จผ่าน RPC พร้อมบันทึกเหตุผลใน audit log |
| `supabase/migrations/005_admin_only_receipt_deletion.sql` | จำกัดการลบเฉพาะแอดมินที่ระบุ UUID ใน `itpc_receipt_admins` |
| `lib/config.ts` | หัวกระดาษ/ที่อยู่/เลขผู้เสียภาษี และรหัสชุดเลขที่ (`25`) |
| `lib/bahttext.ts` | แปลงตัวเลขเป็นตัวอักษรบาทไทย/อังกฤษ (`npm run test:baht`) |
| `components/ReceiptSheet.tsx` | แม่แบบใบเสร็จ (ต้นฉบับ + สำเนาจากแม่แบบเดียว) และ CSS พิมพ์ A4 |
| `app/receipts/[id]/pdf/route.ts` | สร้าง PDF ด้วย puppeteer-core |

## หมายเหตุ
- หน้าออกใบเสร็จค้นหานักเรียนจากรหัสหรือชื่อ แล้วเติมชื่อ รหัสนักเรียน (รหัสผู้สมัคร) และชั้นเรียนให้อัตโนมัติ
- เลขที่ = ปี พ.ศ. ของวันที่ชำระ - รหัสชุด - ลำดับ 4 หลัก (รีเซ็ตทุกปี) เช่น `2569-25-0145`
- ราคาในใบเสร็จถูกคัดลอกเก็บ ณ วันที่ขาย แก้ราคาในตาราง `itpc_receipt_items` ภายหลังไม่กระทบใบเก่า
- ใบเสร็จแก้ไขไม่ได้ การยกเลิกและการลบถาวรต้องระบุเหตุผล และบันทึกเหตุการณ์ไว้ใน audit log
- หน้ารายการสามารถดาวน์โหลด PDF หรือลบใบเสร็จถาวรได้ การลบต้องยืนยันก่อนและไม่สามารถกู้คืนข้อมูลใบเสร็จได้
- เพิ่มสิทธิ์แอดมินโดยคัดลอกคำสั่งนี้ไปรันใน SQL Editor และแทน `UUID-ของ-แอดมิน` ด้วย UUID จาก Supabase Authentication → Users (ต้องใส่ชื่อคอลัมน์และ UUID ใน single quotes):
  ```sql
  insert into public.itpc_receipt_admins (user_id)
  values ('UUID-ของ-แอดมิน');
  ```
  ผู้ใช้ทั่วไปลบไม่ได้และใช้การยกเลิกแทน
- ติดตั้งบน Vercel: ปล่อย `CHROME_EXECUTABLE_PATH` ว่างไว้ ระบบใช้ `@sparticuz/chromium`
- ถ้า PDF ไม่มีฟอนต์ไทย แปลว่าเซิร์ฟเวอร์เข้า Google Fonts ไม่ได้ ให้ดาวน์โหลดฟอนต์ Sarabun ไว้ใน `public/fonts` แล้วใช้ `@font-face`

v.kZG2L9GZyR3n4