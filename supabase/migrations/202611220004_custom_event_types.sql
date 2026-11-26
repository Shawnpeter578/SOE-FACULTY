alter table public.event_proposals
  drop constraint event_proposals_event_type_check,
  add constraint event_proposals_event_type_check
    check (char_length(btrim(event_type)) between 1 and 100);
