-- V44 — Security + Production Audit / Hardening
-- Run AFTER the existing V40/V41 patches and review before applying.
-- This patch does NOT reset or delete portfolio content.

-- 1. Public content: public read, admin-only writes.
alter table if exists public.site_content enable row level security;
drop policy if exists "Public can read site content" on public.site_content;
create policy "Public can read site content"
on public.site_content for select using (true);

drop policy if exists "Admins can manage site content" on public.site_content;
create policy "Admins can manage site content"
on public.site_content for all to authenticated
using (public.is_admin()) with check (public.is_admin());

grant select on public.site_content to anon, authenticated;
grant insert, update, delete on public.site_content to authenticated;

-- 2. Media library: public can read published records only.
alter table if exists public.media_library enable row level security;
drop policy if exists "Public can read published media" on public.media_library;
create policy "Public can read published media"
on public.media_library for select using (published = true);

drop policy if exists "Admins can manage media library" on public.media_library;
create policy "Admins can manage media library"
on public.media_library for all to authenticated
using (public.is_admin()) with check (public.is_admin());

grant select on public.media_library to anon, authenticated;
grant insert, update, delete on public.media_library to authenticated;

-- 3. Contact enquiries: public insert only; admin inbox access only.
alter table if exists public.contact_inquiries enable row level security;
drop policy if exists "Public can submit contact enquiries" on public.contact_inquiries;
create policy "Public can submit contact enquiries"
on public.contact_inquiries for insert to anon, authenticated
with check (
  char_length(trim(name)) between 1 and 120
  and char_length(trim(email)) between 3 and 254
  and char_length(trim(category)) between 1 and 80
  and char_length(trim(subject)) <= 180
  and char_length(trim(message)) between 10 and 5000
);

drop policy if exists "Admins can read contact enquiries" on public.contact_inquiries;
create policy "Admins can read contact enquiries"
on public.contact_inquiries for select to authenticated
using (public.is_admin());

drop policy if exists "Admins can update contact enquiries" on public.contact_inquiries;
create policy "Admins can update contact enquiries"
on public.contact_inquiries for update to authenticated
using (public.is_admin()) with check (public.is_admin());

drop policy if exists "Admins can delete contact enquiries" on public.contact_inquiries;
create policy "Admins can delete contact enquiries"
on public.contact_inquiries for delete to authenticated
using (public.is_admin());

-- 4. Storage: portfolio-media must remain PUBLIC for public asset URLs.
-- Public bucket visibility does NOT grant anonymous upload/update/delete.
-- These policies restrict write operations to authenticated admins.
drop policy if exists "Admins can upload portfolio media" on storage.objects;
create policy "Admins can upload portfolio media"
on storage.objects for insert to authenticated
with check (bucket_id = 'portfolio-media' and public.is_admin());

drop policy if exists "Admins can update portfolio media" on storage.objects;
create policy "Admins can update portfolio media"
on storage.objects for update to authenticated
using (bucket_id = 'portfolio-media' and public.is_admin())
with check (bucket_id = 'portfolio-media' and public.is_admin());

drop policy if exists "Admins can delete portfolio media" on storage.objects;
create policy "Admins can delete portfolio media"
on storage.objects for delete to authenticated
using (bucket_id = 'portfolio-media' and public.is_admin());

-- 5. Ensure the admin RPC is executable by signed-in admins.
grant execute on function public.is_admin() to authenticated;

select 'V44 security hardening applied.' as status;
