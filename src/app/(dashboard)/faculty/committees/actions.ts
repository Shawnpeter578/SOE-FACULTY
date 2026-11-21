"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireRole } from "@/lib/auth/guard";
import { COMMITTEE_FILES, committeeUpdateKinds } from "@/lib/event-committees";
import { committeeLoadError } from "@/lib/event-committees-server";
import { coordinatorCandidateSchema } from "@/lib/event-coordinators";
import type { AssignmentActionState, CandidateSearchState } from "../co-faculty/actions";
import { createClient } from "@/lib/supabase/server";
import { vcEvidenceExtension } from "@/lib/validation/vc-evidence";

const id = z.uuid();

function refreshCommittees() {
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
    name: z.string().trim().min(1).max(80),
    responsibilities: z.string().trim().max(1500),
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

export async function searchCommitteeCoordinators(committeeId: string, _previous: CandidateSearchState, form: FormData): Promise<CandidateSearchState> {
  await requireRole(["FACULTY"]);
  const fields = z.object({ committeeId: id, name: z.string().trim().min(2).max(120) })
    .safeParse({ committeeId, name: form.get("name") });
  if (!fields.success) return { matches: [], message: "Enter at least two characters of the faculty member’s name." };

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("search_committee_coordinators", {
    p_committee_id: fields.data.committeeId, p_name: fields.data.name,
  });
  const candidates = z.array(coordinatorCandidateSchema).safeParse(data);
  if (error || !candidates.success) return { matches: [], message: "Faculty search could not be completed. Try again." };
  return { matches: candidates.data, message: candidates.data.length ? "" : "No faculty members match that name." };
}

export async function assignCommitteeCoordinator(committeeId: string, _previous: AssignmentActionState, form: FormData): Promise<AssignmentActionState> {
  await requireRole(["FACULTY"]);
  const fields = z.object({ committeeId: id, facultyId: id }).safeParse({ committeeId, facultyId: form.get("facultyId") });
  if (!fields.success) return { success: false, message: "Select a faculty member." };

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("assign_committee_coordinator", {
    p_committee_id: fields.data.committeeId, p_faculty_id: fields.data.facultyId,
  });
  if (error || !data) return { success: false, message: "The coordinator could not be assigned. Refresh and try again." };
  refreshCommittees();
  return { success: true, message: "Coordinator assigned." };
}

export async function submitCommitteeUpdate(committeeId: string, _previous: AssignmentActionState, form: FormData): Promise<AssignmentActionState> {
  const profile = await requireRole(["FACULTY"]);
  const fields = z.object({
    committeeId: id,
    kind: z.enum(committeeUpdateKinds),
    title: z.string().trim().min(1).max(120),
    details: z.string().trim().max(4000),
  }).safeParse({ committeeId, kind: form.get("kind"), title: form.get("title"), details: form.get("details") ?? "" });
  const entry = form.get("file");
  const file = entry instanceof File && (entry.size > 0 || entry.name !== "") ? entry : null;
  if (!fields.success || (!fields.data.details && !file)) {
    return { success: false, message: "Enter a title and add details or attach a file." };
  }
  const extension = file && await vcEvidenceExtension(file);
  if (file && !extension) return { success: false, message: "Choose a valid PDF, PNG or JPG file up to 10 MB." };

  const supabase = await createClient();
  const { data: committee, error: accessError } = await supabase.rpc("can_access_event_committee", {
    p_committee_id: fields.data.committeeId, p_coordinator_only: true,
  });
  if (accessError) return { success: false, message: committeeLoadError(accessError.code) };
  if (!committee) return { success: false, message: "Only the assigned coordinator can post an update." };

  const updateId = crypto.randomUUID();
  const documents = supabase.storage.from(COMMITTEE_FILES);
  const path = extension ? `${fields.data.committeeId}/${profile.id}/${updateId}.${extension}` : null;
  if (path && file) {
    const { error } = await documents.upload(path, file, { contentType: file.type });
    if (error) return { success: false, message: "The file could not be uploaded. Refresh to check your assignment and try again." };
  }

  const { error } = await supabase.rpc("submit_event_committee_update", {
    p_committee_id: fields.data.committeeId, p_update_id: updateId,
    p_kind: fields.data.kind, p_title: fields.data.title, p_details: fields.data.details,
    p_file_path: path, p_file_name: path && file ? (file.name.trim().slice(0, 255) || `Attachment.${extension}`) : null,
  });
  if (error) {
    if (path) await documents.remove([path]);
    return { success: false, message: error.code === "42501" ? "This committee is no longer assigned to you." : "The update could not be posted. Try again." };
  }

  refreshCommittees();
  return { success: true, message: "Update posted." };
}
