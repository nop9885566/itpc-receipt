import Nav from '@/components/Nav';
import { createClient } from '@/lib/supabase/server';
import type { Item, StockBalance, StockMovement } from '@/lib/types';
import InventoryManager from './InventoryManager';
import PageHeader from '@/components/PageHeader';
import AppIcon from '@/components/AppIcon';

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
  const trackedItems = (items ?? []).filter((item) => item.stock_tracked).length;
  const totalUnits = (balances ?? []).reduce((total, balance) => total + balance.quantity, 0);

  return (
    <>
      <Nav />
      <main className="container">
        <PageHeader
          section="งานพัสดุ / คลังสินค้า"
          title="สต็อกสินค้า"
          description="ตรวจสอบยอดคงเหลือ บันทึกรับเข้า เบิกออก และปรับยอด"
          icon="box"
        />
        {!loadError && <div className="summary-grid">
          <div className="summary-card">
            <span className="summary-icon"><AppIcon name="box" /></span>
            <span className="summary-copy"><span className="summary-label">สินค้าที่ติดตาม</span><strong className="summary-value">{trackedItems}<span className="summary-unit">รายการ</span></strong></span>
          </div>
          <div className="summary-card">
            <span className="summary-icon"><AppIcon name="check" /></span>
            <span className="summary-copy"><span className="summary-label">จำนวนคงเหลือรวม</span><strong className="summary-value">{totalUnits}<span className="summary-unit">ชิ้น</span></strong></span>
          </div>
          <div className="summary-card">
            <span className="summary-icon"><AppIcon name="receipt" /></span>
            <span className="summary-copy"><span className="summary-label">รายการเคลื่อนไหวล่าสุด</span><strong className="summary-value">{movements?.length ?? 0}<span className="summary-unit">รายการ</span></strong></span>
          </div>
        </div>}
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
