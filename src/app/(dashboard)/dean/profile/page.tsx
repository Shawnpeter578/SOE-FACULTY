import { IdCard, Mail } from "lucide-react";
import { workspaceInitials } from "@/components/workspace-top-bar";
import { facultyCardClass, facultyPageClass } from "../../faculty/components/workspace-styles";
import ProfileForm from "../../faculty/profile/profile-form";
import { getDeanAccount } from "../account";
import { saveDeanProfile } from "./actions";

export default async function DeanProfilePage() {
  const account = await getDeanAccount();
  const name = account.details.fullName;

  return (
    <div className={facultyPageClass}>
      <header>
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Profile</h1>
        <p className="mt-2 text-sm text-text-secondary">View your account and update your contact and office details.</p>
      </header>
      <section className={`${facultyCardClass} flex min-w-0 items-center gap-4 p-5 sm:gap-5 sm:p-7`} aria-label="Dean profile">
        <span aria-hidden="true" className="flex size-15 shrink-0 items-center justify-center rounded-2xl bg-brand-selected text-2xl font-bold text-brand-primary sm:size-18">{workspaceInitials(name, "D")}</span>
        <div className="min-w-0">
          <h2 className="break-words text-xl font-bold tracking-tight sm:text-2xl">{name}</h2>
          <p className="mt-1 text-sm font-medium text-text-secondary">{account.details.designation || "Dean"}</p>
        </div>
      </section>
      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)]">
        <ProfileForm values={account.details} canEdit saveAction={saveDeanProfile} />
        <section className={`${facultyCardClass} min-w-0 p-5 sm:p-7`}>
          <h2 className="text-lg font-bold tracking-tight">Account details</h2>
          <dl className="mt-4 divide-y divide-brand-border">
            <div className="flex min-w-0 items-start gap-3 pb-4">
              <Mail size={17} className="mt-0.5 shrink-0 text-brand-primary" aria-hidden="true" />
              <div className="min-w-0">
                <dt className="text-sm text-text-secondary">Sign-in email</dt>
                <dd className="mt-1 break-words text-sm font-semibold">{account.email ?? "No email on file"}</dd>
              </div>
            </div>
            <div className="flex items-start gap-3 pt-4">
              <IdCard size={17} className="mt-0.5 shrink-0 text-brand-primary" aria-hidden="true" />
              <div>
                <dt className="text-sm text-text-secondary">Account role</dt>
                <dd className="mt-1 text-sm font-semibold">Dean</dd>
              </div>
            </div>
          </dl>
        </section>
      </div>
    </div>
  );
}
