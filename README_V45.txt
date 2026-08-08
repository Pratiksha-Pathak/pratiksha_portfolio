V45 — Responsive + Final QA

1. LOGO FIX
V45 fixes the remaining public-header failure mode by merging cloud and local media instead of letting an incomplete cloud media object overwrite a valid local logo. The resolver supports siteLogo/logo aliases, embedded data URLs, Storage/public URLs and a built-in favicon fallback. Admin saves a local embedded resilience copy and version timestamp when a logo is saved.

After extracting V45, re-save the logo once in Admin → Photo & Media → Website Logo so the browser-local resilience copy is populated. No SQL patch is required.

2. RESPONSIVE QA
- Desktop, tablet and mobile header/navigation layouts reviewed.
- Cards/grids collapse at smaller widths.
- Contact enquiry modal remains usable on narrow screens.
- Buttons and form controls retain touch-friendly sizing.

3. ACCESSIBILITY
- Skip-to-content support.
- Keyboard focus visibility.
- Reduced-motion support.
- Image alt/fallback handling.

4. FINAL QA CHECKLIST
- Chrome / Edge / Firefox
- 1440px / 1024px / 768px / 390px viewport checks
- Navigation and section anchors
- Research, Teaching, Presentations and Resources filters
- Featured/published states
- Contact modal + required fields + success/error states
- CV and media links
- Logo replacement/removal
- Console errors
- Broken links
- SEO/favicons/social preview assets

SUPABASE
V45 does not require a SQL patch. Keep the successfully applied V44 security patch.
