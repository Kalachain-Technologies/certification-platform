-- Run this once in the Supabase SQL editor before using the new dashboard fields.
alter table public.participants
  add column if not exists theme text;

alter table public.evaluations
  add column if not exists theme text;

alter table public.participants
  add column if not exists theme_label text;

alter table public.evaluations
  add column if not exists theme_label text;

alter table public.participants
  add column if not exists convener_name text;

alter table public.evaluations
  add column if not exists convener_name text;

alter table public.participants
  add column if not exists convener_title text;

alter table public.evaluations
  add column if not exists convener_title text;

alter table public.participants
  add column if not exists workshop_end_date date;
