begin;

alter table public.event_committees
  add column second_coordinator_id uuid references public.profiles(id) on delete set null,
  add constraint distinct_committee_coordinators check (coordinator_id <> second_coordinator_id);
create index event_committees_second_coordinator_idx on public.event_committees(second_coordinator_id);

create function public.owns_event_committee(p_committee_id uuid)
returns boolean language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.event_committees c
    join public.events e on e.id = c.event_id
    join public.profiles p on p.id = e.created_by and p.role = 'FACULTY'
    where c.id = p_committee_id and p.id = (select auth.uid())
      and e.status = 'OFFICIALLY_APPROVED' and e.vc_approval_document_path is not null
  );
$$;

create or replace function public.can_access_event_committee(p_committee_id text, p_coordinator_only boolean)
returns boolean language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.event_committees c
    join public.events e on e.id = c.event_id
    join public.profiles actor on actor.id = (select auth.uid()) and actor.role = 'FACULTY'
    where c.id = case when p_committee_id ~ '^[a-f0-9]{8}(-[a-f0-9]{4}){3}-[a-f0-9]{12}$' then p_committee_id::uuid end
      and e.status = 'OFFICIALLY_APPROVED' and e.vc_approval_document_path is not null
      and (actor.id in (c.coordinator_id, c.second_coordinator_id) or (not p_coordinator_only and e.created_by = actor.id))
  );
$$;

drop function public.list_event_committees(uuid, uuid);
create or replace function public.list_event_committees(p_event_id uuid default null, p_committee_id uuid default null)
returns table (
  id uuid, event_id uuid, name text, responsibilities text, coordinator_id uuid, coordinator_name text,
  second_coordinator_id uuid, second_coordinator_name text,
  event_title text, venue text, start_date date, end_date date, owner_name text
)
language sql stable security definer set search_path = ''
as $$
  select c.id, e.id, c.name, c.responsibilities, coordinator.id, coordinator.full_name, second.id, second.full_name,
    e.title, e.venue, e.start_date, e.end_date, owner.full_name
  from public.event_committees c
  join public.events e on e.id = c.event_id
  join public.profiles owner on owner.id = e.created_by
  left join public.profiles coordinator on coordinator.id = c.coordinator_id and coordinator.role = 'FACULTY'
  left join public.profiles second on second.id = c.second_coordinator_id and second.role = 'FACULTY'
  join public.profiles actor on actor.id = (select auth.uid()) and actor.role = 'FACULTY'
  where e.status = 'OFFICIALLY_APPROVED' and e.vc_approval_document_path is not null
    and (p_committee_id is null or c.id = p_committee_id)
    and ((p_event_id is null and actor.id in (coordinator.id, second.id))
      or (p_event_id = e.id and e.created_by = actor.id))
  order by e.start_date, e.title, c.name, c.id;
$$;

drop function public.search_committee_coordinators(uuid, text);
create or replace function public.search_committee_coordinators(p_committee_id uuid, p_name text)
returns table (id uuid, full_name text, email text)
language sql stable security definer set search_path = ''
as $$
  select p.id, p.full_name, u.email::text from public.profiles p
  join auth.users u on u.id = p.id
  where p.role = 'FACULTY' and p.id <> (select auth.uid())
    and char_length(btrim(p_name)) between 2 and 254
    and (strpos(lower(p.full_name), lower(btrim(p_name))) > 0 or lower(u.email) = lower(btrim(p_name)))
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

create or replace function public.assign_committee_coordinator(p_committee_id uuid, p_faculty_id uuid)
returns boolean language plpgsql security definer set search_path = ''
as $$
declare
  committee public.event_committees%rowtype;
begin
  select * into committee from public.event_committees
  where id = p_committee_id and public.owns_event_committee(id) for update;
  if not found then
    raise exception 'Only the event lead can assign coordinators' using errcode = '42501';
  end if;
  perform 1 from public.profiles
  where id = p_faculty_id and role = 'FACULTY' and id <> (select auth.uid()) for share;
  if not found then
    raise exception 'Choose another faculty member' using errcode = '22023';
  end if;
  if p_faculty_id in (committee.coordinator_id, committee.second_coordinator_id) then
    return true;
  end if;
  if committee.coordinator_id is not null and committee.second_coordinator_id is not null then
    raise exception 'This committee already has two coordinators' using errcode = '23514';
  end if;
  update public.event_committees set
    coordinator_id = coalesce(committee.coordinator_id, p_faculty_id),
    second_coordinator_id = case when committee.coordinator_id is not null then p_faculty_id else committee.second_coordinator_id end
  where id = committee.id;
  return true;
end;
$$;

create function public.remove_committee_coordinator(p_committee_id uuid, p_faculty_id uuid)
returns boolean language plpgsql security definer set search_path = ''
as $$
begin
  update public.event_committees c set
    coordinator_id = case when c.coordinator_id = p_faculty_id then null else c.coordinator_id end,
    second_coordinator_id = case when c.second_coordinator_id = p_faculty_id then null else c.second_coordinator_id end
  where c.id = p_committee_id and public.owns_event_committee(c.id)
    and p_faculty_id in (c.coordinator_id, c.second_coordinator_id);
  return found;
end;
$$;

alter table public.event_committee_updates
  drop constraint event_committee_updates_kind_check,
  drop constraint event_committee_updates_file_object_id_fkey,
  add constraint event_committee_updates_kind_check check (kind in ('REPORT', 'NEED', 'UPDATE', 'MESSAGE')),
  add constraint event_committee_updates_file_object_id_fkey foreign key (file_object_id) references storage.objects(id) on delete set null,
  add column file_removed boolean not null default false;

-- Keep the conversation when its underlying file is removed through Storage.
create function public.clear_removed_committee_file()
returns trigger language plpgsql set search_path = ''
as $$
begin
  if old.file_object_id is not null and new.file_object_id is null then
    new.file_removed := true;
    new.details := case when new.details = '' then 'Attachment removed.' else new.details end;
    new.file_path := null;
    new.file_name := null;
  end if;
  return new;
end;
$$;
create trigger clear_removed_committee_file before update of file_object_id on public.event_committee_updates
for each row execute function public.clear_removed_committee_file();

update storage.buckets set allowed_mime_types = array[
  'application/pdf', 'image/jpeg', 'image/png',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
] where id = 'committee-files';

drop policy "Assigned co-faculty can upload committee files" on storage.objects;
create policy "Committee members can upload files"
on storage.objects for insert to authenticated with check (
  bucket_id = 'committee-files'
  and name ~ '^[a-f0-9-]{36}/[a-f0-9-]{36}/[a-f0-9-]{36}\.(pdf|jpg|png|docx|xlsx)$'
  and split_part(name, '/', 2) = (select auth.uid())::text
  and public.can_access_event_committee(split_part(name, '/', 1), false)
);

drop policy "Assigned co-faculty can clean up pending committee files" on storage.objects;
create policy "Committee leads can remove files and members can clean up their pending uploads"
on storage.objects for delete to authenticated using (
  bucket_id = 'committee-files' and (
    exists (select 1 from public.event_committee_updates u
      where u.file_path = storage.objects.name and public.owns_event_committee(u.committee_id))
    or (
      split_part(name, '/', 2) = (select auth.uid())::text
      and public.can_access_event_committee(split_part(name, '/', 1), false)
      and not exists (select 1 from public.event_committee_updates u where u.file_path = storage.objects.name)
    )
  )
);


create or replace function public.submit_event_committee_update(
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
  join public.profiles actor on actor.id = actor_id and actor.role = 'FACULTY'
  where c.id = p_committee_id and actor_id in (e.created_by, c.coordinator_id, c.second_coordinator_id)
    and e.status = 'OFFICIALLY_APPROVED' and e.vc_approval_document_path is not null
  for update of c;
  if not found then
    raise exception 'Only committee members can post' using errcode = '42501';
  end if;

  if p_update_id is null or p_kind is null or p_kind not in ('REPORT', 'NEED', 'UPDATE', 'MESSAGE')
    or p_title is null or p_title !~ '[^[:space:]]' or char_length(btrim(p_title)) > 120
    or char_length(details) > 4000 or (details = '' and p_file_path is null) then
    raise exception 'Enter a title and add details or a file' using errcode = '22023';
  end if;

  if p_file_path is not null then
    if p_file_path not in (
      concat(p_committee_id, '/', actor_id, '/', p_update_id, '.pdf'),
      concat(p_committee_id, '/', actor_id, '/', p_update_id, '.jpg'),
      concat(p_committee_id, '/', actor_id, '/', p_update_id, '.png'),
      concat(p_committee_id, '/', actor_id, '/', p_update_id, '.docx'),
      concat(p_committee_id, '/', actor_id, '/', p_update_id, '.xlsx')
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

revoke all on function public.owns_event_committee(uuid), public.remove_committee_coordinator(uuid, uuid),
  public.list_event_committees(uuid, uuid), public.search_committee_coordinators(uuid, text),
  public.clear_removed_committee_file() from public, anon, authenticated;
grant execute on function public.owns_event_committee(uuid), public.remove_committee_coordinator(uuid, uuid),
  public.list_event_committees(uuid, uuid), public.search_committee_coordinators(uuid, text) to authenticated;

commit;
