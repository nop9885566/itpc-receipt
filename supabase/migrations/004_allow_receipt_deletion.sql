create or replace function public.receipts_guard() returns trigger language plpgsql as $$
begin
  if tg_op = 'DELETE' then
    if current_setting('itpc_receipt.allow_delete', true) is distinct from 'on' then
      raise exception 'receipts can only be deleted through delete_receipt()';
    end if;
    return old;
  end if;

  if new.receipt_no <> old.receipt_no or new.payer_name <> old.payer_name or new.paid_at <> old.paid_at
     or (old.total <> 0 and new.total <> old.total)
     or old.status = 'cancelled' then
    raise exception 'issued receipts are immutable';
  end if;

  return new;
end $$;

create or replace function public.lines_guard() returns trigger language plpgsql as $$
begin
  if tg_op = 'UPDATE' then
    raise exception 'receipt lines are immutable';
  end if;

  if current_setting('itpc_receipt.allow_delete', true) is distinct from 'on' then
    raise exception 'receipt lines are immutable';
  end if;
  return old;
end $$;

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
  if coalesce(trim(p_reason), '') = '' then raise exception 'reason required'; end if;

  select * into v_receipt
    from public.itpc_receipt_receipts
   where id = p_id
   for update;
  if not found then raise exception 'receipt not found'; end if;

  insert into public.itpc_receipt_audit_log (user_id, action, receipt_id, detail)
  values (
    auth.uid(),
    'delete',
    p_id,
    jsonb_build_object(
      'receipt_no', v_receipt.receipt_no,
      'reason', trim(p_reason)
    )
  );

  perform set_config('itpc_receipt.allow_delete', 'on', true);
  delete from public.itpc_receipt_receipt_lines where receipt_id = p_id;
  delete from public.itpc_receipt_receipts where id = p_id;
end;
$$;

revoke all on function public.delete_receipt(uuid, text) from public, anon;
grant execute on function public.delete_receipt(uuid, text) to authenticated;
