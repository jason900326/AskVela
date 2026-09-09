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

-- A continuation belongs to one saved reading. Because the three source tables use
-- different id types, cleanup is handled by delete triggers rather than a polymorphic FK.
create or replace function public.delete_reading_continuation_on_source_delete()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_kind text;
begin
  v_kind := case TG_TABLE_NAME
    when 'readings' then 'tarot'
    when 'astrology_readings' then 'astrology'
    when 'dream_readings' then 'dream'
    else null
  end;

  if v_kind is not null then
    delete from public.reading_continuations
      where user_id = OLD.user_id
        and kind = v_kind
        and reading_id = OLD.id::text;
  end if;
  return OLD;
end;
$$;

drop trigger if exists cleanup_tarot_continuation on public.readings;
create trigger cleanup_tarot_continuation
  after delete on public.readings
  for each row execute function public.delete_reading_continuation_on_source_delete();

drop trigger if exists cleanup_astrology_continuation on public.astrology_readings;
create trigger cleanup_astrology_continuation
  after delete on public.astrology_readings
  for each row execute function public.delete_reading_continuation_on_source_delete();

drop trigger if exists cleanup_dream_continuation on public.dream_readings;
create trigger cleanup_dream_continuation
  after delete on public.dream_readings
  for each row execute function public.delete_reading_continuation_on_source_delete();
