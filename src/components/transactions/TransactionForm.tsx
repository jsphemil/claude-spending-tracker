"use client";

import { useActionState, useState } from "react";
import type { TransactionActionState } from "@/lib/actions/transactions";

const initialState: TransactionActionState = { error: null };

type TransactionType = "INCOME" | "EXPENSE" | "TRANSFER";

type AccountOption = { id: string; name: string; icon: string; currency: string };
type CategoryOption = { id: string; name: string; icon: string; type: "INCOME" | "EXPENSE" };

type TransactionFormValues = {
  type: TransactionType;
  amount: string;
  date: string;
  description: string;
  accountId: string;
  categoryId: string;
  fromAccountId: string;
  toAccountId: string;
};

const emptyValues: TransactionFormValues = {
  type: "EXPENSE",
  amount: "",
  date: new Date().toISOString().slice(0, 10),
  description: "",
  accountId: "",
  categoryId: "",
  fromAccountId: "",
  toAccountId: "",
};

const TYPE_OPTIONS: { value: TransactionType; label: string }[] = [
  { value: "INCOME", label: "Income" },
  { value: "EXPENSE", label: "Expense" },
  { value: "TRANSFER", label: "Transfer" },
];

export function TransactionForm({
  action,
  accounts,
  categories,
  defaultValues,
  submitLabel,
}: {
  action: (
    state: TransactionActionState,
    formData: FormData
  ) => Promise<TransactionActionState>;
  accounts: AccountOption[];
  categories: CategoryOption[];
  defaultValues?: Partial<TransactionFormValues>;
  submitLabel: string;
}) {
  const [state, formAction, pending] = useActionState(action, initialState);
  const values = { ...emptyValues, ...defaultValues };
  const [type, setType] = useState<TransactionType>(values.type);

  const visibleCategories = categories.filter((c) => c.type === type);

  return (
    <form action={formAction} className="max-w-md space-y-4">
      <div className="flex gap-1 rounded-md bg-zinc-100 p-1">
        {TYPE_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => setType(opt.value)}
            className={`flex-1 rounded px-3 py-1.5 text-sm font-medium ${
              type === opt.value
                ? "bg-white text-zinc-900 shadow-sm"
                : "text-zinc-500 hover:text-zinc-700"
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>
      <input type="hidden" name="type" value={type} />

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1">
          <label htmlFor="amount" className="text-sm font-medium text-zinc-700">
            Amount
          </label>
          <input
            id="amount"
            name="amount"
            type="number"
            step="0.01"
            min="0.01"
            required
            defaultValue={values.amount}
            className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-zinc-500 focus:outline-none"
          />
        </div>
        <div className="space-y-1">
          <label htmlFor="date" className="text-sm font-medium text-zinc-700">
            Date
          </label>
          <input
            id="date"
            name="date"
            type="date"
            required
            defaultValue={values.date}
            className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-zinc-500 focus:outline-none"
          />
        </div>
      </div>

      {type === "TRANSFER" ? (
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <label htmlFor="fromAccountId" className="text-sm font-medium text-zinc-700">
              From account
            </label>
            <select
              id="fromAccountId"
              name="fromAccountId"
              required
              defaultValue={values.fromAccountId}
              className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-zinc-500 focus:outline-none"
            >
              <option value="" disabled>
                Select account
              </option>
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.icon} {a.name}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <label htmlFor="toAccountId" className="text-sm font-medium text-zinc-700">
              To account
            </label>
            <select
              id="toAccountId"
              name="toAccountId"
              required
              defaultValue={values.toAccountId}
              className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-zinc-500 focus:outline-none"
            >
              <option value="" disabled>
                Select account
              </option>
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.icon} {a.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <label htmlFor="accountId" className="text-sm font-medium text-zinc-700">
              Account
            </label>
            <select
              id="accountId"
              name="accountId"
              required
              defaultValue={values.accountId}
              className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-zinc-500 focus:outline-none"
            >
              <option value="" disabled>
                Select account
              </option>
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.icon} {a.name}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <label htmlFor="categoryId" className="text-sm font-medium text-zinc-700">
              Category
            </label>
            <select
              id="categoryId"
              name="categoryId"
              required
              defaultValue={values.categoryId}
              className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-zinc-500 focus:outline-none"
            >
              <option value="" disabled>
                Select category
              </option>
              {visibleCategories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.icon} {c.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}

      <div className="space-y-1">
        <label htmlFor="description" className="text-sm font-medium text-zinc-700">
          Description (optional)
        </label>
        <input
          id="description"
          name="description"
          defaultValue={values.description}
          className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-zinc-500 focus:outline-none"
        />
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
