create table if not exists public.dream_readings (
  id text primary key check (id ~ '^dream_[0-9a-f]{32}$'),
  user_id uuid not null references auth.users(id) on delete cascade,
  request_id text not null,
  dream_text text not null check (char_length(dream_text) between 8 and 4000),
  waking_life_context text not null default '' check (char_length(waking_life_context) <= 1200),
  extraction jsonb not null,
  reading_result jsonb not null,
  disclaimer text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '365 days')
);

create index if not exists dream_readings_user_updated_idx
  on public.dream_readings (user_id, updated_at desc);
create index if not exists dream_readings_expiry_idx
  on public.dream_readings (expires_at);

alter table public.dream_readings enable row level security;

drop policy if exists "dream_readings_select_own" on public.dream_readings;
create policy "dream_readings_select_own"
  on public.dream_readings for select
  using ((select auth.uid()) = user_id);

drop policy if exists "dream_readings_insert_own" on public.dream_readings;
create policy "dream_readings_insert_own"
  on public.dream_readings for insert
  with check ((select auth.uid()) = user_id);

drop policy if exists "dream_readings_update_own" on public.dream_readings;
create policy "dream_readings_update_own"
  on public.dream_readings for update
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "dream_readings_delete_own" on public.dream_readings;
create policy "dream_readings_delete_own"
  on public.dream_readings for delete
  using ((select auth.uid()) = user_id);
