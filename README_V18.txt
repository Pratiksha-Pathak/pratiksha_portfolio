PRATIKSHA PATHAK PORTFOLIO — V18 RESOURCES MANAGER

WHAT'S NEW
- Resources are now managed through the existing Supabase `resources` table.
- Admin > Resources can add, edit, remove, reorder (by dashboard order), publish/unpublish, and categorize resources.
- Each resource can have an external URL OR an uploaded file.
- Supported uploads include PDF, Word, PowerPoint, Excel, ZIP and common image formats, up to 25 MB.
- Uploaded resource files go to the existing `portfolio-media` Supabase Storage bucket.
- Public Resources cards load published resources from Supabase.
- Clicking a live resource opens the URL/file; internal #section links remain same-page links.
- Existing V17 Supabase Auth, database, logo, profile photo, CV and footer/social systems are preserved.

HOW TO USE
1. Open admin.html and log in.
2. Go to Resources.
3. Existing resources will be loaded from Supabase if already present; otherwise the V17 resource list is used as the starting list.
4. Click + Add resource.
5. Fill in:
   - Icon / symbol
   - Title
   - Category
   - Button label
   - Description
   - External URL OR upload a file
   - Publish checkbox
6. Click the existing Save Changes button.
7. Open index.html and refresh. Published resources should appear in the Resources grid.

IMPORTANT
- No new SQL patch is required for V18 because the original portfolio schema already created the `resources` table and its RLS policies.
- If you have not yet used the Resources section in V18, make one small resource change and Save Changes once; this syncs the resource list to the database.
- Uploaded files are not deleted from Storage when a resource is removed/replaced in this version, to avoid accidentally breaking existing URLs. We can add storage cleanup later.


V18 FIX: Resource save/delete now uses a Supabase-safe filtered DELETE, preventing the "DELETE requires a WHERE clause" error.


V19 NOTE
If online Save Changes reports "permission denied for table admin_users", run SUPABASE_FIX_V19.sql once.
