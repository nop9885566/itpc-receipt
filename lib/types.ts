export type Item = {
  id: number; name: string; receipt_name: string; price: number;
  requires_size: boolean; show_formula: boolean; active: boolean; sort_order: number;
  stock_tracked: boolean;
};
export type StockBalance = { item_id: number; size: string; quantity: number };
export type StockMovement = {
  id: number; at: string; item_id: number; size: string; action: string;
  change_qty: number; quantity_before: number; quantity_after: number;
  receipt_id: string | null; note: string | null;
};
export type Cashier = { id: string; name_th: string; name_en: string };
export type Student = {
  student_id: string; title_th: string; first_name_th: string; last_name_th: string; grade: string;
};
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
