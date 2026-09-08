create table if not exists public.dream_readings (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  request_id text not null,
  dream_text text not null,
  context_text text not null default '',
  extracted_json jsonb not null default '{}'::jsonb,
  reading_result jsonb not null,
  disclaimer text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '365 days'),
  constraint dream_readings_owner_id_unique unique (user_id, id),
  constraint dream_readings_dream_length check (char_length(dream_text) between 10 and 3000),
  constraint dream_readings_context_length check (char_length(context_text) <= 800)
);

create index if not exists dream_readings_user_updated_idx
  on public.dream_readings (user_id, updated_at desc);
create index if not exists dream_readings_expires_idx
  on public.dream_readings (expires_at);

alter table public.dream_readings enable row level security;

create policy "dream_readings_select_own"
  on public.dream_readings for select
  using (auth.uid() = user_id);
create policy "dream_readings_insert_own"
  on public.dream_readings for insert
  with check (auth.uid() = user_id);
create policy "dream_readings_update_own"
  on public.dream_readings for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
create policy "dream_readings_delete_own"
  on public.dream_readings for delete
  using (auth.uid() = user_id);

grant select, insert, update, delete on public.dream_readings to authenticated;
