create table if not exists public.tarot_cards (
  card_id text primary key,
  name_en text not null,
  name_zh_tw text not null,
  arcana text not null check (arcana in ('major', 'minor')),
  number_or_rank text not null,
  suit text check (suit is null or suit in ('wands', 'cups', 'swords', 'pentacles')),
  court_card boolean not null default false,
  aliases jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (
    (arcana = 'major' and suit is null and court_card = false)
    or (arcana = 'minor' and suit is not null)
  )
);

alter table public.knowledge_chunks
  add column if not exists card_id text references public.tarot_cards(card_id),
  add column if not exists orientation text
    check (orientation is null or orientation in ('upright', 'reversed')),
  add column if not exists source_location jsonb not null default '{}'::jsonb;

create index if not exists knowledge_chunks_card_id_orientation_idx
  on public.knowledge_chunks (card_id, orientation);

create index if not exists knowledge_chunks_book_card_idx
  on public.knowledge_chunks (book_id, card_id);

alter table public.tarot_cards enable row level security;

create or replace function public.match_structured_tarot_chunks(
  query_embedding vector(1536),
  filter_card_ids text[] default null,
  match_count integer default 12,
  filter_orientation text default null,
  filter_tarot_system text default null,
  filter_book_ids uuid[] default null
)
returns table (
  id bigint,
  book_id uuid,
  book_title text,
  author text,
  tarot_system text,
  chunk_index integer,
  content text,
  chapter text,
  card_id text,
  card_name text,
  card_name_zh_tw text,
  section_type text,
  orientation text,
  source_location jsonb,
  similarity double precision
)
language sql
stable
as $$
  select
    kc.id,
    kc.book_id,
    b.title as book_title,
    b.author,
    b.tarot_system,
    kc.chunk_index,
    kc.content,
    kc.chapter,
    kc.card_id,
    tc.name_en as card_name,
    tc.name_zh_tw as card_name_zh_tw,
    kc.section_type,
    kc.orientation,
    kc.source_location,
    1 - (kc.embedding <=> query_embedding) as similarity
  from public.knowledge_chunks kc
  join public.books b on b.id = kc.book_id
  left join public.tarot_cards tc on tc.card_id = kc.card_id
  where
    (filter_card_ids is null or cardinality(filter_card_ids) = 0 or kc.card_id = any(filter_card_ids))
    and (filter_orientation is null or kc.orientation is null or kc.orientation = filter_orientation)
    and (filter_tarot_system is null or b.tarot_system = filter_tarot_system)
    and (filter_book_ids is null or cardinality(filter_book_ids) = 0 or kc.book_id = any(filter_book_ids))
  order by kc.embedding <=> query_embedding
  limit greatest(1, least(match_count, 30));
$$;

revoke all on function public.match_structured_tarot_chunks(vector, text[], integer, text, text, uuid[]) from public;
revoke all on function public.match_structured_tarot_chunks(vector, text[], integer, text, text, uuid[]) from anon;
revoke all on function public.match_structured_tarot_chunks(vector, text[], integer, text, text, uuid[]) from authenticated;
grant execute on function public.match_structured_tarot_chunks(vector, text[], integer, text, text, uuid[]) to service_role;
