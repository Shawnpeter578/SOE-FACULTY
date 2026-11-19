import RequestLetterWorkspace from "@/components/request-letter-workspace";

export default async function DeanRequestLetterPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <RequestLetterWorkspace id={id} roles={["DEAN"]} />;
}
