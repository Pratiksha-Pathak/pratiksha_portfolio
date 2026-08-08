V26 — Presentations collection + logo reliability

Based directly on V25.
- Admin > Presentations manager supports unlimited presentation entries.
- Each entry supports title, type, description, tags, URL or PDF/PPT/PPTX upload, publish/unpublish, and remove.
- Resources > Presentations now scrolls to a dedicated same-page Presentations section.
- Each presentation appears as its own card, like Teaching Videos.
- No new SQL is required; presentation metadata uses site_content.presentationItems and files use existing portfolio-media Storage.
- Public logo rendering now treats a saved logo URL as enabled unless explicitly disabled, applies cache-busting, and retries after full page load.
