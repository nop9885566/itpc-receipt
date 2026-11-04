alter table public.itpc_receipt_stock_movements
  drop constraint itpc_receipt_stock_movements_action_check;

alter table public.itpc_receipt_stock_movements
  add constraint itpc_receipt_stock_movements_action_check
  check (action in ('in', 'out', 'adjustment', 'sale', 'sale_cancel', 'sale_delete'));

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
  v_change int;
begin
  if auth.uid() is null then raise exception 'not authenticated'; end if;
  if p_action is null or p_action not in ('in', 'out', 'adjustment') then
    raise exception 'invalid stock action';
  end if;
  if p_quantity is null or (p_action = 'adjustment' and p_quantity = 0)
     or (p_action <> 'adjustment' and p_quantity < 1) then
    raise exception 'invalid quantity';
  end if;
  if length(coalesce(p_note, '')) > 500 then raise exception 'note must be 500 characters or fewer'; end if;
  if p_action = 'adjustment' and coalesce(trim(p_note), '') = '' then
    raise exception 'reason required for stock adjustment';
  end if;

  select * into v_item
    from public.itpc_receipt_items
   where id = p_item_id
   for update;
  if not found then raise exception 'item not found'; end if;
  if not v_item.stock_tracked then raise exception 'stock tracking is disabled for this item'; end if;
  if v_item.requires_size and v_size is null then raise exception 'size required for %', v_item.name; end if;
  if not v_item.requires_size and v_size is not null then raise exception 'size is not used for %', v_item.name; end if;

  v_change := case when p_action = 'out' then -p_quantity else p_quantity end;

  if v_change > 0 then
    insert into public.itpc_receipt_stock_balances (item_id, size, quantity)
    values (p_item_id, coalesce(v_size, ''), v_change)
    on conflict (item_id, size) do update
      set quantity = public.itpc_receipt_stock_balances.quantity + excluded.quantity,
          updated_at = now()
    returning quantity into v_after;
    v_before := v_after - v_change;
  else
    update public.itpc_receipt_stock_balances
       set quantity = quantity + v_change, updated_at = now()
     where item_id = p_item_id
       and size = coalesce(v_size, '')
       and quantity + v_change >= 0
    returning quantity into v_after;
    if not found then
      select coalesce(quantity, 0) into v_before
        from public.itpc_receipt_stock_balances
       where item_id = p_item_id and size = coalesce(v_size, '');
      v_before := coalesce(v_before, 0);
      raise exception 'insufficient stock for % (size %): available %, requested %',
        v_item.name, coalesce(v_size, '-'), v_before, -v_change;
    end if;
    v_before := v_after - v_change;
  end if;

  insert into public.itpc_receipt_stock_movements (
    user_id, item_id, size, action, change_qty, quantity_before, quantity_after, note
  ) values (
    auth.uid(), p_item_id, coalesce(v_size, ''), p_action, v_change,
    v_before, v_after, nullif(trim(coalesce(p_note, '')), '')
  );
end;
$$;

revoke all on function public.adjust_stock(int, text, int, text, text) from public, anon;
grant execute on function public.adjust_stock(int, text, int, text, text) to authenticated;
