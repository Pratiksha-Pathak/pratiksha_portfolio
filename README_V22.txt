Pratiksha Pathak Portfolio v22
Resource cleanup fix.

Changes:
- Removes the legacy "Curriculum Vitae" resource when saving the Academic CV.
- Public site hides the legacy Curriculum Vitae card whenever an Academic CV is published.
- Academic CV and Professional Resume remain separate resources.
- No new SQL required.

Test:
1. Open admin.html and log in.
2. Go to Photo & Media.
3. Save Academic CV once (you can reselect the same PDF).
4. Open the public website and hard refresh (Ctrl+Shift+R).
5. Resources should show Academic CV, Professional Resume, Research Papers, Teaching Videos, Presentations — no duplicate Curriculum Vitae.
