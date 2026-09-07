# AskVela Auth Setup

Phase 6 uses Supabase Auth. Email/password and Google OAuth are supported by the web client.

## Required Supabase settings

### Email/password

- Email provider enabled.
- During development, Confirm email may stay disabled for faster testing.
- Before public launch, explicitly decide whether to enable email confirmation again.

### Google OAuth

1. Enable the Google provider in Supabase Auth Providers.
2. Configure the Google OAuth client ID and client secret in Supabase.
3. In Google Cloud Console, add the Supabase callback URL shown by Supabase to the OAuth client's Authorized redirect URIs.
4. In Supabase Auth URL Configuration, set the production Site URL to the deployed AskVela origin.
5. Add development and preview origins that should be allowed to return from auth, for example local development and the current Vercel production/preview URLs.

The app calls `signInWithOAuth({ provider: "google" })` and returns to `window.location.origin`. `lib/supabase-browser.js` keeps `detectSessionInUrl: true`, so the browser client restores the OAuth or password-recovery session after returning to AskVela.

## Password recovery

The sign-in modal sends a reset email with `resetPasswordForEmail()`. After the user follows the recovery link, Supabase emits `PASSWORD_RECOVERY`; AskVela opens the recovery state and updates the password with `updateUser()`.

The redirect origin used by the reset flow must therefore also exist in the Supabase redirect allow list.

## Phase 6 manual acceptance tests

Run these against the deployed environment before marking Phase 6 complete:

1. Create a new Email/password account with Confirm email currently disabled; verify the session is created immediately.
2. Sign out; reload the page; verify the user remains signed out and private history is no longer visible.
3. Sign back in; verify the same private history returns.
4. Start an anonymous reading, then sign in; verify that reading is saved without redrawing cards.
5. Use **Forgot password**, follow the email link, set a new password, sign out, and sign in with the new password.
6. Sign in with Google using an email that has never been used in AskVela; verify the account and session are created and history saves normally.
7. Sign out, then sign in again with the same Google account; verify the same history is visible.
8. Test an email address that already has an Email/password account, then use Google with the same verified email. Confirm Supabase resolves the identity as expected and does not create an unexpected second user/history silo. If it does, do not ship until an explicit identity-linking policy is chosen.
9. Cancel the Google consent screen once; verify AskVela remains usable anonymously and does not get stuck in a loading state.
10. Test both desktop and mobile widths.

## Production notes

- Never place the Google client secret in Next.js public environment variables; it belongs in Supabase's provider configuration.
- Keep `NEXT_PUBLIC_SUPABASE_URL` and the public/publishable key in Vercel as already required by the existing Auth client.
- RLS remains the source of truth for reading ownership. OAuth does not bypass database policies.
