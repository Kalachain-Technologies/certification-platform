-- Run this once in the Supabase SQL editor before using the "Workshop by / Resource Person" dropdown.
alter table public.participants
  add column if not exists workshop_by_label text;

alter table public.evaluations
  add column if not exists workshop_by_label text;
