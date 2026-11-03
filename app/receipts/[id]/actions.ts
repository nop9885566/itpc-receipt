'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

export async function cancelReceipt(id: string, reason: string): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { error } = await supabase.rpc('cancel_receipt', { p_id: id, p_reason: reason });
  if (error) return { error: error.message };
  revalidatePath(`/receipts/${id}`);
  revalidatePath('/receipts');
  return {};
}
