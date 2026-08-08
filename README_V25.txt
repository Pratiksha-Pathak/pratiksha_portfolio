Pratiksha Pathak Portfolio — V25

V25 is based directly on the tested V24.

This release combines:
1. Presentation resource workflow.
2. Additional public-logo rendering reliability.

Presentations:
- Add presentation title, description/category and a URL or uploaded file from the existing Resources admin area.
- Presentation resources are displayed as public Resources cards when published.
- The existing CV, Resume, Research Papers and Teaching Videos workflows are preserved.

Logo:
- Public rendering now applies the cloud media settings after Supabase content loads.
- Replaced logos get a cache-busting version token so the browser does not keep an old image.
- Existing logo visibility/name controls are preserved.

No new SQL is required for this V25 build if the V24 database is already working.
