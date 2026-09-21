ECOWORLD PILE EFFICIENCY PORTAL — PRODUCTION BUILD
===================================================

Frontend
- Static HTML/CSS/JavaScript, suitable for Vercel zero-config deployment.
- Supabase JS is loaded from jsDelivr.
- Browser localStorage is now only a UI cache. Shared data lives in Supabase.

Supabase project already connected
- Project: maxwilltan's Project
- Project ref: yqxwiitsdxmypemwgows
- Database tables: ecoworld_profiles, ecoworld_project_access, ecoworld_config,
  ecoworld_submissions, ecoworld_audit_log, ecoworld_bootstrap
- Storage bucket: ecoworld-drawings (private)
- Edge Functions: ecoworld-bootstrap, ecoworld-manage-consultants
- RLS policies protect Management vs Consultant access.

First production login
1. Open the deployed website.
2. Click "First-time Management setup".
3. Enter your Management email, a password of at least 8 characters, and the one-time setup token supplied separately.
4. After the account is created, log in normally.
5. In Management > Add/Edit, create consultant accounts, set each initial password, and assign projects.

Important
- Never put a Supabase secret/service-role key in this frontend. The browser only uses the publishable key.
- Consultant passwords are sent only to the protected management Edge Function. Existing passwords are not stored or displayed in the browser.
- Drawings are uploaded to the private ecoworld-drawings bucket rather than IndexedDB.
- The supabase/ directory in this package is maintenance/reference source and is excluded from Vercel by .vercelignore.

Recommended Supabase dashboard setting before wider rollout
- Enable Auth > Password Security > Leaked password protection.
