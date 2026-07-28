-- Wklej całość w Supabase → SQL Editor → New query → Run.

create extension if not exists pgcrypto;

create table if not exists public.applications (
  id uuid primary key default gen_random_uuid(),
  application_code text unique not null,
  name text not null,
  age integer not null check (age between 18 and 99),
  telegram text not null,
  country text not null,
  experience text not null,
  market text not null,
  strategy text not null,
  reason text not null,
  goal text not null,
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  created_at timestamptz not null default now()
);

create table if not exists public.admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade
);

alter table public.applications enable row level security;
alter table public.admin_users enable row level security;

-- Każdy może wysłać ankietę, ale nie może czytać całej tabeli.
create policy "public can submit applications"
on public.applications for insert
to anon, authenticated
with check (status = 'pending');

-- Tylko użytkownik wpisany do admin_users może czytać, aktualizować i usuwać zgłoszenia.
create policy "admins can select applications"
on public.applications for select
to authenticated
using (exists (select 1 from public.admin_users a where a.user_id = auth.uid()));

create policy "admins can update applications"
on public.applications for update
to authenticated
using (exists (select 1 from public.admin_users a where a.user_id = auth.uid()))
with check (exists (select 1 from public.admin_users a where a.user_id = auth.uid()));

create policy "admins can delete applications"
on public.applications for delete
to authenticated
using (exists (select 1 from public.admin_users a where a.user_id = auth.uid()));

-- Bezpieczne sprawdzanie wyłącznie statusu po losowym kodzie.
create or replace function public.get_application_status(p_code text)
returns table(status text)
language sql
security definer
set search_path = public
as $$
  select a.status from public.applications a
  where upper(a.application_code) = upper(p_code)
  limit 1;
$$;

revoke all on function public.get_application_status(text) from public;
grant execute on function public.get_application_status(text) to anon, authenticated;

grant usage on schema public to anon, authenticated;
grant insert on public.applications to anon, authenticated;
grant select, update, delete on public.applications to authenticated;

-- PO UTWORZENIU KONTA ADMINA:
-- 1. Supabase → Authentication → Users → Add user
-- 2. Skopiuj UUID użytkownika
-- 3. Uruchom poniższą komendę po podmianie UUID:
-- insert into public.admin_users(user_id) values ('TU-WKLEJ-UUID-ADMINA');
