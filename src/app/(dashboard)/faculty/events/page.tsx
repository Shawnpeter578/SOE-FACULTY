
import Link from "next/link";
import { requireRole } from "@/lib/auth/guard";
import { createClient } from "@/lib/supabase/server";

const statusStyles: Record<string, string> = {
  DRAFT: "bg-gray-100 text-gray-700",
  SUBMITTED: "bg-blue-100 text-blue-700",
  UNDER_REVIEW: "bg-yellow-100 text-yellow-700",
  CHANGES_REQUESTED: "bg-orange-100 text-orange-700",
  REJECTED: "bg-red-100 text-red-700",
  APPROVED_BY_DEAN: "bg-green-100 text-green-700",
};

export default async function FacultyProposalsPage() {
  const profile = await requireRole(["FACULTY"]);
  const supabase = await createClient();

  const { data: proposals, error } = await supabase
    .from("event_proposals")
    .select(`
      id,
      title,
      venue,
      start_date,
      end_date,
      status,
      review_note,
      created_at
    `)
    .eq("created_by", profile.id)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error("Unable to load your proposals.");
  }

  return (
    <main className="space-y-6 p-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">My Proposals</h1>
          <p className="text-gray-500">
            Track your submitted event proposals and Dean feedback.
          </p>
        </div>

        <Link
          href="/faculty/events/new"
          className="rounded-md bg-black px-4 py-2 text-white"
        >
          + New Proposal
        </Link>
      </div>

      {!proposals?.length ? (
        <div className="rounded-lg border p-8 text-center">
          <h2 className="font-medium">No proposals yet</h2>
          <p className="mt-2 text-sm text-gray-500">
            Your event proposals will appear here.
          </p>
          <Link
            href="/faculty/events/new"
            className="mt-4 inline-block underline"
          >
            Submit your first proposal
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {proposals.map((proposal) => (
            <article
              key={proposal.id}
              className="space-y-3 rounded-lg border p-5"
            >
              <div className="flex flex-wrap justify-between gap-3">
                <h2 className="font-semibold">{proposal.title}</h2>

                <span
                  className={`rounded-full px-3 py-1 text-xs font-medium ${
                    statusStyles[proposal.status] ??
                    "bg-gray-100 text-gray-700"
                  }`}
                >
                  {proposal.status.replaceAll("_", " ")}
                </span>
              </div>

              <p className="text-sm text-gray-500">
                {proposal.venue} · {proposal.start_date} to {proposal.end_date}
              </p>

              {proposal.review_note && (
                <div className="rounded-md bg-gray-50 p-3">
                  <p className="text-sm font-medium">Dean's feedback</p>
                  <p className="mt-1 text-sm">
                    {proposal.review_note}
                  </p>
                </div>
              )}

              {proposal.status === "CHANGES_REQUESTED" && (
                <Link
                  href={`/faculty/events/${proposal.id}/edit`}
                  className="inline-block text-sm font-medium underline"
                >
                  Edit and resubmit →
                </Link>
              )}

              <p className="text-xs text-gray-400">
                Submitted {new Date(proposal.created_at).toLocaleDateString()}
              </p>
            </article>
          ))}
        </div>
      )}
    </main>
  );
}
