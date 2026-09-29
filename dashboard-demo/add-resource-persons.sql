-- Run this once in the Supabase SQL editor before using the "Resource Person" tabs.
-- Stores Certificate of Appreciation records for resource persons / conveners.
create table if not exists public.resource_persons (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  salutation text,
  name text not null,
  email text not null,
  role text not null default 'Resource Person',
  programme_name text not null,
  programme_title text,
  programme_date date,
  programme_end_date date,
  audio_feedback_url text,
  wallet_address text,
  certificate_status text not null default 'NotIssued',
  token_id text,
  tx_hash text,
  verification_link text
);

-- The dashboard server and the public certificate page both use the anon key,
-- so anon needs the same read/insert/update access as the other tables.
alter table public.resource_persons enable row level security;

create policy "resource_persons_select" on public.resource_persons
  for select to anon, authenticated using (true);

create policy "resource_persons_insert" on public.resource_persons
  for insert to anon, authenticated with check (true);

create policy "resource_persons_update" on public.resource_persons
  for update to anon, authenticated using (true) with check (true);
