# Phase 8 Production Acceptance

This checklist closes the remaining production work for Astrology and Dream history without relying on ad-hoc manual testing.

## 1. Apply the history migrations

In the active production Supabase project, open **SQL Editor** and run these files in order:

1. `supabase/migrations/005_astrology_history.sql`
2. `supabase/migrations/006_dream_history.sql`

`006_dream_history.sql` intentionally accepts Dream text from **2 to 4000 characters**, matching the runtime Dream API. A remembered image such as `火車` must be saveable after sign-in.

Do not mark either migration complete only because the SQL editor reports success. Run the verification query next.

## 2. Verify schema, RLS, policies, and retention

Run:

`supabase/verification/phase8_history_check.sql`

Expected result: exactly two rows (`astrology_readings`, `dream_readings`) and all of these values are true/correct:

- `rls_enabled = true`
- `policy_count = 4`
- `retention_is_365_days = true`
- `dream_length_matches_api = true`

If either table is missing, do not continue to production acceptance.

## 3. Prepare one dedicated smoke-test account

Use a normal production Email/password account that contains no personal readings. It exists only for automated acceptance and can be deleted later.

Keep its credentials only in your local `.env.local`; never commit them.

Required local variables:

```env
VELA_BASE_URL=https://YOUR-PRODUCTION-DOMAIN
SMOKE_TEST_EMAIL=YOUR-SMOKE-ACCOUNT-EMAIL
SMOKE_TEST_PASSWORD=YOUR-SMOKE-ACCOUNT-PASSWORD
```

The existing production Supabase variables are also required:

```env
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=...
```

`NEXT_PUBLIC_SUPABASE_ANON_KEY` remains supported as the legacy public-key fallback.

## 4. Run the automated production smoke

```bash
npm run smoke:production
```

The smoke test performs all of the following against `VELA_BASE_URL`:

1. Generates a source-grounded Virgo **daily** Astrology reading.
2. Generates a source-grounded Virgo **weekly** Astrology reading.
3. Generates a Dream reading from the intentionally short input `火車`.
4. Requires Dream production to use `freud-full-book-rag` and return retrieved Freud passages.
5. Signs in the dedicated smoke user.
6. Saves the daily Astrology reading to private history.
7. Reads the Astrology detail back and confirms the same reading ID.
8. Saves the short Dream reading to private history.
9. Reads the Dream detail back and confirms the same reading ID and Dream text.
10. Confirms both readings appear in their history collections.
11. Deletes only the two smoke readings it created.
12. Signs the smoke user out.

A full acceptance run ends with:

`PASS: Phase 8 production acceptance smoke completed successfully.`

### API-only diagnostic mode

If you only want to diagnose the reading APIs before history credentials are ready:

```env
SMOKE_ALLOW_API_ONLY=1
```

This is a **partial** check and does not satisfy the Phase 7/8 history exit condition.

### Dream RAG diagnostic override

The default smoke requires Freud full-book RAG because that is the intended production state. For troubleshooting only, you can temporarily allow the curated fallback:

```env
SMOKE_REQUIRE_FULL_DREAM_RAG=0
```

Do not use that override to close Phase 8.

## 5. Final deployed UI acceptance

After the automated smoke passes, check both desktop and mobile in the deployed app:

- Astrology: Daily result renders, sources are visible, and the result can be reopened from **我的紀錄**.
- Astrology: Weekly result renders without layout overflow.
- Dream: `火車` alone can start a reading and, after sign-in, can be saved and reopened.
- Dream: Source details indicate full Freud retrieval rather than silently presenting fallback as full RAG.
- Cross-mode history: Tarot, Astrology, and Dream entries coexist and opening one switches to the correct experience.
- Sign out, reload, sign back in: private Astrology and Dream history still appears for the same account only.

Only after the automated smoke and these deployed desktop/mobile checks pass should the remaining Phase 7/8 roadmap boxes be marked complete.
