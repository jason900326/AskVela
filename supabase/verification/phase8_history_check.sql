-- Phase 8 production verification: Astrology + Dream history tables and RLS.
-- Run this in Supabase SQL Editor after applying 005_astrology_history.sql and 006_dream_history.sql.

with tables as (
  select
    c.relname as table_name,
    c.relrowsecurity as rls_enabled
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public'
    and c.relname in ('astrology_readings', 'dream_readings')
), policies as (
  select
    tablename as table_name,
    count(*)::int as policy_count
  from pg_policies
  where schemaname = 'public'
    and tablename in ('astrology_readings', 'dream_readings')
  group by tablename
), constraints as (
  select
    c.relname as table_name,
    con.conname as constraint_name,
    pg_get_constraintdef(con.oid) as definition
  from pg_constraint con
  join pg_class c on c.oid = con.conrelid
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public'
    and c.relname in ('astrology_readings', 'dream_readings')
)
select
  t.table_name,
  true as table_exists,
  t.rls_enabled,
  coalesce(p.policy_count, 0) as policy_count,
  exists (
    select 1
    from constraints c
    where c.table_name = t.table_name
      and c.definition ilike '%365 days%'
  ) as has_365_day_default_or_check,
  case
    when t.table_name = 'dream_readings' then exists (
      select 1
      from constraints c
      where c.table_name = 'dream_readings'
        and c.definition ilike '%char_length(dream_text)%>= 2%'
    )
    else true
  end as dream_min_length_matches_api
from tables t
left join policies p using (table_name)
order by t.table_name;

-- Expected:
-- 1. Two rows: astrology_readings and dream_readings.
-- 2. rls_enabled = true for both.
-- 3. policy_count = 4 for both (select/insert/update/delete own rows).
-- 4. dream_min_length_matches_api = true for dream_readings.
--
-- Note: PostgreSQL may render the interval default expression differently,
-- so the retention column itself should also be checked directly if the
-- has_365_day_default_or_check helper is false:
--
-- select table_name, column_default
-- from information_schema.columns
-- where table_schema = 'public'
--   and table_name in ('astrology_readings', 'dream_readings')
--   and column_name = 'expires_at';
