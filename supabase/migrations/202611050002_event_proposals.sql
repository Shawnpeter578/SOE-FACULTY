
-- EventDesk: Event proposal and approval workflow
-- Requires the existing public.profiles and public.app_role schema.

create type public.proposal_status as enum (
  'DRAFT',
  'SUBMITTED',
  'UNDER_REVIEW',
  'CHANGES_REQUESTED',
  'REJECTED',
  'APPROVED_BY_DEAN'
);

create type public.event_status as enum (
  'AWAITING_VC_DOCUMENT',
  'OFFICIALLY_APPROVED'
);

-- 1. Faculty event proposals

create table public.event_proposals (
  id uuid primary key default gen_random_uuid(),

  title text not null,
  description text not null,
  objectives text,
  venue text not null,

  start_date date not null,
  end_date date not null,

  estimated_budget numeric(12,2),

  created_by uuid not null
    references public.profiles(id),

  status public.proposal_status not null default 'DRAFT',

  review_note text,
  reviewed_by uuid references public.profiles(id),
  reviewed_at timestamptz,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint valid_event_dates
    check (end_date >= start_date),

  constraint valid_estimated_budget
    check (estimated_budget is null or estimated_budget >= 0)
);

-- 2. Official events
-- An event is created automatically when the Dean approves a proposal.

create table public.events (
  id uuid primary key default gen_random_uuid(),

  proposal_id uuid not null unique
    references public.event_proposals(id),

  title text not null,
  description text not null,
  venue text not null,

  start_date date not null,
  end_date date not null,

  status public.event_status not null
    default 'AWAITING_VC_DOCUMENT',

  created_by uuid not null references public.profiles(id),

  vc_approval_document_path text,
  vc_document_uploaded_by uuid references public.profiles(id),
  vc_document_uploaded_at timestamptz,

  created_at timestamptz not null default now(),

  constraint valid_event_dates
    check (end_date >= start_date)
);

-- 3. Immutable decision history

create table public.proposal_reviews (
  id uuid primary key default gen_random_uuid(),

  proposal_id uuid not null
    references public.event_proposals(id) on delete cascade,

  action public.proposal_status not null,
  note text,

  reviewed_by uuid not null
    references public.profiles(id),

  created_at timestamptz not null default now()
);

-- 4. Enable RLS

alter table public.event_proposals enable row level security;
alter table public.events enable row level security;
alter table public.proposal_reviews enable row level security;

-- Explicit permissions

revoke all on public.event_proposals from anon, authenticated;
revoke all on public.events from anon, authenticated;
revoke all on public.proposal_reviews from anon, authenticated;

grant select, insert, update
on public.event_proposals to authenticated;

grant select
on public.events to authenticated;

grant select
on public.proposal_reviews to authenticated;

-- 5. Proposal visibility

create policy "Faculty can view own proposals"
on public.event_proposals
for select to authenticated
using (created_by = (select auth.uid()));

create policy "Dean can view all proposals"
on public.event_proposals
for select to authenticated
using (
  exists (
    select 1 from public.profiles
    where id = (select auth.uid())
      and role = 'DEAN'
  )
);

-- Faculty can submit proposals for themselves.

create policy "Faculty can create proposals"
on public.event_proposals
for insert to authenticated
with check (
  created_by = (select auth.uid())
  and exists (
    select 1 from public.profiles
    where id = (select auth.uid())
      and role = 'FACULTY'
  )
);

-- Faculty can edit their own drafts or proposals returned for changes.

create policy "Faculty can edit eligible proposals"
on public.event_proposals
for update to authenticated
using (
  created_by = (select auth.uid())
  and status in ('DRAFT', 'CHANGES_REQUESTED')
)
with check (
  created_by = (select auth.uid())
  and status in ('DRAFT', 'CHANGES_REQUESTED', 'SUBMITTED')
);

-- Dean can review and update any proposal.

create policy "Dean can review proposals"
on public.event_proposals
for update to authenticated
using (
  exists (
    select 1 from public.profiles
    where id = (select auth.uid())
      and role = 'DEAN'
  )
)
with check (
  exists (
    select 1 from public.profiles
    where id = (select auth.uid())
      and role = 'DEAN'
  )
);

-- 6. Dean can view all events.
-- Faculty can view events originating from their own proposals.

create policy "Dean can view all events"
on public.events
for select to authenticated
using (
  exists (
    select 1 from public.profiles
    where id = (select auth.uid())
      and role = 'DEAN'
  )
);

create policy "Faculty can view own events"
on public.events
for select to authenticated
using (
  exists (
    select 1 from public.event_proposals p
    where p.id = proposal_id
      and p.created_by = (select auth.uid())
  )
);

-- 7. Review history visibility

create policy "Dean can view all review history"
on public.proposal_reviews
for select to authenticated
using (
  exists (
    select 1 from public.profiles
    where id = (select auth.uid())
      and role = 'DEAN'
  )
);

create policy "Faculty can view own review history"
on public.proposal_reviews
for select to authenticated
using (
  exists (
    select 1 from public.event_proposals p
    where p.id = proposal_id
      and p.created_by = (select auth.uid())
  )
);

-- 8. Automatically create an event when Dean approves a proposal.

create or replace function public.handle_proposal_approval()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.status = 'APPROVED_BY_DEAN'
     and old.status is distinct from new.status then

    insert into public.events (
      proposal_id,
      title,
      description,
      venue,
      start_date,
      end_date,
      created_by
    )
    values (
      new.id,
      new.title,
      new.description,
      new.venue,
      new.start_date,
      new.end_date,
      new.created_by
    );

  end if;

  return new;
end;
$$;

create trigger on_proposal_approved
after update of status on public.event_proposals
for each row
execute function public.handle_proposal_approval();

-- 9. Record proposal decisions automatically.

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
      coalesce(new.reviewed_by, auth.uid())
    );

  end if;

  return new;
end;
$$;

create trigger on_proposal_status_changed
after update of status on public.event_proposals
for each row
execute function public.record_proposal_review();

-- 10. Updated timestamp

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger set_event_proposal_updated_at
before update on public.event_proposals
for each row
execute function public.set_updated_at();
