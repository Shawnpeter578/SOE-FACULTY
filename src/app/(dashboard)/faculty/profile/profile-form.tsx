"use client";

import { useActionState, useState } from "react";
import { Check, UserRound } from "lucide-react";
import { saveFacultyProfile, type ProfileActionState } from "./actions";
import { profileFields, type FacultyProfileFields } from "./profile-fields";

export default function FacultyProfileForm({
  values,
  canEdit,
  saveAction = saveFacultyProfile,
}: {
  values: FacultyProfileFields;
  canEdit: boolean;
  saveAction?: (previous: ProfileActionState, data: FormData) => Promise<ProfileActionState>;
}) {
  const [draft, setDraft] = useState<Partial<FacultyProfileFields>>({});
  const [state, formAction, pending] = useActionState(async (previous: ProfileActionState, data: FormData) => {
    const result = await saveAction(previous, data);
    if (result.success) setDraft({});
    return result;
  }, { success: false, message: "" });

  return (
    <section className="min-w-0 rounded-3xl border border-slate-200/80 bg-white p-5 shadow-[0_2px_15px_rgba(15,23,42,0.03)] sm:p-7">
      <div className="flex items-center gap-3">
        <span className="flex size-10 items-center justify-center rounded-xl bg-slate-50 text-[#1E2B58]"><UserRound size={19} aria-hidden="true" /></span>
        <h2 className="text-xl font-bold tracking-tight text-slate-900">Personal details</h2>
      </div>

      <form action={formAction} className="mt-6" aria-busy={pending}>
        <fieldset disabled={pending} className="grid min-w-0 gap-4 sm:grid-cols-2 sm:gap-5">
          {profileFields.map((field) => (
            <label key={field.name} className="block min-w-0">
              <span className="mb-1.5 block text-sm font-semibold text-slate-700">{field.label}</span>
              <input
                name={field.name}
                value={draft[field.name] ?? values[field.name]}
                onChange={(event) => {
                  const value = event.currentTarget.value;
                  setDraft((current) => ({ ...current, [field.name]: value }));
                }}
                type={field.name === "phone" ? "tel" : "text"}
                autoComplete={field.name === "phone" ? "tel" : field.name === "fullName" ? "name" : undefined}
                required={field.name === "fullName"}
                maxLength={field.maxLength}
                readOnly={!canEdit}
                className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-base text-slate-900 outline-none read-only:bg-slate-50 focus:border-[#1E2B58] focus:ring-1 focus:ring-[#1E2B58] disabled:opacity-60"
              />
            </label>
          ))}
        </fieldset>

        <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-5">
          {canEdit ? (
            <>
              <p role={state.success ? "status" : "alert"} className={`flex items-center gap-1.5 text-sm ${state.success ? "text-emerald-800" : "text-red-700"}`}>
                {state.success && <Check size={16} aria-hidden="true" />}{state.message}
              </p>
              <button type="submit" disabled={pending} className="ml-auto inline-flex min-h-11 items-center rounded-xl bg-[#1E2B58] px-4 text-sm font-semibold text-white transition-colors hover:bg-[#162044] disabled:cursor-wait disabled:opacity-70">
                {pending ? "Saving…" : "Save changes"}
              </button>
            </>
          ) : <p role="status" className="text-sm text-slate-600">Profile editing becomes available after the faculty profile database migration is applied.</p>}
        </div>
      </form>
    </section>
  );
}
