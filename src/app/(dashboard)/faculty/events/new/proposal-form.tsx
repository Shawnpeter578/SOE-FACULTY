
"use client";

import { useActionState } from "react";
import {
  submitEventProposal,
  type ProposalFormState,
} from "./actions";

const initialState: ProposalFormState = {
  success: false,
  message: null,
};

export default function ProposalForm() {
  const [state, formAction, isPending] = useActionState(
    submitEventProposal,
    initialState
  );

  return (
    <form action={formAction} className="space-y-5">
      <div>
        <label htmlFor="title">Event title</label>
        <input
          id="title"
          name="title"
          required
          minLength={3}
          maxLength={150}
          className="w-full rounded border p-2"
        />
        {state.errors?.title?.map((error) => (
          <p key={error} className="text-sm text-red-600">{error}</p>
        ))}
      </div>

      <div>
        <label htmlFor="description">Description</label>
        <textarea
          id="description"
          name="description"
          required
          minLength={20}
          maxLength={5000}
          className="w-full rounded border p-2"
        />
        {state.errors?.description?.map((error) => (
          <p key={error} className="text-sm text-red-600">{error}</p>
        ))}
      </div>

      <div>
        <label htmlFor="objectives">Objectives</label>
        <textarea
          id="objectives"
          name="objectives"
          className="w-full rounded border p-2"
        />
      </div>

      <div>
        <label htmlFor="venue">Venue</label>
        <input
          id="venue"
          name="venue"
          required
          className="w-full rounded border p-2"
        />
      </div>

      <div>
        <label htmlFor="start_date">Start date</label>
        <input
          id="start_date"
          name="start_date"
          type="date"
          required
          className="w-full rounded border p-2"
        />
      </div>

      <div>
        <label htmlFor="end_date">End date</label>
        <input
          id="end_date"
          name="end_date"
          type="date"
          required
          className="w-full rounded border p-2"
        />
        {state.errors?.end_date?.map((error) => (
          <p key={error} className="text-sm text-red-600">{error}</p>
        ))}
      </div>

      <div>
        <label htmlFor="estimated_budget">Estimated budget (₹)</label>
        <input
          id="estimated_budget"
          name="estimated_budget"
          type="number"
          min="0"
          step="0.01"
          className="w-full rounded border p-2"
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

      <button
        type="submit"
        disabled={isPending || state.success}
        className="rounded bg-black px-5 py-2 text-white disabled:opacity-50"
      >
        {isPending ? "Submitting..." : "Submit proposal"}
      </button>
    </form>
  );
}
