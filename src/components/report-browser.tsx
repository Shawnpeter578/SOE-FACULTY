import Link from "next/link";
import { ChevronRight, Download, FileText, Folder } from "lucide-react";
import type { ReactNode } from "react";

export const reportPage = "mx-auto max-w-6xl space-y-5 py-2 md:py-4";
export const reportSurface = "min-w-0 rounded-card border border-brand-border bg-brand-surface";

export function ReportHeading({ description }: { description: string }) {
  return (
    <header className="py-2">
      <h1 className="text-3xl font-bold tracking-tight text-brand-primary">Reports</h1>
      <p className="mt-1.5 text-sm text-text-secondary">{description}</p>
    </header>
  );
}

export function ReportBreadcrumbs({ items }: { items: { name: string; href?: string }[] }) {
  return (
    <nav aria-label="Report location">
      <ol className="flex flex-wrap items-center gap-1.5 text-sm font-medium text-text-secondary">
        {items.map((item, index) => (
          <li key={index} className="flex min-w-0 items-center gap-1.5">
            {index > 0 && <ChevronRight size={14} className="shrink-0" aria-hidden="true" />}
            {item.href ? <Link href={item.href} className="break-words rounded-md px-1.5 py-1 text-brand-primary hover:bg-brand-selected">{item.name}</Link>
              : <span aria-current="page" className="break-words px-1.5 py-1 font-semibold text-brand-primary">{item.name}</span>}
          </li>
        ))}
      </ol>
    </nav>
  );
}

export function ReportFolders({ folders }: { folders: { href: string; title: string; detail?: string }[] }) {
  return (
    <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {folders.map(({ href, title, detail }) => (
        <li key={href} className="min-w-0">
          <Link href={href} className={`${reportSurface} group flex h-full items-center gap-3 p-3.5 transition-colors hover:border-brand-primary/30 hover:bg-brand-selected focus-visible:outline-2 focus-visible:outline-brand-primary`}>
            <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-brand-selected text-brand-primary group-hover:bg-white"><Folder size={20} aria-hidden="true" /></span>
            <span className="min-w-0 flex-1">
              <span className="block break-words text-sm font-semibold text-brand-primary">{title}</span>
              {detail && <span className="mt-0.5 block text-xs text-text-secondary">{detail}</span>}
            </span>
            <ChevronRight size={16} className="shrink-0 text-text-secondary" aria-hidden="true" />
          </Link>
        </li>
      ))}
    </ul>
  );
}

export function ReportFiles({ files, empty }: { files: { id: string; name: string; href: string; contributor: string; detail?: string; actions?: ReactNode }[]; empty: string }) {
  const row = "grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 px-4 sm:px-5 md:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)_minmax(0,1fr)_6rem]";
  return (
    <div className={`${reportSurface} overflow-hidden`}>
      <div aria-hidden="true" className={`${row} border-b border-brand-border bg-brand-canvas/70 py-3 text-xs font-semibold text-text-secondary`}>
        <span>Name</span><span className="hidden md:block">Added by</span><span className="hidden md:block">Details</span><span className="text-right">Actions</span>
      </div>
      {files.length ? <ul aria-label="Files" className="divide-y divide-brand-border">
        {files.map(({ id, name, href, contributor, detail, actions }) => (
          <li key={id} className={`${row} py-2.5 transition-colors hover:bg-brand-canvas`}>
            <div className="flex min-w-0 items-center gap-2.5">
              <span className="grid size-8 shrink-0 place-items-center rounded-md bg-brand-selected text-brand-primary"><FileText size={16} aria-hidden="true" /></span>
              <div className="min-w-0">
                <a href={href} className="block break-all text-sm font-semibold text-brand-primary hover:underline">{name}</a>
                <p className="mt-0.5 break-words text-xs text-text-secondary md:hidden">{contributor}{detail ? ` · ${detail}` : ""}</p>
              </div>
            </div>
            <span className="hidden min-w-0 break-words text-sm text-text-secondary md:block">{contributor}</span>
            <span className="hidden min-w-0 break-words text-xs text-text-secondary md:block">{detail}</span>
            <div className="flex items-center justify-end gap-0.5">
              <a href={href} aria-label={`Download ${name}`} className="grid size-9 shrink-0 place-items-center rounded-md text-brand-primary hover:bg-brand-selected"><Download size={17} aria-hidden="true" /></a>
              {actions}
            </div>
          </li>
        ))}
      </ul> : <p className="px-5 py-8 text-sm text-text-secondary">{empty}</p>}
    </div>
  );
}
