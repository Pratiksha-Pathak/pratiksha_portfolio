-- V14 — Pratiksha Pathak Portfolio database setup
-- 1) Create a Supabase project.
-- 2) Run this entire script in SQL Editor.
-- 3) In Authentication > Users, create your admin email/password.
-- 4) Copy that user's UUID and run the final INSERT command below.

create table if not exists public.portfolio_content (
  key text primary key,
  value jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);
alter table public.portfolio_content enable row level security;

create table if not exists public.admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);
alter table public.admin_users enable row level security;

create or replace function public.is_admin()
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists(select 1 from public.admin_users where user_id = auth.uid());
$$;

-- Recreate policies safely if this script is run more than once.
drop policy if exists "Public can read portfolio content" on public.portfolio_content;
drop policy if exists "Admins can insert portfolio content" on public.portfolio_content;
drop policy if exists "Admins can update portfolio content" on public.portfolio_content;
drop policy if exists "Admins can delete portfolio content" on public.portfolio_content;
drop policy if exists "Admins can read own admin record" on public.admin_users;

create policy "Public can read portfolio content"
on public.portfolio_content for select using (true);

create policy "Admins can insert portfolio content"
on public.portfolio_content for insert to authenticated
with check (public.is_admin());

create policy "Admins can update portfolio content"
on public.portfolio_content for update to authenticated
using (public.is_admin()) with check (public.is_admin());

create policy "Admins can delete portfolio content"
on public.portfolio_content for delete to authenticated
using (public.is_admin());

create policy "Admins can read own admin record"
on public.admin_users for select to authenticated
using (user_id = auth.uid());

-- Optional metadata for future Supabase Storage media migration.
create table if not exists public.portfolio_media (
  key text primary key,
  file_name text,
  storage_path text,
  mime_type text,
  public_url text,
  updated_at timestamptz not null default now()
);
alter table public.portfolio_media enable row level security;
drop policy if exists "Public can read portfolio media" on public.portfolio_media;
drop policy if exists "Admins can manage portfolio media" on public.portfolio_media;
create policy "Public can read portfolio media" on public.portfolio_media for select using (true);
create policy "Admins can manage portfolio media" on public.portfolio_media for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- AFTER creating the admin user in Authentication > Users, replace the UUID and run:
-- insert into public.admin_users(user_id) values ('YOUR-AUTH-USER-UUID') on conflict do nothing;

-- Future media bucket: create a public bucket named portfolio-media from Storage UI.
