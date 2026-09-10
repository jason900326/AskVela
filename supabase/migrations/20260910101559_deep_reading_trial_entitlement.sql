create table if not exists public.deep_reading_trials (
  user_id uuid primary key references auth.users(id) on delete cascade,
  reading_id text not null check (char_length(reading_id) between 8 and 180),
  request_id text not null check (char_length(request_id) between 8 and 200),
  status text not null default 'claimed' check (status in ('claimed', 'completed')),
  claimed_at timestamptz not null default now(),
  completed_at timestamptz,
  updated_at timestamptz not null default now(),
  check ((status = 'claimed' and completed_at is null) or (status = 'completed' and completed_at is not null))
);

alter table public.deep_reading_trials enable row level security;

-- A signed-out visitor never needs access to trial entitlement state. Signed-in
-- users may see and claim only their own row, and may only advance it to completed.
-- There is intentionally no DELETE grant/policy: a client cannot reset its trial.
revoke all on public.deep_reading_trials from anon, authenticated;
grant select, insert, update on public.deep_reading_trials to authenticated;

drop policy if exists "deep_reading_trials_select_own" on public.deep_reading_trials;
create policy "deep_reading_trials_select_own"
  on public.deep_reading_trials for select
  to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "deep_reading_trials_insert_own" on public.deep_reading_trials;
create policy "deep_reading_trials_insert_own"
  on public.deep_reading_trials for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "deep_reading_trials_update_own" on public.deep_reading_trials;
create policy "deep_reading_trials_update_own"
  on public.deep_reading_trials for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
