begin;

create table public.faculty_profile_details (
  profile_id uuid primary key references public.profiles(id) on delete cascade,
  employee_id text,
  designation text check (char_length(designation) <= 100),
  department text check (char_length(department) <= 100),
  phone text check (char_length(phone) <= 40),
  office_room text check (char_length(office_room) <= 100)
);

alter table public.faculty_profile_details enable row level security;
revoke all on table public.faculty_profile_details from public, anon, authenticated;
grant select on table public.faculty_profile_details to authenticated;

create policy "Faculty can read their own profile details"
on public.faculty_profile_details for select to authenticated
using (
  profile_id = (select auth.uid())
  and exists (
    select 1 from public.profiles p
    where p.id = faculty_profile_details.profile_id and p.role = 'FACULTY'
  )
);

-- Keep the display name and private details in one transaction. The session
-- determines the row and role, and the employee ID is institution-managed.
create function public.save_faculty_profile(
  p_full_name text,
  p_designation text,
  p_department text,
  p_phone text,
  p_office_room text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  faculty_id uuid := auth.uid();
  display_name text := nullif(btrim(p_full_name), '');
begin
  if display_name is null or char_length(display_name) > 120 then
    raise exception 'Full name must contain between 1 and 120 characters' using errcode = '22023';
  end if;

  update public.profiles
  set full_name = display_name, updated_at = now()
  where id = faculty_id and role = 'FACULTY';

  if not found then
    raise exception 'A faculty account is required' using errcode = '42501';
  end if;

  insert into public.faculty_profile_details (profile_id, designation, department, phone, office_room)
  values (
    faculty_id,
    nullif(btrim(p_designation), ''),
    nullif(btrim(p_department), ''),
    nullif(btrim(p_phone), ''),
    nullif(btrim(p_office_room), '')
  )
  on conflict (profile_id) do update set
    designation = excluded.designation,
    department = excluded.department,
    phone = excluded.phone,
    office_room = excluded.office_room;
end;
$$;

revoke all on function public.save_faculty_profile(text, text, text, text, text) from public, anon, authenticated;
grant execute on function public.save_faculty_profile(text, text, text, text, text) to authenticated;

commit;
