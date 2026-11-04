alter table public.itpc_receipt_items
  add column stock_tracked boolean not null default true;

create table public.itpc_receipt_stock_balances (
  item_id int not null references public.itpc_receipt_items(id),
  size text not null default '',
  quantity int not null default 0 check (quantity >= 0),
  updated_at timestamptz not null default now(),
  primary key (item_id, size)
);

create table public.itpc_receipt_stock_movements (
  id bigserial primary key,
  at timestamptz not null default now(),
  user_id uuid,
  item_id int not null references public.itpc_receipt_items(id),
  size text not null default '',
  action text not null check (action in ('in', 'out', 'sale', 'sale_cancel', 'sale_delete')),
  change_qty int not null,
  quantity_before int not null,
  quantity_after int not null,
  receipt_id uuid,
  note text
);
create index on public.itpc_receipt_stock_movements (item_id, at desc);
create index on public.itpc_receipt_stock_movements (receipt_id);

alter table public.itpc_receipt_stock_balances enable row level security;
alter table public.itpc_receipt_stock_movements enable row level security;
create policy "staff read stock balances" on public.itpc_receipt_stock_balances
  for select to authenticated using (true);
create policy "staff read stock movements" on public.itpc_receipt_stock_movements
  for select to authenticated using (true);
revoke insert, update, delete on public.itpc_receipt_stock_balances from anon, authenticated;
revoke insert, update, delete on public.itpc_receipt_stock_movements from anon, authenticated;
grant select on public.itpc_receipt_stock_balances, public.itpc_receipt_stock_movements to authenticated;

create or replace function public.set_item_stock_tracking(p_item_id int, p_tracked boolean)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then raise exception 'not authenticated'; end if;
  update public.itpc_receipt_items
     set stock_tracked = p_tracked
   where id = p_item_id;
  if not found then raise exception 'item not found'; end if;
end;
$$;

create or replace function public.adjust_stock(
  p_item_id int,
  p_size text,
  p_quantity int,
  p_action text,
  p_note text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_item public.itpc_receipt_items%rowtype;
  v_size text := nullif(trim(coalesce(p_size, '')), '');
  v_before int;
  v_after int;
begin
  if auth.uid() is null then raise exception 'not authenticated'; end if;
  if p_quantity is null or p_quantity < 1 then raise exception 'quantity must be >= 1'; end if;
  if p_action not in ('in', 'out') then raise exception 'invalid stock action'; end if;
  if length(coalesce(p_note, '')) > 500 then raise exception 'note must be 500 characters or fewer'; end if;

  select * into v_item
    from public.itpc_receipt_items
   where id = p_item_id
   for update;
  if not found then raise exception 'item not found'; end if;
  if not v_item.stock_tracked then raise exception 'stock tracking is disabled for this item'; end if;
  if v_item.requires_size and v_size is null then raise exception 'size required for %', v_item.name; end if;
  if not v_item.requires_size and v_size is not null then raise exception 'size is not used for %', v_item.name; end if;

  if p_action = 'in' then
    insert into public.itpc_receipt_stock_balances (item_id, size, quantity)
    values (p_item_id, coalesce(v_size, ''), p_quantity)
    on conflict (item_id, size) do update
      set quantity = public.itpc_receipt_stock_balances.quantity + excluded.quantity,
          updated_at = now()
    returning quantity into v_after;
    v_before := v_after - p_quantity;
  else
    update public.itpc_receipt_stock_balances
       set quantity = quantity - p_quantity, updated_at = now()
     where item_id = p_item_id
       and size = coalesce(v_size, '')
       and quantity >= p_quantity
    returning quantity into v_after;
    if not found then
      select coalesce(quantity, 0) into v_before
        from public.itpc_receipt_stock_balances
       where item_id = p_item_id and size = coalesce(v_size, '');
      v_before := coalesce(v_before, 0);
      raise exception 'insufficient stock for % (size %): available %, requested %',
        v_item.name, coalesce(v_size, '-'), v_before, p_quantity;
    end if;
    v_before := v_after + p_quantity;
  end if;

  insert into public.itpc_receipt_stock_movements (
    user_id, item_id, size, action, change_qty, quantity_before, quantity_after, note
  ) values (
    auth.uid(), p_item_id, coalesce(v_size, ''), p_action,
    case when p_action = 'in' then p_quantity else -p_quantity end,
    v_before, v_after, nullif(trim(coalesce(p_note, '')), '')
  );
end;
$$;

create or replace function public.restore_receipt_stock(p_receipt_id uuid, p_action text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_line record;
  v_after int;
begin
  for v_line in
    select l.item_id, coalesce(l.size, '') as size, sum(l.qty)::int as qty
      from public.itpc_receipt_receipt_lines l
     where l.receipt_id = p_receipt_id
       and l.item_id is not null
       and exists (
         select 1
           from public.itpc_receipt_stock_movements m
          where m.receipt_id = p_receipt_id
            and m.item_id = l.item_id
            and m.size = coalesce(l.size, '')
            and m.action = 'sale'
       )
     group by l.item_id, coalesce(l.size, '')
  loop
    insert into public.itpc_receipt_stock_balances (item_id, size, quantity)
    values (v_line.item_id, v_line.size, v_line.qty)
    on conflict (item_id, size) do update
      set quantity = public.itpc_receipt_stock_balances.quantity + excluded.quantity,
          updated_at = now()
    returning quantity into v_after;

    insert into public.itpc_receipt_stock_movements (
      user_id, item_id, size, action, change_qty, quantity_before, quantity_after, receipt_id
    ) values (
      auth.uid(), v_line.item_id, v_line.size, p_action, v_line.qty,
      v_after - v_line.qty, v_after, p_receipt_id
    );
  end loop;
end;
$$;

create or replace function public.issue_receipt(
  p_paid_at date,
  p_payer_name text,
  p_applicant_code text,
  p_level_name text,
  p_cashier_id uuid,
  p_series text,
  p_lines jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_year int := extract(year from p_paid_at)::int + 543;
  v_seq int;
  v_id uuid;
  v_total numeric(12,2) := 0;
  v_cash public.itpc_receipt_cashiers%rowtype;
  v_line jsonb;
  v_item public.itpc_receipt_items%rowtype;
  v_qty int;
  v_size text;
  v_desc text;
  v_before int;
  v_after int;
  v_n int := 0;
begin
  if auth.uid() is null then raise exception 'not authenticated'; end if;
  if coalesce(trim(p_payer_name), '') = '' then raise exception 'payer name required'; end if;
  if jsonb_typeof(p_lines) <> 'array' or jsonb_array_length(p_lines) = 0 then
    raise exception 'at least one line required';
  end if;

  select * into v_cash from public.itpc_receipt_cashiers where id = p_cashier_id and active;
  if not found then raise exception 'cashier not found'; end if;

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
    v_year, p_series, v_seq, p_paid_at, trim(p_payer_name),
    nullif(trim(p_applicant_code), ''), nullif(trim(p_level_name), ''), 0,
    v_cash.name_th, v_cash.name_en, v_cash.title_th, v_cash.title_en, v_cash.signature_url, auth.uid()
  ) returning id into v_id;

  for v_line in select * from jsonb_array_elements(p_lines) loop
    v_n := v_n + 1;
    select * into v_item
      from public.itpc_receipt_items
     where id = (v_line->>'item_id')::int and active
     for update;
    if not found then raise exception 'item % not found', v_line->>'item_id'; end if;

    v_qty := coalesce((v_line->>'qty')::int, 1);
    v_size := nullif(trim(coalesce(v_line->>'size', '')), '');
    if v_qty < 1 then raise exception 'qty must be >= 1'; end if;
    if v_item.requires_size and v_size is null then
      raise exception 'size required for %', v_item.name;
    end if;

    if v_item.stock_tracked then
      update public.itpc_receipt_stock_balances
         set quantity = quantity - v_qty, updated_at = now()
       where item_id = v_item.id
         and size = coalesce(v_size, '')
         and quantity >= v_qty
      returning quantity into v_after;
      if not found then
        select coalesce(quantity, 0) into v_before
          from public.itpc_receipt_stock_balances
         where item_id = v_item.id and size = coalesce(v_size, '');
        raise exception 'insufficient stock for % (size %): available %, requested %',
          v_item.name, coalesce(v_size, '-'), coalesce(v_before, 0), v_qty;
      end if;
      v_before := v_after + v_qty;
      insert into public.itpc_receipt_stock_movements (
        user_id, item_id, size, action, change_qty, quantity_before, quantity_after, receipt_id
      ) values (
        auth.uid(), v_item.id, coalesce(v_size, ''), 'sale', -v_qty, v_before, v_after, v_id
      );
    end if;

    v_desc := v_item.receipt_name;
    if v_size is not null then v_desc := v_desc || ' ขนาด ' || v_size; end if;
    if v_item.show_formula then
      v_desc := v_desc || ' (' || trim(trailing '.' from trim(trailing '0' from v_item.price::text)) || ' * ' || v_qty || ')';
    end if;

    insert into public.itpc_receipt_receipt_lines (
      receipt_id, line_no, item_id, description, size, qty, unit_price, line_total
    ) values (
      v_id, v_n, v_item.id, v_desc, v_size, v_qty, v_item.price, v_item.price * v_qty
    );
    v_total := v_total + v_item.price * v_qty;
  end loop;

  update public.itpc_receipt_receipts set total = v_total where id = v_id;
  insert into public.itpc_receipt_audit_log (user_id, action, receipt_id, detail)
  values (auth.uid(), 'issue', v_id, jsonb_build_object('total', v_total));

  return v_id;
end;
$$;

create or replace function public.cancel_receipt(p_id uuid, p_reason text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then raise exception 'not authenticated'; end if;
  if coalesce(trim(p_reason), '') = '' then raise exception 'reason required'; end if;

  update public.itpc_receipt_receipts
     set status = 'cancelled', cancelled_at = now(), cancel_reason = trim(p_reason)
   where id = p_id and status = 'issued';
  if not found then raise exception 'receipt not found or already cancelled'; end if;

  perform public.restore_receipt_stock(p_id, 'sale_cancel');
  insert into public.itpc_receipt_audit_log (user_id, action, receipt_id, detail)
  values (auth.uid(), 'cancel', p_id, jsonb_build_object('reason', p_reason));
end;
$$;

create or replace function public.delete_receipt(p_id uuid, p_reason text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_receipt public.itpc_receipt_receipts%rowtype;
begin
  if auth.uid() is null then raise exception 'not authenticated'; end if;
  if not public.is_receipt_admin() then raise exception 'admin permission required'; end if;
  if coalesce(trim(p_reason), '') = '' then raise exception 'reason required'; end if;

  select * into v_receipt
    from public.itpc_receipt_receipts
   where id = p_id
   for update;
  if not found then raise exception 'receipt not found'; end if;

  if v_receipt.status = 'issued' then
    perform public.restore_receipt_stock(p_id, 'sale_delete');
  end if;

  insert into public.itpc_receipt_audit_log (user_id, action, receipt_id, detail)
  values (
    auth.uid(), 'delete', p_id,
    jsonb_build_object('receipt_no', v_receipt.receipt_no, 'reason', trim(p_reason))
  );

  perform set_config('itpc_receipt.allow_delete', 'on', true);
  delete from public.itpc_receipt_receipt_lines where receipt_id = p_id;
  delete from public.itpc_receipt_receipts where id = p_id;
end;
$$;

revoke all on function public.set_item_stock_tracking(int, boolean) from public, anon;
revoke all on function public.adjust_stock(int, text, int, text, text) from public, anon;
revoke all on function public.restore_receipt_stock(uuid, text) from public, anon, authenticated;
revoke all on function public.issue_receipt(date, text, text, text, uuid, text, jsonb) from public, anon;
revoke all on function public.cancel_receipt(uuid, text) from public, anon;
revoke all on function public.delete_receipt(uuid, text) from public, anon;
grant execute on function public.set_item_stock_tracking(int, boolean) to authenticated;
grant execute on function public.adjust_stock(int, text, int, text, text) to authenticated;
grant execute on function public.issue_receipt(date, text, text, text, uuid, text, jsonb) to authenticated;
grant execute on function public.cancel_receipt(uuid, text) to authenticated;
grant execute on function public.delete_receipt(uuid, text) to authenticated;
