"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check } from "lucide-react";

export default function EventConfirmedDialog({ committeesHref, decisionHref }: { committeesHref: string; decisionHref: string }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const router = useRouter();

  useEffect(() => {
    dialog.current?.showModal();
  }, []);

  return (
    <dialog
      ref={dialog}
      aria-labelledby="event-confirmed-title"
      aria-describedby="event-confirmed-description"
      onClose={() => router.replace(decisionHref, { scroll: false })}
      className="m-auto w-[min(28rem,calc(100%-2rem))] rounded-2xl border border-brand-border bg-white p-6 text-text-primary shadow-xl backdrop:bg-brand-hover/40"
    >
      <span className="grid size-11 place-items-center rounded-xl bg-success-bg text-emerald-800"><Check size={22} aria-hidden="true" /></span>
      <h2 id="event-confirmed-title" className="mt-4 text-xl font-bold text-brand-primary">Your event is officially confirmed</h2>
      <p id="event-confirmed-description" className="mt-2 text-sm text-text-secondary">You can now start forming committees for this event.</p>
      <div className="mt-5 flex flex-wrap justify-end gap-2">
        <form method="dialog">
          <button type="submit" className="min-h-11 rounded-xl px-4 text-sm font-semibold text-brand-primary hover:bg-brand-selected">Close</button>
        </form>
        <Link replace href={committeesHref} className="inline-flex min-h-11 items-center justify-center rounded-xl bg-brand-primary px-4 text-sm font-semibold text-white hover:bg-brand-hover">Start forming committees</Link>
      </div>
    </dialog>
  );
}
