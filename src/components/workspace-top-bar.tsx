import Form from "next/form";
import Link from "next/link";
import { ArrowRight, LayoutGrid, Search } from "lucide-react";
import type { ReactNode } from "react";

export function workspaceInitials(name: string, fallback: string) {
  return name.trim().split(/\s+/).slice(0, 2).map((word) => word[0]).join("").toUpperCase() || fallback;
}

type WorkspaceTopBarProps = {
  role: "Dean" | "Faculty";
  name: string;
  initials: string;
  searchPath: string;
  searchLabel: string;
  showSearch?: boolean;
  showOnMobile?: boolean;
  notifications: ReactNode;
};

export default function WorkspaceTopBar({
  role, name, initials, searchPath, searchLabel, showSearch = true, showOnMobile = true, notifications,
}: WorkspaceTopBarProps) {
  return (
    <header className={`${showOnMobile ? 'flex' : 'hidden lg:flex'} relative z-10 mx-3 mt-3 min-h-16 shrink-0 items-center gap-2 rounded-2xl border border-brand-border bg-brand-surface/90 px-2.5 shadow-sm sm:mx-5 sm:gap-4 sm:rounded-3xl sm:px-5 lg:mx-8 lg:mt-5 lg:min-h-[4.5rem] lg:gap-5 lg:px-6 xl:px-8`}>
      <div className="hidden shrink-0 items-center gap-2.5 lg:flex">
        <span className="flex size-10 items-center justify-center rounded-xl bg-brand-selected text-brand-primary">
          <LayoutGrid className="size-5" aria-hidden="true" />
        </span>
        <p className="text-sm font-bold text-brand-primary">{role} workspace</p>
      </div>
      {showSearch && (
        <Form
          action={searchPath}
          role="search"
          aria-label={searchLabel}
          className="flex min-h-12 min-w-0 max-w-xl flex-1 items-center gap-2 rounded-full border border-brand-border bg-brand-canvas py-0.5 pl-3 pr-1.5 transition-colors focus-within:border-brand-primary focus-within:bg-brand-surface focus-within:ring-2 focus-within:ring-brand-primary/15 sm:gap-3 sm:pl-4"
        >
          <Search className="size-4 shrink-0 text-brand-primary sm:size-5" aria-hidden="true" />
          <input
            type="search"
            name="q"
            maxLength={120}
            aria-label={searchLabel}
            placeholder={role === "Dean" ? "Search requests" : "Search events"}
            className="min-h-11 min-w-0 flex-1 bg-transparent text-base text-text-primary outline-none placeholder:text-text-secondary sm:text-sm"
          />
          <button type="submit" aria-label={role === "Dean" ? "Search requests" : "Search events"} className="inline-flex size-9 shrink-0 items-center justify-center rounded-full bg-brand-primary text-white transition-colors hover:bg-brand-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-primary sm:w-auto sm:px-4 sm:text-sm sm:font-semibold">
            <span className="hidden sm:inline">Search</span>
            <ArrowRight className="size-4 sm:hidden" aria-hidden="true" />
          </button>
        </Form>
      )}
      <div className="ml-auto flex shrink-0 items-center gap-1.5 sm:gap-3">
        {notifications}
        <span className="hidden h-7 w-px bg-brand-border xl:block" aria-hidden="true" />
        <Link href={role === "Dean" ? "/dean/profile" : "/faculty/profile"} aria-label="Your profile" className="flex min-h-11 items-center gap-2.5 rounded-full p-1 text-brand-primary transition-colors hover:bg-brand-selected focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-primary xl:pr-3">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-brand-selected text-sm font-bold" aria-hidden="true">
            {initials}
          </span>
          <span className="hidden max-w-36 truncate text-sm font-semibold xl:block">{name}</span>
        </Link>
      </div>
    </header>
  );
}
