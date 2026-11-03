import Nav from '@/components/Nav';
import { createClient } from '@/lib/supabase/server';
import { todayBangkok } from '@/lib/format';
import { DEFAULT_SERIES } from '@/lib/config';
import type { Cashier, Item } from '@/lib/types';
import NewReceiptForm from './form';

export default async function NewReceiptPage() {
  const supabase = await createClient();
  const [{ data: items }, { data: cashiers }] = await Promise.all([
    supabase.from('itpc_receipt_items').select('*').eq('active', true).order('sort_order'),
    supabase.from('itpc_receipt_cashiers').select('id, name_th, name_en').eq('active', true),
  ]);
  return (
    <>
      <Nav />
      <div className="container">
        <h2>ออกใบเสร็จใหม่</h2>
        <NewReceiptForm
          items={(items ?? []) as Item[]}
          cashiers={(cashiers ?? []) as Cashier[]}
          today={todayBangkok()}
          defaultSeries={DEFAULT_SERIES}
        />
      </div>
    </>
  );
}
