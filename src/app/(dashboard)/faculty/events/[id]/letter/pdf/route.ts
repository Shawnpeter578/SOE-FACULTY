import { loadRequestLetter, requestLetterUrl } from "@/lib/request-letter-server";
import { renderRequestLetterPdf } from "@/lib/request-letter-pdf";

export async function GET(_request: Request, { params }: RouteContext<"/faculty/events/[id]/letter/pdf">) {
  const { id } = await params;
  const { event, letter, ready } = await loadRequestLetter(id, ["FACULTY", "DEAN", "VC"]);
  if (!ready && !event.letter_printed_at) return new Response("The final request letter is not ready.", { status: 404 });

  const pdf = await renderRequestLetterPdf(letter, await requestLetterUrl(id));
  return new Response(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${letter.letterId}.pdf"`,
      "Cache-Control": "private, no-store",
    },
  });
}
