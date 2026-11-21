import QRCode from "qrcode";
import { getProfilePreferences } from "@/lib/profile-preferences-server";
import { loadRequestLetter, requestLetterUrl } from "@/lib/request-letter-server";
import RouteRefresh from "./route-refresh";
import LetterPreview from "./request-letter-preview";

export default async function RequestLetterWorkspace({ id }: { id: string }) {
  const { profile, supabase, event, letter, ready, canUpdate, signingAvailable, textEditingAvailable, back } = await loadRequestLetter(id);
  const [qr, preferences] = await Promise.all([
    ready || event.letter_printed_at ? requestLetterUrl(id).then((url) => QRCode.toDataURL(url, { width: 240 })) : undefined,
    canUpdate && "faculty_signature" in event ? getProfilePreferences(supabase, profile.id) : null,
  ]);

  return (
    <>
      <RouteRefresh />
      <LetterPreview
        key={id} {...letter} back={back} qr={qr} detailsAt={event.review_details_at}
        printedAt={event.letter_printed_at} status={event.status}
        ready={ready} canUpdate={canUpdate} signingAvailable={signingAvailable} textEditingAvailable={textEditingAvailable}
        savedSignature={preferences?.signature}
      />
    </>
  );
}
