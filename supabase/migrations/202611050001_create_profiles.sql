
-- 1. Define our application's global roles

create type public.app_role as enum (
  'STUDENT',
  'FACULTY',
  'DEAN',
  'VC',
  'ADMIN'
);


-- 2. Create the profiles table

create table public.profiles (
  id uuid primary key
    references auth.users(id)
    on delete cascade,

  full_name text not null,

  role public.app_role not null default 'STUDENT',

  created_at timestamptz not null default now(),

  updated_at timestamptz not null default now()
);


-- 3. Enable Row Level Security

alter table public.profiles
enable row level security;


-- 4. Restrict database privileges

revoke all on table public.profiles
from anon, authenticated;

grant select on table public.profiles
to authenticated;


-- 5. Allow authenticated users to read only their own profile

create policy "Users can read their own profile"
on public.profiles
for select
to authenticated
using (
  (select auth.uid()) = id
);

-- 6. Create a function to generate profiles automatically

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin

  insert into public.profiles (
    id,
    full_name
  )
  values (
    new.id,
    coalesce(
      nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''),
      split_part(coalesce(new.email, 'user'), '@', 1)
    )
  );

  return new;

end;
$$;


-- 7. Attach the function to Supabase Auth

create trigger on_auth_user_created
after insert on auth.users
for each row
execute function public.handle_new_user();


-- 8. Backfill profiles for existing accounts

insert into public.profiles (id, full_name)
select
  id,
  coalesce(
    nullif(trim(raw_user_meta_data ->> 'full_name'), ''),
    split_part(coalesce(email, 'user'), '@', 1)
  )
from auth.users
on conflict (id) do nothing;
