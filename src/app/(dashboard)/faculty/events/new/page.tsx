import ProposalForm from "./proposal-form";

export default function NewEventProposalPage() {
  return (
    <main className="mx-auto max-w-3xl space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold">Propose an event</h1>
        <p className="text-sm text-gray-500">
          Submit your event proposal for Dean review.
        </p>
      </div>

      <ProposalForm />
    </main>
  );
}