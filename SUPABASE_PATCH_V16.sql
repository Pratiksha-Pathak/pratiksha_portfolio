-- V16 — Supabase Storage verification / policy patch
-- The V15 setup already created the portfolio-media bucket.
-- Run this query once before testing cloud uploads.

insert into storage.buckets (id,name,public)
values ('portfolio-media','portfolio-media',true)
on conflict (id) do update set public=true;

-- Public website must be able to display portfolio media.
drop policy if exists "Public can view portfolio media" on storage.objects;
create policy "Public can view portfolio media"
on storage.objects
for select
using (bucket_id='portfolio-media');

-- Only an authenticated admin can upload/change/delete portfolio media.
drop policy if exists "Admins can upload portfolio media" on storage.objects;
create policy "Admins can upload portfolio media"
on storage.objects
for insert to authenticated
with check (bucket_id='portfolio-media' and public.is_admin());

drop policy if exists "Admins can update portfolio media" on storage.objects;
create policy "Admins can update portfolio media"
on storage.objects
for update to authenticated
using (bucket_id='portfolio-media' and public.is_admin())
with check (bucket_id='portfolio-media' and public.is_admin());

drop policy if exists "Admins can delete portfolio media" on storage.objects;
create policy "Admins can delete portfolio media"
on storage.objects
for delete to authenticated
using (bucket_id='portfolio-media' and public.is_admin());

select 'V16 Storage is ready.' as status;
