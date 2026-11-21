import "server-only";

import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { z } from "zod";
import { requireRole, type AppRole } from "@/lib/auth/guard";
import { createClient } from "@/lib/supabase/server";
import { formatEventBudget, formatEventDateRange, formatEventTime, type ApprovalEvent, type LetterEventDetails } from "@/lib/event-approval";
import type { RequestLetter } from "@/lib/request-letter";
import { parseSignature } from "@/lib/profile-signature";

export async function loadRequestLetter(id: string, roles: AppRole[]) {
  const profile = await requireRole(roles);
  if (!z.uuid().safeParse(id).success) notFound();

  const supabase = await createClient();
  const query = supabase.from("events").select("*").eq("proposal_id", id);
  if (profile.role === "FACULTY") query.eq("created_by", profile.id);
  const { data: event, error } = await query.maybeSingle<ApprovalEvent>();
  if (error) throw new Error("Unable to load the request letter.");
  if (!event || (profile.role === "VC" && !event.letter_printed_at)) notFound();

  const { data: proposal, error: proposalError } = profile.role === "VC" ? { data: null, error: null } : await supabase
    .from("event_proposals")
    .select("status,reviewed_at,department,start_time,end_time,duration,expected_participants,target_audience,objectives,estimated_budget,special_requirements")
    .eq("id", id).maybeSingle();
  if (proposalError) throw new Error("Unable to load the approved request.");
  if (profile.role !== "VC" && proposal?.status !== "APPROVED_BY_DEAN") notFound();

  const faculty = event.letter_faculty_name && (event.letter_faculty_signed_at || event.letter_printed_at)
    ? event.letter_faculty_name : profile.role === "FACULTY" ? profile.full_name
    : event.letter_faculty_name ?? "Faculty coordinator";
  const details: LetterEventDetails = event.letter_event_details ?? {
    department: proposal?.department,
    startTime: proposal?.start_time,
    endTime: proposal?.end_time,
    duration: proposal?.duration,
    participants: proposal?.expected_participants,
    audience: proposal?.target_audience,
    objectives: proposal?.objectives,
  };
  const dean = event.letter_dean_name ?? details.deanApprovalName ?? "Dean";
  const budget = event.review_details_at ? event.review_budget : event.review_budget ?? proposal?.estimated_budget;
  const ready = Boolean(event.letter_generated_at && event.letter_faculty_signed_at);
  const signingAvailable = "letter_faculty_signed_at" in event;
  const textEditingAvailable = "letter_body" in event;
  const canUpdate = signingAvailable && profile.role === "FACULTY" && !event.letter_printed_at && event.status === "AWAITING_VC_DOCUMENT";
  const back = profile.role === "FACULTY" ? `/faculty/events/${id}` : "/vc/dashboard";
  const year = (event.letter_generated_at ?? event.letter_printed_at ?? event.start_date).slice(0, 4);
  const letter: RequestLetter = {
    id, title: event.title, description: event.description, venue: event.venue, faculty, dean,
    date: formatEventDateRange(event.start_date, event.end_date),
    times: [details.startTime, details.endTime].filter((value): value is string => Boolean(value)).map(formatEventTime).join(" – "),
    department: details.department, duration: details.duration, participants: details.participants,
    audience: details.audience, objectives: details.objectives,
    budget: budget == null ? null : formatEventBudget(budget),
    requirements: event.review_details_at ? event.review_requirements : event.review_requirements ?? proposal?.special_requirements,
    facultySignedAt: event.letter_faculty_signed_at, deanSignedAt: event.letter_dean_signed_at,
    deanApprovedAt: details.deanApprovedAt ?? proposal?.reviewed_at, createdAt: event.letter_generated_at,
    facultySignature: parseSignature(event.faculty_signature), deanApprovalSignature: parseSignature(event.dean_approval_signature),
    letterId: `ED-${year}-${event.id.toUpperCase()}`,
    body: event.letter_body, closing: event.letter_closing,
    usesLegacyLetterFormat: event.letter_body == null && (!textEditingAvailable || Boolean(event.letter_faculty_signed_at || event.letter_printed_at)),
  };

  return { profile, supabase, event, letter, ready, signingAvailable, textEditingAvailable, canUpdate, back };
}

export async function requestLetterUrl(id: string) {
  const path = `/faculty/events/${id}/letter`;
  const configuredUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (configuredUrl) {
    const url = URL.parse(configuredUrl);
    if (url && (url.protocol === "https:" || url.protocol === "http:")) return new URL(path, url).href;
  }
  const requestHeaders = await headers();
  const host = requestHeaders.get("host");
  if (!host || !/^(?:[a-z0-9.-]+|\[[a-f0-9:]+\])(?::\d{1,5})?$/i.test(host)) {
    throw new Error("Unable to determine the request letter URL.");
  }
  const local = /^(?:localhost|127\.0\.0\.1|\[::1\])(?::\d+)?$/i.test(host);
  const protocol = local || requestHeaders.get("x-forwarded-proto") === "http" ? "http" : "https";
  return new URL(path, `${protocol}://${host}`).href;
}
