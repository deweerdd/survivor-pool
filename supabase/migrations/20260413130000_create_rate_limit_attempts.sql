-- Rate-limit attempts table. Rows are logged by server actions via the
-- service-role (admin) client; RLS is enabled with no policies so regular
-- users cannot read or write.
create table public.rate_limit_attempts (
  id bigserial primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  action text not null,
  attempted_at timestamptz not null default now()
);

create index rate_limit_attempts_lookup_idx
  on public.rate_limit_attempts (user_id, action, attempted_at desc);

alter table public.rate_limit_attempts enable row level security;
