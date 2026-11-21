begin;

create table public.profile_preferences (
  profile_id uuid primary key references public.profiles(id) on delete cascade,
  campus text check (char_length(campus) <= 100),
  office_hours text check (char_length(office_hours) <= 160),
  bio text check (char_length(bio) <= 500),
  signature jsonb,
  signature_revision uuid,
  constraint valid_profile_signature check (signature is null or (
    jsonb_typeof(signature) = 'object' and jsonb_typeof(signature->'value') = 'string'
    and octet_length(signature::text) <= 16100
    and coalesce(case signature->>'kind'
      when 'typed' then char_length(signature->>'value') between 1 and 120
        and signature->>'value' ~ '[^[:space:]]' and signature->>'value' !~ '[[:cntrl:]]'
      when 'drawn' then char_length(signature->>'value') <= 16000
        and signature->>'value' ~ '^[0-9]{1,3},[0-9]{1,3}( [0-9]{1,3},[0-9]{1,3})+(\|[0-9]{1,3},[0-9]{1,3}( [0-9]{1,3},[0-9]{1,3})+)*$'
      else false
    end, false)
  ) is true)
);

alter table public.profile_preferences enable row level security;
revoke all on public.profile_preferences from public, anon, authenticated;
grant select on public.profile_preferences to authenticated;
grant insert (profile_id, campus, office_hours, bio, signature),
  update (profile_id, campus, office_hours, bio, signature)
  on public.profile_preferences to authenticated;

create policy "Faculty and deans manage own profile preferences"
on public.profile_preferences for all to authenticated
using (profile_id = (select auth.uid()) and exists (
  select 1 from public.profiles where id = (select auth.uid()) and role in ('FACULTY', 'DEAN')
))
with check (profile_id = (select auth.uid()) and exists (
  select 1 from public.profiles where id = (select auth.uid()) and role in ('FACULTY', 'DEAN')
));

create function public.stamp_profile_signature_revision()
returns trigger language plpgsql set search_path = ''
as $$
begin
  if new.signature is null then
    new.signature_revision := null;
  elsif tg_op = 'INSERT' or new.signature is distinct from old.signature then
    new.signature_revision := gen_random_uuid();
  end if;
  return new;
end;
$$;

create trigger stamp_profile_signature_revision before insert or update on public.profile_preferences
for each row execute function public.stamp_profile_signature_revision();

alter table public.events add column faculty_signature jsonb, add column dean_approval_signature jsonb;

create function public.reset_faculty_signature_mark()
returns trigger language plpgsql set search_path = ''
as $$
begin
  if new.letter_faculty_signed_at is null then
    new.faculty_signature := null;
  end if;
  return new;
end;
$$;

-- This trigger runs after guard_request_letter, which clears signatures after edits.
create trigger reset_faculty_signature_mark before update on public.events
for each row execute function public.reset_faculty_signature_mark();

create function public.sign_request_letter_with_profile_signature(
  p_proposal_id uuid, p_signature_revision uuid, p_expected_details_at timestamptz,
  p_body text default null, p_closing text default null
)
returns void language plpgsql security definer set search_path = ''
as $$
declare
  actor uuid := auth.uid();
  saved_mark jsonb;
  previous_signed_at timestamptz;
begin
  if not exists (select 1 from public.profiles where id = actor and role = 'FACULTY') then
    raise exception 'Faculty account required' using errcode = '42501';
  end if;

  select signature into saved_mark from public.profile_preferences
  where profile_id = actor and signature_revision = p_signature_revision for share;
  if not found or saved_mark is null then
    raise exception 'Saved signature changed' using errcode = 'P0001';
  end if;

  select letter_faculty_signed_at into previous_signed_at from public.events
  where proposal_id = p_proposal_id and created_by = actor for update;
  if not found then
    raise exception 'The request letter is unavailable for this account' using errcode = '42501';
  end if;

  if p_body is null and p_closing is null then
    perform public.update_request_letter(p_proposal_id, 'sign_letter', p_expected_details_at);
  else
    perform public.prepare_request_letter(p_proposal_id, 'sign_letter', p_body, p_closing, p_expected_details_at);
  end if;

  update public.events set faculty_signature = saved_mark
  where proposal_id = p_proposal_id and created_by = actor
    and letter_faculty_signed_at is distinct from previous_signed_at;
end;
$$;

revoke all on function public.sign_request_letter_with_profile_signature(uuid, uuid, timestamptz, text, text) from public, anon, authenticated;
grant execute on function public.sign_request_letter_with_profile_signature(uuid, uuid, timestamptz, text, text) to authenticated;

create function public.approve_proposal_with_profile_signature(
  p_proposal_id uuid, p_expected_status text, p_note text, p_signature_revision uuid
)
returns boolean language plpgsql security definer set search_path = ''
as $$
declare
  actor uuid := auth.uid();
  saved_mark jsonb;
begin
  if not public.is_dean() then
    raise exception 'Dean account required' using errcode = '42501';
  end if;
  if char_length(p_note) > 500 then
    raise exception 'Keep the decision note to 500 characters' using errcode = '22023';
  end if;

  select signature into saved_mark from public.profile_preferences
  where profile_id = actor and signature_revision = p_signature_revision for share;
  if not found or saved_mark is null then
    raise exception 'Saved signature changed' using errcode = 'P0001';
  end if;

  update public.event_proposals set status = 'APPROVED_BY_DEAN', review_note = p_note
  where id = p_proposal_id and status::text = p_expected_status
    and status in ('SUBMITTED', 'UNDER_REVIEW', 'CHANGES_REQUESTED');
  if not found then return false; end if;

  update public.events set dean_approval_signature = saved_mark where proposal_id = p_proposal_id;
  if not found then
    raise exception 'The approved request did not create an event' using errcode = '22023';
  end if;
  return true;
end;
$$;

revoke all on function public.approve_proposal_with_profile_signature(uuid, text, text, uuid) from public, anon, authenticated;
grant execute on function public.approve_proposal_with_profile_signature(uuid, text, text, uuid) to authenticated;

commit;
