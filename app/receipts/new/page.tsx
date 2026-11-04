import Nav from '@/components/Nav';
import { createClient } from '@/lib/supabase/server';
import { todayBangkok } from '@/lib/format';
import { DEFAULT_SERIES } from '@/lib/config';
import type { Cashier, Item, StockBalance, Student } from '@/lib/types';
import NewReceiptForm from './form';
import PageHeader from '@/components/PageHeader';

export default async function NewReceiptPage() {
  const supabase = await createClient();
  const [
    { data: items, error: itemsError },
    { data: cashiers, error: cashiersError },
    { data: students, error: studentsError },
    { data: stockBalances, error: stockError },
  ] = await Promise.all([
    supabase.from('itpc_receipt_items').select('*').eq('active', true).order('sort_order'),
    supabase.from('itpc_receipt_cashiers').select('id, name_th, name_en').eq('active', true),
    supabase.from('itpc_receipt_students').select('student_id, title_th, first_name_th, last_name_th, grade'),
    supabase.from('itpc_receipt_stock_balances').select('item_id, size, quantity'),
  ]);
  return (
    <>
      <Nav />
      <div className="container">
        <PageHeader
          section="งานการเงิน / ออกใบเสร็จ"
          title="ออกใบเสร็จใหม่"
          description="กรอกข้อมูลผู้ชำระ เลือกรายการ และตรวจสอบยอดก่อนบันทึก"
          icon="plus"
        />
        <NewReceiptForm
          items={(items ?? []) as Item[]}
          itemLoadError={itemsError ? 'ไม่สามารถโหลดรายการสินค้าได้' : undefined}
          stockBalances={(stockBalances ?? []) as StockBalance[]}
          stockLoadError={stockError ? 'ไม่สามารถโหลดข้อมูลสต็อกได้' : undefined}
          cashiers={(cashiers ?? []) as Cashier[]}
          cashierLoadError={cashiersError ? 'ไม่สามารถโหลดรายชื่อผู้รับเงินได้' : undefined}
          students={(students ?? []) as Student[]}
          studentLoadError={studentsError ? 'ไม่สามารถโหลดรายชื่อนักเรียนได้' : (!students?.length ? 'ยังไม่มีรายชื่อนักเรียน กรุณาติดต่อผู้ดูแลระบบ' : undefined)}
          today={todayBangkok()}
          defaultSeries={DEFAULT_SERIES}
        />
      </div>
    </>
  );
}
