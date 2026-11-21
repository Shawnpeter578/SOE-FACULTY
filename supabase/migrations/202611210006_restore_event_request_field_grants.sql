begin;

-- Some existing projects applied the request fields before the permissions
-- hardening migration. That migration's table-level revoke also clears these
-- column grants when applied later. Restore only the intended faculty fields.
grant insert (
  event_type, resource_person, start_time, end_time, duration, department,
  expected_participants, target_audience, sponsorship_expected, special_requirements, attachments
) on public.event_proposals to authenticated;

grant update (
  event_type, resource_person, start_time, end_time, duration, department,
  expected_participants, target_audience, sponsorship_expected, special_requirements
) on public.event_proposals to authenticated;

commit;
