# Supabase Drafts

These files are production-prep drafts for the IIUM Ta'aruf Week Mini App.

- `schema.sql` creates the core tables, indexes, and private attendance selfie bucket.
- `rls-policies.sql` drafts role and bureau policies based on server-issued JWT claims.

Review both files inside a real Supabase project before running them. The first backend implementation target should be `/api/auth/telegram`, because the RLS policies depend on trusted `app_user_id`, `app_role`, `bureau`, and `telegram_id` claims.
