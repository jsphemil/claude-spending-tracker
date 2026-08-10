"use client";

import { useActionState } from "react";
import { useRouter } from "next/navigation";
import type { GoalActionState } from "@/lib/actions/goals";

const initialState: GoalActionState = { error: null };

type GoalFormValues = {
  name: string;
  targetAmount: string;
  targetDate: string;
};

const emptyValues: GoalFormValues = {
  name: "",
  targetAmount: "",
  targetDate: "",
};

export function GoalForm({
  action,
  defaultValues,
  submitLabel,
}: {
  action: (state: GoalActionState, formData: FormData) => Promise<GoalActionState>;
  defaultValues?: Partial<GoalFormValues>;
  submitLabel: string;
}) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(action, initialState);
  const values = { ...emptyValues, ...defaultValues };

  return (
    <form action={formAction} className="max-w-md space-y-4">
      <div className="space-y-1">
        <label htmlFor="name" className="text-sm font-medium text-zinc-700">
          Goal name
        </label>
        <input
          id="name"
          name="name"
          required
          placeholder="e.g. Emergency fund, House down payment"
          defaultValue={values.name}
          className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-zinc-500 focus:outline-none"
        />
      </div>

      <div className="space-y-1">
        <label htmlFor="targetAmount" className="text-sm font-medium text-zinc-700">
          Target net worth
        </label>
        <input
          id="targetAmount"
          name="targetAmount"
          type="number"
          step="0.01"
          min="0.01"
          required
          defaultValue={values.targetAmount}
          className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-zinc-500 focus:outline-none"
        />
      </div>

      <div className="space-y-1">
        <label htmlFor="targetDate" className="text-sm font-medium text-zinc-700">
          Target date (optional)
        </label>
        <input
          id="targetDate"
          name="targetDate"
          type="date"
          defaultValue={values.targetDate}
          className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-zinc-500 focus:outline-none"
        />
      </div>

      {state.error && <p className="text-sm text-red-600">{state.error}</p>}

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50"
        >
          {pending ? "Saving…" : submitLabel}
        </button>
        <button
          type="button"
          onClick={() => router.back()}
          disabled={pending}
          className="rounded-md px-4 py-2 text-sm font-medium text-zinc-500 hover:underline disabled:opacity-50"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
