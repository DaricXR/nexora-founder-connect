-- Nexora Founder Connect: optional authenticated database footprint estimate.
-- Safe read-only RPC. Reports the size of the current database, not billable organization usage.
create or replace function public.nexora_database_size_bytes()
returns bigint
language sql
stable
security invoker
set search_path = public
as $$
  select case
    when auth.uid() is not null then pg_database_size(current_database())
    else null::bigint
  end;
$$;
revoke all on function public.nexora_database_size_bytes() from public;
revoke all on function public.nexora_database_size_bytes() from anon;
grant execute on function public.nexora_database_size_bytes() to authenticated;
