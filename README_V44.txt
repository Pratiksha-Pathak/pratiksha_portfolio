V44 — Security + Production + Definitive Logo Fix

LOGO ROOT CAUSE
The V43 implementation treated a missing/blank `enabled` value as false:
`isEnabledFlag(logo.enabled,false)`. Therefore a logo could be successfully
saved yet remain hidden unless the "Show logo" checkbox had explicitly been
checked.

V44 changes this to explicit opt-out behavior:
- A saved logo is shown by default.
- Uploading a new logo automatically enables it.
- Uncheck "Show logo" only when you intentionally want it hidden.
- `Show logo only` controls whether the text name is hidden.

LOGO RESILIENCE
The public header tries, in order:
1. Embedded saved image data URL.
2. Supabase Storage/public URL.
3. Built-in favicon fallback.

PNG is fully supported. File size is a performance consideration, not a
reason for a valid PNG to be hidden. V44 accepts PNG/JPEG/WebP/SVG logos up to
2 MB.

ADMIN STEPS
1. Admin → Photo & Media → Website Logo.
2. Select your logo.
3. Confirm "Show logo in the top-left header" is checked automatically.
4. Save Logo.
5. Refresh the public website with Ctrl+F5 if an old cached page is open.
6. "Show logo only" can be enabled if you want only the logo and no name.

SECURITY / PRODUCTION
`SUPABASE_PATCH_V44.sql` contains the V44 RLS/storage hardening.
Review it in Supabase SQL Editor before applying. It does not reset content.

V44 does not change the public design or remove V43 SEO, CMS, contact,
research, teaching, presentation, qualification, experience or resource
functionality.
