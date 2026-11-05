
import { notFound } from "next/navigation";
import Link from "next/link";
import { requireRole } from "@/lib/auth/guard";
import { createClient } from "@/lib/supabase/server";
import ReviewControls from "./review-controls";

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
  ]);

  const isFinal =
    proposal.status === "APPROVED_BY_DEAN" ||
    proposal.status === "REJECTED";

  return (
    <main className="mx-auto max-w-4xl space-y-6 p-6">
      <div>
        <Link href="/dean/proposals" className="text-sm underline">
          ← Back to proposals
        </Link>

        <h1 className="mt-4 text-2xl font-semibold">
          {proposal.title}
        </h1>

        <p className="mt-2 text-sm text-gray-500">
          Status: {proposal.status.replaceAll("_", " ")}
        </p>
      </div>

      <section className="space-y-3 rounded-lg border p-5">
        <h2 className="font-semibold">Proposal details</h2>

        <p><strong>Faculty:</strong> {faculty?.full_name ?? "Unknown"}</p>
        <p><strong>Venue:</strong> {proposal.venue}</p>
        <p><strong>Start:</strong> {proposal.start_date}</p>
        <p><strong>End:</strong> {proposal.end_date}</p>
        <p>
          <strong>Estimated budget:</strong>{" "}
          {proposal.estimated_budget === null
            ? "Not specified"
            : `₹${proposal.estimated_budget}`}
        </p>

        <div>
          <strong>Description</strong>
          <p className="mt-1 whitespace-pre-wrap">{proposal.description}</p>
        </div>

        <div>
          <strong>Objectives</strong>
          <p className="mt-1 whitespace-pre-wrap">
            {proposal.objectives || "Not specified"}
          </p>
        </div>
      </section>

      {!isFinal && (
        <ReviewControls
          proposalId={proposal.id}
          status={proposal.status}
        />
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
