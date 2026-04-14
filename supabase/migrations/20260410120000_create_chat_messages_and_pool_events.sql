-- Pool chat messages + activity event feed (private pools only).
-- First realtime feature: both tables are added to the supabase_realtime publication.

-- Event type catalog. New variants require a follow-up migration.
create type public.pool_event_type as enum (
  'pick_changed',
  'achievement_earned',
  'elimination_recap',
  'member_joined'
);

-- Chat messages
create table public.chat_messages (
  id         bigserial primary key,
  pool_id    int not null references public.pools(id) on delete cascade,
  user_id    uuid not null references public.profiles(id) on delete cascade,
  body       text not null check (char_length(body) between 1 and 2000),
  created_at timestamptz not null default now(),
  edited_at  timestamptz
);
create index chat_messages_pool_created_idx
  on public.chat_messages (pool_id, created_at desc);

alter table public.chat_messages enable row level security;

create policy "chat_messages_read_pool_members"
  on public.chat_messages for select
  to authenticated
  using (
    exists (
      select 1 from public.pool_members pm
      where pm.pool_id = chat_messages.pool_id
        and pm.user_id = auth.uid()
    )
  );

create policy "chat_messages_insert_own"
  on public.chat_messages for insert
  to authenticated
  with check (
    user_id = auth.uid()
    and exists (
      select 1 from public.pool_members pm
      where pm.pool_id = chat_messages.pool_id
        and pm.user_id = auth.uid()
    )
  );

create policy "chat_messages_update_own"
  on public.chat_messages for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "chat_messages_delete_own"
  on public.chat_messages for delete
  to authenticated
  using (user_id = auth.uid());

-- Pool events (inline activity feed)
create table public.pool_events (
  id             bigserial primary key,
  pool_id        int not null references public.pools(id) on delete cascade,
  type           public.pool_event_type not null,
  actor_user_id  uuid references public.profiles(id) on delete set null,
  payload        jsonb not null default '{}'::jsonb,
  created_at     timestamptz not null default now()
);
create index pool_events_pool_created_idx
  on public.pool_events (pool_id, created_at desc);

alter table public.pool_events enable row level security;

-- Read: pool members only. No INSERT/UPDATE/DELETE policies -- writes go
-- through the service-role admin client from server actions.
create policy "pool_events_read_pool_members"
  on public.pool_events for select
  to authenticated
  using (
    exists (
      select 1 from public.pool_members pm
      where pm.pool_id = pool_events.pool_id
        and pm.user_id = auth.uid()
    )
  );

-- Realtime: make both tables publish INSERT events.
alter publication supabase_realtime add table public.chat_messages;
alter publication supabase_realtime add table public.pool_events;
