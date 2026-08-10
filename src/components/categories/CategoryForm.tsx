"use client";

import { useActionState, useState } from "react";
import {
  CATEGORY_ICONS,
  CATEGORY_TYPES,
  CATEGORY_TYPE_LABELS,
  DEFAULT_CATEGORY_COLOR,
} from "@/lib/constants/categories";
import type { CategoryActionState } from "@/lib/actions/categories";

const initialState: CategoryActionState = { error: null };

type CategoryFormValues = {
  name: string;
  type: (typeof CATEGORY_TYPES)[number];
  color: string;
  icon: string;
  monthlyBudget: string;
};

const emptyValues: CategoryFormValues = {
  name: "",
  type: "EXPENSE",
  color: DEFAULT_CATEGORY_COLOR,
  icon: CATEGORY_ICONS[0],
  monthlyBudget: "",
};

export function CategoryForm({
  action,
  defaultValues,
  submitLabel,
  lockType,
}: {
  action: (
    state: CategoryActionState,
    formData: FormData
  ) => Promise<CategoryActionState>;
  defaultValues?: Partial<CategoryFormValues>;
  submitLabel: string;
  lockType?: boolean;
}) {
  const [state, formAction, pending] = useActionState(action, initialState);
  const values = { ...emptyValues, ...defaultValues };
  const [type, setType] = useState<(typeof CATEGORY_TYPES)[number]>(values.type);

  return (
    <form action={formAction} className="max-w-md space-y-4">
      <div className="space-y-1">
        <label htmlFor="name" className="text-sm font-medium text-zinc-700">
          Name
        </label>
        <input
          id="name"
          name="name"
          required
          defaultValue={values.name}
          className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-zinc-500 focus:outline-none"
        />
      </div>

      <div className="space-y-1">
        <label htmlFor="type" className="text-sm font-medium text-zinc-700">
          Type
        </label>
        <select
          id="type"
          name="type"
          defaultValue={values.type}
          disabled={lockType}
          onChange={(e) => setType(e.target.value as (typeof CATEGORY_TYPES)[number])}
          className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-zinc-500 focus:outline-none disabled:bg-zinc-100"
        >
          {CATEGORY_TYPES.map((t) => (
            <option key={t} value={t}>
              {CATEGORY_TYPE_LABELS[t]}
            </option>
          ))}
        </select>
        {lockType && <input type="hidden" name="type" value={values.type} />}
      </div>

      {type === "EXPENSE" && (
        <div className="space-y-1">
          <label htmlFor="monthlyBudget" className="text-sm font-medium text-zinc-700">
            Monthly budget (optional)
          </label>
          <input
            id="monthlyBudget"
            name="monthlyBudget"
            type="number"
            step="0.01"
            min="0.01"
            placeholder="e.g. 5000"
            defaultValue={values.monthlyBudget}
            className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-zinc-500 focus:outline-none"
          />
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1">
          <label htmlFor="color" className="text-sm font-medium text-zinc-700">
            Color
          </label>
          <input
            id="color"
            name="color"
            type="color"
            defaultValue={values.color}
            className="h-10 w-full rounded-md border border-zinc-300"
          />
        </div>

        <div className="space-y-1">
          <label htmlFor="icon" className="text-sm font-medium text-zinc-700">
            Icon
          </label>
          <select
            id="icon"
            name="icon"
            defaultValue={values.icon}
            className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-zinc-500 focus:outline-none"
          >
            {CATEGORY_ICONS.map((icon) => (
              <option key={icon} value={icon}>
                {icon}
              </option>
            ))}
          </select>
        </div>
      </div>

      {state.error && <p className="text-sm text-red-600">{state.error}</p>}

      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50"
      >
        {pending ? "Saving…" : submitLabel}
      </button>
    </form>
  );
}
