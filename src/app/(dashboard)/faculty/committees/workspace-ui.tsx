import type { ReactNode } from "react";
import { UsersRound } from "lucide-react";

export const committeePanel = "min-w-0 rounded-card border border-brand-border bg-brand-surface";
export const committeePage = "mx-auto max-w-6xl space-y-5 py-2 md:py-4";

export function CommitteeHeader({ title, context, children }: { title: string; context?: string; children?: ReactNode }) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-4 border-b border-brand-border pb-5">
      <div className="flex min-w-0 items-start gap-3.5">
        <span className="grid size-11 shrink-0 place-items-center rounded-lg bg-brand-primary text-white sm:size-12"><UsersRound size={21} aria-hidden="true" /></span>
        <div className="min-w-0">
          <h1 className="break-words text-2xl font-bold tracking-tight text-brand-primary sm:text-3xl">{title}</h1>
          {context && <p className="mt-1 break-words text-sm text-text-secondary">{context}</p>}
        </div>
      </div>
      {children}
    </header>
  );
}
