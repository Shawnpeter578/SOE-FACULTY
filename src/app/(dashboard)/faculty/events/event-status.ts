const statuses: Record<string, { label: string; style: string }> = {
  DRAFT: { label: "Draft", style: "bg-slate-100 text-slate-700" },
  SUBMITTED: { label: "Submitted", style: "bg-blue-50 text-blue-700" },
  UNDER_REVIEW: { label: "Under review", style: "bg-amber-50 text-amber-800" },
  CHANGES_REQUESTED: { label: "Changes requested", style: "bg-orange-50 text-orange-800" },
  REJECTED: { label: "Rejected", style: "bg-red-50 text-red-700" },
  APPROVED_BY_DEAN: { label: "Approved by Dean", style: "bg-emerald-50 text-emerald-800" },
  AWAITING_VC_DOCUMENT: { label: "Awaiting official letter", style: "bg-blue-50 text-blue-700" },
  OFFICIALLY_APPROVED: { label: "Officially approved", style: "bg-emerald-50 text-emerald-800" },
};

export function getStatusLabel(status: string) {
  return statuses[status]?.label ?? status.replaceAll("_", " ");
}

export function getStatusStyle(status: string) {
  return statuses[status]?.style ?? "bg-slate-100 text-slate-700";
}
