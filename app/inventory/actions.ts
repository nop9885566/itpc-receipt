'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

export async function adjustStock(input: {
  itemId: number;
  size: string;
  quantity: number;
  action: 'in' | 'out' | 'adjustment';
  note: string;
}): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { error } = await supabase.rpc('adjust_stock', {
    p_item_id: input.itemId,
    p_size: input.size,
    p_quantity: input.quantity,
    p_action: input.action,
    p_note: input.note,
  });
  if (error) return { error: error.message };
  revalidatePath('/inventory');
  revalidatePath('/receipts/new');
  return {};
}

export async function setStockTracking(itemId: number, tracked: boolean): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { error } = await supabase.rpc('set_item_stock_tracking', {
    p_item_id: itemId,
    p_tracked: tracked,
  });
  if (error) return { error: error.message };
  revalidatePath('/inventory');
  revalidatePath('/receipts/new');
  return {};
}
