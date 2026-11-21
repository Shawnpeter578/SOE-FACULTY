begin;

-- The Dean can make a final decision on a submitted request or a legacy review.
alter policy "Dean can review proposals" on public.event_proposals
using ((select public.is_dean()) and status in ('SUBMITTED', 'UNDER_REVIEW', 'CHANGES_REQUESTED'))
with check ((select public.is_dean()) and status in ('APPROVED_BY_DEAN', 'REJECTED'));

create function public.guard_dean_proposal_update()
returns trigger language plpgsql set search_path = ''
as $$
begin
  if public.is_dean() and (to_jsonb(new) - array['status', 'review_note'])
    is distinct from (to_jsonb(old) - array['status', 'review_note']) then
    raise exception 'A dean can only update the decision and review note' using errcode = '42501';
  end if;
  return new;
end;
$$;

-- Run before the existing review and updated-at triggers stamp the decision.
create trigger guard_dean_proposal_update
before update on public.event_proposals
for each row execute function public.guard_dean_proposal_update();

create or replace function public.guard_request_letter()
returns trigger language plpgsql set search_path = ''
as $$
begin
  if old.letter_generated_at is not null
    and (new.review_budget is distinct from old.review_budget
      or new.review_requirements is distinct from old.review_requirements) then
    new.letter_faculty_signed_at := null;
    new.letter_dean_signed_at := null;
    new.letter_dean_signed_by := null;
    new.letter_dean_name := null;
  end if;

  if old.letter_printed_at is null and new.letter_printed_at is not null
    and (new.letter_generated_at is null or new.letter_faculty_signed_at is null) then
    raise exception 'The faculty signature is required before sending to the VC' using errcode = '22023';
  end if;
  return new;
end;
$$;

create or replace function public.update_request_letter(
  p_proposal_id uuid,
  p_action text,
  p_expected_details_at timestamptz default null
)
returns void language plpgsql security definer set search_path = ''
as $$
declare
  actor uuid := auth.uid();
  actor_name text;
  details jsonb;
  request public.event_proposals%rowtype;
  letter public.events%rowtype;
begin
  select full_name into actor_name from public.profiles where id = actor and role = 'FACULTY';
  if not found then
    raise exception 'A faculty account is required' using errcode = '42501';
  end if;

  select * into request from public.event_proposals
  where id = p_proposal_id and status = 'APPROVED_BY_DEAN' and created_by = actor;
  if not found then
    raise exception 'The letter is unavailable for this account' using errcode = '42501';
  end if;

  select * into letter from public.events where proposal_id = p_proposal_id for update;
  if not found or letter.created_by <> request.created_by
    or letter.status <> 'AWAITING_VC_DOCUMENT' or letter.letter_printed_at is not null
    or letter.review_details_at is distinct from p_expected_details_at then
    raise exception 'The letter changed or is no longer editable' using errcode = '22023';
  end if;

  details := coalesce(letter.letter_event_details, jsonb_build_object(
    'department', request.department,
    'startTime', request.start_time,
    'endTime', request.end_time,
    'duration', request.duration,
    'participants', request.expected_participants,
    'audience', request.target_audience,
    'objectives', request.objectives
  )) || jsonb_build_object(
    'deanApprovalName', coalesce(letter.letter_event_details->>'deanApprovalName', (
      select full_name from public.profiles where id = request.reviewed_by
    )),
    'deanApprovedAt', request.reviewed_at
  );

  if p_action = 'sign_letter' then
    if length(btrim(coalesce(actor_name, ''))) = 0 then
      raise exception 'A profile name is required to sign' using errcode = '22023';
    end if;
    if letter.review_details_at is null then
      update public.events set
        review_budget = coalesce(review_budget, request.estimated_budget),
        review_requirements = coalesce(review_requirements, request.special_requirements),
        review_details_at = now()
      where id = letter.id;
    end if;
    update public.events set
      letter_event_details = details,
      letter_generated_at = coalesce(letter_generated_at, now()),
      letter_faculty_name = case when letter_faculty_signed_at is null then actor_name else letter_faculty_name end,
      letter_faculty_signed_at = coalesce(letter_faculty_signed_at, now())
    where id = letter.id;
  elsif p_action = 'confirm_printed' then
    if letter.letter_generated_at is null or letter.letter_faculty_signed_at is null then
      raise exception 'The faculty signature is required' using errcode = '22023';
    end if;
    update public.events set letter_printed_at = now(), letter_event_details = details
    where id = letter.id;
  else
    raise exception 'Invalid letter action' using errcode = '22023';
  end if;
end;
$$;

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
  actor_role public.app_role;
  current_event public.events%rowtype;
  decision_note text := nullif(btrim(p_note), '');
begin
  select role into actor_role from public.profiles where id = actor;
  if actor_role is null or actor_role not in ('FACULTY', 'VC') then
    raise exception 'This account cannot update an event approval' using errcode = '42501';
  end if;

  select e.* into current_event from public.events e
  join public.event_proposals p on p.id = e.proposal_id
  where e.proposal_id = p_proposal_id and p.status = 'APPROVED_BY_DEAN'
    and (actor_role <> 'FACULTY' or (e.created_by = actor and p.created_by = actor))
    and (actor_role <> 'VC' or e.letter_printed_at is not null)
  for update of e;

  if not found then
    raise exception 'This event is unavailable for this account' using errcode = '42501';
  end if;
  if current_event.status <> 'AWAITING_VC_DOCUMENT' then
    raise exception 'This event is already closed or locked' using errcode = '22023';
  end if;

  if actor_role = 'FACULTY' then
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
  elsif actor_role = 'VC' and current_event.letter_printed_at is not null and current_event.vc_decision is null
      and p_action in ('vc_approve', 'vc_reject') then
    if char_length(decision_note) > 3000 or (p_action = 'vc_reject' and decision_note is null) then
      raise exception 'A reason is required to decline a request' using errcode = '22023';
    end if;
    update public.events set
      vc_decision = case when p_action = 'vc_approve' then 'APPROVED' else 'REJECTED' end,
      vc_note = decision_note, vc_decided_at = now(), vc_decided_by = actor,
      status = case when p_action = 'vc_reject' then 'REJECTED_BY_VC'::public.event_status else current_event.status end
    where id = current_event.id;
    return;
  end if;

  raise exception 'This action is unavailable at the current approval stage' using errcode = '22023';
end;
$$;

-- The VC owns new decision evidence. Keep read access to existing documents.
drop policy "Dean can upload event documents" on storage.objects;
drop policy "Dean can update event documents" on storage.objects;
drop policy "Dean can delete event documents" on storage.objects;

create function public.vc_can_access_event_evidence(document_path text)
returns boolean language sql stable security invoker set search_path = ''
as $$
  select exists (select 1 from public.profiles where id = (select auth.uid()) and role = 'VC')
    and exists (
      select 1 from public.events
      where id::text = split_part(document_path, '/', 1) and letter_printed_at is not null
    );
$$;
revoke all on function public.vc_can_access_event_evidence(text) from public, anon, authenticated;
grant execute on function public.vc_can_access_event_evidence(text) to authenticated;

create policy "VC can read evidence for printed requests"
on storage.objects for select to authenticated
using (bucket_id = 'event-documents' and public.vc_can_access_event_evidence(name));

create policy "VC can upload evidence for printed requests"
on storage.objects for insert to authenticated
with check (bucket_id = 'event-documents' and public.vc_can_access_event_evidence(name));

create policy "VC can clean up unrecorded evidence"
on storage.objects for delete to authenticated
using (bucket_id = 'event-documents' and public.vc_can_access_event_evidence(name));

-- Old links and clients cannot submit a decision on behalf of the VC.
drop function public.record_dean_vc_decision(uuid, text, text, text, text);

create function public.record_vc_decision(
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
  vc_name text;
  current_event public.events%rowtype;
  reason text := nullif(regexp_replace(p_reason, '^[[:space:]]+|[[:space:]]+$', '', 'g'), '');
begin
  select full_name into vc_name from public.profiles where id = actor and role = 'VC';
  if not found then
    raise exception 'Only the Vice-Chancellor can record this decision' using errcode = '42501';
  end if;

  select e.* into current_event from public.events e
  join public.event_proposals p on p.id = e.proposal_id
  where e.proposal_id = p_proposal_id and p.status = 'APPROVED_BY_DEAN'
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
    vc_decided_by = coalesce(current_event.vc_decided_by, actor),
    vc_recorded_at = now(),
    vc_recorded_by = actor,
    vc_recorded_by_name = vc_name,
    vc_recorded_file_name = case when p_document_path is not null then left(nullif(btrim(p_file_name), ''), 255) end,
    vc_approval_document_path = case when p_decision = 'APPROVED' then p_document_path end,
    vc_document_uploaded_at = case when p_decision = 'APPROVED' then now() end,
    vc_document_uploaded_by = case when p_decision = 'APPROVED' then actor end,
    vc_rejection_proof_path = case when p_decision = 'REJECTED' then p_document_path end
  where id = current_event.id;
end;
$$;

revoke all on function public.record_vc_decision(uuid, text, text, text, text) from public, anon, authenticated;
grant execute on function public.record_vc_decision(uuid, text, text, text, text) to authenticated;

commit;
