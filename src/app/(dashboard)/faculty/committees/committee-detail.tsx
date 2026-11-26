import Link from "next/link";
import { notFound } from "next/navigation";
import { Archive, Download, FileText, MessageSquare, Paperclip, UsersRound } from "lucide-react";
import { z } from "zod";
import { requireRole } from "@/lib/auth/guard";
import { formatApprovalTime, formatEventDateRange } from "@/lib/event-approval";
import { committeeCoordinators, committeeUpdateLabels, type CommitteeUpdate } from "@/lib/event-committees";
import { COMMITTEE_UPDATES_PAGE_SIZE, committeeLoadError, loadCommitteeUpdates, loadEventCommittees } from "@/lib/event-committees-server";
import { createClient } from "@/lib/supabase/server";
import AppLayout from "../components/AppLayout";
import ChatTimeline from "./chat-timeline";
import { AssignCommitteeForm, CommitteeManagement, CommitteeUpdateForm } from "./forms";
import { CommitteeAvatar, CommitteeBack, CommitteeEmpty, CommitteeHeader, committeeLink, committeePage, committeePanel } from "./workspace-ui";

const dayFormat = new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Kolkata" });
const clockFormat = new Intl.DateTimeFormat("en-IN", { hour: "numeric", minute: "2-digit", timeZone: "Asia/Kolkata" });

export default async function CommitteeDetail({ committeeId, eventId, page, filesOnly }: { committeeId: string; eventId?: string; page?: string | string[]; filesOnly: boolean }) {
  if (!z.uuid().safeParse(committeeId).success || (eventId && !z.uuid().safeParse(eventId).success)) notFound();
  const profile = await requireRole(["FACULTY"]);

  const requestedPage = typeof page === "string" && /^[1-9][0-9]{0,5}$/.test(page) ? Number(page) : 1;
  const supabase = await createClient();
  const { data: committees, error } = await loadEventCommittees(supabase, eventId, committeeId);
  if (error) return (
    <AppLayout facultyName={profile.full_name}>
      <p role="status" className={`${committeePanel} p-5 text-sm text-text-secondary`}>{committeeLoadError(error.code)}</p>
    </AppLayout>
  );
  const committee = committees[0];
  if (!committee) notFound();

  const { data: updates, error: updateError, count } = await loadCommitteeUpdates(supabase, committee.id, requestedPage, filesOnly);
  const parent = eventId ? `/faculty/committees/${eventId}` : "/faculty/co-faculty/committees";
  const href = `${parent}/${committee.id}`;
  const fileHref = `${href}?view=files`;
  const coordinators = committeeCoordinators(committee);
  const history = (updates ?? []).slice().reverse();
  const hasOlderUpdates = (count ?? 0) > requestedPage * COMMITTEE_UPDATES_PAGE_SIZE;
  const tab = "inline-flex min-h-10 items-center gap-2 rounded-lg px-3 text-sm font-semibold hover:bg-brand-border focus-visible:outline-2 focus-visible:outline-brand-primary";
  const tabState = (active: boolean) => active ? "bg-brand-selected text-brand-primary" : "text-text-secondary";
  function historyPageHref(next: number) {
    if (next === 1) return filesOnly ? fileHref : href;
    return filesOnly ? `${fileHref}&page=${next}` : `${href}?page=${next}`;
  }

  return (
    <AppLayout facultyName={profile.full_name} refreshIntervalMs={10000}>
      <div className={committeePage}>
        <CommitteeBack href={parent}>{eventId ? "Event committees" : "My committees"}</CommitteeBack>
        <CommitteeHeader compact title={committee.name} context={`${committee.event_title} · ${formatEventDateRange(committee.start_date, committee.end_date)}`}>
          {eventId && <div className="flex flex-wrap gap-2">
            <Link href={`/faculty/reports?event=${eventId}&committee=${committee.id}`} className={committeeLink}><Archive size={16} aria-hidden="true" />Reports</Link>
            <CommitteeManagement committeeId={committee.id} name={committee.name} responsibilities={committee.responsibilities} />
          </div>}
        </CommitteeHeader>

        <div className="@container">
          <div className="grid items-start gap-5 @min-[48rem]:grid-cols-[minmax(0,1fr)_minmax(17rem,20rem)]">
            <section aria-label="Committee discussion" className={`${committeePanel} overflow-hidden`}>
              <nav aria-label="Committee discussion views" className="flex flex-wrap gap-1.5 border-b border-brand-border p-3">
                <Link href={href} aria-current={!filesOnly ? "page" : undefined} className={`${tab} ${tabState(!filesOnly)}`}><MessageSquare size={17} aria-hidden="true" />Chat history</Link>
                <Link href={fileHref} aria-current={filesOnly ? "page" : undefined} className={`${tab} ${tabState(filesOnly)}`}><Paperclip size={17} aria-hidden="true" />Shared files</Link>
              </nav>
              {!updateError && (requestedPage > 1 || hasOlderUpdates) && (
                <nav aria-label="Committee history pages" className="flex flex-wrap justify-center gap-3 border-b border-brand-border px-3 py-2 text-xs font-semibold text-brand-primary">
                  {hasOlderUpdates && <Link href={historyPageHref(requestedPage + 1)} className="rounded-md px-2 py-1 hover:bg-brand-selected">Older {filesOnly ? "files" : "messages"}</Link>}
                  {requestedPage > 1 && <Link href={historyPageHref(requestedPage - 1)} className="rounded-md px-2 py-1 hover:bg-brand-selected">Newer {filesOnly ? "files" : "messages"}</Link>}
                </nav>
              )}

              {updateError ? <p role="status" className="p-5 text-sm text-text-secondary">{committeeLoadError(updateError.code)}</p>
                : filesOnly ? (
                  <div>
                    {updates.length ? <ul aria-label="Shared files" className="divide-y divide-brand-border">
                      {updates.map((update) => update.file_name && (
                        <li key={update.id} className="flex min-w-0 items-center gap-3 px-4 py-3 sm:px-5">
                          <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-brand-selected text-brand-primary"><FileText size={18} aria-hidden="true" /></span>
                          <div className="min-w-0 flex-1">
                            <p className="break-all text-sm font-semibold text-brand-primary">{update.file_name}</p>
                            <p className="mt-0.5 break-words text-xs text-text-secondary">{update.submitted_by_name} · {formatApprovalTime(update.created_at)}</p>
                          </div>
                          <a href={`/faculty/committee-files/${update.id}`} aria-label={`Download ${update.file_name}`} className="grid size-10 shrink-0 place-items-center rounded-lg text-brand-primary hover:bg-brand-selected focus-visible:outline-2 focus-visible:outline-brand-primary"><Download size={17} aria-hidden="true" /></a>
                        </li>
                      ))}
                    </ul> : <CommitteeEmpty title={requestedPage > 1 ? "No files on this page" : "No files shared yet"}>Files posted in chat will appear here.</CommitteeEmpty>}
                    <div className="border-t border-brand-border p-3">
                      <Link href={`${href}#committee-composer`} className={committeeLink}><Paperclip size={16} aria-hidden="true" />Share a file in chat</Link>
                    </div>
                  </div>
                ) : (
                  <ChatTimeline key={requestedPage} newestId={history.at(-1)?.id}>
                    {history.length ? <ol aria-label="Chat history" className="space-y-3">
                      {history.map((update, index) => {
                        const day = dayFormat.format(new Date(update.created_at));
                        const previous = history[index - 1];
                        const showDay = !previous || day !== dayFormat.format(new Date(previous.created_at));
                        return <ChatMessage key={update.id} update={update} mine={update.submitted_by === profile.id} day={showDay ? day : undefined} />;
                      })}
                    </ol> : <CommitteeEmpty title={requestedPage > 1 ? "No messages on this page" : "Start the conversation"}>Send a message or attach a file for your committee.</CommitteeEmpty>}
                  </ChatTimeline>
                )}
              {!filesOnly && <div id="committee-composer" className="scroll-mt-4 border-t border-brand-border p-3 sm:p-4">
                <CommitteeUpdateForm committeeId={committee.id} href={href} confirmFileSent={!eventId} />
              </div>}
            </section>

            <aside className={`${committeePanel} overflow-hidden`}>
              <div className="flex items-center gap-2 border-b border-brand-border px-5 py-4 font-bold text-brand-primary"><UsersRound size={18} aria-hidden="true" /><h2>Committee team</h2></div>
              <div className="space-y-4 p-5">
                <div className="flex min-w-0 items-center gap-2.5">
                  <CommitteeAvatar name={committee.owner_name} accent />
                  <div className="min-w-0">
                    <p className="break-words text-sm font-semibold text-brand-primary">{committee.owner_name}</p>
                    <p className="text-xs text-text-secondary">Event lead</p>
                  </div>
                </div>
                {committee.responsibilities && <div className="rounded-xl bg-brand-canvas p-3">
                  <h3 className="text-xs font-semibold text-brand-primary">Responsibilities</h3>
                  <p className="mt-1 whitespace-pre-wrap break-words text-sm text-text-secondary">{committee.responsibilities}</p>
                </div>}
                <div>
                  <h3 className="mb-2 flex items-center justify-between gap-2 text-sm font-semibold text-brand-primary">Co-faculty <span className="rounded-full bg-brand-selected px-2.5 py-1 text-xs">{coordinators.length} / 2</span></h3>
                  {eventId ? <AssignCommitteeForm committeeId={committee.id} coordinators={coordinators} />
                    : <ul className="space-y-2">{coordinators.map(({ id, name }) => <li key={id} className="flex items-center gap-2.5 text-sm text-text-primary"><CommitteeAvatar name={name} /><span className="min-w-0 break-words">{name}{id === profile.id && " (you)"}</span></li>)}</ul>}
                </div>
              </div>
            </aside>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}

function ChatMessage({ update, mine, day }: { update: CommitteeUpdate; mine: boolean; day?: string }) {
  const title = update.title !== "Message" && update.title !== "Attachment" ? update.title : null;
  return (
    <li>
      {day && <div className="mb-3 flex items-center gap-3 text-xs font-medium text-text-secondary before:h-px before:flex-1 before:bg-brand-border after:h-px after:flex-1 after:bg-brand-border">{day}</div>}
      <div className={`flex items-end gap-2 ${mine ? "flex-row-reverse" : ""}`}>
        <CommitteeAvatar name={update.submitted_by_name} accent={mine} />
        <div className={`min-w-0 max-w-[min(84%,36rem)] rounded-2xl border border-brand-border px-3 py-2.5 ${mine ? "rounded-br-sm bg-brand-selected" : "rounded-bl-sm bg-white"}`}>
          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
            <span className="break-words text-xs font-bold text-brand-primary">{mine ? "You" : update.submitted_by_name}</span>
            <time dateTime={update.created_at} className="text-xs text-text-secondary">{clockFormat.format(new Date(update.created_at))}</time>
          </div>
          {title && <p className="mt-1 break-words text-sm font-semibold text-brand-primary">{title}</p>}
          {update.kind !== "MESSAGE" && <span className="mt-1 inline-block rounded-md bg-white px-2 py-0.5 text-xs font-medium text-brand-primary">{committeeUpdateLabels[update.kind]}</span>}
          {update.details && <p className="mt-1 whitespace-pre-wrap break-words text-sm text-text-primary">{update.details}</p>}
          {update.file_name && <a href={`/faculty/committee-files/${update.id}`} className="mt-2 flex max-w-full items-center gap-2 rounded-xl border border-brand-border bg-white px-2.5 py-2 text-xs font-semibold text-brand-primary hover:bg-brand-canvas focus-visible:outline-2 focus-visible:outline-brand-primary">
            <FileText size={16} className="shrink-0" aria-hidden="true" /><span className="min-w-0 flex-1 break-all">{update.file_name}</span><Download size={15} className="shrink-0" aria-hidden="true" />
          </a>}
          {update.file_removed && update.details !== "Attachment removed." && <p className="mt-1 text-xs text-text-secondary">Attachment removed.</p>}
        </div>
      </div>
    </li>
  );
}
