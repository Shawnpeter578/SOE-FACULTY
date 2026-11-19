import { createClient } from "@/lib/supabase/server";
import { PROPOSAL_ATTACHMENT_BUCKET, type ProposalAttachment } from "@/lib/validation/proposal-attachments";

type Proposal = {
  title: string;
  description: string;
  objectives: string | null;
  venue: string;
  start_date: string;
  end_date: string;
  estimated_budget: number | null;
  event_type?: string;
  resource_person?: string;
  start_time?: string | null;
  end_time?: string | null;
  duration?: string;
  department?: string;
  expected_participants?: number | null;
  target_audience?: string;
  sponsorship_expected?: boolean;
  special_requirements?: string;
  attachments?: unknown;
};

export default async function ProposalDetails({ proposal, facultyName }: { proposal: Proposal; facultyName: string }) {
  const supabase = await createClient();
  const attachments: ProposalAttachment[] = Array.isArray(proposal.attachments)
    ? proposal.attachments.filter((item): item is ProposalAttachment => item && typeof item.name === "string" && typeof item.path === "string" && typeof item.size === "number")
    : [];
  const links = await Promise.all(attachments.map(async (attachment) => {
    const { data } = await supabase.storage.from(PROPOSAL_ATTACHMENT_BUCKET).createSignedUrl(attachment.path, 3600, { download: attachment.name });
    return { ...attachment, url: data?.signedUrl };
  }));
  const budget = proposal.estimated_budget == null ? "Not specified" : new Intl.NumberFormat("en-IN", {
    style: "currency", currency: "INR", maximumFractionDigits: 2,
  }).format(proposal.estimated_budget);

  return <section className="space-y-5 rounded-xl border border-brand-border bg-white p-6 shadow-card">
    <h2 className="text-lg font-bold">Request details</h2>
    <dl className="grid gap-5 sm:grid-cols-2">
      {[
        ["Faculty", facultyName], ["Event type", proposal.event_type], ["Resource person", proposal.resource_person],
        ["Department", proposal.department], ["Start date", proposal.start_date], ["End date", proposal.end_date],
        ["Start time (IST)", proposal.start_time?.slice(0, 5)], ["End time (IST)", proposal.end_time?.slice(0, 5)],
        ["Expected duration", proposal.duration], ["Venue", proposal.venue],
        ["Expected participants", proposal.expected_participants?.toLocaleString("en-IN")], ["Target audience", proposal.target_audience],
        ["Estimated budget", budget], ["Sponsorship expected", proposal.sponsorship_expected ? "Yes, not yet confirmed" : "No"],
      ].map(([label, value]) => <div key={label}><dt className="text-sm font-semibold">{label}</dt><dd className="mt-1 break-words text-sm text-text-secondary">{value || "Not specified"}</dd></div>)}
      {[["Description", proposal.description], ["Objectives", proposal.objectives], ["Special requirements", proposal.special_requirements]].map(([label, value]) => <div key={label} className="sm:col-span-2"><dt className="text-sm font-semibold">{label}</dt><dd className="mt-1 whitespace-pre-wrap break-words text-sm text-text-secondary">{value || "Not specified"}</dd></div>)}
    </dl>
    <div className="border-t border-brand-border pt-5">
      <h3 className="text-sm font-semibold">Attachments</h3>
      {links.length ? <ul className="mt-3 space-y-2">{links.map((attachment) => <li key={attachment.path} className="break-words text-sm">
        {attachment.url ? <a href={attachment.url} target="_blank" rel="noreferrer" className="font-medium text-brand-primary underline">{attachment.name}</a> : <span>{attachment.name} — Download unavailable; refresh to retry.</span>}
        <span className="ml-2 text-xs text-text-secondary">{Math.ceil(attachment.size / 1024)} KB</span>
      </li>)}</ul> : <p className="mt-2 text-sm text-text-secondary">No attachments.</p>}
    </div>
  </section>;
}
