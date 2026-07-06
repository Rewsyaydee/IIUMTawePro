# Supabase Drafts

These files are production-prep drafts for the IIUM Ta'aruf Week Mini App.

- `schema.sql` creates the core tables, indexes, and private attendance selfie bucket.
- `rls-policies.sql` drafts role and bureau policies based on server-issued JWT claims.
- `verify-rls.sql` checks that RLS is enabled, the expected policies exist, helper functions were created, and the private attendance selfie bucket is present.

Review both files inside a real Supabase project before running them. The first backend implementation target should be `/api/auth/telegram`, because the RLS policies depend on trusted `app_user_id`, `app_role`, `bureau`, and `telegram_id` claims.

After running `schema.sql` and `rls-policies.sql` in the Supabase SQL Editor, paste `verify-rls.sql` into the SQL Editor. RLS policies do not create new tables, so they will not appear as extra tables in the Table Editor.
