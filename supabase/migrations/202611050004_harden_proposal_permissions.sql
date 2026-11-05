
-- Remove broad table-level write permissions.
revoke insert, update, delete
on public.event_proposals
from authenticated;

revoke insert, update, delete
on public.events
from authenticated;

revoke insert, update, delete
on public.proposal_reviews
from authenticated;

-- Faculty can insert only proposal data.
grant insert (
  title,
  description,
  objectives,
  venue,
  start_date,
  end_date,
  estimated_budget,
  created_by,
  status
)
on public.event_proposals to authenticated;

-- Faculty can edit proposal content.
-- Dean can update review decisions.
grant update (
  title,
  description,
  objectives,
  venue,
  start_date,
  end_date,
  estimated_budget,
  status,
  review_note
)
on public.event_proposals to authenticated;

-- Read-only access to official events and review history.
grant select on public.events to authenticated;
grant select on public.proposal_reviews to authenticated;

-- Faculty submissions must start as SUBMITTED.
drop policy if exists "Faculty can create proposals"
on public.event_proposals;

create policy "Faculty can create proposals"
on public.event_proposals
for insert to authenticated
with check (
  created_by = (select auth.uid())
  and status = 'SUBMITTED'
  and exists (
    select 1 from public.profiles
    where id = (select auth.uid())
      and role = 'FACULTY'
  )
);

-- Stamp the authenticated Dean as the reviewer.
create or replace function public.stamp_proposal_review()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.status is distinct from old.status
     and new.status in (
       'UNDER_REVIEW',
       'CHANGES_REQUESTED',
       'REJECTED',
       'APPROVED_BY_DEAN'
     ) then

    new.reviewed_by := auth.uid();
    new.reviewed_at := now();
  end if;

  return new;
end;
$$;

drop trigger if exists stamp_proposal_review
on public.event_proposals;

create trigger stamp_proposal_review
before update of status on public.event_proposals
for each row
execute function public.stamp_proposal_review();

-- Audit records must use the actual authenticated reviewer.
create or replace function public.record_proposal_review()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.status is distinct from old.status
     and new.status in (
       'UNDER_REVIEW',
       'CHANGES_REQUESTED',
       'REJECTED',
       'APPROVED_BY_DEAN'
     ) then

    insert into public.proposal_reviews (
      proposal_id,
      action,
      note,
      reviewed_by
    )
    values (
      new.id,
      new.status,
      new.review_note,
      auth.uid()
    );

  end if;

  return new;
end;
$$;
