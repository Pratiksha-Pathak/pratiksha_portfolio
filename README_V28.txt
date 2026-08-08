V28 — Portfolio UI polish + Supabase logo cache fix

Changes:
1. Logo persistence fix: each saved logo receives a unique version token. The public site uses that token when loading the Supabase Storage URL so replaced logos cannot remain stuck behind browser/CDN cache.
2. Logo visibility settings continue to come from Supabase: enabled controls whether the logo is shown; hideName controls whether PRATIKSHA PATHAK is shown beside it.
3. Research paper cards now use the same polished visual language as Presentations, with a cover area, cleaner spacing, subtle hover lift, border highlight and shadow.
4. Teaching cards now use the same clean hover treatment, with a subtle thumbnail/play interaction.
5. Resource cards receive the same hover treatment for a more consistent public-site UI.
6. Existing Presentations, CVs, Resources, Teaching, Experience and Supabase content/database behavior are preserved.

No new SQL migration is required.
