"use client";

import { LogOut } from "lucide-react";
import { useActionState } from "react";
import { logout } from "@/lib/auth/logout";

export default function LogoutButton() {
  const [error, submit, pending] = useActionState(logout, "");

  return (
    <form action={submit} className="relative">
      <button type="submit" disabled={pending} aria-label={pending ? "Logging out" : "Log out"}
        title="Log out"
        className="inline-flex min-h-11 min-w-11 items-center justify-center gap-2 rounded-xl border border-brand-border text-sm font-semibold text-brand-primary hover:bg-brand-selected disabled:opacity-60 xl:px-3">
        <LogOut size={18} aria-hidden="true" />
        <span className="hidden xl:inline">{pending ? "Logging out…" : "Log out"}</span>
      </button>
      {error && <p role="alert" className="absolute right-0 top-full mt-2 w-48 rounded-lg border border-brand-border bg-brand-surface p-3 text-sm text-danger shadow-md">{error}</p>}
    </form>
  );
}
