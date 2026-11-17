insert into public.itpc_receipt_receipt_counters (buddhist_year, series, last_seq)
select buddhist_year, series, max(seq)
  from public.itpc_receipt_receipts
 group by buddhist_year, series
on conflict (buddhist_year, series)
do update set last_seq = greatest(
  public.itpc_receipt_receipt_counters.last_seq,
  excluded.last_seq
);

update public.itpc_receipt_receipt_counters c
   set last_seq = case
     when exists (
       select 1
         from public.itpc_receipt_receipts r
        where r.buddhist_year = c.buddhist_year
          and r.series = c.series
     ) then greatest(
       c.last_seq,
       coalesce((
         select max(r.seq)
           from public.itpc_receipt_receipts r
          where r.buddhist_year = c.buddhist_year
            and r.series = c.series
       ), 0),
       coalesce((
         select max(
           case
             when a.detail->>'receipt_no' ~ '^[0-9]+-[0-9]+-[0-9]+$'
             then split_part(a.detail->>'receipt_no', '-', 3)::int
           end
         )
           from public.itpc_receipt_audit_log a
          where a.action = 'delete'
            and split_part(a.detail->>'receipt_no', '-', 1) = c.buddhist_year::text
            and split_part(a.detail->>'receipt_no', '-', 2) = c.series
       ), 0)
     )
     else 0
   end;

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
  v_year int := greatest(extract(year from p_paid_at)::int + 543, 2570);
  v_series constant text := '99';
  v_last_seq int;
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
  select v_year, v_series, coalesce(max(seq), 0)
    from public.itpc_receipt_receipts
   where buddhist_year = v_year and series = v_series
  on conflict (buddhist_year, series) do nothing;

  select last_seq
    into v_last_seq
    from public.itpc_receipt_receipt_counters
   where buddhist_year = v_year and series = v_series
   for update;

  v_seq := v_last_seq + 1;
  update public.itpc_receipt_receipt_counters
     set last_seq = v_seq
   where buddhist_year = v_year and series = v_series;

  insert into public.itpc_receipt_receipts (
    receipt_no, buddhist_year, series, seq, paid_at, payer_name, applicant_code, level_name, total,
    cashier_name_th, cashier_name_en, cashier_title_th, cashier_title_en, cashier_signature_url, created_by
  ) values (
    v_year || '-' || v_series || '-' || lpad(v_seq::text, 4, '0'),
    v_year, v_series, v_seq, p_paid_at, trim(p_payer_name),
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

  insert into public.itpc_receipt_receipt_counters (buddhist_year, series, last_seq)
  select v_receipt.buddhist_year, v_receipt.series, coalesce(max(seq), 0)
    from public.itpc_receipt_receipts
   where buddhist_year = v_receipt.buddhist_year
     and series = v_receipt.series
  on conflict (buddhist_year, series) do nothing;

  perform 1
    from public.itpc_receipt_receipt_counters
   where buddhist_year = v_receipt.buddhist_year
     and series = v_receipt.series
   for update;

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

  if not exists (
    select 1
      from public.itpc_receipt_receipts
     where buddhist_year = v_receipt.buddhist_year
       and series = v_receipt.series
  ) then
    update public.itpc_receipt_receipt_counters
       set last_seq = 0
     where buddhist_year = v_receipt.buddhist_year
       and series = v_receipt.series;
  end if;
end;
$$;

revoke all on function public.issue_receipt(date, text, text, text, uuid, text, jsonb) from public, anon;
grant execute on function public.issue_receipt(date, text, text, text, uuid, text, jsonb) to authenticated;
revoke all on function public.delete_receipt(uuid, text) from public, anon;
grant execute on function public.delete_receipt(uuid, text) to authenticated;
