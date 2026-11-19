import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import { requireRole } from "@/lib/auth/guard";
import { formatApprovalDate, formatEventBudget, formatEventDateRange, type ApprovalEvent } from "@/lib/event-approval";
import { createClient } from "@/lib/supabase/server";
import { universityName } from "@/lib/university";
import PrintLetter from "./print-letter";

export default async function RequestLetterPage({ params }: { params: Promise<{ id: string }> }) {
  const profile = await requireRole(["FACULTY", "DEAN", "VC"]);
  const { id } = await params;
  if (!z.string().uuid().safeParse(id).success) notFound();
  const supabase = await createClient();
  const query = supabase.from("events").select("*").eq("proposal_id", id);
  if (profile.role === "FACULTY") query.eq("created_by", profile.id);
  const { data: event, error } = await query.maybeSingle<ApprovalEvent>();
  if (error) throw new Error("Unable to load the request letter.");
  if (!event?.letter_generated_at) notFound();
  const back = profile.role === "FACULTY" ? `/faculty/events/${id}` : profile.role === "DEAN" ? `/dean/proposals/${id}` : "/vc/dashboard";

  return (
    <main className="mx-auto w-full max-w-3xl p-4 sm:p-8 print:max-w-none print:p-0">
      <div className="mb-4 flex items-center justify-between gap-3 print:hidden"><Link href={back} className="text-sm font-semibold text-brand-primary hover:underline">← Back to request</Link><PrintLetter /></div>
      <article className="space-y-5 rounded-card border border-brand-border bg-white p-7 text-sm text-text-primary sm:p-12 print:border-0 print:p-0">
        <header className="border-b border-brand-border pb-4"><p className="text-xs font-semibold text-brand-primary">{universityName}</p><h1 className="mt-1 text-2xl font-bold text-brand-primary">Event request for VC review</h1></header>
        <p>Date prepared {formatApprovalDate(event.letter_generated_at)}</p>
        <p>To the Vice-Chancellor</p>
        <p className="font-semibold">Subject · Request for approval of {event.title}</p>
        <p>Please review the following request, which has been approved by the Dean for submission to your office.</p>
        <dl className="grid gap-3 sm:grid-cols-2">
          <div><dt className="font-semibold">Event</dt><dd>{event.title}</dd></div>
          <div><dt className="font-semibold">Faculty coordinator</dt><dd>{event.letter_faculty_name ?? "Faculty coordinator"}</dd></div>
          <div><dt className="font-semibold">Dates</dt><dd>{formatEventDateRange(event.start_date, event.end_date)}</dd></div>
          <div><dt className="font-semibold">Venue</dt><dd>{event.venue}</dd></div>
          {event.review_budget != null && <div><dt className="font-semibold">Budget</dt><dd>{formatEventBudget(event.review_budget)}</dd></div>}
        </dl>
        <p className="whitespace-pre-wrap break-words">{event.description}</p>
        {event.review_requirements && <div><h2 className="font-semibold">Event requirements</h2><p className="mt-1 whitespace-pre-wrap break-words">{event.review_requirements}</p></div>}
        <p>Submitted by {event.letter_faculty_name ?? "the faculty coordinator"}</p>
      </article>
    </main>
  );
}
