"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireRole } from "@/lib/auth/guard";
import { COMMITTEE_FILES, committeeUpdateKinds } from "@/lib/event-committees";
import { committeeLoadError } from "@/lib/event-committees-server";
import { coordinatorCandidateSchema } from "@/lib/event-coordinators";
import type { AssignmentActionState } from "../co-faculty/actions";
import { createClient } from "@/lib/supabase/server";
import { validateCommitteeAttachment } from "@/lib/validation/committee-attachments";

const id = z.uuid();
const committeeFields = {
  name: z.string().trim().min(1).max(80),
  responsibilities: z.string().trim().max(1500),
};
const candidate = coordinatorCandidateSchema.extend({ email: z.string().nullable() });
export type CommitteeSearchState = { matches: z.infer<typeof candidate>[]; message: string };

function refreshCommittees() {
  revalidatePath("/faculty/committees");
  revalidatePath("/faculty/reports");
  revalidatePath("/faculty/committees/[eventId]", "page");
  revalidatePath("/faculty/committees/[eventId]/[committeeId]", "page");
  revalidatePath("/faculty/co-faculty");
  revalidatePath("/faculty/co-faculty/committees");
  revalidatePath("/faculty/co-faculty/committees/[committeeId]", "page");
}

export async function createCommittee(eventId: string, _previous: AssignmentActionState, form: FormData): Promise<AssignmentActionState> {
  await requireRole(["FACULTY"]);
  const fields = z.object({
    eventId: id,
    ...committeeFields,
  }).safeParse({ eventId, name: form.get("name"), responsibilities: form.get("responsibilities") ?? "" });
  if (!fields.success) return { success: false, message: "Enter a committee name and up to 1,500 characters of responsibilities." };

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("create_event_committee", {
    p_event_id: fields.data.eventId, p_name: fields.data.name, p_responsibilities: fields.data.responsibilities,
  });
  if (error) return { success: false, message: error.code === "42501" ? "Only the faculty event owner can create committees for a locked event." : committeeLoadError(error.code) };
  if (!data) return { success: false, message: "A committee with that name already exists for this event." };
  refreshCommittees();
  return { success: true, message: "Committee created." };
}

export async function editCommittee(committeeId: string, _previous: AssignmentActionState, form: FormData): Promise<AssignmentActionState> {
  await requireRole(["FACULTY"]);
  const fields = z.object({ committeeId: id, ...committeeFields })
    .safeParse({ committeeId, name: form.get("name"), responsibilities: form.get("responsibilities") ?? "" });
  if (!fields.success) return { success: false, message: "Enter a committee name and up to 1,500 characters of responsibilities." };
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("edit_event_committee", {
    p_committee_id: fields.data.committeeId, p_name: fields.data.name, p_responsibilities: fields.data.responsibilities,
  });
  if (error?.code === "23505") return { success: false, message: "A committee with that name already exists for this event." };
  if (error) return { success: false, message: committeeLoadError(error.code) };
  if (!data) return { success: false, message: "Only the event lead can edit this committee." };
  refreshCommittees();
  return { success: true, message: "Committee updated." };
}

export async function deleteCommittee(committeeId: string): Promise<AssignmentActionState> {
  await requireRole(["FACULTY"]);
  if (!id.safeParse(committeeId).success) return { success: false, message: "Invalid committee." };
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("archive_event_committee", { p_committee_id: committeeId });
  if (error) return { success: false, message: committeeLoadError(error.code) };
  if (!data || !id.safeParse(data).success) return { success: false, message: "Only the event lead can delete this committee." };
  refreshCommittees();
  redirect(`/faculty/committees/${data}`);
}

export async function searchCommitteeCoordinators(committeeId: string, _previous: CommitteeSearchState, form: FormData): Promise<CommitteeSearchState> {
  await requireRole(["FACULTY"]);
  const fields = z.object({ committeeId: id, name: z.string().trim().min(2).max(254) })
    .safeParse({ committeeId, name: form.get("name") });
  if (!fields.success) return { matches: [], message: "Enter a name or full sign-in email." };

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("search_committee_coordinators", {
    p_committee_id: fields.data.committeeId, p_name: fields.data.name,
  });
  const candidates = z.array(candidate).safeParse(data);
  if (error) return { matches: [], message: committeeLoadError(error.code) };
  if (!candidates.success) return { matches: [], message: "Faculty search returned an unexpected response. Check that the latest database migrations are applied." };
  return { matches: candidates.data, message: candidates.data.length ? "" : "No other faculty accounts match. Try part of their saved profile name or their full sign-in email. Student accounts cannot be assigned." };
}

export async function assignCommitteeCoordinator(committeeId: string, _previous: AssignmentActionState, form: FormData): Promise<AssignmentActionState> {
  await requireRole(["FACULTY"]);
  const fields = z.object({ committeeId: id, facultyId: id }).safeParse({ committeeId, facultyId: form.get("facultyId") });
  if (!fields.success) return { success: false, message: "Select a faculty member." };

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("assign_committee_coordinator", {
    p_committee_id: fields.data.committeeId, p_faculty_id: fields.data.facultyId,
  });
  if (error?.code === "23514") return { success: false, message: "This committee already has two coordinators." };
  if (error || !data) return { success: false, message: "The coordinator could not be assigned. Refresh and try again." };
  refreshCommittees();
  return { success: true, message: "Coordinator assigned." };
}

export async function removeCommitteeCoordinator(committeeId: string, facultyId: string): Promise<AssignmentActionState> {
  await requireRole(["FACULTY"]);
  if (!id.safeParse(committeeId).success || !id.safeParse(facultyId).success) return { success: false, message: "Invalid coordinator." };
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("remove_committee_coordinator", { p_committee_id: committeeId, p_faculty_id: facultyId });
  if (error || !data) return { success: false, message: "The coordinator could not be removed." };
  refreshCommittees();
  return { success: true, message: "Coordinator removed." };
}

export async function deleteCommitteeFile(updateId: string): Promise<AssignmentActionState> {
  await requireRole(["FACULTY"]);
  if (!id.safeParse(updateId).success) return { success: false, message: "Invalid attachment." };
  const supabase = await createClient();
  const { data: update } = await supabase.from("event_committee_updates").select("committee_id, file_path").eq("id", updateId).maybeSingle();
  if (!update?.file_path) return { success: false, message: "This file is no longer available." };
  const { data: authorized } = await supabase.rpc("owns_event_committee", { p_committee_id: update.committee_id });
  if (!authorized) return { success: false, message: "Only the event lead can delete this file." };
  const { data, error } = await supabase.storage.from(COMMITTEE_FILES).remove([update.file_path]);
  if (error || !data?.length) return { success: false, message: "The file could not be deleted. Refresh and try again." };
  refreshCommittees();
  return { success: true, message: "File deleted." };
}

export async function submitCommitteeUpdate(committeeId: string, _previous: AssignmentActionState, form: FormData): Promise<AssignmentActionState> {
  const profile = await requireRole(["FACULTY"]);
  const fields = z.object({
    committeeId: id,
    kind: z.enum(committeeUpdateKinds),
    title: z.string().trim().max(120),
    details: z.string().trim().max(4000),
  }).safeParse({ committeeId, kind: form.get("kind"), title: form.get("title") ?? "", details: form.get("details") ?? "" });
  const entry = form.get("file");
  const file = entry instanceof File && (entry.size > 0 || entry.name !== "") ? entry : null;
  if (!fields.success || (!fields.data.details && !file)) {
    return { success: false, message: "Write a message or attach a file." };
  }
  const attachment = file && await validateCommitteeAttachment(file);
  if (file && !attachment) return { success: false, message: "Choose a supported document or image up to 10 MB." };

  const supabase = await createClient();
  const { data: committee, error: accessError } = await supabase.rpc("can_access_event_committee", {
    p_committee_id: fields.data.committeeId, p_coordinator_only: false,
  });
  if (accessError) return { success: false, message: committeeLoadError(accessError.code) };
  if (!committee) return { success: false, message: "Only committee members can post here." };

  const updateId = crypto.randomUUID();
  const documents = supabase.storage.from(COMMITTEE_FILES);
  const path = attachment ? `${fields.data.committeeId}/${profile.id}/${updateId}.${attachment.extension}` : null;
  if (path && file && attachment) {
    const { error } = await documents.upload(path, file, { contentType: attachment.contentType });
    if (error) return { success: false, message: "The file could not be uploaded. Refresh to check your assignment and try again." };
  }

  const { error } = await supabase.rpc("submit_event_committee_update", {
    p_committee_id: fields.data.committeeId, p_update_id: updateId,
    p_kind: fields.data.kind, p_title: fields.data.title || (file ? "Attachment" : "Message"), p_details: fields.data.details,
    p_file_path: path, p_file_name: path && file ? file.name.trim().slice(0, 255) : null,
  });
  if (error) {
    if (path) await documents.remove([path]);
    return { success: false, message: error.code === "42501" ? "This committee is no longer assigned to you." : "The update could not be posted. Try again." };
  }

  refreshCommittees();
  return { success: true, message: "Sent to committee." };
}
