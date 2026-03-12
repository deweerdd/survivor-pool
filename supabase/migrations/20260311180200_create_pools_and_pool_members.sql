-- pools table
create table public.pools (
  id          serial primary key,
  season_id   int not null references public.seasons(id),
  name        text not null,
  is_public   boolean not null default false,
  invite_code text unique,
  created_by  uuid references public.profiles(id),
  created_at  timestamptz not null default now()
);

-- pool_members table
create table public.pool_members (
  id        serial primary key,
  pool_id   int not null references public.pools(id),
  user_id   uuid not null references public.profiles(id),
  joined_at timestamptz not null default now(),
  unique (pool_id, user_id)
);

-- RLS: pools
alter table public.pools enable row level security;

create policy "pools_public_read"
  on public.pools for select
  using (true);

create policy "pools_admin_insert"
  on public.pools for insert
  to authenticated
  with check (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and is_admin = true
    )
  );

create policy "pools_owner_insert"
  on public.pools for insert
  to authenticated
  with check (created_by = auth.uid());

create policy "pools_admin_update"
  on public.pools for update
  to authenticated
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and is_admin = true
    )
  );

-- RLS: pool_members
alter table public.pool_members enable row level security;

create policy "pool_members_read_own"
  on public.pool_members for select
  to authenticated
  using (user_id = auth.uid());

create policy "pool_members_insert_self"
  on public.pool_members for insert
  to authenticated
  with check (user_id = auth.uid());
