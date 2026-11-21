begin;

create table public.event_coordinators (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  faculty_id uuid not null references public.profiles(id) on delete cascade,
  responsibilities text not null check (char_length(btrim(responsibilities)) between 1 and 1000),
  due_date date,
  progress text not null default 'NOT_STARTED' check (progress in ('NOT_STARTED', 'IN_PROGRESS', 'DONE')),
  created_at timestamptz not null default now(),
  unique (event_id, faculty_id)
);

create index event_coordinators_faculty_id_idx on public.event_coordinators (faculty_id);
alter table public.event_coordinators enable row level security;
revoke all on public.event_coordinators from public, anon, authenticated;

create function public.list_event_coordinators(p_event_id uuid default null)
returns table (
  id uuid, event_id uuid, faculty_id uuid, title text, venue text, start_date date, end_date date,
  owner_name text, coordinator_name text, responsibilities text, due_date date, progress text
)
language sql stable security definer set search_path = ''
as $$
  select c.id, e.id, c.faculty_id, e.title, e.venue, e.start_date, e.end_date,
    owner.full_name, coordinator.full_name, c.responsibilities, c.due_date, c.progress
  from public.event_coordinators c
  join public.events e on e.id = c.event_id
  join public.profiles owner on owner.id = e.created_by
  join public.profiles coordinator on coordinator.id = c.faculty_id
  where e.status = 'OFFICIALLY_APPROVED' and coordinator.role = 'FACULTY'
    and exists (select 1 from public.profiles where profiles.id = (select auth.uid()) and role = 'FACULTY')
    and ((p_event_id is null and c.faculty_id = (select auth.uid()))
      or (p_event_id = e.id and e.created_by = (select auth.uid())))
  order by coalesce(c.due_date, e.start_date), e.title, c.id;
$$;

create function public.search_event_coordinator_candidates(p_event_id uuid, p_name text)
returns table (id uuid, full_name text)
language sql stable security definer set search_path = ''
as $$
  select p.id, p.full_name from public.profiles p
  where char_length(btrim(p_name)) between 2 and 120
    and p.role = 'FACULTY' and p.id <> (select auth.uid())
    and strpos(lower(p.full_name), lower(btrim(p_name))) > 0
    and exists (
      select 1 from public.events e join public.profiles owner on owner.id = e.created_by
      where e.id = p_event_id and e.status = 'OFFICIALLY_APPROVED'
        and owner.id = (select auth.uid()) and owner.role = 'FACULTY'
    )
    and not exists (select 1 from public.event_coordinators c where c.event_id = p_event_id and c.faculty_id = p.id)
  order by p.full_name, p.id
  limit 15;
$$;

create function public.assign_event_coordinator(p_event_id uuid, p_faculty_id uuid, p_responsibilities text, p_due_date date)
returns boolean language plpgsql security definer set search_path = ''
as $$
begin
  perform 1 from public.events e join public.profiles owner on owner.id = e.created_by
  where e.id = p_event_id and e.status = 'OFFICIALLY_APPROVED'
    and owner.id = (select auth.uid()) and owner.role = 'FACULTY'
  for share of e;
  if not found then
    raise exception 'Only the event owner can assign a coordinator after final approval' using errcode = '42501';
  end if;

  perform 1 from public.profiles where id = p_faculty_id and role = 'FACULTY' and id <> (select auth.uid()) for share;
  if not found or p_responsibilities is null or p_responsibilities !~ '[^[:space:]]'
    or char_length(btrim(p_responsibilities)) > 1000 then
    raise exception 'Choose another faculty member and enter their responsibilities' using errcode = '22023';
  end if;

  insert into public.event_coordinators (event_id, faculty_id, responsibilities, due_date)
  values (p_event_id, p_faculty_id, btrim(p_responsibilities), p_due_date)
  on conflict (event_id, faculty_id) do nothing;
  return found;
end;
$$;

create function public.remove_event_coordinator(p_assignment_id uuid)
returns boolean language plpgsql security definer set search_path = ''
as $$
begin
  delete from public.event_coordinators c using public.events e, public.profiles owner
  where c.id = p_assignment_id and e.id = c.event_id and owner.id = e.created_by
    and owner.id = (select auth.uid()) and owner.role = 'FACULTY' and e.status = 'OFFICIALLY_APPROVED';
  return found;
end;
$$;

create function public.update_coordinator_progress(p_assignment_id uuid, p_progress text)
returns boolean language plpgsql security definer set search_path = ''
as $$
begin
  if p_progress is null or p_progress not in ('NOT_STARTED', 'IN_PROGRESS', 'DONE') then
    raise exception 'Choose a valid progress status' using errcode = '22023';
  end if;

  update public.event_coordinators c set progress = p_progress
  from public.events e, public.profiles p
  where c.id = p_assignment_id and e.id = c.event_id and e.status = 'OFFICIALLY_APPROVED'
    and c.faculty_id = (select auth.uid()) and p.id = c.faculty_id and p.role = 'FACULTY';
  return found;
end;
$$;

revoke all on function public.list_event_coordinators(uuid), public.search_event_coordinator_candidates(uuid, text),
  public.assign_event_coordinator(uuid, uuid, text, date), public.remove_event_coordinator(uuid),
  public.update_coordinator_progress(uuid, text) from public, anon, authenticated;
grant execute on function public.list_event_coordinators(uuid), public.search_event_coordinator_candidates(uuid, text),
  public.assign_event_coordinator(uuid, uuid, text, date), public.remove_event_coordinator(uuid),
  public.update_coordinator_progress(uuid, text) to authenticated;

commit;
