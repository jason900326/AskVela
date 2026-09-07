create table if not exists public.astrology_readings (
  id text primary key check (id ~ '^astro_[0-9a-f]{32}$'),
  user_id uuid not null references auth.users(id) on delete cascade,
  request_id text not null,
  sign_id text not null check (sign_id in ('aries','taurus','gemini','cancer','leo','virgo','libra','scorpio','sagittarius','capricorn','aquarius','pisces')),
  sign_name_zh_tw text not null,
  sign_profile jsonb not null,
  period text not null check (period in ('daily','weekly')),
  local_date date not null,
  timezone text not null,
  sky_context jsonb not null,
  reading_result jsonb not null,
  disclaimer text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '365 days')
);

create index if not exists astrology_readings_user_updated_idx
  on public.astrology_readings (user_id, updated_at desc);
create index if not exists astrology_readings_expiry_idx
  on public.astrology_readings (expires_at);

alter table public.astrology_readings enable row level security;

drop policy if exists "astrology_readings_select_own" on public.astrology_readings;
create policy "astrology_readings_select_own"
  on public.astrology_readings for select
  using ((select auth.uid()) = user_id);

drop policy if exists "astrology_readings_insert_own" on public.astrology_readings;
create policy "astrology_readings_insert_own"
  on public.astrology_readings for insert
  with check ((select auth.uid()) = user_id);

drop policy if exists "astrology_readings_update_own" on public.astrology_readings;
create policy "astrology_readings_update_own"
  on public.astrology_readings for update
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "astrology_readings_delete_own" on public.astrology_readings;
create policy "astrology_readings_delete_own"
  on public.astrology_readings for delete
  using ((select auth.uid()) = user_id);
