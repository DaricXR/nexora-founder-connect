-- Run in Supabase SQL Editor AFTER v8 schema.sql and jobs.sql.
-- Does not delete existing data. Each row belongs to the authenticated user.
create table if not exists public.companies (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references auth.users(id) on delete cascade,
 identity_key text not null,
 name text not null check(length(name) between 1 and 160),
 country text not null default '',
 website text not null default '',
 specialty text not null default '',
 stage text not null default 'Research' check(stage in ('Research','Qualified','Outreach','Conversation','Proposal','Won','Lost')),
 goal text not null default 'projects' check(goal in ('projects','partners','career')),
 fit smallint not null default 3 check(fit between 1 and 5),
 timing smallint not null default 3 check(timing between 1 and 5),
 signal text not null default '',
 signal_date date,
 source_url text not null default '',
 next_action date,
 notes text not null default '',
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 unique(user_id,identity_key)
);
create index if not exists companies_user_created_idx on public.companies(user_id,created_at desc);
create index if not exists companies_user_next_idx on public.companies(user_id,next_action);
alter table public.companies enable row level security;
revoke all on public.companies from anon;
grant select,insert,update,delete on public.companies to authenticated;
drop policy if exists "companies_select_own" on public.companies;
drop policy if exists "companies_insert_own" on public.companies;
drop policy if exists "companies_update_own" on public.companies;
drop policy if exists "companies_delete_own" on public.companies;
create policy "companies_select_own" on public.companies for select to authenticated using (auth.uid() = user_id);
create policy "companies_insert_own" on public.companies for insert to authenticated with check (auth.uid() = user_id);
create policy "companies_update_own" on public.companies for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "companies_delete_own" on public.companies for delete to authenticated using (auth.uid() = user_id);
