V46 — Theme System + Deployment Preparation

NEW
- Three selectable public website themes persisted through the existing site_content record.
- Theme 01 Current Academic preserves the existing dark visual direction.
- Theme 02 Coral & Navy uses #1D3557, #FF6B6B and #FFC857 with #FFF7F2 / #FFE8D6 neutrals.
- Theme 03 Emerald & Gold uses #0D6B5E, #1ABC9C and #F4B942 with #F8FCFA / #E8F5F1 neutrals.
- Admin → General → Website theme provides the selector.
- No new SQL patch is required: siteTheme is stored inside existing site_content JSON.
- Existing content, media, contact, research, teaching, presentations and SEO systems are preserved.

V46 deployment preparation
- Keep the existing V44/V45 Supabase security configuration.
- Before final launch, replace placeholder canonical/domain values in robots.txt and sitemap.xml with the actual production domain.
- Configure Search Console and analytics only after the final domain is selected.

LOGO
- Per project direction, the unresolved logo issue is intentionally not changed in V46.
