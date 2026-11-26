begin;

create table public.committee_upload_reminders (
  committee_id uuid not null references public.event_committees(id) on delete cascade,
  coordinator_id uuid not null references public.profiles(id) on delete cascade,
  sent_at timestamptz not null default now(),
  primary key (committee_id, coordinator_id)
);

alter table public.committee_upload_reminders enable row level security;
revoke all on public.committee_upload_reminders from public, anon, authenticated;
grant select, insert on public.committee_upload_reminders to service_role;

create function public.due_committee_upload_reminders()
returns table (committee_id uuid, coordinator_id uuid, email text, coordinator_name text,
  committee_name text, event_title text, end_date date)
language sql stable security definer set search_path = ''
as $$
  select c.id, p.id, u.email::text, p.full_name, c.name, e.title, e.end_date
  from public.event_committees c
  join public.events e on e.id = c.event_id
  join public.event_proposals request on request.id = e.proposal_id
  join public.profiles p on p.id in (c.coordinator_id, c.second_coordinator_id)
  join auth.users u on u.id = p.id
  where c.archived_at is null and e.status = 'OFFICIALLY_APPROVED'
    and e.vc_approval_document_path is not null and p.role = 'FACULTY'
    and u.email is not null and u.email_confirmed_at is not null
    and now() >= ((e.end_date + coalesce(request.end_time, time '23:59:59'))
      at time zone 'Asia/Kolkata') + interval '72 hours'
    and not exists (
      select 1 from public.event_committee_updates update_record
      where update_record.committee_id = c.id and update_record.submitted_by = p.id
        and (update_record.file_object_id is not null or update_record.file_removed)
    )
    and not exists (
      select 1 from public.committee_upload_reminders reminder
      where reminder.committee_id = c.id and reminder.coordinator_id = p.id
    )
  order by e.end_date, c.id, p.id;
$$;

revoke all on function public.due_committee_upload_reminders() from public, anon, authenticated;
grant execute on function public.due_committee_upload_reminders() to service_role;

create function public.committee_upload_notifications()
returns table (id uuid, event_id uuid, committee_id uuid, proposal_id uuid,
  event_title text, committee_name text, submitted_by_name text, file_name text, created_at timestamptz)
language sql stable security definer set search_path = ''
as $$
  select u.id, e.id, c.id, e.proposal_id, e.title, c.name, u.submitted_by_name, u.file_name, u.created_at
  from public.event_committee_updates u
  join public.event_committees c on c.id = u.committee_id
  join public.events e on e.id = c.event_id
  join public.profiles owner on owner.id = e.created_by
  where owner.id = (select auth.uid()) and owner.role = 'FACULTY'
    and c.archived_at is null and u.submitted_by <> owner.id
    and u.file_object_id is not null
  order by u.created_at desc, u.id;
$$;

revoke all on function public.committee_upload_notifications() from public, anon;
grant execute on function public.committee_upload_notifications() to authenticated;

commit;
