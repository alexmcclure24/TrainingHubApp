-- Training Hub database. Paste this whole file into Supabase → SQL Editor → Run.
-- One table holds everything: each person's profile/plan and their logs.
-- Row Level Security makes sure people can only ever see and change their own rows.

create table if not exists public.entries (
  user_id    uuid        not null references auth.users (id) on delete cascade,
  kind       text        not null check (kind in ('profile', 'days', 'sessions', 'tests')),
  key        text        not null,
  data       jsonb       not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  primary key (user_id, kind, key)
);

alter table public.entries enable row level security;

drop policy if exists "own rows: read"   on public.entries;
drop policy if exists "own rows: insert" on public.entries;
drop policy if exists "own rows: update" on public.entries;
drop policy if exists "own rows: delete" on public.entries;

create policy "own rows: read"   on public.entries for select using (auth.uid() = user_id);
create policy "own rows: insert" on public.entries for insert with check (auth.uid() = user_id);
create policy "own rows: update" on public.entries for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own rows: delete" on public.entries for delete using (auth.uid() = user_id);

-- Newer Supabase projects don't expose new tables automatically.
-- Signed-in users get table access; the policies above still limit them to their own rows.
grant usage on schema public to authenticated;
grant select, insert, update, delete on table public.entries to authenticated;
