create table if not exists public.readings (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  question text not null check (char_length(question) between 1 and 500),
  spread_id text not null,
  spread_name_zh_tw text not null,
  request_id text not null check (char_length(request_id) between 8 and 200),
  selected_card_indexes smallint[] not null,
  reading_result jsonb not null,
  message_count smallint not null default 0 check (message_count between 0 and 6),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '365 days'),
  unique (id, user_id)
);

create table if not exists public.reading_cards (
  reading_id uuid not null,
  user_id uuid not null,
  position_index smallint not null check (position_index between 0 and 2),
  card_id text not null,
  name_en text not null,
  name_zh_tw text not null,
  arcana text not null,
  number_or_rank text not null,
  suit text,
  position text not null,
  position_label_zh_tw text not null,
  orientation text not null check (orientation in ('upright', 'reversed')),
  created_at timestamptz not null default now(),
  primary key (reading_id, position_index),
  foreign key (reading_id, user_id)
    references public.readings(id, user_id)
    on delete cascade
);

create table if not exists public.reading_messages (
  reading_id uuid not null,
  user_id uuid not null,
  ordinal smallint not null check (ordinal between 1 and 6),
  question text not null check (char_length(question) between 1 and 320),
  answer text not null check (char_length(answer) between 1 and 1200),
  practical_focus text not null default '' check (char_length(practical_focus) <= 500),
  safety jsonb,
  created_at timestamptz not null default now(),
  primary key (reading_id, ordinal),
  foreign key (reading_id, user_id)
    references public.readings(id, user_id)
    on delete cascade
);

create index if not exists readings_user_updated_idx
  on public.readings (user_id, updated_at desc);

create index if not exists readings_expiry_idx
  on public.readings (expires_at);

alter table public.readings enable row level security;
alter table public.reading_cards enable row level security;
alter table public.reading_messages enable row level security;

drop policy if exists "Users can select their readings" on public.readings;
create policy "Users can select their readings"
  on public.readings for select
  to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "Users can insert their readings" on public.readings;
create policy "Users can insert their readings"
  on public.readings for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users can update their readings" on public.readings;
create policy "Users can update their readings"
  on public.readings for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users can delete their readings" on public.readings;
create policy "Users can delete their readings"
  on public.readings for delete
  to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "Users can select their reading cards" on public.reading_cards;
create policy "Users can select their reading cards"
  on public.reading_cards for select
  to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "Users can insert their reading cards" on public.reading_cards;
create policy "Users can insert their reading cards"
  on public.reading_cards for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users can delete their reading cards" on public.reading_cards;
create policy "Users can delete their reading cards"
  on public.reading_cards for delete
  to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "Users can select their reading messages" on public.reading_messages;
create policy "Users can select their reading messages"
  on public.reading_messages for select
  to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "Users can insert their reading messages" on public.reading_messages;
create policy "Users can insert their reading messages"
  on public.reading_messages for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users can delete their reading messages" on public.reading_messages;
create policy "Users can delete their reading messages"
  on public.reading_messages for delete
  to authenticated
  using ((select auth.uid()) = user_id);

revoke all on public.readings from anon;
revoke all on public.reading_cards from anon;
revoke all on public.reading_messages from anon;
grant select, insert, update, delete on public.readings to authenticated;
grant select, insert, delete on public.reading_cards to authenticated;
grant select, insert, delete on public.reading_messages to authenticated;

create or replace function public.save_reading_history(
  p_reading jsonb,
  p_cards jsonb,
  p_messages jsonb
)
returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_reading_id uuid;
  v_row_count integer;
begin
  if v_user_id is null then
    raise exception 'Authentication required';
  end if;

  v_reading_id := (p_reading ->> 'id')::uuid;

  insert into public.readings (
    id,
    user_id,
    question,
    spread_id,
    spread_name_zh_tw,
    request_id,
    selected_card_indexes,
    reading_result,
    message_count,
    expires_at
  ) values (
    v_reading_id,
    v_user_id,
    p_reading ->> 'question',
    p_reading ->> 'spread_id',
    p_reading ->> 'spread_name_zh_tw',
    p_reading ->> 'request_id',
    array(select jsonb_array_elements_text(p_reading -> 'selected_card_indexes')::smallint),
    p_reading -> 'reading_result',
    jsonb_array_length(p_messages)::smallint,
    now() + interval '365 days'
  )
  on conflict (id) do update set
    question = excluded.question,
    spread_id = excluded.spread_id,
    spread_name_zh_tw = excluded.spread_name_zh_tw,
    request_id = excluded.request_id,
    selected_card_indexes = excluded.selected_card_indexes,
    reading_result = excluded.reading_result,
    message_count = excluded.message_count,
    updated_at = now(),
    expires_at = now() + interval '365 days'
  where readings.user_id = v_user_id;

  get diagnostics v_row_count = row_count;
  if v_row_count <> 1 then
    raise exception 'Reading ownership mismatch';
  end if;

  delete from public.reading_cards where reading_id = v_reading_id;
  insert into public.reading_cards (
    reading_id,
    user_id,
    position_index,
    card_id,
    name_en,
    name_zh_tw,
    arcana,
    number_or_rank,
    suit,
    position,
    position_label_zh_tw,
    orientation
  )
  select
    v_reading_id,
    v_user_id,
    card.position_index,
    card.card_id,
    card.name_en,
    card.name_zh_tw,
    card.arcana,
    card.number_or_rank,
    card.suit,
    card.position,
    card.position_label_zh_tw,
    card.orientation
  from jsonb_to_recordset(p_cards) as card(
    position_index smallint,
    card_id text,
    name_en text,
    name_zh_tw text,
    arcana text,
    number_or_rank text,
    suit text,
    position text,
    position_label_zh_tw text,
    orientation text
  );

  delete from public.reading_messages where reading_id = v_reading_id;
  insert into public.reading_messages (
    reading_id,
    user_id,
    ordinal,
    question,
    answer,
    practical_focus,
    safety
  )
  select
    v_reading_id,
    v_user_id,
    message.ordinal,
    message.question,
    message.answer,
    message.practical_focus,
    message.safety
  from jsonb_to_recordset(p_messages) as message(
    ordinal smallint,
    question text,
    answer text,
    practical_focus text,
    safety jsonb
  );

  return v_reading_id;
end;
$$;

revoke all on function public.save_reading_history(jsonb, jsonb, jsonb) from public;
revoke all on function public.save_reading_history(jsonb, jsonb, jsonb) from anon;
grant execute on function public.save_reading_history(jsonb, jsonb, jsonb) to authenticated;

comment on table public.readings is
  'User-owned Vela readings. Each record expires 365 days after its latest save.';
comment on function public.save_reading_history(jsonb, jsonb, jsonb) is
  'Atomically saves one authenticated user reading, its fixed cards, and follow-up messages.';
