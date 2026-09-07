# Phase 6 — Accounts, history, and memory boundaries

Vela keeps login optional. A visitor can complete a reading and all follow-ups anonymously; signing in only adds durable, cross-device history.

## Saved data

For each saved reading, Vela stores:

- the original question and spread
- the deterministic request and reading IDs needed to verify the draw
- the user's selected face-down positions
- fixed cards, positions, and orientations
- the structured Vela interpretation
- up to six follow-up questions and answers

The server rebuilds the deterministic draw before saving. Client-supplied cards or an interpretation whose card signature does not match the fixed draw are rejected.

## Memory boundary

History is not silent cross-reading memory. Starting a new reading does not send prior questions or readings to the model. A saved reading is loaded only when its owner explicitly opens it, and follow-ups continue only within that reading.

## Isolation and deletion

The API derives identity from the verified Supabase access token; it never accepts a user ID from the request body. All three history tables use Row Level Security and require `auth.uid() = user_id`. Child rows also use composite foreign keys so cards or messages cannot be attached to another user's reading.

Users can delete one reading or clear all history. Deleting the Supabase Auth user cascades to all saved readings. A saved reading expires 365 days after its latest save; expired rows are hidden and removed when history is next loaded.

## Deployment setup

1. Run `supabase/migrations/004_accounts_and_reading_history.sql` in the active Supabase project.
2. Add `NEXT_PUBLIC_SUPABASE_ANON_KEY` to local and Vercel environments. Keep `SUPABASE_SERVICE_ROLE_KEY` server-only.
3. In Supabase Auth URL Configuration, allow the production Vela URL and local development URL as redirect URLs.
4. Keep Email/Password enabled. Email confirmation may remain enabled; the UI handles both immediate sessions and confirmation-email signup.

The anonymous flow remains available if Auth is not configured, but account and history controls show anonymous mode until these settings are present.
