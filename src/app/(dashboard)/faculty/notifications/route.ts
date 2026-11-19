import { requireRole } from "@/lib/auth/guard";
import { createClient } from "@/lib/supabase/server";
import { getNotificationItems, recentNotificationCount, type ApprovalDocument, type DeanReview, type PrintedLetter, type ViceChancellorDecision } from "./notification-items";

type ReadResult<T> = { data: T[] | null; error: { code: string } | null };
const headers = { "Cache-Control": "private, no-store" };

async function readUpdates<T>(query: (from: number, to: number) => PromiseLike<ReadResult<T>>, all: boolean, optional = false) {
  const size = all ? 200 : recentNotificationCount;
  const rows: T[] = [];
  for (let start = 0; ; start += size) {
    const { data, error } = await query(start, start + size - 1);
    if (error) {
      // Earlier installations have Dean reviews and file uploads but no VC decision columns.
      if (optional && ["42703", "PGRST204"].includes(error.code)) return [];
      throw new Error(`Notification lookup failed (${error.code}).`);
    }
    rows.push(...(data ?? []));
    if (!all || (data?.length ?? 0) < size) return rows;
  }
}

export async function GET(request: Request) {
  const faculty = await requireRole(["FACULTY"]);
  const supabase = await createClient();
  const all = new URL(request.url).searchParams.get("view") === "all";

  try {
    const [reviews, letters, decisions, documents] = await Promise.all([
      readUpdates<DeanReview>((from, to) => supabase.from("proposal_reviews")
        .select("id, proposal_id, action, note, created_at, proposal:event_proposals!inner(title, created_by)")
        .eq("proposal.created_by", faculty.id).order("created_at", { ascending: false }).order("id", { ascending: true })
        .range(from, to).overrideTypes<DeanReview[], { merge: false }>(), all),
      readUpdates<PrintedLetter>((from, to) => supabase.from("events")
        .select("id, proposal_id, title, letter_printed_at")
        .eq("created_by", faculty.id).not("letter_printed_at", "is", null)
        .order("letter_printed_at", { ascending: false }).order("id", { ascending: true })
        .range(from, to).overrideTypes<PrintedLetter[], { merge: false }>(), all, true),
      readUpdates<ViceChancellorDecision>((from, to) => supabase.from("events")
        .select("id, proposal_id, title, vc_decision, vc_note, vc_decided_at")
        .eq("created_by", faculty.id).not("vc_decided_at", "is", null)
        .order("vc_decided_at", { ascending: false }).order("id", { ascending: true })
        .range(from, to).overrideTypes<ViceChancellorDecision[], { merge: false }>(), all, true),
      readUpdates<ApprovalDocument>((from, to) => supabase.from("events")
        .select("id, proposal_id, title, vc_document_uploaded_at")
        .eq("created_by", faculty.id).not("vc_document_uploaded_at", "is", null).not("vc_approval_document_path", "is", null)
        .order("vc_document_uploaded_at", { ascending: false }).order("id", { ascending: true })
        .range(from, to).overrideTypes<ApprovalDocument[], { merge: false }>(), all),
    ]);
    const items = getNotificationItems(reviews, letters, decisions, documents);
    return Response.json({ facultyId: faculty.id, items: all ? items : items.slice(0, recentNotificationCount) }, { headers });
  } catch (error) {
    console.error("Unable to load faculty notifications:", error);
    return Response.json({ error: "Unable to load notifications." }, { status: 500, headers });
  }
}
