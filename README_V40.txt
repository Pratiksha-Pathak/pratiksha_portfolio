V40 — CMS / Media Library Pro

Built directly from V39. Keeps all V39 functionality and upgrades the Media Library into a practical central asset manager: searchable/filterable media cards, file-type and status badges, thumbnails, file metadata, featured/published controls, ordering, replace/delete, copy URL, usage detection, safer deletion, and clearer upload/save states.

Run SUPABASE_PATCH_V40.sql once in Supabase SQL Editor after the V39 patch. The V40 migration is backward-compatible with the existing media_library table.

Media Library remains admin-only for management; only published media are readable publicly through the existing RLS policy.
