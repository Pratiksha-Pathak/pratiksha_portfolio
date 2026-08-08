V20 — CV Resource Link Fix

What changed:
- Saving the CV from Admin > Photo & Media now also creates/updates the public Resources > Curriculum Vitae card.
- The resource card points directly to the uploaded Supabase Storage PDF.
- Removing the CV also removes the matching Curriculum Vitae resource record.
- Existing text editing, logo/profile uploads, footer/social settings, and Supabase database setup are preserved.

No new SQL is required for this V20 change. Use the same Supabase project and the V19 database setup.

Test:
1. Open admin.html and log in.
2. Photo & Media > upload/save CV.
3. Open the public index.html and refresh.
4. Go to Resources and click Curriculum Vitae.
5. It should open the same PDF as the top Download CV button.
