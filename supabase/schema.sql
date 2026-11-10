-- Run once in the Supabase SQL editor. Each user can access ONLY their own leads.
create extension if not exists pgcrypto;
create table if not exists public.leads (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references auth.users(id) on delete cascade,
 identity_key text not null,
 name text not null check (length(name) between 1 and 120),
 company text not null check (length(company) between 1 and 160),
 country text not null default '',
 region text not null default '',
 sector text not null default '',
 url text not null default '',
 notes text not null default '',
 goal text not null default 'projects' check (goal in ('projects','partners','career')),
 fit smallint not null default 3 check (fit between 1 and 5),
 potential smallint not null default 3 check (potential between 1 and 5),
 priority smallint generated always as (fit + potential) stored,
 contacted boolean not null default false,
 contact_date date,
 channel text not null default '',
 status text not null default 'Research',
 followup date,
 history jsonb not null default '[]'::jsonb,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 unique(user_id, identity_key)
);
create index if not exists leads_owner_contact_idx on public.leads(user_id,contacted,priority desc,created_at desc);
create index if not exists leads_owner_followup_idx on public.leads(user_id,followup);
alter table public.leads enable row level security;
revoke all on public.leads from anon;
grant select,insert,update,delete on public.leads to authenticated;
drop policy if exists "select own" on public.leads;
drop policy if exists "insert own" on public.leads;
drop policy if exists "update own" on public.leads;
drop policy if exists "delete own" on public.leads;
create policy "select own" on public.leads for select to authenticated using (auth.uid() = user_id);
create policy "insert own" on public.leads for insert to authenticated with check (auth.uid() = user_id);
create policy "update own" on public.leads for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "delete own" on public.leads for delete to authenticated using (auth.uid() = user_id);
