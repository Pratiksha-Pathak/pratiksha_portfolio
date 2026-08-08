V27 — Logo Reliability + Presentation Thumbnails

Changes from V26:
- Public logo rendering now loads independently of the resources table.
- Public logo prefers the current Supabase Storage path and refreshes its URL so replacements appear reliably.
- Show logo / hide name settings are applied from the Supabase media record on every public load.
- Presentation items support optional uploaded thumbnails in addition to PDF/PPT/PPTX files or URLs.
- Multiple presentations remain supported; each item is stored in the existing presentationItems collection.
- Existing CV, Resources, Teaching, Experience, text and database functionality is preserved.

Testing checklist:
1. Upload a new logo, enable Show logo, save; refresh index.html.
2. Enable Show logo only; refresh index.html and confirm the name disappears.
3. Disable Show logo; refresh and confirm the name returns.
4. Add two presentations with different thumbnails and confirm both cards appear.
5. Open each presentation and verify the uploaded file/URL.
