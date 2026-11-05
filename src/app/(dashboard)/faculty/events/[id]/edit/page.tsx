
import Link from "next/link";
import { requireRole } from "@/lib/auth/guard";
import { createClient } from "@/lib/supabase/server";

type Proposal = {
  id: string;
  title: string;
  venue: string;
  start_date: string;
  end_date: string;
  estimated_budget: number | null;
  status: string;
  review_note: string | null;
  created_at: string;
};

const statusConfig: Record<
  string,
  { label: string; className: string }
> = {
  DRAFT: {
    label: "Draft",
    className: "bg-gray-100 text-gray-700",
  },
  SUBMITTED: {
    label: "Submitted",
    className: "bg-blue-100 text-blue-700",
  },
  UNDER_REVIEW: {
    label: "Under review",
    className: "bg-yellow-100 text-yellow-800",
  },
  CHANGES_REQUESTED: {
    label: "Changes requested",
    className: "bg-orange-100 text-orange-800",
  },
  REJECTED: {
    label: "Rejected",
    className: "bg-red-100 text-red-700",
  },
  APPROVED_BY_DEAN: {
    label: "Approved by Dean",
    className: "bg-green-100 text-green-700",
  },
};

function formatDate(date: string) {
  return new Date(`${date}T00:00:00`).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatBudget(budget: number | null) {
  if (budget === null) return "Not specified";

  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(budget);
}

export default async function FacultyEventsPage() {
  const profile = await requireRole(["FACULTY"]);
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("event_proposals")
    .select(
      "id,title,venue,start_date,end_date,estimated_budget,status,review_note,created_at"
    )
    .eq("created_by", profile.id)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Failed to fetch faculty proposals:", error);

    return (
      <main className="mx-auto max-w-6xl p-6">
        <h1 className="text-2xl font-semibold">My Proposals</h1>
        <p className="mt-4 text-sm text-red-600">
          Unable to load your proposals. Please refresh the page or try again
          later.
        </p>
      </main>
    );
  }

  const proposals = (data ?? []) as Proposal[];

  return (
    <main className="mx-auto max-w-6xl space-y-8 p-6">
      {/* Header */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <p className="text-sm text-gray-500">Faculty workspace</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight">
            My Proposals
          </h1>
          <p className="mt-2 text-sm text-gray-500">
            Track your event proposals and respond to review feedback.
          </p>
        </div>

        <Link
          href="/faculty/events/new"
          className="inline-flex items-center justify-center rounded-lg bg-black px-5 py-3 text-sm font-medium text-white transition hover:bg-gray-800"
        >
          + New event proposal
        </Link>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <SummaryCard
          label="Total proposals"
          value={proposals.length}
        />
        <SummaryCard
          label="Under review"
          value={
            proposals.filter(
              (proposal) =>
                proposal.status === "SUBMITTED" ||
                proposal.status === "UNDER_REVIEW"
            ).length
          }
        />
        <SummaryCard
          label="Changes requested"
          value={
            proposals.filter(
              (proposal) => proposal.status === "CHANGES_REQUESTED"
            ).length
          }
        />
        <SummaryCard
          label="Approved"
          value={
            proposals.filter(
              (proposal) => proposal.status === "APPROVED_BY_DEAN"
            ).length
          }
        />
      </div>

      {/* Proposal list */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">All proposals</h2>
          <span className="text-sm text-gray-500">
            {proposals.length} {proposals.length === 1 ? "proposal" : "proposals"}
          </span>
        </div>

        {proposals.length === 0 ? (
          <div className="rounded-xl border border-dashed p-10 text-center">
            <h3 className="font-medium">No proposals yet</h3>
            <p className="mt-2 text-sm text-gray-500">
              Create your first event proposal to get started.
            </p>
            <Link
              href="/faculty/events/new"
              className="mt-5 inline-flex rounded-lg bg-black px-4 py-2.5 text-sm text-white hover:bg-gray-800"
            >
              Create proposal
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {proposals.map((proposal) => {
              const status =
                statusConfig[proposal.status] ?? {
                  label: proposal.status.replaceAll("_", " "),
                  className: "bg-gray-100 text-gray-700",
                };

              return (
                <article
                  key={proposal.id}
                  className="rounded-xl border bg-white p-5 shadow-sm"
                >
                  <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-lg font-semibold">
                          {proposal.title}
                        </h3>

                        <span
                          className={`rounded-full px-3 py-1 text-xs font-medium ${status.className}`}
                        >
                          {status.label}
                        </span>
                      </div>

                      <p className="mt-2 text-sm text-gray-500">
                        {proposal.venue}
                      </p>

                      <p className="mt-1 text-sm text-gray-500">
                        {formatDate(proposal.start_date)}
                        {proposal.start_date !== proposal.end_date &&
                          ` – ${formatDate(proposal.end_date)}`}
                      </p>

                      <p className="mt-2 text-sm text-gray-500">
                        Estimated budget:{" "}
                        <span className="font-medium text-gray-800">
                          {formatBudget(proposal.estimated_budget)}
                        </span>
                      </p>
                    </div>

                    <p className="shrink-0 text-xs text-gray-400">
                      Submitted{" "}
                      {formatDate(proposal.created_at.slice(0, 10))}
                    </p>
                  </div>

                  {/* Dean feedback */}
                  {proposal.status === "CHANGES_REQUESTED" &&
                    proposal.review_note && (
                      <div className="mt-5 rounded-lg border border-orange-200 bg-orange-50 p-4">
                        <p className="text-sm font-semibold text-orange-900">
                          Feedback from Dean
                        </p>
                        <p className="mt-2 whitespace-pre-wrap text-sm text-orange-800">
                          {proposal.review_note}
                        </p>
                      </div>
                    )}

                  {proposal.status === "REJECTED" &&
                    proposal.review_note && (
                      <div className="mt-5 rounded-lg border border-red-200 bg-red-50 p-4">
                        <p className="text-sm font-semibold text-red-900">
                          Review note
                        </p>
                        <p className="mt-2 whitespace-pre-wrap text-sm text-red-800">
                          {proposal.review_note}
                        </p>
                      </div>
                    )}

                  {/* Actions */}
                  <div className="mt-5 flex flex-wrap items-center gap-3 border-t pt-4">
                    {proposal.status === "CHANGES_REQUESTED" && (
                      <Link
                        href={`/faculty/events/${proposal.id}/edit`}
                        className="rounded-lg bg-black px-4 py-2 text-sm font-medium text-white hover:bg-gray-800"
                      >
                        Edit and resubmit
                      </Link>
                    )}

                    {proposal.status === "APPROVED_BY_DEAN" && (
                      <span className="text-sm font-medium text-green-700">
                        Dean approval complete
                      </span>
                    )}

                    {proposal.status === "SUBMITTED" && (
                      <span className="text-sm text-blue-700">
                        Waiting for Dean review
                      </span>
                    )}

                    {proposal.status === "UNDER_REVIEW" && (
                      <span className="text-sm text-yellow-700">
                        Currently being reviewed
                      </span>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}

function SummaryCard({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-xl border bg-white p-5 shadow-sm">
      <p className="text-sm text-gray-500">{label}</p>
      <p className="mt-2 text-2xl font-semibold">{value}</p>
    </div>
  );
}
