begin;

create table public.event_report_submissions (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id),
  event_title text not null,
  faculty_id uuid not null references public.profiles(id),
  faculty_name text not null,
  dean_id uuid not null references public.profiles(id),
  dean_name text not null,
  revision text not null,
  file_count integer not null check (file_count > 0),
  submitted_at timestamptz not null default now(),
  unique (event_id, revision)
);
create index event_reports_dean_inbox_idx on public.event_report_submissions (dean_id, submitted_at desc, id);
create index event_reports_event_history_idx on public.event_report_submissions (event_id, submitted_at desc, id);

create table public.event_report_files (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null references public.event_report_submissions(id),
  update_id uuid not null references public.event_committee_updates(id),
  file_object_id uuid not null references storage.objects(id),
  committee_name text not null,
  file_name text not null,
  file_path text not null,
  submitted_by_name text not null,
  unique (submission_id, update_id)
);
create index event_report_files_path_idx on public.event_report_files(file_path);
create index event_report_files_object_idx on public.event_report_files(file_object_id);
create index event_report_files_update_idx on public.event_report_files(update_id);

alter table public.event_report_submissions enable row level security;
alter table public.event_report_files enable row level security;
revoke all on public.event_report_submissions, public.event_report_files from public, anon, authenticated;
grant select on public.event_report_submissions, public.event_report_files to authenticated;

create policy "Report senders and recipients can read submissions"
on public.event_report_submissions for select to authenticated using (
  exists (
    select 1 from public.profiles p where p.id = (select auth.uid())
      and ((p.id = faculty_id and p.role = 'FACULTY') or (p.id = dean_id and p.role = 'DEAN'))
  )
);

create policy "Report senders and recipients can read submitted files"
on public.event_report_files for select to authenticated using (
  exists (select 1 from public.event_report_submissions s where s.id = submission_id)
);

create function public.is_submitted_report_file(p_path text)
returns boolean language sql stable security definer set search_path = ''
as $$
  select exists (select 1 from public.event_report_files where file_path = p_path);
$$;
revoke all on function public.is_submitted_report_file(text) from public, anon, authenticated;
grant execute on function public.is_submitted_report_file(text) to authenticated;

create policy "Submitted report files are protected from deletion"
on storage.objects as restrictive for delete to authenticated using (
  bucket_id <> 'committee-files' or not public.is_submitted_report_file(name)
);

create policy "Deans can download files sent to them in reports"
on storage.objects for select to authenticated using (
  bucket_id = 'committee-files' and exists (
    select 1 from public.event_report_files f
    join public.event_report_submissions s on s.id = f.submission_id
    where f.file_object_id = storage.objects.id and s.dean_id = (select auth.uid())
  )
);

create function public.preview_event_report(p_event_id uuid)
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
    where c.event_id = e.id
  ) files
  cross join lateral (
    select count(*)::integer as total,
      coalesce(array_agg(c.name order by c.name) filter (where not exists (
        select 1 from public.event_committee_updates u where u.committee_id = c.id and u.file_object_id is not null
      )), '{}'::text[]) as missing
    from public.event_committees c where c.event_id = e.id
  ) committees
  where e.id = p_event_id and e.status = 'OFFICIALLY_APPROVED' and e.vc_approval_document_path is not null;
$$;

create function public.submit_event_report(p_event_id uuid, p_expected_revision text)
returns uuid language plpgsql security definer set search_path = ''
as $$
declare
  event_row public.events%rowtype;
  draft record;
  package_id uuid;
  inserted_count integer;
begin
  select e.* into event_row from public.events e
  join public.profiles actor on actor.id = e.created_by and actor.role = 'FACULTY'
  where e.id = p_event_id and actor.id = (select auth.uid())
    and e.status = 'OFFICIALLY_APPROVED' and e.vc_approval_document_path is not null
  for update of e;
  if not found then
    raise exception 'Only the event lead can send reports' using errcode = '42501';
  end if;

  select * into draft from public.preview_event_report(p_event_id);
  if not found or draft.dean_id is null or cardinality(draft.file_ids) = 0 or cardinality(draft.missing_committees) > 0 then
    raise exception 'Every committee needs a file and the event needs an approving dean' using errcode = '22023';
  end if;
  if p_expected_revision is distinct from draft.revision then
    raise exception 'The report files changed' using errcode = '40001';
  end if;

  insert into public.event_report_submissions (event_id, event_title, faculty_id, faculty_name, dean_id, dean_name, revision, file_count)
  values (event_row.id, event_row.title, event_row.created_by,
    (select full_name from public.profiles where id = event_row.created_by),
    draft.dean_id, draft.dean_name, draft.revision, cardinality(draft.file_ids))
  on conflict (event_id, revision) do nothing returning id into package_id;

  if package_id is null then
    select id into package_id from public.event_report_submissions
    where event_id = p_event_id and revision = draft.revision;
    return package_id;
  end if;

  insert into public.event_report_files (submission_id, update_id, file_object_id, committee_name, file_name, file_path, submitted_by_name)
  select package_id, u.id, u.file_object_id, c.name, u.file_name, u.file_path, u.submitted_by_name
  from public.event_committee_updates u
  join public.event_committees c on c.id = u.committee_id and c.event_id = p_event_id
  where u.id = any(draft.file_ids) and u.file_object_id is not null;
  get diagnostics inserted_count = row_count;
  if inserted_count <> cardinality(draft.file_ids) then
    raise exception 'The report files changed' using errcode = '40001';
  end if;
  return package_id;
end;
$$;

revoke all on function public.preview_event_report(uuid), public.submit_event_report(uuid, text) from public, anon, authenticated;
grant execute on function public.preview_event_report(uuid), public.submit_event_report(uuid, text) to authenticated;

commit;
