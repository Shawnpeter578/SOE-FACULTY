
import { requireRole } from "@/lib/auth/guard";
import { createClient } from "@/lib/supabase/server";

export default async function DeanProposalsPage() {
  await requireRole(["DEAN"]);

  const supabase = await createClient();

  const { data: proposals, error } = await supabase
    .from("event_proposals")
    .select(`
      id,
      title,
      venue,
      start_date,
      end_date,
      estimated_budget,
      status,
      created_at,
      created_by
    `)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error("Unable to load event proposals.");
  }

  const userIds = [...new Set(
    proposals.map((proposal) => proposal.created_by)
  )];

  const { data: profiles, error: profileError } = userIds.length
    ? await supabase
        .from("profiles")
        .select("id, full_name")
        .in("id", userIds)
    : { data: [], error: null };

  if (profileError) {
    throw new Error("Unable to load faculty profiles.");
  }

  const profileMap = new Map(
    (profiles ?? []).map((profile) => [
      profile.id,
      profile.full_name,
    ])
  );

  return (
    <main className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold">Event Proposals</h1>
        <p className="text-gray-500">
          Review and manage institutional event proposals.
        </p>
      </div>

      {proposals.length === 0 ? (
        <p>No event proposals have been submitted yet.</p>
      ) : (
        <div className="space-y-4">
          {proposals.map((proposal) => (
            <article
              key={proposal.id}
              className="rounded-lg border p-5"
            >
              <div className="flex flex-wrap justify-between gap-3">
                <h2 className="font-semibold">{proposal.title}</h2>
                <span className="text-sm">
                  {proposal.status.replaceAll("_", " ")}
                </span>
              </div>

              <p className="mt-2 text-sm text-gray-500">
                Submitted by:{" "}
                {profileMap.get(proposal.created_by) ?? "Unknown"}
              </p>

              <p className="mt-1 text-sm">
                {proposal.venue} · {proposal.start_date} to{" "}
                {proposal.end_date}
              </p>

              {proposal.estimated_budget !== null && (
                <p className="mt-1 text-sm">
                  Estimated budget: ₹{proposal.estimated_budget}
                </p>
              )}

              <a
                href={`/dean/proposals/${proposal.id}`}
                className="mt-4 inline-block text-sm underline"
              >
                Review proposal →
              </a>
            </article>
          ))}
        </div>
      )}
    </main>
  );
}
