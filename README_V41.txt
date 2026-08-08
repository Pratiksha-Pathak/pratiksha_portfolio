V41 — Contact + Communication

Built directly from V40.

Fixes:
- Snapshot cards now use stable 01–06 section numbering while retaining live item counts.
- Resources now have the same Featured + Publish controls as Research, Teaching, and Presentations.
- Featured content now includes Resources.
- Hero second CTA is now admin-controlled via Teaching button text; the hero no longer hard-codes a teaching CTA while the admin exposes a CV CTA.

Contact + Communication:
- Public contact form with name, email, enquiry category, subject, message.
- Honeypot and minimum interaction-time spam protection.
- Success/error/loading states.
- Supabase contact_inquiries storage.
- Admin Enquiries inbox with status tracking and delete.
- Optional Supabase Edge Function for email notifications through Resend.

Database:
Run SUPABASE_PATCH_V41.sql after SUPABASE_PATCH_V40.sql.

Email integration setup:
Deploy supabase/functions/contact-notification/index.ts and configure Supabase secrets:
RESEND_API_KEY
CONTACT_TO_EMAIL
CONTACT_FROM_EMAIL
The public form still records enquiries in Supabase if the email notification service is not configured.
