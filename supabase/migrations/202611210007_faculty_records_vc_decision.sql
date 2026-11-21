begin;

drop function public.record_vc_decision(uuid, text, text, text, text);
drop policy "VC can read events sent for decision" on public.events;
drop policy "VC can read evidence for printed requests" on storage.objects;
drop policy "VC can upload evidence for printed requests" on storage.objects;
drop policy "VC can clean up unrecorded evidence" on storage.objects;
drop function public.vc_can_access_event_evidence(text);

-- Preserve the letter actions used by existing faculty clients.
create or replace function public.advance_event_approval(
  p_proposal_id uuid,
  p_action text,
  p_budget numeric default null,
  p_requirements text default null,
  p_note text default null,
  p_document_path text default null
)
returns void language plpgsql security definer set search_path = ''
as $$
declare
  actor uuid := auth.uid();
  current_event public.events%rowtype;
begin
  if not exists (select 1 from public.profiles where id = actor and role = 'FACULTY') then
    raise exception 'This account cannot update an event approval' using errcode = '42501';
  end if;

  select e.* into current_event from public.events e
  join public.event_proposals p on p.id = e.proposal_id
  where e.proposal_id = p_proposal_id and p.status = 'APPROVED_BY_DEAN'
    and e.created_by = actor and p.created_by = actor
  for update of e;

  if not found then
    raise exception 'This event is unavailable for this account' using errcode = '42501';
  end if;
  if current_event.status <> 'AWAITING_VC_DOCUMENT' then
    raise exception 'This event is already closed or locked' using errcode = '22023';
  end if;

  if p_action = 'generate_letter' and current_event.letter_generated_at is null then
    update public.events set letter_generated_at = now(),
      letter_faculty_name = (select full_name from public.profiles where id = actor)
    where id = current_event.id;
    return;
  elsif p_action = 'save_details' and current_event.letter_generated_at is not null and current_event.letter_printed_at is null then
    if p_budget is null or p_budget < 0 or p_budget > 9999999999.99 or p_budget <> round(p_budget, 2)
      or p_requirements is null or char_length(btrim(p_requirements)) not between 1 and 3000 then
      raise exception 'A valid budget and requirements are required' using errcode = '22023';
    end if;
    update public.events set review_budget = p_budget, review_requirements = btrim(p_requirements), review_details_at = now()
    where id = current_event.id;
    return;
  elsif p_action = 'mark_printed' and current_event.review_details_at is not null and current_event.letter_printed_at is null then
    update public.events set letter_printed_at = now() where id = current_event.id;
    return;
  end if;

  raise exception 'This action is unavailable at the current approval stage' using errcode = '22023';
end;
$$;

create policy "Faculty can upload VC evidence for their printed requests"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'event-documents'
  and name ~ '^[0-9a-f-]{36}/[0-9a-f-]{36}\.(pdf|png|jpg)$'
  and exists (select 1 from public.profiles where id = (select auth.uid()) and role = 'FACULTY')
  and exists (
    select 1 from public.events e
    join public.event_proposals p on p.id = e.proposal_id
    where e.id::text = split_part(storage.objects.name, '/', 1)
      and e.created_by = (select auth.uid()) and p.created_by = (select auth.uid())
      and p.status = 'APPROVED_BY_DEAN'
      and e.status = 'AWAITING_VC_DOCUMENT' and e.letter_printed_at is not null
  )
);

-- The existing restrictive policy protects any file already recorded on an event.
create policy "Faculty can clean up their unrecorded VC evidence"
on storage.objects for delete to authenticated
using (
  bucket_id = 'event-documents'
  and name ~ '^[0-9a-f-]{36}/[0-9a-f-]{36}\.(pdf|png|jpg)$'
  and exists (select 1 from public.profiles where id = (select auth.uid()) and role = 'FACULTY')
  and exists (
    select 1 from public.events e
    join public.event_proposals p on p.id = e.proposal_id
    where e.id::text = split_part(storage.objects.name, '/', 1)
      and e.created_by = (select auth.uid()) and p.created_by = (select auth.uid())
      and p.status = 'APPROVED_BY_DEAN' and e.letter_printed_at is not null
  )
);

-- The faculty owner records the VC's outcome. Keep legacy VC attribution where present.
create function public.record_faculty_vc_decision(
  p_proposal_id uuid,
  p_decision text,
  p_reason text default null,
  p_document_path text default null,
  p_file_name text default null
)
returns void language plpgsql security definer set search_path = ''
as $$
declare
  actor uuid := auth.uid();
  faculty_name text;
  current_event public.events%rowtype;
  reason text := nullif(regexp_replace(p_reason, '^[[:space:]]+|[[:space:]]+$', '', 'g'), '');
begin
  select full_name into faculty_name from public.profiles where id = actor and role = 'FACULTY';
  if not found then
    raise exception 'Only faculty can record this decision' using errcode = '42501';
  end if;

  select e.* into current_event from public.events e
  join public.event_proposals p on p.id = e.proposal_id
  where e.proposal_id = p_proposal_id and p.status = 'APPROVED_BY_DEAN'
    and e.created_by = actor and p.created_by = actor
  for update of e;

  if not found or current_event.letter_printed_at is null or current_event.status <> 'AWAITING_VC_DOCUMENT' then
    raise exception 'This event is unavailable for a VC decision' using errcode = '22023';
  end if;
  if p_decision is null or p_decision not in ('APPROVED', 'REJECTED')
    or (current_event.vc_decision is not null and current_event.vc_decision <> p_decision) then
    raise exception 'The selected outcome is unavailable' using errcode = '22023';
  end if;
  if p_decision = 'REJECTED' and (reason is null or char_length(reason) > 3000) then
    raise exception 'Enter the VC rejection reason (up to 3000 characters)' using errcode = '22023';
  end if;
  if p_decision = 'APPROVED' and p_document_path is null then
    raise exception 'A VC-signed copy is required' using errcode = '22023';
  end if;
  if p_document_path is not null then
    if split_part(p_document_path, '/', 1) <> current_event.id::text
      or p_document_path !~ '^[0-9a-f-]{36}/[0-9a-f-]{36}\.(pdf|png|jpg)$' then
      raise exception 'The uploaded document is unavailable for this event' using errcode = '22023';
    end if;
    perform 1 from storage.objects
    where bucket_id = 'event-documents' and name = p_document_path
    for share;
    if not found then
      raise exception 'The uploaded document is unavailable for this event' using errcode = '22023';
    end if;
  end if;

  update public.events set
    status = case when p_decision = 'APPROVED' then 'OFFICIALLY_APPROVED'::public.event_status else 'REJECTED_BY_VC'::public.event_status end,
    vc_decision = p_decision,
    vc_note = case when p_decision = 'REJECTED' then reason else current_event.vc_note end,
    vc_decided_at = coalesce(current_event.vc_decided_at, now()),
    vc_recorded_at = now(),
    vc_recorded_by = actor,
    vc_recorded_by_name = faculty_name,
    vc_recorded_file_name = case when p_document_path is not null then left(nullif(btrim(p_file_name), ''), 255) end,
    vc_approval_document_path = case when p_decision = 'APPROVED' then p_document_path end,
    vc_document_uploaded_at = case when p_decision = 'APPROVED' then now() end,
    vc_document_uploaded_by = case when p_decision = 'APPROVED' then actor end,
    vc_rejection_proof_path = case when p_decision = 'REJECTED' then p_document_path end
  where id = current_event.id;
end;
$$;

revoke all on function public.record_faculty_vc_decision(uuid, text, text, text, text) from public, anon, authenticated;
grant execute on function public.record_faculty_vc_decision(uuid, text, text, text, text) to authenticated;

commit;
