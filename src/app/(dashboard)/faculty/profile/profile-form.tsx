"use client";

import { useActionState, useState } from "react";
import { profileInputClass, ProfileFormFooter } from "@/components/profile-form-controls";
import { saveFacultyProfile, type ProfileActionState } from "./actions";
import { profileFields, type FacultyProfileFields } from "./profile-fields";

export default function ProfileForm({
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
  const dirty = profileFields.some(({ name }) => draft[name] !== undefined && draft[name] !== values[name]);

  return (
    <section>
      <h3 className="text-lg font-bold tracking-tight text-brand-primary">Personal details</h3>
      <form action={formAction} className="mt-4" aria-busy={pending}>
        <fieldset disabled={pending} className="grid min-w-0 gap-4 sm:grid-cols-2">
          {profileFields.map((field) => (
            <label key={field.name} className={`block min-w-0 ${field.name === "fullName" ? "sm:col-span-2" : ""}`}>
              <span className="mb-1.5 block text-sm font-semibold text-text-primary">{field.label}</span>
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
                className={profileInputClass}
              />
            </label>
          ))}
        </fieldset>

        {canEdit ? <ProfileFormFooter state={state} dirty={dirty} pending={pending} onDiscard={() => setDraft({})} saveLabel="Save changes" />
          : <p role="status" className="mt-4 text-sm text-text-secondary">Profile editing becomes available after the faculty profile database migration is applied.</p>}
      </form>
    </section>
  );
}
