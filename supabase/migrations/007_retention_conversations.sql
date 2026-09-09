create table if not exists public.reading_continuations (
  user_id uuid not null references auth.users(id) on delete cascade,
  kind text not null check (kind in ('tarot', 'astrology', 'dream')),
  reading_id text not null check (char_length(reading_id) between 8 and 180),
  turns jsonb not null default '[]'::jsonb check (jsonb_typeof(turns) = 'array'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, kind, reading_id)
);

create index if not exists reading_continuations_user_updated_idx
  on public.reading_continuations (user_id, updated_at desc);

alter table public.reading_continuations enable row level security;

drop policy if exists "reading_continuations_select_own" on public.reading_continuations;
create policy "reading_continuations_select_own"
  on public.reading_continuations for select
  to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "reading_continuations_insert_own" on public.reading_continuations;
create policy "reading_continuations_insert_own"
  on public.reading_continuations for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "reading_continuations_update_own" on public.reading_continuations;
create policy "reading_continuations_update_own"
  on public.reading_continuations for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "reading_continuations_delete_own" on public.reading_continuations;
create policy "reading_continuations_delete_own"
  on public.reading_continuations for delete
  to authenticated
  using ((select auth.uid()) = user_id);

revoke all on public.reading_continuations from anon;
grant select, insert, update, delete on public.reading_continuations to authenticated;
