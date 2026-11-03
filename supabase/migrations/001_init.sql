-- =========================================================
-- Receipt system schema
-- Run in Supabase SQL editor (or `supabase db push`)
-- =========================================================

create table public.itpc_receipt_items (
  id            serial primary key,
  name          text not null,                 -- name shown in the sales form
  receipt_name  text not null,                 -- name printed on the receipt
  price         numeric(10,2) not null check (price >= 0),
  requires_size boolean not null default false,
  show_formula  boolean not null default false, -- print "(price * qty)" after the name
  active        boolean not null default true,
  sort_order    int not null default 0
);

create table public.itpc_receipt_cashiers (
  id            uuid primary key default gen_random_uuid(),
  name_th       text not null,
  name_en       text not null,
  title_th      text not null default 'เจ้าหน้าที่ผู้รับเงิน',
  title_en      text not null default 'Cashier',
  signature_url text,                          -- public URL of signature image (Supabase Storage)
  active        boolean not null default true
);

-- running number per (Buddhist year, series)
create table public.itpc_receipt_receipt_counters (
  buddhist_year int not null,
  series        text not null,
  last_seq      int  not null default 0,
  primary key (buddhist_year, series)
);

create table public.itpc_receipt_receipts (
  id             uuid primary key default gen_random_uuid(),
  receipt_no     text not null unique,         -- e.g. 2569-25-0145
  buddhist_year  int  not null,
  series         text not null,
  seq            int  not null,
  paid_at        date not null,
  payer_name     text not null,
  applicant_code text,
  level_name     text,
  total          numeric(12,2) not null,
  -- cashier snapshot: issued receipts never change even if cashier record changes
  cashier_name_th text not null,
  cashier_name_en text not null,
  cashier_title_th text not null,
  cashier_title_en text not null,
  cashier_signature_url text,
  status         text not null default 'issued' check (status in ('issued','cancelled')),
  cancelled_at   timestamptz,
  cancel_reason  text,
  created_by     uuid references auth.users(id),
  created_at     timestamptz not null default now(),
  unique (buddhist_year, series, seq)
);

create table public.itpc_receipt_receipt_lines (
  id          uuid primary key default gen_random_uuid(),
  receipt_id  uuid not null references public.itpc_receipt_receipts(id) on delete restrict,
  line_no     int  not null,
  item_id     int  references public.itpc_receipt_items(id),
  description text not null,                   -- final printed text, snapshot
  size        text,
  qty         int  not null check (qty > 0),
  unit_price  numeric(10,2) not null,          -- snapshot of price at time of sale
  line_total  numeric(12,2) not null
);
create index on public.itpc_receipt_receipt_lines (receipt_id);

create table public.itpc_receipt_audit_log (
  id         bigserial primary key,
  at         timestamptz not null default now(),
  user_id    uuid,
  action     text not null,
  receipt_id uuid,
  detail     jsonb
);

-- ---------------------------------------------------------
-- Row Level Security: signed-in staff can read; all writes go through functions
-- ---------------------------------------------------------
alter table public.itpc_receipt_items            enable row level security;
alter table public.itpc_receipt_cashiers         enable row level security;
alter table public.itpc_receipt_receipt_counters enable row level security;
alter table public.itpc_receipt_receipts         enable row level security;
alter table public.itpc_receipt_receipt_lines    enable row level security;
alter table public.itpc_receipt_audit_log        enable row level security;

create policy "staff read items"     on public.itpc_receipt_items         for select to authenticated using (true);
create policy "staff read cashiers"  on public.itpc_receipt_cashiers      for select to authenticated using (true);
create policy "staff read receipts"  on public.itpc_receipt_receipts      for select to authenticated using (true);
create policy "staff read lines"     on public.itpc_receipt_receipt_lines for select to authenticated using (true);
-- receipt_counters and audit_log: no policies = no direct access (functions below are SECURITY DEFINER)

-- ---------------------------------------------------------
-- Issue a receipt (atomic: number + header + lines in one transaction)
-- p_lines = [{"item_id":1,"size":"28","qty":1}, ...]
-- Prices are read from items here, never trusted from the browser.
-- ---------------------------------------------------------
create or replace function public.issue_receipt(
  p_paid_at        date,
  p_payer_name     text,
  p_applicant_code text,
  p_level_name     text,
  p_cashier_id     uuid,
  p_series         text,
  p_lines          jsonb
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_year   int := extract(year from p_paid_at)::int + 543;
  v_seq    int;
  v_id     uuid;
  v_total  numeric(12,2) := 0;
  v_cash   public.itpc_receipt_cashiers%rowtype;
  v_line   jsonb;
  v_item   public.itpc_receipt_items%rowtype;
  v_qty    int;
  v_size   text;
  v_desc   text;
  v_n      int := 0;
begin
  if auth.uid() is null then raise exception 'not authenticated'; end if;
  if coalesce(trim(p_payer_name),'') = '' then raise exception 'payer name required'; end if;
  if jsonb_typeof(p_lines) <> 'array' or jsonb_array_length(p_lines) = 0 then
    raise exception 'at least one line required';
  end if;

  select * into v_cash from public.itpc_receipt_cashiers where id = p_cashier_id and active;
  if not found then raise exception 'cashier not found'; end if;

  -- atomic running number (row lock held until commit => no gaps from rollbacks, no duplicates)
  insert into public.itpc_receipt_receipt_counters (buddhist_year, series, last_seq)
  values (v_year, p_series, 1)
  on conflict (buddhist_year, series)
  do update set last_seq = public.itpc_receipt_receipt_counters.last_seq + 1
  returning last_seq into v_seq;

  insert into public.itpc_receipt_receipts (
    receipt_no, buddhist_year, series, seq, paid_at, payer_name, applicant_code, level_name, total,
    cashier_name_th, cashier_name_en, cashier_title_th, cashier_title_en, cashier_signature_url, created_by
  ) values (
    v_year || '-' || p_series || '-' || lpad(v_seq::text, 4, '0'),
    v_year, p_series, v_seq, p_paid_at, trim(p_payer_name), nullif(trim(p_applicant_code),''), nullif(trim(p_level_name),''), 0,
    v_cash.name_th, v_cash.name_en, v_cash.title_th, v_cash.title_en, v_cash.signature_url, auth.uid()
  ) returning id into v_id;

  for v_line in select * from jsonb_array_elements(p_lines) loop
    v_n := v_n + 1;
    select * into v_item from public.itpc_receipt_items where id = (v_line->>'item_id')::int and active;
    if not found then raise exception 'item % not found', v_line->>'item_id'; end if;

    v_qty  := coalesce((v_line->>'qty')::int, 1);
    v_size := nullif(trim(coalesce(v_line->>'size','')), '');
    if v_qty < 1 then raise exception 'qty must be >= 1'; end if;
    if v_item.requires_size and v_size is null then
      raise exception 'size required for %', v_item.name;
    end if;

    v_desc := v_item.receipt_name;
    if v_size is not null then v_desc := v_desc || ' ขนาด ' || v_size; end if;
    if v_item.show_formula then
      v_desc := v_desc || ' (' || trim(trailing '.' from trim(trailing '0' from v_item.price::text)) || ' * ' || v_qty || ')';
    end if;

    insert into public.itpc_receipt_receipt_lines (receipt_id, line_no, item_id, description, size, qty, unit_price, line_total)
    values (v_id, v_n, v_item.id, v_desc, v_size, v_qty, v_item.price, v_item.price * v_qty);

    v_total := v_total + v_item.price * v_qty;
  end loop;

  update public.itpc_receipt_receipts set total = v_total where id = v_id;

  insert into public.itpc_receipt_audit_log (user_id, action, receipt_id, detail)
  values (auth.uid(), 'issue', v_id, jsonb_build_object('total', v_total));

  return v_id;
end;
$$;

-- Cancel (never delete). Issue a new receipt afterwards if needed.
create or replace function public.cancel_receipt(p_id uuid, p_reason text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then raise exception 'not authenticated'; end if;
  if coalesce(trim(p_reason),'') = '' then raise exception 'reason required'; end if;

  update public.itpc_receipt_receipts
     set status = 'cancelled', cancelled_at = now(), cancel_reason = trim(p_reason)
   where id = p_id and status = 'issued';
  if not found then raise exception 'receipt not found or already cancelled'; end if;

  insert into public.itpc_receipt_audit_log (user_id, action, receipt_id, detail)
  values (auth.uid(), 'cancel', p_id, jsonb_build_object('reason', p_reason));
end;
$$;

revoke all on function public.issue_receipt(date,text,text,text,uuid,text,jsonb) from public, anon;
revoke all on function public.cancel_receipt(uuid,text) from public, anon;
grant execute on function public.issue_receipt(date,text,text,text,uuid,text,jsonb) to authenticated;
grant execute on function public.cancel_receipt(uuid,text) to authenticated;

-- Block UPDATE/DELETE of issued data except the cancel path above (defence in depth)
create or replace function public.receipts_guard() returns trigger language plpgsql as $$
begin
  if tg_op = 'DELETE' then raise exception 'receipts cannot be deleted; cancel instead'; end if;
  if tg_op = 'UPDATE' then
    -- allowed: total fill-in during issue, and status change to cancelled
    if new.receipt_no <> old.receipt_no or new.payer_name <> old.payer_name or new.paid_at <> old.paid_at
       or (old.total <> 0 and new.total <> old.total)
       or old.status = 'cancelled' then
      raise exception 'issued receipts are immutable';
    end if;
  end if;
  return new;
end $$;
create trigger receipts_guard_trg before update or delete on public.itpc_receipt_receipts
for each row execute function public.receipts_guard();

create or replace function public.lines_guard() returns trigger language plpgsql as $$
begin
  if tg_op in ('UPDATE','DELETE') then raise exception 'receipt lines are immutable'; end if;
  return new;
end $$;
create trigger lines_guard_trg before update or delete on public.itpc_receipt_receipt_lines
for each row execute function public.lines_guard();
