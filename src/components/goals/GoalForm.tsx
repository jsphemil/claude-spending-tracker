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
        <label htmlFor="name" className="text-sm font-medium text-fg">
          Goal name
        </label>
        <input
          id="name"
          name="name"
          required
          placeholder="e.g. Emergency fund, House down payment"
          defaultValue={values.name}
          className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-fg focus:border-accent focus:outline-none"
        />
      </div>

      <div className="space-y-1">
        <label htmlFor="targetAmount" className="text-sm font-medium text-fg">
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
          className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-fg focus:border-accent focus:outline-none"
        />
      </div>

      <div className="space-y-1">
        <label htmlFor="targetDate" className="text-sm font-medium text-fg">
          Target date (optional)
        </label>
        <input
          id="targetDate"
          name="targetDate"
          type="date"
          defaultValue={values.targetDate}
          className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-fg focus:border-accent focus:outline-none"
        />
      </div>

      {state.error && <p className="text-sm text-danger">{state.error}</p>}

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-strong disabled:opacity-50"
        >
          {pending ? "Saving…" : submitLabel}
        </button>
        <button
          type="button"
          onClick={() => router.back()}
          disabled={pending}
          className="rounded-md px-4 py-2 text-sm font-medium text-fg-muted hover:underline disabled:opacity-50"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
