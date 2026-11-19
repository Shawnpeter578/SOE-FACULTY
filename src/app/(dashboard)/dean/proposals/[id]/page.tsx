
import { notFound } from "next/navigation";
import Link from "next/link";
import { requireRole } from "@/lib/auth/guard";
import { createClient } from "@/lib/supabase/server";
import ReviewControls from "./review-controls";
import ProposalDetails from "@/components/proposal-details";
import RouteRefresh from "@/components/route-refresh";
import ApprovalControls from "@/components/approval-controls";
import { EVENT_DOCUMENT_BUCKET, formatApprovalTime, type ApprovalEvent } from "@/lib/event-approval";

export default async function ProposalDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireRole(["DEAN"]);

  const { id } = await params;
  const supabase = await createClient();

  const { data: proposal, error } = await supabase
    .from("event_proposals")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error || !proposal) notFound();

  const [
    { data: faculty },
    { data: reviews },
    { data: event, error: eventError },
  ] = await Promise.all([
    supabase
      .from("profiles")
      .select("full_name")
      .eq("id", proposal.created_by)
      .maybeSingle(),

    supabase
      .from("proposal_reviews")
      .select("id, action, note, created_at")
      .eq("proposal_id", id)
      .order("created_at", { ascending: false }),

    supabase.from("events").select("*").eq("proposal_id", id).maybeSingle<ApprovalEvent>(),
  ]);

  if (eventError) throw new Error("Unable to load the event approval journey.");
  const document = event?.vc_approval_document_path
    ? await supabase.storage.from(EVENT_DOCUMENT_BUCKET).createSignedUrl(event.vc_approval_document_path, 3600, { download: "VC approval.pdf" })
    : null;

  const isFinal =
    proposal.status === "APPROVED_BY_DEAN" ||
    proposal.status === "REJECTED";

  return (
    <main className="mx-auto max-w-4xl space-y-6 p-6">
      <RouteRefresh />
      <div>
        <Link href="/dean/proposals" className="text-sm underline">
          ← Back to proposals
        </Link>

        <h1 className="mt-4 text-2xl font-semibold">
          {proposal.title}
        </h1>

        <p className="mt-2 text-sm text-gray-500">
          Status: {(event?.status ?? proposal.status).replaceAll("_", " ")}
        </p>
      </div>

      <ProposalDetails proposal={proposal} facultyName={faculty?.full_name ?? "Faculty member"} />

      {!isFinal && (
        <ReviewControls
          proposalId={proposal.id}
          status={proposal.status}
        />
      )}

      {event && (
        <section className="space-y-3 rounded-card border border-brand-border bg-white p-5">
          <h2 className="font-bold text-brand-primary">Vice-Chancellor review</h2>
          {event.letter_generated_at && <Link href={`/faculty/events/${id}/letter`} className="inline-block text-sm font-semibold text-brand-primary hover:underline">View request letter</Link>}
          <p className="text-sm text-text-secondary">
            {event.vc_decision === "REJECTED" ? "The Vice-Chancellor declined the request. The event is closed."
              : event.status === "OFFICIALLY_APPROVED" ? "The event is officially approved."
              : event.vc_decision === "APPROVED" ? "The Vice-Chancellor approved the request. Upload the signed PDF to finalize it."
              : event.letter_printed_at ? "The letter is awaiting the Vice-Chancellor’s decision."
              : "Waiting for faculty to prepare and print the request letter."}
          </p>
          {event.vc_decided_at && <p className="whitespace-pre-wrap break-words text-sm text-text-secondary">{formatApprovalTime(event.vc_decided_at)}{event.vc_note && ` · ${event.vc_note}`}</p>}
          {event.vc_decision === "APPROVED" && event.status === "AWAITING_VC_DOCUMENT" && <ApprovalControls mode="lock" proposalId={id} />}
          {document?.data?.signedUrl && <a className="inline-block text-sm font-semibold text-brand-primary hover:underline" href={document.data.signedUrl}>Download signed approval</a>}
        </section>
      )}

      <section className="space-y-3 rounded-lg border p-5">
        <h2 className="font-semibold">Decision history</h2>

        {!reviews?.length ? (
          <p className="text-sm text-gray-500">
            No review actions recorded yet.
          </p>
        ) : (
          reviews.map((review) => (
            <article key={review.id} className="border-b pb-3">
              <p className="font-medium">
                {review.action.replaceAll("_", " ")}
              </p>
              {review.note && <p>{review.note}</p>}
              <p className="text-xs text-gray-500">
                {new Date(review.created_at).toLocaleString()}
              </p>
            </article>
          ))
        )}
      </section>
    </main>
  );
}
