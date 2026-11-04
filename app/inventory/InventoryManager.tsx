'use client';

import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import type { Item, StockBalance, StockMovement } from '@/lib/types';
import { adjustStock, setStockTracking } from './actions';
import AppIcon from '@/components/AppIcon';

const movementNames: Record<string, string> = {
  in: 'รับเข้า',
  out: 'เบิกออก',
  adjustment: 'ปรับยอด',
  sale: 'ขาย',
  sale_cancel: 'คืนจากการยกเลิก',
  sale_delete: 'คืนจากการลบใบเสร็จ',
};

function friendlyStockError(message: string) {
  if (message.includes('insufficient stock')) return 'จำนวนคงเหลือไม่พอ กรุณาตรวจสอบยอดสต็อกแล้วลองอีกครั้ง';
  if (message.includes('size required')) return 'กรุณาระบุไซส์สินค้า';
  if (message.includes('size is not used')) return 'สินค้านี้ไม่ต้องระบุไซส์';
  if (message.includes('disabled for this item')) return 'สินค้านี้ปิดการติดตามสต็อกอยู่';
  if (message.includes('quantity must')) return 'จำนวนต้องเป็นเลขตั้งแต่ 1 ขึ้นไป';
  if (message.includes('reason required')) return 'กรุณาระบุเหตุผลในการปรับยอด';
  if (message.includes('invalid quantity')) return 'จำนวนปรับยอดต้องเป็นเลขจำนวนเต็ม และห้ามเป็นศูนย์';
  return 'บันทึกไม่สำเร็จ กรุณาลองอีกครั้ง หากยังพบปัญหาให้ติดต่อผู้ดูแลระบบ';
}

export default function InventoryManager(props: {
  items: Item[];
  balances: StockBalance[];
  movements: StockMovement[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [itemId, setItemId] = useState(props.items[0]?.id ?? 0);
  const [size, setSize] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [action, setAction] = useState<'in' | 'out' | 'adjustment'>('in');
  const [note, setNote] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const selectedItem = useMemo(() => props.items.find((item) => item.id === itemId), [props.items, itemId]);

  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setMessage('');
    setError('');
    startTransition(async () => {
      const result = await adjustStock({ itemId, size, quantity, action, note });
      if (result.error) {
        setError(friendlyStockError(result.error));
        return;
      }
      setMessage(action === 'in' ? 'บันทึกรับสินค้าเข้าแล้ว' : action === 'out' ? 'บันทึกการเบิกสินค้าแล้ว' : 'ปรับยอดสต็อกแล้ว');
      setNote('');
      router.refresh();
    });
  }

  function toggleTracking(item: Item) {
    setMessage('');
    setError('');
    startTransition(async () => {
      const result = await setStockTracking(item.id, !item.stock_tracked);
      if (result.error) {
        setError('เปลี่ยนการติดตามสต็อกไม่สำเร็จ กรุณาลองอีกครั้ง');
        return;
      }
      setMessage(`ปรับการติดตามสต็อกของ "${item.name}" แล้ว`);
      router.refresh();
    });
  }

  return (
    <div className="inventory-layout">
      <section className="card inventory-balance">
        <div className="card-heading">
          <div><h2>ยอดคงเหลือ</h2><p>ยอดแยกตามไซส์สำหรับสินค้าที่ต้องระบุไซส์</p></div>
        </div>
        {props.items.length ? <div className="table-scroll"><table className="list">
          <thead><tr><th>สินค้า</th><th>ไซส์</th><th className="r">คงเหลือ</th><th>การติดตาม</th></tr></thead>
          <tbody>
            {props.items.map((item) => {
              const balances = props.balances.filter((balance) => balance.item_id === item.id);
              const rows = item.stock_tracked
                ? (item.requires_size
                  ? balances.length ? balances : [{ item_id: item.id, size: '-', quantity: 0 }]
                  : [{ item_id: item.id, size: '-', quantity: balances.find((balance) => balance.size === '')?.quantity ?? 0 }])
                : [{ item_id: item.id, size: '-', quantity: 0 }];
              return rows.map((balance, index) => (
                <tr key={`${item.id}-${balance.size}`}>
                  {index === 0 && <td rowSpan={rows.length}><strong>{item.name}</strong></td>}
                  <td>{item.requires_size ? balance.size : '-'}</td>
                  <td className="r">{item.stock_tracked ? <span className="quantity-pill">{balance.quantity}</span> : '-'}</td>
                  {index === 0 && (
                    <td rowSpan={rows.length}>
                      <div className="tracking-cell">
                        <span className={`tracking-status ${item.stock_tracked ? 'on' : 'off'}`}>{item.stock_tracked ? 'ติดตาม' : 'ปิด'}</span>
                        <button className="btn secondary tracking-toggle" type="button" disabled={pending} onClick={() => toggleTracking(item)}>
                          {item.stock_tracked ? 'ปิด' : 'เปิด'}
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ));
            })}
          </tbody>
        </table></div> : (
          <div className="empty-state compact-empty">
            <span className="empty-icon"><AppIcon name="box" size={22} /></span>
            <h2>ยังไม่มีรายการสินค้า</h2>
            <p>กรุณาติดต่อผู้ดูแลระบบเพื่อเพิ่มสินค้าในระบบ</p>
          </div>
        )}
      </section>

      <section className="card inventory-form">
        <div className="card-heading">
          <div><h2>บันทึกความเคลื่อนไหว</h2><p>ระบุรายการและจำนวนที่ต้องการปรับ</p></div>
        </div>
        <form onSubmit={submit}>
          <div className="grid2">
            <div>
              <label htmlFor="stock-item">สินค้า</label>
              <select
                id="stock-item"
                value={itemId}
                onChange={(e) => {
                  setItemId(Number(e.target.value));
                  setSize('');
                }}
                required
              >
                {props.items.map((item) => (
                  <option key={item.id} value={item.id} disabled={!item.stock_tracked}>
                    {item.name}{item.stock_tracked ? '' : ' (ไม่ติดตามสต็อก)'}
                  </option>
                ))}
              </select>
            </div>
            {selectedItem?.requires_size && (
              <div>
                <label htmlFor="stock-size">ไซส์</label>
                <input id="stock-size" value={size} onChange={(e) => setSize(e.target.value)} required />
              </div>
            )}
            <div>
              <label htmlFor="stock-action">รายการ</label>
              <select
                id="stock-action"
                value={action}
                onChange={(e) => {
                  setAction(e.target.value as 'in' | 'out' | 'adjustment');
                  setQuantity(1);
                }}
              >
                <option value="in">รับสินค้าเข้า</option>
                <option value="out">เบิกสินค้าออก</option>
                <option value="adjustment">ปรับยอดสต็อก (+ / -)</option>
              </select>
            </div>
            <div>
              <label htmlFor="stock-quantity">{action === 'adjustment' ? 'จำนวนที่ปรับ (+ เพิ่ม / - ลด)' : 'จำนวน'}</label>
              <input
                id="stock-quantity"
                type="number"
                min={action === 'adjustment' ? undefined : 1}
                step={1}
                value={quantity}
                onChange={(e) => setQuantity(Number(e.target.value))}
                required
              />
              {action === 'adjustment' && <small>ใส่จำนวนบวกเพื่อเพิ่ม หรือติดลบเพื่อลดยอดคงเหลือ</small>}
            </div>
            <div>
              <label htmlFor="stock-note">{action === 'adjustment' ? 'เหตุผลที่ปรับยอด (จำเป็น)' : 'หมายเหตุ (ไม่บังคับ)'}</label>
              <input
                id="stock-note"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                maxLength={500}
                required={action === 'adjustment'}
                placeholder={action === 'adjustment' ? 'เช่น ตรวจนับสินค้าคงเหลือ' : ''}
              />
            </div>
          </div>
          <button className="btn" type="submit" disabled={pending || !selectedItem?.stock_tracked}>
            <AppIcon name="check" size={18} />
            {pending ? 'กำลังบันทึก...' : 'บันทึกสต็อก'}
          </button>
        </form>
        {message && <p>{message}</p>}
        {error && <p className="error" role="alert">{error}</p>}
      </section>

      <section className="card inventory-history">
        <div className="card-heading">
          <div><h2>ประวัติความเคลื่อนไหว</h2><p>แสดงรายการล่าสุดไม่เกิน 50 รายการ</p></div>
        </div>
        {props.movements.length ? <div className="table-scroll"><table className="list">
          <thead><tr><th>วันเวลา</th><th>สินค้า</th><th>ไซส์</th><th>รายการ</th><th className="r">จำนวน</th><th className="r">คงเหลือ</th><th>หมายเหตุ</th></tr></thead>
          <tbody>
            {props.movements.map((movement) => (
              <tr key={movement.id}>
                <td>{new Date(movement.at).toLocaleString('th-TH', { timeZone: 'Asia/Bangkok' })}</td>
                <td>{props.items.find((item) => item.id === movement.item_id)?.name ?? `สินค้า #${movement.item_id}`}</td>
                <td>{movement.size || '-'}</td>
                <td>{movementNames[movement.action] ?? movement.action}</td>
                <td className={`r ${movement.change_qty > 0 ? 'movement-positive' : 'movement-negative'}`}>{movement.change_qty > 0 ? '+' : ''}{movement.change_qty}</td>
                <td className="r"><span className="quantity-pill">{movement.quantity_after}</span></td>
                <td>{movement.note ?? ''}</td>
              </tr>
            ))}
          </tbody>
        </table></div> : <div className="empty-state compact-empty">
          <span className="empty-icon"><AppIcon name="receipt" size={22} /></span>
          <h2>ยังไม่มีประวัติการเคลื่อนไหว</h2>
          <p>เมื่อมีการรับเข้า เบิกออก หรือปรับยอด รายการจะแสดงที่นี่</p>
        </div>}
      </section>
    </div>
  );
}
