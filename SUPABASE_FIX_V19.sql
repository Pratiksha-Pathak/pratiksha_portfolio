-- V19 — Fix Supabase admin permissions / schema mismatch
-- Run this ONCE in Supabase SQL Editor.
-- This fixes the V15 patch's revoked table privileges and makes is_admin()
-- work with either the current user_id column or an older id column.

-- Authenticated users need table privileges; RLS still controls what they can do.
grant usage on schema public to authenticated;
grant select on public.admin_users to authenticated;
grant select, insert, update, delete on public.site_content to authenticated;
grant select, insert, update, delete on public.resources to authenticated;

-- Resources uses an identity BIGINT id in the V18 schema.
do $$
begin
  if to_regclass('public.resources_id_seq') is not null then
    grant usage, select on sequence public.resources_id_seq to authenticated;
  end if;
end $$;

-- Recreate the admin check using the actual admin_users key column.
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='admin_users' and column_name='user_id'
  ) then
    execute $fn$
      create or replace function public.is_admin()
      returns boolean
      language sql
      stable
      security definer
      set search_path = public
      as $body$
        select exists(
          select 1 from public.admin_users
          where user_id = auth.uid()
        );
      $body$;
    $fn$;
  elsif exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='admin_users' and column_name='id'
  ) then
    execute $fn$
      create or replace function public.is_admin()
      returns boolean
      language sql
      stable
      security definer
      set search_path = public
      as $body$
        select exists(
          select 1 from public.admin_users
          where id = auth.uid()
        );
      $body$;
    $fn$;
  else
    raise exception 'admin_users must contain either user_id or id (UUID linked to auth.users.id)';
  end if;
end $$;

grant execute on function public.is_admin() to authenticated;

-- Keep direct admin table access restricted to the signed-in admin record.
-- The website itself uses is_admin() for authorization.
drop policy if exists "Admins can read own admin record" on public.admin_users;
drop policy if exists "Allow authenticated users to read admin_users" on public.admin_users;

do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='admin_users' and column_name='user_id'
  ) then
    execute 'create policy "Admins can read own admin record" on public.admin_users for select to authenticated using (user_id = auth.uid())';
  elsif exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='admin_users' and column_name='id'
  ) then
    execute 'create policy "Admins can read own admin record" on public.admin_users for select to authenticated using (id = auth.uid())';
  end if;
end $$;

-- Make sure site content/resources can be read by the public site.
grant select on public.site_content to anon;
grant select on public.resources to anon;

select 'V19 admin permissions fixed.' as status;
