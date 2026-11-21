"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Check, ChevronDown, LayoutGrid, UserRound, UsersRound } from "lucide-react";

export default function FacultyWorkspaceSwitch({ name, initials, coFaculty }: {
  name: string; initials: string; coFaculty: boolean;
}) {
  const [open, setOpen] = useState(false);
  const control = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    function dismiss(event: PointerEvent) {
      if (event.target instanceof Node && !control.current?.contains(event.target)) setOpen(false);
    }
    document.addEventListener("pointerdown", dismiss);
    return () => document.removeEventListener("pointerdown", dismiss);
  }, [open]);

  const settingsClass = "flex min-h-11 items-center gap-2.5 rounded-xl px-3 text-sm font-semibold text-brand-primary hover:bg-brand-border focus-visible:outline-2 focus-visible:outline-brand-primary";
  return (
    <div ref={control} className="relative" onKeyDown={(event) => {
      if (event.key === "Escape" && open) {
        setOpen(false);
        trigger.current?.focus();
      }
    }}>
      <button ref={trigger} type="button" aria-expanded={open} aria-controls={open ? "faculty-workspace-choices" : undefined}
        aria-label={`Switch workspace, ${coFaculty ? "Co-Faculty" : "Faculty"} active`}
        onClick={() => setOpen(!open)}
        className="flex min-h-11 items-center gap-1 rounded-full p-1 text-brand-primary hover:bg-brand-selected focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-primary sm:gap-2.5 xl:pr-2">
        <span aria-hidden="true" className="grid size-9 shrink-0 place-items-center rounded-full bg-brand-selected text-sm font-bold">{initials}</span>
        <span className="hidden max-w-36 truncate text-sm font-semibold xl:block">{name}</span>
        <ChevronDown size={16} aria-hidden="true" className={`shrink-0 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && <nav id="faculty-workspace-choices" aria-label="Switch workspace" className="absolute top-[calc(100%+0.5rem)] right-0 z-50 w-64 max-w-[calc(100vw-2rem)] rounded-2xl border border-brand-border bg-brand-surface p-2 shadow-xl">
        <p className="px-3 pt-2 pb-1 text-xs font-semibold text-text-secondary">Switch workspace</p>
        <Link href="/faculty/dashboard" onClick={() => setOpen(false)} aria-current={coFaculty ? undefined : "true"} className={`${settingsClass} ${coFaculty ? "" : "bg-brand-selected"}`}>
          <LayoutGrid size={17} aria-hidden="true" />Faculty{!coFaculty && <Check size={16} aria-label="Current workspace" className="ml-auto" />}
        </Link>
        <Link href="/faculty/co-faculty" onClick={() => setOpen(false)} aria-current={coFaculty ? "true" : undefined} className={`${settingsClass} ${coFaculty ? "bg-brand-selected" : ""}`}>
          <UsersRound size={17} aria-hidden="true" />Co-Faculty{coFaculty && <Check size={16} aria-label="Current workspace" className="ml-auto" />}
        </Link>
        <div className="mt-1 border-t border-brand-border pt-1">
          <Link href="/faculty/profile" onClick={() => setOpen(false)} className={settingsClass}><UserRound size={17} aria-hidden="true" />Profile settings</Link>
        </div>
      </nav>}
    </div>
  );
}
