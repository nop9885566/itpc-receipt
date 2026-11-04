import Nav from '@/components/Nav';
import { createClient } from '@/lib/supabase/server';
import type { Item, StockBalance, StockMovement } from '@/lib/types';
import InventoryManager from './InventoryManager';

export default async function InventoryPage() {
  const supabase = await createClient();
  const [
    { data: items, error: itemsError },
    { data: balances, error: balancesError },
    { data: movements, error: movementsError },
  ] = await Promise.all([
    supabase.from('itpc_receipt_items').select('id, name, requires_size, stock_tracked').order('sort_order'),
    supabase.from('itpc_receipt_stock_balances').select('item_id, size, quantity').order('item_id').order('size'),
    supabase
      .from('itpc_receipt_stock_movements')
      .select('id, at, item_id, size, action, change_qty, quantity_before, quantity_after, receipt_id, note')
      .order('at', { ascending: false })
      .limit(50),
  ]);
  const loadError = itemsError ?? balancesError ?? movementsError;

  return (
    <>
      <Nav />
      <main className="container">
        <div className="page-heading">
          <div>
            <h2>จัดการสต็อกสินค้า</h2>
            <p>ตรวจสอบยอดคงเหลือและบันทึกรับเข้าหรือเบิกออก</p>
          </div>
        </div>
        <p className="notice">ยอดเริ่มต้นเป็นศูนย์ กรุณาบันทึกรับสินค้าเข้าก่อนออกใบเสร็จ สินค้าที่ระบุไซส์จะแยกยอดตามไซส์</p>
        {loadError
          ? <p className="error" role="alert">โหลดข้อมูลสต็อกไม่สำเร็จ กรุณาลองใหม่อีกครั้ง</p>
          : <InventoryManager
            items={(items ?? []) as Item[]}
            balances={(balances ?? []) as StockBalance[]}
            movements={(movements ?? []) as StockMovement[]}
          />}
      </main>
    </>
  );
}
