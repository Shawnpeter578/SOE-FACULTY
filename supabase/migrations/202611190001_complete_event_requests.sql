-- Persist every field collected by the faculty New Event Request wizard.
begin;

alter table public.event_proposals
  add column event_type text not null default 'Workshop'
    check (event_type in ('Workshop', 'Technical', 'Cultural', 'Sports', 'Other')),
  add column resource_person text not null default '',
  add column start_time time,
  add column end_time time,
  add column duration text not null default '',
  add column department text not null default '',
  add column expected_participants integer check (expected_participants between 1 and 1000000),
  add column target_audience text not null default '',
  add column sponsorship_expected boolean not null default false,
  add column special_requirements text not null default '',
  add column attachments jsonb not null default '[]'::jsonb
    check (jsonb_typeof(attachments) = 'array' and jsonb_array_length(attachments) <= 3),
  add constraint valid_event_request_times
    check (start_date <> end_date or start_time is null or end_time is null or end_time > start_time);

-- Existing migrations grant writes by column rather than by table.
grant insert (
  event_type, resource_person, start_time, end_time, duration, department,
  expected_participants, target_audience, sponsorship_expected, special_requirements, attachments
) on public.event_proposals to authenticated;

grant update (
  event_type, resource_person, start_time, end_time, duration, department,
  expected_participants, target_audience, sponsorship_expected, special_requirements
) on public.event_proposals to authenticated;

-- A definer function avoids recursive profile RLS when the dean reads authors' names.
create or replace function public.is_dean()
returns boolean
language sql stable security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles
    where id = (select auth.uid()) and role = 'DEAN'
  );
$$;
revoke all on function public.is_dean() from public, anon;
grant execute on function public.is_dean() to authenticated;

create policy "Dean can read faculty profiles"
on public.profiles for select to authenticated
using (role = 'FACULTY' and (select public.is_dean()));

-- Separate private storage for proposal attachments; official letters keep their existing bucket.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'proposal-attachments', 'proposal-attachments', false, 5242880,
  array['application/pdf', 'image/jpeg', 'image/png']
)
on conflict (id) do update set
  public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy "Faculty can upload own proposal attachments"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'proposal-attachments'
  and (storage.foldername(name))[1] = (select auth.uid())::text
  and exists (select 1 from public.profiles where id = (select auth.uid()) and role = 'FACULTY')
);

create policy "Faculty and dean can read authorized proposal attachments"
on storage.objects for select to authenticated
using (
  bucket_id = 'proposal-attachments'
  and (
    (storage.foldername(name))[1] = (select auth.uid())::text
    or (select public.is_dean())
  )
);

-- Failed submissions can remove uploaded objects, but submitted attachments remain immutable.
create policy "Faculty can clean up unsubmitted attachments"
on storage.objects for delete to authenticated
using (
  bucket_id = 'proposal-attachments'
  and (storage.foldername(name))[1] = (select auth.uid())::text
  and not exists (
    select 1 from public.event_proposals p
    where p.created_by = (select auth.uid())
      and p.attachments @> jsonb_build_array(jsonb_build_object('path', storage.objects.name))
  )
);

commit;
