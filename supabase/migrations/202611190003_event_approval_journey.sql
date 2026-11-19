begin;

alter type public.event_status add value if not exists 'REJECTED_BY_VC';

alter table public.events
  add column letter_generated_at timestamptz,
  add column letter_faculty_name text,
  add column review_budget numeric(12,2) check (review_budget >= 0),
  add column review_requirements text,
  add column review_details_at timestamptz,
  add column letter_printed_at timestamptz,
  add column vc_decision text check (vc_decision in ('APPROVED', 'REJECTED')),
  add column vc_note text,
  add column vc_decided_at timestamptz,
  add column vc_decided_by uuid references public.profiles(id);

create policy "VC can read events sent for decision"
on public.events for select to authenticated
using (letter_printed_at is not null and exists (
  select 1 from public.profiles where id = (select auth.uid()) and role = 'VC'
));

create or replace function public.is_locked_event_document(document_path text)
returns boolean language sql stable security definer set search_path = ''
as $$
  select exists (select 1 from public.events where vc_approval_document_path = document_path);
$$;

revoke all on function public.is_locked_event_document(text) from public, anon, authenticated;
grant execute on function public.is_locked_event_document(text) to authenticated;

create policy "Locked event documents cannot be updated"
on storage.objects as restrictive for update to authenticated
using (bucket_id <> 'event-documents' or not public.is_locked_event_document(name))
with check (bucket_id <> 'event-documents' or not public.is_locked_event_document(name));

create policy "Locked event documents cannot be deleted"
on storage.objects as restrictive for delete to authenticated
using (bucket_id <> 'event-documents' or not public.is_locked_event_document(name));

create function public.advance_event_approval(
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
  if actor_role is null or actor_role not in ('FACULTY', 'DEAN', 'VC') then
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
  elsif actor_role = 'DEAN' and p_action = 'lock_document' and current_event.vc_decision = 'APPROVED'
      and current_event.vc_approval_document_path is null then
    if p_document_path is null or split_part(p_document_path, '/', 1) <> current_event.id::text
      or p_document_path !~ '^[0-9a-f-]+/[0-9a-f-]+\.pdf$'
      or not exists (select 1 from storage.objects where bucket_id = 'event-documents' and name = p_document_path) then
      raise exception 'The approval PDF is unavailable' using errcode = '22023';
    end if;
    update public.events set vc_approval_document_path = p_document_path, vc_document_uploaded_at = now(),
      vc_document_uploaded_by = actor, status = 'OFFICIALLY_APPROVED'
    where id = current_event.id;
    return;
  end if;

  raise exception 'This action is unavailable at the current approval stage' using errcode = '22023';
end;
$$;

revoke all on function public.advance_event_approval(uuid, text, numeric, text, text, text) from public, anon, authenticated;
grant execute on function public.advance_event_approval(uuid, text, numeric, text, text, text) to authenticated;

commit;
