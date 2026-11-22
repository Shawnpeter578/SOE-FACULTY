import { SignatureSettings, WorkplaceSettings } from "@/components/profile-preferences";
import ProfileWorkspace from "@/components/profile-workspace";
import { workspaceInitials } from "@/components/workspace-top-bar";
import { getProfilePreferences } from "@/lib/profile-preferences-server";
import { createClient } from "@/lib/supabase/server";
import { universityName } from "@/lib/university";
import ProfileForm from "../../faculty/profile/profile-form";
import { getDeanAccount } from "../account";
import { saveDeanProfile } from "./actions";

export default async function DeanProfilePage() {
  const account = await getDeanAccount();
  const preferences = await getProfilePreferences(await createClient(), account.id);
  const name = account.details.fullName;

  return (
    <ProfileWorkspace
      name={name}
      initials={workspaceInitials(name, "D")}
      role="Dean"
      affiliation={[account.details.designation, account.details.department, preferences.values.campus].filter(Boolean).join(" · ") || universityName}
      email={account.email}
      signatureSaved={preferences.available ? Boolean(preferences.signature) : null}
      personal={<ProfileForm values={account.details} canEdit saveAction={saveDeanProfile} />}
      workplace={<WorkplaceSettings values={preferences.values} available={preferences.available} missingMigration={preferences.missingMigration} />}
      signature={<SignatureSettings fullName={name} role="DEAN" saved={preferences.signature} available={preferences.available} missingMigration={preferences.missingMigration} />}
    />
  );
}
