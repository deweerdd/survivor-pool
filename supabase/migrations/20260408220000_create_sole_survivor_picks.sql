-- Sole Survivor picks: one pick per user per pool for who wins the season.
-- Points = 2 * (total_episodes - picked_at_episode + 1), awarded after finale.
create table public.sole_survivor_picks (
  id                serial primary key,
  pool_id           int not null references public.pools(id),
  user_id           uuid not null references public.profiles(id),
  contestant_id     int not null references public.contestants(id),
  picked_at_episode int not null,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  unique (pool_id, user_id)
);

-- RLS
alter table public.sole_survivor_picks enable row level security;

-- Authenticated users can read picks in pools they belong to
create policy "sole_survivor_picks_read_pool_members"
  on public.sole_survivor_picks for select
  to authenticated
  using (
    exists (
      select 1 from public.pool_members pm
      where pm.pool_id = sole_survivor_picks.pool_id
        and pm.user_id = auth.uid()
    )
  );

-- Users can insert their own pick (must be pool member)
create policy "sole_survivor_picks_insert_own"
  on public.sole_survivor_picks for insert
  to authenticated
  with check (
    user_id = auth.uid()
    and exists (
      select 1 from public.pool_members pm
      where pm.pool_id = sole_survivor_picks.pool_id
        and pm.user_id = auth.uid()
    )
  );

-- Users can update their own pick
create policy "sole_survivor_picks_update_own"
  on public.sole_survivor_picks for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- Users can delete their own pick
create policy "sole_survivor_picks_delete_own"
  on public.sole_survivor_picks for delete
  to authenticated
  using (user_id = auth.uid());
