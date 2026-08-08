-- V15 PATCH
-- Run this AFTER the database tables from the previous step were created.
-- This patch makes the existing admin_users table work securely with the
-- website's Supabase authentication and site_content table.

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists(
    select 1
    from public.admin_users
    where id = auth.uid()
  );
$$;

grant execute on function public.is_admin() to authenticated;

-- Replace site_content write policies with policies that use the
-- SECURITY DEFINER admin check instead of directly reading admin_users.

drop policy if exists "Admins can manage site content" on public.site_content;
drop policy if exists "Public can read site content" on public.site_content;

create policy "Public can read site content"
on public.site_content
for select
using (true);

create policy "Admins can manage site content"
on public.site_content
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

-- Ensure authenticated admins can read/write site content.
grant select on public.site_content to anon, authenticated;
grant insert, update, delete on public.site_content to authenticated;

-- Make the admin table itself readable only through the secure RPC.
-- No direct public/authenticated SELECT policy is needed.
revoke all on public.admin_users from anon;
revoke all on public.admin_users from authenticated;

select 'V15 Supabase patch applied successfully.' as status;
