"use client";

import { useActionState } from "react";
import { updateProposal, type EditProposalState } from "./actions";

type Proposal = {
  id: string;
  title: string;
  description: string;
  objectives: string | null;
  venue: string;
  start_date: string;
  end_date: string;
  estimated_budget: number | null;
};

const initialState: EditProposalState = {
  success: false,
  message: "",
};

export default function EditProposalForm({
  proposal,
}: {
  proposal: Proposal;
}) {
  const action = updateProposal.bind(null, proposal.id);
  const [state, formAction, pending] = useActionState(action, initialState);

  const fieldError = (name: string) =>
    state.errors?.[name]?.[0] ?? null;

  return (
    <form action={formAction} className="space-y-6">
      <div>
        <label htmlFor="title">Event title</label>
        <input
          id="title"
          name="title"
          defaultValue={proposal.title}
          required
          maxLength={150}
          className="mt-1 w-full rounded-lg border p-3"
        />
        {fieldError("title") && (
          <p className="mt-1 text-sm text-red-600">{fieldError("title")}</p>
        )}
      </div>

      <div>
        <label htmlFor="description">Description</label>
        <textarea
          id="description"
          name="description"
          defaultValue={proposal.description}
          required
          rows={5}
          className="mt-1 w-full rounded-lg border p-3"
        />
        {fieldError("description") && (
          <p className="mt-1 text-sm text-red-600">
            {fieldError("description")}
          </p>
        )}
      </div>

      <div>
        <label htmlFor="objectives">Objectives</label>
        <textarea
          id="objectives"
          name="objectives"
          defaultValue={proposal.objectives ?? ""}
          rows={3}
          className="mt-1 w-full rounded-lg border p-3"
        />
        {fieldError("objectives") && (
          <p className="mt-1 text-sm text-red-600">
            {fieldError("objectives")}
          </p>
        )}
      </div>

      <div>
        <label htmlFor="venue">Venue</label>
        <input
          id="venue"
          name="venue"
          defaultValue={proposal.venue}
          required
          className="mt-1 w-full rounded-lg border p-3"
        />
        {fieldError("venue") && (
          <p className="mt-1 text-sm text-red-600">{fieldError("venue")}</p>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="start_date">Start date</label>
          <input
            id="start_date"
            name="start_date"
            type="date"
            defaultValue={proposal.start_date}
            required
            className="mt-1 w-full rounded-lg border p-3"
          />
          {fieldError("start_date") && (
            <p className="mt-1 text-sm text-red-600">
              {fieldError("start_date")}
            </p>
          )}
        </div>

        <div>
          <label htmlFor="end_date">End date</label>
          <input
            id="end_date"
            name="end_date"
            type="date"
            defaultValue={proposal.end_date}
            required
            className="mt-1 w-full rounded-lg border p-3"
          />
          {fieldError("end_date") && (
            <p className="mt-1 text-sm text-red-600">
              {fieldError("end_date")}
            </p>
          )}
        </div>
      </div>

      <div>
        <label htmlFor="estimated_budget">Estimated budget (₹)</label>
        <input
          id="estimated_budget"
          name="estimated_budget"
          type="number"
          min="0"
          step="0.01"
          defaultValue={proposal.estimated_budget ?? ""}
          className="mt-1 w-full rounded-lg border p-3"
        />
        {fieldError("estimated_budget") && (
          <p className="mt-1 text-sm text-red-600">
            {fieldError("estimated_budget")}
          </p>
        )}
      </div>

      {state.message && (
        <p
          role="status"
          className={`text-sm ${
            state.success ? "text-green-700" : "text-red-600"
          }`}
        >
          {state.message}
        </p>
      )}

      <button
        type="submit"
        disabled={pending || state.success}
        className="rounded-lg bg-black px-5 py-3 text-white disabled:opacity-50"
      >
        {pending ? "Resubmitting..." : "Save changes and resubmit"}
      </button>
    </form>
  );
}