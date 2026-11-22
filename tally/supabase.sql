-- Tally Tiles leaderboard: paste this whole file into Supabase > SQL Editor > Run.
-- Not run against a live project by the author: if anything errors, send the message back.

create table if not exists public.scores (
  id         bigint generated always as identity primary key,
  day        text     not null check (day ~ '^\d{4}-\d{2}-\d{2}$'),
  level      text     not null check (level in ('easy','medium','hard','insane')),
  idx        smallint not null check (idx between 0 and 9),
  name       text     not null check (char_length(name) between 1 and 16),
  secs       integer  not null check (secs between 2 and 36000),
  hints      smallint not null default 0 check (hints between 0 and 3),
  pid        text     not null check (char_length(pid) between 8 and 64),  -- random per-device id, never shown
  created_at timestamptz not null default now(),
  unique (day, level, idx, pid)   -- one score per device per puzzle
);

create index if not exists scores_lookup on public.scores (level, day);

alter table public.scores enable row level security;

-- Visitors (the "anon" role) may add scores and read the public columns. Nothing else.
revoke all on table public.scores from anon, authenticated;
grant insert on table public.scores to anon;
grant select (day, level, idx, name, secs, hints) on table public.scores to anon;

drop policy if exists "anyone can read scores" on public.scores;
create policy "anyone can read scores" on public.scores for select to anon using (true);

drop policy if exists "anyone can post a score" on public.scores;
create policy "anyone can post a score" on public.scores for insert to anon with check (true);

-- To remove a bad entry later: Table Editor > scores > delete the row (or: delete from public.scores where name = 'x';)
