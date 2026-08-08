V32 — Cloud content rendering fix + scalable public libraries

Base: V29 Teaching Library.

Major changes:
1. Fixed public cloud-content normalization. Saved Supabase content is now handled whether stored as arrays, JSON strings, wrapped objects, or legacy key names.
2. Public Qualifications, Experience, Teaching, Research, Presentations, and Resources now reliably render from the normalized cloud data.
3. Added scalable public libraries: Teaching, Research, Presentations, and Resources show the first 6 items initially.
4. When more than 6 items exist, a clean “Show all N” control expands the library without horizontal scrolling or overcrowding.
5. “Show fewer” collapses the library again.
6. Existing Teaching filters/search and Research filters/search continue to work with the scalable view.
7. Preserved V29/V28 presentation thumbnails, presentation cards, teaching playback links, research cards, resources, CV/Resume handling, Supabase database/storage, and existing content-management UI.
8. Logo implementation was intentionally NOT changed in V32, per project direction.

No new Supabase SQL migration is required for these changes.
