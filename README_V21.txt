V21 — Academic CV + Professional Resume + Resources Link Fix

Changes:
- Separate Academic CV and Professional Resume uploads in Admin > Photo & Media.
- Academic CV remains the main Download CV document.
- Each uploaded document is automatically published as its own Resources card.
- Public Resources uses the cloud media URL as a fallback/source of truth, repairing older resource rows that were not linked.
- Existing Curriculum Vitae resource is migrated/removed when the Academic CV is replaced/removed.
- No new SQL required.

Test:
1. Open admin.html and sign in.
2. Photo & Media > upload Academic CV > Save Academic CV.
3. Upload Professional Resume > Save Professional Resume.
4. Open public index.html and hard refresh.
5. Resources should show Academic CV and Professional Resume as live links.
6. Top Download CV should open the Academic CV.
7. Resources > Professional Resume should open the corporate resume.
