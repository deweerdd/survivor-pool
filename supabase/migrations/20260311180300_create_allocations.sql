-- allocations table
create table public.allocations (
  id             serial primary key,
  pool_id        int not null references public.pools(id),
  episode_id     int not null references public.episodes(id),
  user_id        uuid not null references public.profiles(id),
  contestant_id  int not null references public.contestants(id),
  points         int not null,
  created_at     timestamptz not null default now(),
  unique (pool_id, episode_id, user_id, contestant_id),
  check (points > 0)
);

-- RLS
alter table public.allocations enable row level security;

-- Users can read their own allocations
create policy "allocations_read_own"
  on public.allocations for select
  to authenticated
  using (user_id = auth.uid());

-- Users can insert their own allocations only when the episode is not locked
create policy "allocations_insert_own"
  on public.allocations for insert
  to authenticated
  with check (
    user_id = auth.uid()
    and not exists (
      select 1 from public.episodes
      where id = episode_id and is_locked = true
    )
  );

-- Users can delete their own allocations only when the episode is not locked
create policy "allocations_delete_own"
  on public.allocations for delete
  to authenticated
  using (
    user_id = auth.uid()
    and not exists (
      select 1 from public.episodes
      where id = episode_id and is_locked = true
    )
  );
