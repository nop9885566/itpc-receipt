export type Item = {
  id: number; name: string; receipt_name: string; price: number;
  requires_size: boolean; show_formula: boolean; active: boolean; sort_order: number;
};
export type Cashier = { id: string; name_th: string; name_en: string };
export type ReceiptLine = {
  id: string; line_no: number; description: string; size: string | null;
  qty: number; unit_price: number; line_total: number;
};
export type Receipt = {
  id: string; receipt_no: string; paid_at: string; payer_name: string;
  applicant_code: string | null; level_name: string | null; total: number;
  cashier_name_th: string; cashier_name_en: string; cashier_title_th: string; cashier_title_en: string;
  cashier_signature_url: string | null;
  status: 'issued' | 'cancelled'; cancelled_at: string | null; cancel_reason: string | null;
  created_at: string;
  receipt_lines: ReceiptLine[];
};
