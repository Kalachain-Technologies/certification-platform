-- Run this once in the Supabase SQL editor before using the new dashboard fields.
alter table public.participants
  add column if not exists workshop_by text;

alter table public.evaluations
  add column if not exists workshop_by text;
