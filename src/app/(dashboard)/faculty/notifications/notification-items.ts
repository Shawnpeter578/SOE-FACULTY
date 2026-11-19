export const recentNotificationCount = 5;

export type FacultyNotification = {
  id: string;
  proposalId: string;
  title: string;
  message: string;
  note: string | null;
  at: string;
  tone: "positive" | "attention" | "neutral";
};

export type FacultyNotificationFeed = { facultyId: string; items: FacultyNotification[] };

export type DeanReview = {
  id: string;
  proposal_id: string;
  action: string;
  note: string | null;
  created_at: string;
  proposal: { title: string };
};

export type ViceChancellorDecision = {
  id: string;
  proposal_id: string;
  title: string;
  vc_decision: "APPROVED" | "REJECTED" | null;
  vc_note: string | null;
  vc_decided_at: string;
};

export type ApprovalDocument = { id: string; proposal_id: string; title: string; vc_document_uploaded_at: string };
export type PrintedLetter = { id: string; proposal_id: string; title: string; letter_printed_at: string };

const deanUpdates: Record<string, Pick<FacultyNotification, "message" | "tone">> = {
  UNDER_REVIEW: { message: "The Dean started reviewing your request", tone: "neutral" },
  CHANGES_REQUESTED: { message: "The Dean requested changes", tone: "attention" },
  REJECTED: { message: "The Dean declined your request", tone: "attention" },
  APPROVED_BY_DEAN: { message: "The Dean approved your request", tone: "positive" },
};

export function getNotificationItems(reviews: DeanReview[], letters: PrintedLetter[], decisions: ViceChancellorDecision[], documents: ApprovalDocument[]) {
  const items: FacultyNotification[] = reviews.map((review) => ({
    id: `dean:${review.id}`,
    proposalId: review.proposal_id,
    title: review.proposal.title,
    note: review.note,
    at: review.created_at,
    ...(deanUpdates[review.action] ?? { message: "The Dean updated your request", tone: "neutral" }),
  }));
  for (const letter of letters) {
    items.push({
      id: `printed:${letter.id}`,
      proposalId: letter.proposal_id,
      title: letter.title,
      message: "Your request letter was printed for VC review",
      note: null,
      at: letter.letter_printed_at,
      tone: "neutral",
    });
  }
  for (const decision of decisions) {
    if (!decision.vc_decision) continue;
    const approved = decision.vc_decision === "APPROVED";
    items.push({
      id: `vc:${decision.id}`,
      proposalId: decision.proposal_id,
      title: decision.title,
      message: approved ? "The Vice-Chancellor approved your request" : "The Vice-Chancellor declined your request",
      note: decision.vc_note,
      at: decision.vc_decided_at,
      tone: approved ? "positive" : "attention",
    });
  }
  for (const document of documents) {
    items.push({
      id: `document:${document.id}`,
      proposalId: document.proposal_id,
      title: document.title,
      message: "Your signed VC approval is available",
      note: null,
      at: document.vc_document_uploaded_at,
      tone: "positive",
    });
  }
  return items.sort((a, b) => Date.parse(b.at) - Date.parse(a.at) || a.id.localeCompare(b.id));
}
