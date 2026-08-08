V33 — Contact/Footer + Logo Persistence Fix

Based on the supplied V32 FRESH source.

Fixes:
- Public Contact email/mobile now displays the saved Supabase values, not placeholders.
- Public Contact links are rebuilt from saved values after cloud content loads.
- Footer social links use saved footer social settings, with root Contact values as fallback.
- Logo loading accepts Storage path/public URL/file URL and tolerant boolean values.
- Logo cache busting remains enabled so replacements appear immediately.
- Existing Research, Teaching, Qualifications, Experience, Presentations, Resources, CV/Resume and Supabase functionality is preserved.
- No changes to the database schema are required.
