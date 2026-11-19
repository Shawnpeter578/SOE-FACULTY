import Link from "next/link";
import { requireRole } from "@/lib/auth/guard";
import { createClient } from "@/lib/supabase/server";
import { formatApprovalTime, formatEventBudget, formatEventDateRange, type ApprovalEvent } from "@/lib/event-approval";
import ApprovalControls from "@/components/approval-controls";
import RouteRefresh from "@/components/route-refresh";

export default async function ViceChancellorDashboardPage() {
  const profile = await requireRole(["VC"]);
  const supabase = await createClient();
  const { data, error } = await supabase.from("events").select("*").order("created_at", { ascending: false })
    .overrideTypes<ApprovalEvent[], { merge: false }>();
  if (error) throw new Error("Unable to load events for VC review.");
  const events = data.filter((event) => event.letter_printed_at);
  return (
    <main className="mx-auto max-w-5xl space-y-5 p-5 sm:p-8">
      <RouteRefresh intervalMs={10000} />
      <header><h1 className="text-2xl font-bold text-brand-primary">Vice-Chancellor dashboard</h1><p className="mt-1 text-sm text-text-secondary">Welcome, {profile.full_name}.</p></header>
      <h2 className="text-lg font-bold text-brand-primary">Event decisions</h2>
      {events.length ? events.map((event) => (
        <article key={event.id} className="space-y-3 rounded-card border border-brand-border bg-white p-5 shadow-card">
          <div className="flex flex-wrap items-center justify-between gap-2"><h3 className="text-base font-bold text-brand-primary">{event.title}</h3><span className={`rounded-full px-3 py-1 text-xs font-semibold ${event.vc_decision === "REJECTED" ? "bg-red-50 text-red-800" : event.vc_decision === "APPROVED" ? "bg-emerald-50 text-emerald-800" : "bg-brand-selected text-brand-primary"}`}>{event.vc_decision === "REJECTED" ? "Declined" : event.vc_decision === "APPROVED" ? "Approved" : "Awaiting decision"}</span></div>
          <p className="text-sm text-text-secondary">{formatEventDateRange(event.start_date, event.end_date)} · {event.venue}</p>
          {event.review_budget != null && <p className="text-sm text-text-secondary">Budget · {formatEventBudget(event.review_budget)}</p>}
          {event.review_requirements && <p className="whitespace-pre-wrap break-words text-sm text-text-secondary">{event.review_requirements}</p>}
          <Link className="inline-block text-sm font-semibold text-brand-primary hover:underline" href={`/faculty/events/${event.proposal_id}/letter`}>Read request letter</Link>
          {event.status === "AWAITING_VC_DOCUMENT" && !event.vc_decision ? (
            <div className="border-t border-brand-border pt-3"><ApprovalControls proposalId={event.proposal_id} mode="vc" /></div>
          ) : event.vc_decided_at && <p className="whitespace-pre-wrap break-words text-sm text-text-secondary">{formatApprovalTime(event.vc_decided_at)}{event.vc_note && ` · ${event.vc_note}`}</p>}
        </article>
      )) : <p className="rounded-card border border-brand-border bg-white p-5 text-sm text-text-secondary">No printed requests have been sent for review yet.</p>}
    </main>
  );
}
