begin;

alter table public.events
  add column vc_rejection_proof_path text,
  add column vc_recorded_by uuid references public.profiles(id),
  add column vc_recorded_at timestamptz,
  add column vc_recorded_by_name text,
  add column vc_recorded_file_name text;

create or replace function public.is_locked_event_document(document_path text)
returns boolean language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.events
    where vc_approval_document_path = document_path or vc_rejection_proof_path = document_path
  );
$$;

create function public.record_dean_vc_decision(
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
  dean_name text;
  current_event public.events%rowtype;
  reason text := nullif(regexp_replace(p_reason, '^[[:space:]]+|[[:space:]]+$', '', 'g'), '');
begin
  select full_name into dean_name from public.profiles where id = actor and role = 'DEAN';
  if not found then
    raise exception 'Only a Dean can record the VC decision' using errcode = '42501';
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
    vc_recorded_by_name = dean_name,
    vc_recorded_file_name = case when p_document_path is not null then left(nullif(btrim(p_file_name), ''), 255) end,
    vc_approval_document_path = case when p_decision = 'APPROVED' then p_document_path end,
    vc_document_uploaded_at = case when p_decision = 'APPROVED' then now() end,
    vc_document_uploaded_by = case when p_decision = 'APPROVED' then actor end,
    vc_rejection_proof_path = case when p_decision = 'REJECTED' then p_document_path end
  where id = current_event.id;
end;
$$;

revoke all on function public.record_dean_vc_decision(uuid, text, text, text, text) from public, anon, authenticated;
grant execute on function public.record_dean_vc_decision(uuid, text, text, text, text) to authenticated;

commit;
