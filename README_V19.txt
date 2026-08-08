PRATIKSHA PATHAK PORTFOLIO — V19 DATABASE/ADMIN FIX

WHAT'S FIXED
- Fixes the V15/V18 Supabase admin permission conflict.
- Restores authenticated table privileges that were revoked by the older V15 patch.
- Rebuilds is_admin() using the actual admin_users UUID column (user_id or legacy id).
- Keeps admin authorization server-side through the SECURITY DEFINER RPC.
- Keeps the V18 Resources, CV, logo, profile photo and footer/social systems.

IMPORTANT — ONE SUPABASE STEP
Before testing V19, open Supabase > SQL Editor and run the complete file:
SUPABASE_FIX_V19.sql

Then refresh admin.html with Ctrl+Shift+R.

TEST ORDER
1. Log in to admin.html with the Supabase Auth admin account.
2. Change a small piece of text and click Save changes.
3. Confirm: "Changes saved to the online database."
4. Upload the CV PDF and save it.
5. Go to Resources, make a small change, and save.
6. Refresh index.html and confirm the change appears publicly.

If an error remains after running SUPABASE_FIX_V19.sql, send the exact error screenshot before running any additional SQL.
