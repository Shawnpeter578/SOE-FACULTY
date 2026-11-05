
-- Private storage bucket for EventDesk documents

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'event-documents',
  'event-documents',
  false,
  20971520, -- 20 MB
  array[
    'application/pdf',
    'image/jpeg',
    'image/png'
  ]
)
on conflict (id) do update
set
  public = false,
  file_size_limit = 20971520,
  allowed_mime_types = excluded.allowed_mime_types;

-- Dean can upload documents for any event.

create policy "Dean can upload event documents"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'event-documents'
  and exists (
    select 1
    from public.profiles
    where id = (select auth.uid())
      and role = 'DEAN'
  )
);

-- Dean can view all event documents.
-- Faculty can view documents belonging to their own events.

create policy "Authorized users can view event documents"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'event-documents'
  and (
    exists (
      select 1
      from public.profiles
      where id = (select auth.uid())
        and role = 'DEAN'
    )
    or exists (
      select 1
      from public.events e
      join public.event_proposals p
        on p.id = e.proposal_id
      where p.created_by = (select auth.uid())
        and e.id::text = (storage.foldername(name))[1]
    )
  )
);

-- Only Dean can replace or delete documents.

create policy "Dean can update event documents"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'event-documents'
  and exists (
    select 1
    from public.profiles
    where id = (select auth.uid())
      and role = 'DEAN'
  )
)
with check (
  bucket_id = 'event-documents'
  and exists (
    select 1
    from public.profiles
    where id = (select auth.uid())
      and role = 'DEAN'
  )
);

create policy "Dean can delete event documents"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'event-documents'
  and exists (
    select 1
    from public.profiles
    where id = (select auth.uid())
      and role = 'DEAN'
  )
);
