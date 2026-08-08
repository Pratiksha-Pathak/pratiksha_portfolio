V43 — SEO + Discoverability

1. V43 is based directly on V42.
2. SEO settings are available in Admin → SEO & Discoverability.
3. Set the production Site URL before launch. This is used for canonical, Open Graph, schema and sitemap guidance.
4. Re-save the website logo once in Admin → Photo & Media if the logo was uploaded in an earlier version. V43 stores a compact embedded fallback in addition to Supabase Storage, which makes the header logo resilient to Storage URL/cache issues.
5. sitemap.xml is for the current single-page portfolio. Admin is intentionally excluded.
6. robots.txt points to /sitemap.xml. Before V46, update the placeholder domain if deploying under a custom domain.
7. Social preview image is assets/og-preview.png.
8. V44 will audit RLS/storage/authentication/file validation/session handling.
