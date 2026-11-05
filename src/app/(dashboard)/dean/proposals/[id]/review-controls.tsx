
"use client";

import { useActionState } from "react";
import { reviewProposal, type ReviewState } from "./actions";

const initialState: ReviewState = {
  success: false,
  message: null,
};

export default function ReviewControls({
  proposalId,
  status,
}: {
  proposalId: string;
  status: string;
}) {
  const [state, formAction, isPending] = useActionState(
    reviewProposal,
    initialState
  );

  const isReviewing = status === "UNDER_REVIEW";

  return (
    <form action={formAction} className="space-y-4 rounded-lg border p-5">
      <input type="hidden" name="proposalId" value={proposalId} />

      <div>
        <label htmlFor="note" className="block font-medium">
          Review comments
        </label>
        <textarea
          id="note"
          name="note"
          rows={4}
          maxLength={3000}
          placeholder="Enter feedback or the reason for your decision..."
          className="mt-2 w-full rounded-md border p-3"
        />
      </div>

      {state.message && (
        <p
          role="status"
          className={state.success ? "text-green-700" : "text-red-600"}
        >
          {state.message}
        </p>
      )}

      {!isReviewing ? (
        <button
          type="submit"
          name="action"
          value="UNDER_REVIEW"
          disabled={isPending}
          className="rounded-md bg-blue-700 px-4 py-2 text-white disabled:opacity-50"
        >
          {isPending ? "Processing..." : "Start review"}
        </button>
      ) : (
        <div className="flex flex-wrap gap-3">
          <button
            type="submit"
            name="action"
            value="APPROVED_BY_DEAN"
            disabled={isPending}
            className="rounded-md bg-green-700 px-4 py-2 text-white disabled:opacity-50"
          >
            Approve
          </button>

          <button
            type="submit"
            name="action"
            value="CHANGES_REQUESTED"
            disabled={isPending}
            className="rounded-md border px-4 py-2 disabled:opacity-50"
          >
            Request changes
          </button>

          <button
            type="submit"
            name="action"
            value="REJECTED"
            disabled={isPending}
            className="rounded-md bg-red-700 px-4 py-2 text-white disabled:opacity-50"
          >
            Reject
          </button>
        </div>
      )}
    </form>
  );
}
