-- A claimed Deep Reading trial is a one-time entitlement record.
-- Authenticated clients may read or create their own claim, but may not mutate
-- or delete it afterward. The primary key on user_id is the atomic one-trial guard.
revoke update on public.deep_reading_trials from authenticated;

drop policy if exists "deep_reading_trials_update_own" on public.deep_reading_trials;
