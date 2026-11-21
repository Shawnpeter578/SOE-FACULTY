begin;

alter table public.events
  add column letter_body text check (char_length(letter_body) between 1 and 12000),
  add column letter_closing text check (char_length(letter_closing) <= 3000);

create function public.prepare_request_letter(
  p_proposal_id uuid,
  p_action text,
  p_body text,
  p_closing text,
  p_expected_details_at timestamptz default null
)
returns void language plpgsql security definer set search_path = ''
as $$
declare
  actor uuid := auth.uid();
  request public.event_proposals%rowtype;
  letter public.events%rowtype;
begin
  if not exists (select 1 from public.profiles where id = actor and role = 'FACULTY') then
    raise exception 'A faculty account is required' using errcode = '42501';
  end if;

  select * into request from public.event_proposals
  where id = p_proposal_id and created_by = actor and status = 'APPROVED_BY_DEAN';
  if not found then
    raise exception 'The letter is unavailable for this account' using errcode = '42501';
  end if;

  select * into letter from public.events where proposal_id = request.id and created_by = actor for update;
  if not found or letter.status <> 'AWAITING_VC_DOCUMENT' or letter.letter_printed_at is not null
    or letter.review_details_at is distinct from p_expected_details_at then
    raise exception 'The letter changed or is no longer editable' using errcode = '22023';
  end if;

  if p_action is null or p_action not in ('save_draft', 'sign_letter') or p_body is null
    or p_body !~ '[^[:space:]]' or char_length(p_body) > 12000
    or p_closing is null or char_length(p_closing) > 3000 then
    raise exception 'Invalid request letter text' using errcode = '22023';
  end if;

  if letter.letter_body is distinct from p_body or letter.letter_closing is distinct from p_closing then
    update public.events set
      letter_body = p_body,
      letter_closing = p_closing,
      review_budget = case when review_details_at is null then coalesce(review_budget, request.estimated_budget) else review_budget end,
      review_requirements = case when review_details_at is null then coalesce(review_requirements, request.special_requirements) else review_requirements end,
      review_details_at = clock_timestamp(),
      letter_faculty_signed_at = null,
      letter_dean_signed_at = null,
      letter_dean_signed_by = null,
      letter_dean_name = null
    where id = letter.id
    returning review_details_at into letter.review_details_at;
  end if;

  if p_action = 'sign_letter' then
    perform public.update_request_letter(request.id, 'sign_letter', letter.review_details_at);
  end if;
end;
$$;

revoke all on function public.prepare_request_letter(uuid, text, text, text, timestamptz) from public, anon, authenticated;
grant execute on function public.prepare_request_letter(uuid, text, text, text, timestamptz) to authenticated;

commit;
