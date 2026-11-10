-- Add automated monitoring findings; run after v9 migrations.
create table if not exists public.monitor_alerts (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references auth.users(id) on delete cascade,
 identity_key text not null,
 category text not null check(category in ('job','company_signal')),
 title text not null,
 company text not null default '',
 country text not null default '',
 source_url text not null,
 source_name text not null default '',
 summary text not null default '',
 score smallint not null default 1 check(score between 1 and 10),
 status text not null default 'new' check(status in ('new','reviewed','dismissed')),
 found_at timestamptz not null default now(),
 last_seen_at timestamptz not null default now(),
 unique(user_id, identity_key)
);
create index if not exists monitor_alerts_owner_sort on public.monitor_alerts(user_id,status,score desc,found_at desc);
alter table public.monitor_alerts enable row level security;
revoke all on public.monitor_alerts from anon;
grant select,update,delete on public.monitor_alerts to authenticated;
-- Automated runner uses a service role and writes rows. Users may only READ/UPDATE their own rows.
drop policy if exists "alerts_select_own" on public.monitor_alerts;
drop policy if exists "alerts_update_own" on public.monitor_alerts;
drop policy if exists "alerts_delete_own" on public.monitor_alerts;
create policy "alerts_select_own" on public.monitor_alerts for select to authenticated using(auth.uid()=user_id);
create policy "alerts_update_own" on public.monitor_alerts for update to authenticated using(auth.uid()=user_id) with check(auth.uid()=user_id);
create policy "alerts_delete_own" on public.monitor_alerts for delete to authenticated using(auth.uid()=user_id);
