import QRCode from "qrcode";
import type { AppRole } from "@/lib/auth/guard";
import { getProfilePreferences } from "@/lib/profile-preferences-server";
import { loadRequestLetter, requestLetterUrl } from "@/lib/request-letter-server";
import RouteRefresh from "./route-refresh";
import LetterPreview from "./request-letter-preview";

export default async function RequestLetterWorkspace({ id, roles }: { id: string; roles: AppRole[] }) {
  const { profile, supabase, event, letter, ready, canUpdate, signingAvailable, textEditingAvailable, back } = await loadRequestLetter(id, roles);
  const [qr, preferences] = await Promise.all([
    ready || event.letter_printed_at ? requestLetterUrl(id).then((url) => QRCode.toDataURL(url, { width: 240 })) : undefined,
    canUpdate && "faculty_signature" in event ? getProfilePreferences(supabase, profile.id) : null,
  ]);

  return (
    <>
      <RouteRefresh />
      <LetterPreview
        key={id} {...letter} role={profile.role} back={back} qr={qr} detailsAt={event.review_details_at}
        printedAt={event.letter_printed_at} status={event.status} vcDecision={event.vc_decision}
        ready={ready} canUpdate={canUpdate} signingAvailable={signingAvailable} textEditingAvailable={textEditingAvailable}
        savedSignature={preferences?.signature}
      />
    </>
  );
}
