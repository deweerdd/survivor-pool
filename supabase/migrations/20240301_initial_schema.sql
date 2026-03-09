-- Initial schema for Survivor Pool app
-- Run via: supabase db push

-- Seasons (managed by super admin)
create table if not exists seasons (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  number integer not null unique,
  is_active boolean not null default false,
  created_at timestamptz not null default now()
);

-- Survivors (managed by super admin)
create table if not exists survivors (
  id uuid primary key default gen_random_uuid(),
  season_id uuid not null references seasons(id) on delete cascade,
  name text not null,
  image_url text,
  is_active boolean not null default true,
  eliminated_episode_id uuid, -- set when eliminated (FK added after episodes table)
  created_at timestamptz not null default now()
);

-- Episodes (managed by super admin)
create table if not exists episodes (
  id uuid primary key default gen_random_uuid(),
  season_id uuid not null references seasons(id) on delete cascade,
  episode_number integer not null,
  air_date timestamptz not null,
  picks_lock_at timestamptz not null,    -- global lock time set by super admin
  results_release_at timestamptz not null, -- global results release time
  created_at timestamptz not null default now(),
  unique(season_id, episode_number)
);

-- Add FK for eliminated_episode_id now that episodes table exists
alter table survivors
  add constraint fk_eliminated_episode
  foreign key (eliminated_episode_id) references episodes(id);

-- Profiles (extends auth.users — created by trigger on signup)
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  avatar_url text,
  is_super_admin boolean not null default false,
  created_at timestamptz not null default now()
);

-- Pools (created by commissioners)
create table if not exists pools (
  id uuid primary key default gen_random_uuid(),
  season_id uuid not null references seasons(id),
  name text not null,
  commissioner_id uuid not null references profiles(id),
  invite_code text not null unique,
  created_at timestamptz not null default now()
);

-- Pool members
create table if not exists pool_members (
  id uuid primary key default gen_random_uuid(),
  pool_id uuid not null references pools(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  joined_at timestamptz not null default now(),
  unique(pool_id, user_id)
);

-- Picks
create table if not exists picks (
  id uuid primary key default gen_random_uuid(),
  pool_id uuid not null references pools(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  episode_id uuid not null references episodes(id) on delete cascade,
  survivor_id uuid not null references survivors(id) on delete cascade,
  points integer not null check (points > 0 and points <= 20),
  created_at timestamptz not null default now(),
  unique(pool_id, user_id, episode_id, survivor_id)
);

-- Trigger: auto-create profile on signup
create or replace function handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, display_name, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.email),
    new.raw_user_meta_data->>'avatar_url'
  );
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- RLS Policies
alter table profiles enable row level security;
alter table seasons enable row level security;
alter table survivors enable row level security;
alter table episodes enable row level security;
alter table pools enable row level security;
alter table pool_members enable row level security;
alter table picks enable row level security;

-- Profiles: users can read all profiles, update only their own
create policy "Profiles are viewable by everyone" on profiles
  for select using (true);

create policy "Users can update own profile" on profiles
  for update using (auth.uid() = id);

-- Seasons: anyone can read
create policy "Seasons are viewable by everyone" on seasons
  for select using (true);

create policy "Only super admins can modify seasons" on seasons
  for all using (
    exists (select 1 from profiles where id = auth.uid() and is_super_admin = true)
  );

-- Survivors: anyone can read
create policy "Survivors are viewable by everyone" on survivors
  for select using (true);

create policy "Only super admins can modify survivors" on survivors
  for all using (
    exists (select 1 from profiles where id = auth.uid() and is_super_admin = true)
  );

-- Episodes: anyone can read
create policy "Episodes are viewable by everyone" on episodes
  for select using (true);

create policy "Only super admins can modify episodes" on episodes
  for all using (
    exists (select 1 from profiles where id = auth.uid() and is_super_admin = true)
  );

-- Pools: members can read their pools, commissioners can create
create policy "Pool members can view their pools" on pools
  for select using (
    exists (
      select 1 from pool_members
      where pool_id = pools.id and user_id = auth.uid()
    )
  );

create policy "Authenticated users can create pools" on pools
  for insert with check (auth.uid() = commissioner_id);

-- Pool members: members can see who else is in their pool
create policy "Pool members can view pool membership" on pool_members
  for select using (
    exists (
      select 1 from pool_members pm2
      where pm2.pool_id = pool_members.pool_id and pm2.user_id = auth.uid()
    )
  );

create policy "Authenticated users can join pools" on pool_members
  for insert with check (auth.uid() = user_id);

-- Picks: members of the pool can read picks after results release
-- Players can only write their own picks before lock
create policy "Pool members can view picks after results release" on picks
  for select using (
    exists (select 1 from pool_members where pool_id = picks.pool_id and user_id = auth.uid())
    and exists (
      select 1 from episodes
      where id = picks.episode_id and results_release_at <= now()
    )
  );

create policy "Players can view their own picks" on picks
  for select using (auth.uid() = user_id);

create policy "Players can insert their own picks before lock" on picks
  for insert with check (
    auth.uid() = user_id
    and exists (
      select 1 from pool_members where pool_id = picks.pool_id and user_id = auth.uid()
    )
    and exists (
      select 1 from episodes where id = picks.episode_id and picks_lock_at > now()
    )
  );

create policy "Players can delete their own picks before lock" on picks
  for delete using (
    auth.uid() = user_id
    and exists (
      select 1 from episodes where id = picks.episode_id and picks_lock_at > now()
    )
  );
