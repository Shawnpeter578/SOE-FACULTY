import Link from "next/link";
import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth/guard";
import { createClient } from "@/lib/supabase/server";
import AppLayout from "../../../components/AppLayout";
import EditProposalForm from "./edit-form";

export default async function EditRequestPage({ params }: { params: Promise<{ id: string }> }) {
  const profile = await requireRole(["FACULTY"]);
  const { id } = await params;
  const supabase = await createClient();
  const { data: proposal, error } = await supabase.from("event_proposals").select("*").eq("id", id).eq("created_by", profile.id).maybeSingle();
  if (error) throw new Error("Unable to load your event request.");
  if (!proposal) notFound();

  return <AppLayout facultyName={profile.full_name}><div className="mx-auto max-w-3xl space-y-6">
    <Link href={`/faculty/events/${id}`} className="text-sm font-semibold text-brand-primary hover:underline">← View request</Link>
    <h1 className="text-3xl font-bold">Edit event request</h1>
    {proposal.status !== "CHANGES_REQUESTED" ? <p>This request is not currently available for editing.</p> : <>
      {proposal.review_note && <div className="rounded-xl border border-orange-200 bg-orange-50 p-5"><h2 className="font-semibold">Dean&apos;s feedback</h2><p className="mt-2 whitespace-pre-wrap text-sm">{proposal.review_note}</p></div>}
      <div className="rounded-xl border border-brand-border bg-white p-6"><EditProposalForm proposal={proposal} /></div>
    </>}
  </div></AppLayout>;
}
