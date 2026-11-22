"use client";

import { useId, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { ArrowUpRight, Building2, IdCard, Mail, PenLine, UserRound } from "lucide-react";

const sections = [
  { id: "personal", label: "Personal details", icon: UserRound },
  { id: "workplace", label: "Workplace", icon: Building2 },
  { id: "signature", label: "E-signature", icon: PenLine },
] as const;
type Section = (typeof sections)[number]["id"];

export default function ProfileWorkspace({
  name, initials, role, affiliation, email, employeeId, signatureSaved, personal, workplace, signature, recent,
}: {
  name: string;
  initials: string;
  role: "Faculty" | "Dean";
  affiliation: string;
  email?: string;
  employeeId?: string | null;
  signatureSaved: boolean | null;
  personal: ReactNode;
  workplace: ReactNode;
  signature: ReactNode;
  recent?: ReactNode;
}) {
  const [active, setActive] = useState<Section>("personal");
  const id = useId();
  const tabs = useRef<Partial<Record<Section, HTMLButtonElement | null>>>({});
  const panels = { personal, workplace, signature };

  function activate(section: Section) {
    setActive(section);
    tabs.current[section]?.focus();
  }

  function handleTabKey(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    let next: number;
    switch (event.key) {
      case "ArrowLeft": next = (index + sections.length - 1) % sections.length; break;
      case "ArrowRight": next = (index + 1) % sections.length; break;
      case "Home": next = 0; break;
      case "End": next = sections.length - 1; break;
      default: return;
    }
    event.preventDefault();
    activate(sections[next].id);
  }

  return (
    <div className="@container mx-auto max-w-6xl py-2 sm:py-6">
      <header className="mb-5 sm:mb-6">
        <h1 className="text-3xl font-bold tracking-tight text-brand-primary sm:text-4xl">Profile</h1>
      </header>
      <div className="grid items-start gap-4 @min-[49rem]:grid-cols-[minmax(0,1fr)_16rem] @min-[62rem]:grid-cols-[minmax(0,1fr)_17.5rem] sm:gap-5">
        <section aria-label="Profile settings" className="min-w-0 rounded-card border border-brand-border bg-brand-surface">
          <div className="flex min-w-0 flex-wrap items-center gap-3.5 rounded-t-card border-b border-brand-border bg-brand-canvas/70 px-4 py-5 sm:flex-nowrap sm:gap-4 sm:px-6">
            <span aria-hidden="true" className="grid size-12 shrink-0 place-items-center rounded-lg bg-brand-primary text-lg font-bold text-white sm:size-14 sm:text-xl">{initials}</span>
            <div className="min-w-0 flex-1">
              <h2 className="text-xl font-bold tracking-tight text-text-primary [overflow-wrap:anywhere] sm:text-2xl">{name}</h2>
              <p className="mt-1 text-sm text-text-secondary [overflow-wrap:anywhere]">{affiliation}</p>
            </div>
            <span className="ml-auto rounded-md border border-brand-border bg-brand-surface px-2.5 py-1 text-xs font-semibold text-brand-primary">{role}</span>
          </div>

          <div role="tablist" aria-label="Profile sections" className="flex min-w-0 border-b border-brand-border sm:px-5">
            {sections.map(({ id: section, label, icon: Icon }, index) => (
              <button
                key={section}
                ref={(element) => { tabs.current[section] = element; }}
                type="button"
                role="tab"
                id={`${id}-${section}-tab`}
                aria-selected={active === section}
                aria-controls={`${id}-${section}-panel`}
                tabIndex={active === section ? 0 : -1}
                onClick={() => setActive(section)}
                onKeyDown={(event) => handleTabKey(event, index)}
                className={`inline-flex min-h-12 min-w-0 flex-1 items-center justify-center gap-2 border-b-2 px-2 py-2 text-center text-xs font-semibold transition-colors hover:bg-brand-canvas hover:text-brand-primary focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-brand-primary sm:flex-none sm:px-4 sm:text-sm ${active === section ? "border-brand-primary text-brand-primary" : "border-transparent text-text-secondary"}`}
              >
                <Icon size={16} className="hidden shrink-0 sm:block" aria-hidden="true" />
                {label}
              </button>
            ))}
          </div>

          {sections.map(({ id: section }) => (
            <div
              key={section}
              id={`${id}-${section}-panel`}
              role="tabpanel"
              aria-labelledby={`${id}-${section}-tab`}
              hidden={active !== section}
              tabIndex={0}
              className="p-4 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-brand-primary sm:p-6"
            >
              {panels[section]}
            </div>
          ))}
        </section>

        <aside aria-label="Account overview" className={`grid min-w-0 auto-rows-max gap-4 ${recent ? "@min-[35rem]:grid-cols-2 @min-[49rem]:grid-cols-1" : ""}`}>
          <section className="min-w-0 rounded-card border border-brand-border bg-brand-surface px-4 py-4 sm:px-5">
            <h2 className="text-base font-bold tracking-tight text-brand-primary">Account details</h2>
            <dl className="mt-2 divide-y divide-brand-border">
              <div className="flex min-w-0 gap-2.5 py-3">
                <Mail size={16} className="mt-0.5 shrink-0 text-text-secondary" aria-hidden="true" />
                <div className="min-w-0">
                  <dt className="text-xs text-text-secondary">Sign-in email</dt>
                  <dd className="mt-0.5 text-sm font-semibold text-text-primary [overflow-wrap:anywhere]">{email || "No email on file"}</dd>
                </div>
              </div>
              {role === "Faculty" && (
                <div className="flex min-w-0 gap-2.5 py-3">
                  <IdCard size={16} className="mt-0.5 shrink-0 text-text-secondary" aria-hidden="true" />
                  <div className="min-w-0">
                    <dt className="text-xs text-text-secondary">Employee ID</dt>
                    <dd className="mt-0.5 text-sm font-semibold text-text-primary [overflow-wrap:anywhere]">{employeeId || "Not assigned"}</dd>
                  </div>
                </div>
              )}
              <div className="flex items-center gap-2.5 pt-3">
                <PenLine size={16} className="shrink-0 text-text-secondary" aria-hidden="true" />
                <div className="min-w-0 flex-1">
                  <dt className="text-xs text-text-secondary">E-signature</dt>
                  <dd className={`mt-0.5 text-sm font-semibold ${signatureSaved ? "text-emerald-800" : "text-text-primary"}`}>
                    {signatureSaved === null ? "Unavailable" : signatureSaved ? "Saved" : "Not set up"}
                  </dd>
                </div>
                {signatureSaved !== null && (
                  <button type="button" onClick={() => activate("signature")} aria-label="Manage e-signature" className="grid size-9 shrink-0 place-items-center rounded-md border border-brand-border text-brand-primary transition-colors hover:bg-brand-selected focus-visible:outline-2 focus-visible:outline-brand-primary">
                    <ArrowUpRight size={16} aria-hidden="true" />
                  </button>
                )}
              </div>
            </dl>
          </section>
          {recent}
        </aside>
      </div>
    </div>
  );
}
