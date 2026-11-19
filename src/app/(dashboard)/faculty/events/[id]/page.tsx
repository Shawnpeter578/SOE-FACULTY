import Link from "next/link";
import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth/guard";
import { createClient } from "@/lib/supabase/server";
import ProposalDetails from "@/components/proposal-details";
import AppLayout from "../../components/AppLayout";

export default async function FacultyRequestDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const profile = await requireRole(["FACULTY"]);
  const { id } = await params;
  const supabase = await createClient();
  const { data: proposal, error } = await supabase.from("event_proposals").select("*").eq("id", id).eq("created_by", profile.id).maybeSingle();
  if (error) throw new Error("Unable to load your event request.");
  if (!proposal) notFound();
  const { data: event } = await supabase.from("events").select("status").eq("proposal_id", id).maybeSingle();
  return <AppLayout><div className="mx-auto max-w-4xl space-y-6">
    <Link href="/faculty/events" className="text-sm font-semibold text-brand-primary hover:underline">← My Events</Link>
    <div><h1 className="text-3xl font-bold">{proposal.title}</h1><p className="mt-2 text-sm text-text-secondary">Status: {(event?.status ?? proposal.status).replaceAll("_", " ")}</p></div>
    {proposal.review_note && <section className="rounded-xl border border-brand-border bg-white p-5"><h2 className="font-semibold">Dean&apos;s feedback</h2><p className="mt-2 whitespace-pre-wrap text-sm">{proposal.review_note}</p></section>}
    {proposal.status === "CHANGES_REQUESTED" && <Link href={`/faculty/events/${id}/edit`} className="inline-block rounded-xl bg-brand-primary px-5 py-3 text-sm font-semibold text-white">Edit and resubmit</Link>}
    <ProposalDetails proposal={proposal} facultyName={profile.full_name} />
  </div></AppLayout>;
}
