begin;

create table public.event_committees (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 80),
  responsibilities text not null default '' check (char_length(responsibilities) <= 1500),
  coordinator_id uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);
create unique index event_committees_event_name_idx on public.event_committees (event_id, lower(name));
create index event_committees_coordinator_idx on public.event_committees (coordinator_id);
alter table public.event_committees enable row level security;
revoke all on public.event_committees from public, anon, authenticated;

create table public.event_committee_updates (
  id uuid primary key,
  committee_id uuid not null references public.event_committees(id) on delete cascade,
  submitted_by uuid references public.profiles(id) on delete set null,
  submitted_by_name text not null,
  kind text not null check (kind in ('REPORT', 'NEED', 'UPDATE')),
  title text not null check (char_length(btrim(title)) between 1 and 120),
  details text not null default '' check (char_length(details) <= 4000),
  file_object_id uuid unique references storage.objects(id) on delete restrict,
  file_path text unique,
  file_name text,
  created_at timestamptz not null default now(),
  check ((file_path is null) = (file_name is null)),
  check ((file_path is null) = (file_object_id is null)),
  check (details <> '' or file_path is not null)
);
create index event_committee_updates_committee_idx on public.event_committee_updates (committee_id, created_at desc, id);
alter table public.event_committee_updates enable row level security;
revoke all on public.event_committee_updates from public, anon, authenticated;
grant select on public.event_committee_updates to authenticated;

create function public.can_access_event_committee(p_committee_id text, p_coordinator_only boolean)
returns boolean language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.event_committees c
    join public.events e on e.id = c.event_id
    join public.profiles actor on actor.id = (select auth.uid()) and actor.role = 'FACULTY'
    where c.id = case when p_committee_id ~ '^[a-f0-9]{8}(-[a-f0-9]{4}){3}-[a-f0-9]{12}$' then p_committee_id::uuid end
      and e.status = 'OFFICIALLY_APPROVED' and e.vc_approval_document_path is not null
      and (c.coordinator_id = actor.id or (not p_coordinator_only and e.created_by = actor.id))
  );
$$;

create policy "Faculty can read updates for their committees"
on public.event_committee_updates for select to authenticated
using (public.can_access_event_committee(committee_id::text, false));

create function public.list_event_committees(p_event_id uuid default null, p_committee_id uuid default null)
returns table (
  id uuid, event_id uuid, name text, responsibilities text, coordinator_id uuid, coordinator_name text,
  event_title text, venue text, start_date date, end_date date, owner_name text
)
language sql stable security definer set search_path = ''
as $$
  select c.id, e.id, c.name, c.responsibilities, coordinator.id, coordinator.full_name,
    e.title, e.venue, e.start_date, e.end_date, owner.full_name
  from public.event_committees c
  join public.events e on e.id = c.event_id
  join public.profiles owner on owner.id = e.created_by
  left join public.profiles coordinator on coordinator.id = c.coordinator_id and coordinator.role = 'FACULTY'
  join public.profiles actor on actor.id = (select auth.uid()) and actor.role = 'FACULTY'
  where e.status = 'OFFICIALLY_APPROVED' and e.vc_approval_document_path is not null
    and (p_committee_id is null or c.id = p_committee_id)
    and ((p_event_id is null and coordinator.id = actor.id)
      or (p_event_id = e.id and e.created_by = actor.id))
  order by e.start_date, e.title, c.name, c.id;
$$;

create function public.create_event_committee(p_event_id uuid, p_name text, p_responsibilities text)
returns boolean language plpgsql security definer set search_path = ''
as $$
begin
  perform 1 from public.events e
  join public.profiles actor on actor.id = e.created_by and actor.role = 'FACULTY'
  where e.id = p_event_id and actor.id = (select auth.uid())
    and e.status = 'OFFICIALLY_APPROVED' and e.vc_approval_document_path is not null
  for share of e;
  if not found then
    raise exception 'Only the faculty event owner can form a committee after VC approval' using errcode = '42501';
  end if;

  if p_name is null or p_name !~ '[^[:space:]]' or char_length(btrim(p_name)) > 80
    or char_length(btrim(p_responsibilities)) > 1500 then
    raise exception 'Enter a valid committee name and responsibilities' using errcode = '22023';
  end if;

  insert into public.event_committees (event_id, name, responsibilities)
  values (p_event_id, btrim(p_name), coalesce(btrim(p_responsibilities), ''))
  on conflict (event_id, lower(name)) do nothing;
  return found;
end;
$$;

create function public.search_committee_coordinators(p_committee_id uuid, p_name text)
returns table (id uuid, full_name text)
language sql stable security definer set search_path = ''
as $$
  select p.id, p.full_name from public.profiles p
  where p.role = 'FACULTY' and p.id <> (select auth.uid())
    and char_length(btrim(p_name)) between 2 and 120
    and strpos(lower(p.full_name), lower(btrim(p_name))) > 0
    and exists (
      select 1 from public.event_committees c
      join public.events e on e.id = c.event_id
      join public.profiles actor on actor.id = e.created_by and actor.role = 'FACULTY'
      where c.id = p_committee_id and actor.id = (select auth.uid())
        and e.status = 'OFFICIALLY_APPROVED' and e.vc_approval_document_path is not null
    )
  order by p.full_name, p.id
  limit 15;
$$;

create function public.assign_committee_coordinator(p_committee_id uuid, p_faculty_id uuid)
returns boolean language plpgsql security definer set search_path = ''
as $$
begin
  perform 1 from public.profiles
  where id = p_faculty_id and role = 'FACULTY' and id <> (select auth.uid())
  for share;
  if not found then
    raise exception 'Choose another faculty member' using errcode = '22023';
  end if;

  update public.event_committees c set coordinator_id = p_faculty_id
  from public.events e, public.profiles actor
  where c.id = p_committee_id and e.id = c.event_id
    and actor.id = e.created_by and actor.id = (select auth.uid()) and actor.role = 'FACULTY'
    and e.status = 'OFFICIALLY_APPROVED' and e.vc_approval_document_path is not null;
  return found;
end;
$$;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('committee-files', 'committee-files', false, 10485760, array['application/pdf', 'image/jpeg', 'image/png']);

create policy "Assigned co-faculty can upload committee files"
on storage.objects for insert to authenticated with check (
  bucket_id = 'committee-files'
  and name ~ '^[a-f0-9-]{36}/[a-f0-9-]{36}/[a-f0-9-]{36}\.(pdf|jpg|png)$'
  and split_part(name, '/', 2) = (select auth.uid())::text
  and public.can_access_event_committee(split_part(name, '/', 1), true)
);

create policy "Faculty can open their committee files"
on storage.objects for select to authenticated using (
  bucket_id = 'committee-files'
  and public.can_access_event_committee(split_part(name, '/', 1), false)
  and (
    split_part(name, '/', 2) = (select auth.uid())::text
    or exists (select 1 from public.event_committee_updates u where u.file_path = storage.objects.name)
  )
);

create policy "Assigned co-faculty can clean up pending committee files"
on storage.objects for delete to authenticated using (
  bucket_id = 'committee-files'
  and split_part(name, '/', 2) = (select auth.uid())::text
  and public.can_access_event_committee(split_part(name, '/', 1), true)
  and not exists (select 1 from public.event_committee_updates u where u.file_path = storage.objects.name)
);

create function public.submit_event_committee_update(
  p_committee_id uuid, p_update_id uuid, p_kind text, p_title text, p_details text, p_file_path text, p_file_name text
)
returns void language plpgsql security definer set search_path = ''
as $$
declare
  actor_id uuid := auth.uid();
  actor_name text;
  object_id uuid;
  details text := coalesce(regexp_replace(p_details, '^[[:space:]]+|[[:space:]]+$', '', 'g'), '');
begin
  select actor.full_name into actor_name from public.event_committees c
  join public.events e on e.id = c.event_id
  join public.profiles actor on actor.id = c.coordinator_id and actor.role = 'FACULTY'
  where c.id = p_committee_id and actor.id = actor_id
    and e.status = 'OFFICIALLY_APPROVED' and e.vc_approval_document_path is not null
  for update of c;
  if not found then
    raise exception 'Only the assigned co-faculty coordinator can submit an update' using errcode = '42501';
  end if;

  if p_update_id is null or p_kind is null or p_kind not in ('REPORT', 'NEED', 'UPDATE')
    or p_title is null or p_title !~ '[^[:space:]]' or char_length(btrim(p_title)) > 120
    or char_length(details) > 4000 or (details = '' and p_file_path is null) then
    raise exception 'Enter a title and add details or a file' using errcode = '22023';
  end if;

  if p_file_path is not null then
    if p_file_path not in (
      concat(p_committee_id, '/', actor_id, '/', p_update_id, '.pdf'),
      concat(p_committee_id, '/', actor_id, '/', p_update_id, '.jpg'),
      concat(p_committee_id, '/', actor_id, '/', p_update_id, '.png')
    ) or p_file_name is null or p_file_name !~ '[^[:space:]]' or char_length(p_file_name) > 255 then
      raise exception 'The attachment is unavailable for this committee' using errcode = '22023';
    end if;
    select id into object_id from storage.objects where bucket_id = 'committee-files' and name = p_file_path;
    if not found then
      raise exception 'The attachment is unavailable for this committee' using errcode = '22023';
    end if;
  end if;

  insert into public.event_committee_updates (id, committee_id, submitted_by, submitted_by_name, kind, title, details, file_object_id, file_path, file_name)
  values (p_update_id, p_committee_id, actor_id, actor_name, p_kind, btrim(p_title), details, object_id, p_file_path,
    case when p_file_path is not null then p_file_name end);
end;
$$;

revoke all on function public.can_access_event_committee(text, boolean), public.list_event_committees(uuid, uuid),
  public.create_event_committee(uuid, text, text), public.search_committee_coordinators(uuid, text),
  public.assign_committee_coordinator(uuid, uuid), public.submit_event_committee_update(uuid, uuid, text, text, text, text, text)
from public, anon, authenticated;
grant execute on function public.can_access_event_committee(text, boolean), public.list_event_committees(uuid, uuid),
  public.create_event_committee(uuid, text, text), public.search_committee_coordinators(uuid, text),
  public.assign_committee_coordinator(uuid, uuid), public.submit_event_committee_update(uuid, uuid, text, text, text, text, text)
to authenticated;

commit;
