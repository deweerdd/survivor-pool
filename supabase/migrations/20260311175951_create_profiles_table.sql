-- Feature 1.1: profiles table + handle_new_user trigger + RLS

-- 1. Create the profiles table
create table public.profiles (
  id            uuid primary key references auth.users(id) on delete cascade,
  email         text,
  display_name  text,
  is_admin      boolean not null default false,
  created_at    timestamptz not null default now()
);

-- 2. Enable Row Level Security
alter table public.profiles enable row level security;

-- 3. RLS: users can read their own row
create policy "users can view own profile"
  on public.profiles
  for select
  using (auth.uid() = id);

-- 4. RLS: users can update their own row
create policy "users can update own profile"
  on public.profiles
  for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- 5. Trigger function: auto-insert profile on signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, display_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', new.email)
  );
  return new;
end;
$$;

-- 6. Attach trigger to auth.users
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
