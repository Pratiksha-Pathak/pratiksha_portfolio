V37 — Research Portfolio Pro

Base: V36 — Teaching Portfolio Pro

V36 fixes carried forward:
- Teaching philosophy supporting text is now editable from Admin → Teaching.
- Teaching categories are robustly generated from saved categories/types so the filter row does not collapse to only All when content is available.
- YouTube playback modal is resilient when the portfolio is opened locally; local file:// mode shows a clean fallback link instead of the oversized YouTube Error 153 player. On a hosted website the embedded player is used.
- Portfolio snapshot remains dynamic and count-driven from current published content.

Major V37 research upgrades:
- Research types: publications, working papers, research projects, reviews, conference papers, etc.
- Research metadata: authors, venue, year, status, category, keywords, DOI, full-text URL, project URL.
- Featured research flag with a featured research panel and featured card treatment.
- Public/hidden research visibility control.
- Dynamic research category filters.
- Research-type filtering.
- Research search across title, authors, venue, status, category, keywords, DOI and description.
- Scalable research library with the existing six-item progressive expansion pattern.
- Dynamic research counts in the portfolio snapshot.
- Supabase persistence continues through the existing site_content JSON structure; no new database table is required.

Preserved:
- Existing Supabase/database functionality.
- Teaching, Qualifications, Experience, Presentations, Resources, CV, Contact and Footer functionality.
- Existing presentation manager and presentation thumbnails.
- Existing logo implementation intentionally unchanged.
