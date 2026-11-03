create table public.itpc_receipt_admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.itpc_receipt_admins enable row level security;
revoke all on table public.itpc_receipt_admins from public, anon, authenticated;

create or replace function public.is_receipt_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select auth.uid() is not null
    and exists (
      select 1
        from public.itpc_receipt_admins
       where user_id = auth.uid()
    );
$$;

revoke all on function public.is_receipt_admin() from public, anon;
grant execute on function public.is_receipt_admin() to authenticated;

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

-- Add admins explicitly from Supabase SQL Editor using their Authentication user UUID:
-- insert into public.itpc_receipt_admins (user_id) values ('00000000-0000-0000-0000-000000000000');
