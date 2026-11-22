begin;

alter table public.event_committees add column archived_at timestamptz;

drop index public.event_committees_event_name_idx;
create unique index event_committees_event_name_idx
  on public.event_committees(event_id, lower(name)) where archived_at is null;

create or replace function public.owns_event_committee(p_committee_id uuid)
returns boolean language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.event_committees c
    join public.events e on e.id = c.event_id
    join public.profiles p on p.id = e.created_by and p.role = 'FACULTY'
    where c.id = p_committee_id and c.archived_at is null and p.id = (select auth.uid())
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
      and c.archived_at is null and e.status = 'OFFICIALLY_APPROVED' and e.vc_approval_document_path is not null
      and (actor.id in (c.coordinator_id, c.second_coordinator_id) or (not p_coordinator_only and e.created_by = actor.id))
  );
$$;

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
  where c.archived_at is null and e.status = 'OFFICIALLY_APPROVED' and e.vc_approval_document_path is not null
    and (p_committee_id is null or c.id = p_committee_id)
    and ((p_event_id is null and actor.id in (coordinator.id, second.id))
      or (p_event_id = e.id and e.created_by = actor.id))
  order by e.start_date, e.title, c.name, c.id;
$$;

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
      where c.id = p_committee_id and c.archived_at is null and actor.id = (select auth.uid())
        and e.status = 'OFFICIALLY_APPROVED' and e.vc_approval_document_path is not null
    )
  order by p.full_name, p.id
  limit 15;
$$;

create or replace function public.create_event_committee(p_event_id uuid, p_name text, p_responsibilities text)
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
  on conflict (event_id, lower(name)) where archived_at is null do nothing;
  return found;
end;
$$;

create or replace function public.preview_event_report(p_event_id uuid)
returns table (
  dean_id uuid, dean_name text, file_ids uuid[], committee_count integer, missing_committees text[],
  revision text, last_sent_at timestamptz, already_sent boolean
)
language sql stable security definer set search_path = ''
as $$
  select dean.id, dean.full_name, files.ids, committees.total, committees.missing,
    md5(files.ids::text),
    (select max(s.submitted_at) from public.event_report_submissions s where s.event_id = e.id),
    exists (select 1 from public.event_report_submissions s where s.event_id = e.id and s.revision = md5(files.ids::text))
  from public.events e
  join public.profiles actor on actor.id = e.created_by and actor.id = (select auth.uid()) and actor.role = 'FACULTY'
  join public.event_proposals p on p.id = e.proposal_id and p.status = 'APPROVED_BY_DEAN'
  left join public.profiles dean on dean.id = p.reviewed_by and dean.role = 'DEAN'
  cross join lateral (
    select coalesce(array_agg(u.id order by u.id), '{}'::uuid[]) as ids
    from public.event_committees c
    join public.event_committee_updates u on u.committee_id = c.id and u.file_object_id is not null
    where c.event_id = e.id and c.archived_at is null
  ) files
  cross join lateral (
    select count(*)::integer as total,
      coalesce(array_agg(c.name order by c.name) filter (where not exists (
        select 1 from public.event_committee_updates u where u.committee_id = c.id and u.file_object_id is not null
      )), '{}'::text[]) as missing
    from public.event_committees c where c.event_id = e.id and c.archived_at is null
  ) committees
  where e.id = p_event_id and e.status = 'OFFICIALLY_APPROVED' and e.vc_approval_document_path is not null;
$$;

create function public.edit_event_committee(p_committee_id uuid, p_name text, p_responsibilities text)
returns boolean language plpgsql security definer set search_path = ''
as $$
begin
  if p_name is null or p_name !~ '[^[:space:]]' or char_length(btrim(p_name)) > 80
    or char_length(btrim(p_responsibilities)) > 1500 then
    raise exception 'Enter a valid committee name and responsibilities' using errcode = '22023';
  end if;

  update public.event_committees set
    name = btrim(p_name), responsibilities = coalesce(btrim(p_responsibilities), '')
  where id = p_committee_id and archived_at is null and public.owns_event_committee(id);
  return found;
end;
$$;

-- Preserve the material referenced by sent reports and remove the committee from active workspaces.
create function public.archive_event_committee(p_committee_id uuid)
returns uuid language plpgsql security definer set search_path = ''
as $$
declare
  archived_event uuid;
begin
  perform 1 from public.events e join public.event_committees c on c.event_id = e.id
  where c.id = p_committee_id and public.owns_event_committee(c.id)
  for update of e;
  if not found then return null; end if;

  update public.event_committees set archived_at = now()
  where id = p_committee_id and archived_at is null and public.owns_event_committee(id)
  returning event_id into archived_event;
  return archived_event;
end;
$$;

revoke all on function public.edit_event_committee(uuid, text, text), public.archive_event_committee(uuid)
from public, anon, authenticated;
grant execute on function public.edit_event_committee(uuid, text, text), public.archive_event_committee(uuid)
to authenticated;

update storage.buckets set allowed_mime_types = array[
  'application/pdf', 'image/jpeg', 'image/png', 'image/gif', 'image/webp',
  'application/msword', 'application/vnd.ms-excel', 'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/vnd.oasis.opendocument.text', 'application/vnd.oasis.opendocument.spreadsheet',
  'application/vnd.oasis.opendocument.presentation', 'application/rtf',
  'text/csv', 'text/tab-separated-values', 'text/plain', 'text/markdown', 'application/json', 'application/xml'
] where id = 'committee-files';

drop policy "Committee members can upload files" on storage.objects;
create policy "Committee members can upload files"
on storage.objects for insert to authenticated with check (
  bucket_id = 'committee-files'
  and name ~ '^[a-f0-9-]{36}/[a-f0-9-]{36}/[a-f0-9-]{36}\.(pdf|jpg|jpeg|png|gif|webp|doc|docx|xls|xlsx|ppt|pptx|odt|ods|odp|rtf|csv|tsv|txt|md|json|xml)$'
  and split_part(name, '/', 2) = (select auth.uid())::text
  and public.can_access_event_committee(split_part(name, '/', 1), false)
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
  where c.id = p_committee_id and c.archived_at is null and actor_id in (e.created_by, c.coordinator_id, c.second_coordinator_id)
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
    if p_file_path !~ (
      '^' || p_committee_id || '/' || actor_id || '/' || p_update_id || '\.(pdf|jpg|jpeg|png|gif|webp|doc|docx|xls|xlsx|ppt|pptx|odt|ods|odp|rtf|csv|tsv|txt|md|json|xml)$'
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

commit;
