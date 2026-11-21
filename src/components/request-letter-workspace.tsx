import QRCode from "qrcode";
import type { AppRole } from "@/lib/auth/guard";
import { loadRequestLetter, requestLetterUrl } from "@/lib/request-letter-server";
import RouteRefresh from "./route-refresh";
import LetterPreview from "./request-letter-preview";

export default async function RequestLetterWorkspace({ id, roles }: { id: string; roles: AppRole[] }) {
  const { profile, event, letter, ready, canUpdate, signingAvailable, textEditingAvailable, back } = await loadRequestLetter(id, roles);
  const qr = ready || event.letter_printed_at ? await QRCode.toDataURL(await requestLetterUrl(id), { width: 240 }) : undefined;

  return (
    <>
      <RouteRefresh />
      <LetterPreview
        key={id} {...letter} role={profile.role} back={back} qr={qr} detailsAt={event.review_details_at}
        printedAt={event.letter_printed_at} status={event.status} vcDecision={event.vc_decision}
        ready={ready} canUpdate={canUpdate} signingAvailable={signingAvailable} textEditingAvailable={textEditingAvailable}
      />
    </>
  );
}
