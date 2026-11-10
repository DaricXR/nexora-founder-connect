-- Run AFTER schema.sql in Supabase SQL Editor. Existing leads are untouched.
create table if not exists public.jobs (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references auth.users(id) on delete cascade,
 identity_key text not null,
 title text not null,
 company text not null,
 location text not null default '',
 work_type text not null default 'Unknown',
 url text not null,
 stage text not null default 'Saved' check(stage in ('Saved','Applied','Interview','Offer','Rejected','Closed')),
 applied_date date,
 followup date,
 notes text not null default '',
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 unique(user_id, identity_key)
);
create index if not exists jobs_owner_stage_idx on public.jobs(user_id,stage,created_at desc);
alter table public.jobs enable row level security;
revoke all on public.jobs from anon;
grant select,insert,update,delete on public.jobs to authenticated;
drop policy if exists "jobs_select_own" on public.jobs;
drop policy if exists "jobs_insert_own" on public.jobs;
drop policy if exists "jobs_update_own" on public.jobs;
drop policy if exists "jobs_delete_own" on public.jobs;
create policy "jobs_select_own" on public.jobs for select to authenticated using (auth.uid() = user_id);
create policy "jobs_insert_own" on public.jobs for insert to authenticated with check (auth.uid() = user_id);
create policy "jobs_update_own" on public.jobs for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "jobs_delete_own" on public.jobs for delete to authenticated using (auth.uid() = user_id);
