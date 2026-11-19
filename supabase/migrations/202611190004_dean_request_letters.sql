begin;

alter table public.events
  add column letter_faculty_signed_at timestamptz,
  add column letter_dean_name text,
  add column letter_dean_signed_at timestamptz,
  add column letter_dean_signed_by uuid references public.profiles(id),
  add column letter_event_details jsonb;

create function public.guard_request_letter()
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
    and (new.letter_faculty_signed_at is null or new.letter_dean_signed_at is null) then
    raise exception 'Both signatures are required before sending to the VC' using errcode = '22023';
  end if;
  return new;
end;
$$;

create trigger guard_request_letter
before update of review_budget, review_requirements, letter_printed_at on public.events
for each row execute function public.guard_request_letter();

-- Resolve both identity and permission on the server, and serialize updates to
-- a single event so the faculty and dean can sign in either order.
create function public.update_request_letter(
  p_proposal_id uuid,
  p_action text,
  p_expected_details_at timestamptz default null
)
returns void language plpgsql security definer set search_path = ''
as $$
declare
  actor uuid := auth.uid();
  actor_role public.app_role;
  actor_name text;
  request public.event_proposals%rowtype;
  letter public.events%rowtype;
begin
  select role, full_name into actor_role, actor_name from public.profiles where id = actor;
  if actor_role is null or actor_role not in ('DEAN', 'FACULTY') then
    raise exception 'A faculty or dean account is required' using errcode = '42501';
  end if;

  select * into request from public.event_proposals
  where id = p_proposal_id and status = 'APPROVED_BY_DEAN';
  if not found or (actor_role = 'FACULTY' and request.created_by <> actor)
    or (actor_role = 'DEAN' and request.reviewed_by is not null and request.reviewed_by <> actor) then
    raise exception 'The letter is unavailable for this account' using errcode = '42501';
  end if;

  select * into letter from public.events where proposal_id = p_proposal_id for update;
  if not found or letter.created_by <> request.created_by
    or letter.status <> 'AWAITING_VC_DOCUMENT' or letter.letter_printed_at is not null
    or letter.review_details_at is distinct from p_expected_details_at then
    raise exception 'The letter changed or is no longer editable' using errcode = '22023';
  end if;

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
    if letter.letter_event_details is null then
      update public.events set letter_event_details = jsonb_build_object(
        'department', request.department,
        'startTime', request.start_time,
        'endTime', request.end_time,
        'duration', request.duration,
        'participants', request.expected_participants,
        'audience', request.target_audience,
        'objectives', request.objectives
      ) where id = letter.id;
    end if;
    if actor_role = 'FACULTY' then
      update public.events set
        letter_generated_at = coalesce(letter_generated_at, now()),
        letter_faculty_name = case when letter_faculty_signed_at is null then actor_name else letter_faculty_name end,
        letter_faculty_signed_at = coalesce(letter_faculty_signed_at, now())
      where id = letter.id;
    else
      update public.events set
        letter_generated_at = coalesce(letter_generated_at, now()),
        letter_dean_name = case when letter_dean_signed_at is null then actor_name else letter_dean_name end,
        letter_dean_signed_by = coalesce(letter_dean_signed_by, actor),
        letter_dean_signed_at = coalesce(letter_dean_signed_at, now())
      where id = letter.id;
    end if;
  elsif p_action = 'confirm_printed' then
    if letter.letter_generated_at is null or letter.letter_faculty_signed_at is null
      or letter.letter_dean_signed_at is null then
      raise exception 'Both signatures are required' using errcode = '22023';
    end if;
    update public.events set letter_printed_at = now() where id = letter.id;
  else
    raise exception 'Invalid letter action' using errcode = '22023';
  end if;
end;
$$;

revoke all on function public.update_request_letter(uuid, text, timestamptz) from public, anon, authenticated;
grant execute on function public.update_request_letter(uuid, text, timestamptz) to authenticated;

commit;
