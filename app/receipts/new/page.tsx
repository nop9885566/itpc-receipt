import Nav from '@/components/Nav';
import { createClient } from '@/lib/supabase/server';
import { todayBangkok } from '@/lib/format';
import { DEFAULT_SERIES } from '@/lib/config';
import type { Cashier, Item, StockBalance, Student } from '@/lib/types';
import NewReceiptForm from './form';

export default async function NewReceiptPage() {
  const supabase = await createClient();
  const [
    { data: items, error: itemsError },
    { data: cashiers },
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
        <h2>ออกใบเสร็จใหม่</h2>
        <NewReceiptForm
          items={(items ?? []) as Item[]}
          itemLoadError={itemsError?.message}
          stockBalances={(stockBalances ?? []) as StockBalance[]}
          stockLoadError={stockError?.message}
          cashiers={(cashiers ?? []) as Cashier[]}
          students={(students ?? []) as Student[]}
          studentLoadError={studentsError?.message ?? (!students?.length ? 'ยังไม่มีรายชื่อนักเรียนในฐานข้อมูล กรุณารัน migration 003_seed_students.sql' : undefined)}
          today={todayBangkok()}
          defaultSeries={DEFAULT_SERIES}
        />
      </div>
    </>
  );
}
