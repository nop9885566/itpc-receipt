'use server';

import { createClient } from '@/lib/supabase/server';

export type NewReceiptInput = {
  paidAt: string;
  payerName: string;
  applicantCode: string;
  levelName: string;
  cashierId: string;
  series: string;
  lines: { item_id: number; size: string; qty: number }[];
};

export async function issueReceipt(input: NewReceiptInput): Promise<{ id?: string; error?: string }> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc('issue_receipt', {
    p_paid_at: input.paidAt,
    p_payer_name: input.payerName,
    p_applicant_code: input.applicantCode,
    p_level_name: input.levelName,
    p_cashier_id: input.cashierId,
    p_series: input.series,
    p_lines: input.lines,
  });
  if (error) return { error: error.message };
  return { id: data as string };
}
