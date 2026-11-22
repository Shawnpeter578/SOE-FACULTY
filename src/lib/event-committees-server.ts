import "server-only";

import { z } from "zod";
import { eventCommitteeSchema, type CommitteeUpdate } from "@/lib/event-committees";
import type { createClient } from "@/lib/supabase/server";

type Supabase = Awaited<ReturnType<typeof createClient>>;

export const COMMITTEE_UPDATES_PAGE_SIZE = 20;

export function approvedCommitteeEvents(supabase: Supabase, facultyId: string) {
  return supabase.from("events").select("id, proposal_id, title, venue, start_date, end_date")
    .eq("created_by", facultyId).eq("status", "OFFICIALLY_APPROVED").not("vc_approval_document_path", "is", null);
}

export async function loadEventCommittees(supabase: Supabase, eventId?: string, committeeId?: string) {
  const { data, error } = await supabase.rpc("list_event_committees", { p_event_id: eventId ?? null, p_committee_id: committeeId ?? null });
  if (error) return { data: [], error };
  const rows = z.array(eventCommitteeSchema).safeParse(data);
  return rows.success ? { data: rows.data, error: null } : { data: [], error: { code: "INVALID_RESPONSE" } };
}

export function loadCommitteeUpdates(supabase: Supabase, committeeId: string, page: number, filesOnly: boolean) {
  const start = (page - 1) * COMMITTEE_UPDATES_PAGE_SIZE;
  const query = supabase.from("event_committee_updates")
    .select("id, title, kind, submitted_by, submitted_by_name, details, file_name, file_removed, created_at", { count: "exact" })
    .eq("committee_id", committeeId);
  if (filesOnly) query.not("file_name", "is", null);
  return query.order("created_at", { ascending: false }).order("id")
    .range(start, start + COMMITTEE_UPDATES_PAGE_SIZE - 1).overrideTypes<CommitteeUpdate[], { merge: false }>();
}

export function committeeLoadError(code: string) {
  return ["PGRST202", "PGRST204", "PGRST205", "42883", "42P01", "42703"].includes(code)
    ? "Committees will be available after the latest EventDesk database update."
    : "Committees could not be loaded. Refresh to try again.";
}
