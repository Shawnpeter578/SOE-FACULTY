import { Check } from "lucide-react";

export const profileInputClass = "min-h-11 w-full min-w-0 rounded-lg border border-brand-border bg-white px-3 py-2.5 text-base text-text-primary transition-colors outline-none placeholder:text-text-secondary read-only:bg-brand-canvas focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/15 disabled:opacity-65 sm:text-sm";
export const profilePrimaryButtonClass = "inline-flex min-h-11 items-center justify-center rounded-lg bg-brand-primary px-4 text-sm font-semibold text-white transition-colors hover:bg-brand-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-primary disabled:bg-brand-selected disabled:text-text-secondary";
export const profileSecondaryButtonClass = "inline-flex min-h-11 items-center justify-center rounded-lg px-3 text-sm font-semibold text-brand-primary transition-colors hover:bg-brand-selected focus-visible:outline-2 focus-visible:outline-brand-primary disabled:opacity-50";

export function ProfileFormMessage({ state }: { state: { success: boolean; message: string } }) {
  if (!state.message) return null;
  return (
    <p role={state.success ? "status" : "alert"} className={`flex min-w-0 items-start gap-1.5 text-sm ${state.success ? "text-emerald-800" : "text-red-700"}`}>
      {state.success && <Check size={16} className="mt-0.5 shrink-0" aria-hidden="true" />}{state.message}
    </p>
  );
}

export function ProfileFormFooter({ state, dirty, pending, onDiscard, saveLabel }: {
  state: { success: boolean; message: string };
  dirty: boolean;
  pending: boolean;
  onDiscard: () => void;
  saveLabel: string;
}) {
  const showResult = state.message && (state.success ? !dirty : dirty);
  return (
    <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-brand-border pt-4">
      {showResult ? <ProfileFormMessage state={state} /> : dirty && <p className="text-sm text-text-secondary">Unsaved changes</p>}
      <div className="ml-auto flex flex-wrap items-center justify-end gap-2">
        <button type="button" onClick={onDiscard} disabled={!dirty || pending} className={profileSecondaryButtonClass}>Discard changes</button>
        <button type="submit" disabled={!dirty || pending} className={profilePrimaryButtonClass}>{pending ? "Saving…" : saveLabel}</button>
      </div>
    </div>
  );
}
