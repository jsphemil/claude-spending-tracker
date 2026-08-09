"use client";

import { useActionState, useState } from "react";
import type { TransactionActionState } from "@/lib/actions/transactions";
import { RECURRENCE_UNITS } from "@/lib/validation/recurring";

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

const UNIT_LABELS: Record<(typeof RECURRENCE_UNITS)[number], string> = {
  DAY: "day(s)",
  WEEK: "week(s)",
  MONTH: "month(s)",
  YEAR: "year(s)",
};

export function TransactionForm({
  action,
  accounts,
  categories,
  defaultValues,
  submitLabel,
  allowRecurring = false,
  recurringInfo = null,
}: {
  action: (
    state: TransactionActionState,
    formData: FormData
  ) => Promise<TransactionActionState>;
  accounts: AccountOption[];
  categories: CategoryOption[];
  defaultValues?: Partial<TransactionFormValues>;
  submitLabel: string;
  /** Only meaningful at creation — shows the "make recurring" toggle. */
  allowRecurring?: boolean;
  /** Set when editing a transaction that's part of a recurring series. */
  recurringInfo?: { scheduleLabel: string } | null;
}) {
  const [state, formAction, pending] = useActionState(action, initialState);
  const values = { ...emptyValues, ...defaultValues };
  const [type, setType] = useState<TransactionType>(values.type);
  const [recurring, setRecurring] = useState(false);
  const [choosingScope, setChoosingScope] = useState(false);

  const visibleCategories = categories.filter((c) => c.type === type);
  const isRecurringEdit = recurringInfo !== null;

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
          {isRecurringEdit ? (
            <>
              <input
                type="text"
                disabled
                value={values.date}
                className="w-full rounded-md border border-zinc-200 bg-zinc-100 px-3 py-2 text-sm text-zinc-500"
              />
              <input type="hidden" name="date" value={values.date} />
            </>
          ) : (
            <input
              id="date"
              name="date"
              type="date"
              required
              defaultValue={values.date}
              className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-zinc-500 focus:outline-none"
            />
          )}
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

      {isRecurringEdit && (
        <p className="rounded-md bg-zinc-50 px-3 py-2 text-sm text-zinc-600">
          🔁 Part of a recurring series · {recurringInfo.scheduleLabel}
        </p>
      )}

      {allowRecurring && !isRecurringEdit && (
        <div className="space-y-2 rounded-md border border-zinc-200 p-3">
          <label className="flex items-center gap-2 text-sm font-medium text-zinc-700">
            <input
              type="checkbox"
              name="recurring"
              checked={recurring}
              onChange={(e) => setRecurring(e.target.checked)}
              className="h-4 w-4 rounded border-zinc-300"
            />
            Make recurring
          </label>

          {recurring && (
            <div className="space-y-3 pt-1">
              <div className="flex items-center gap-2">
                <span className="text-sm text-zinc-600">Repeat every</span>
                <input
                  type="number"
                  name="intervalCount"
                  min="1"
                  defaultValue="1"
                  required
                  className="w-16 rounded-md border border-zinc-300 px-2 py-1.5 text-sm focus:border-zinc-500 focus:outline-none"
                />
                <select
                  name="intervalUnit"
                  defaultValue="MONTH"
                  className="rounded-md border border-zinc-300 px-2 py-1.5 text-sm focus:border-zinc-500 focus:outline-none"
                >
                  {RECURRENCE_UNITS.map((unit) => (
                    <option key={unit} value={unit}>
                      {UNIT_LABELS[unit]}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <label htmlFor="endDate" className="text-sm text-zinc-600">
                  End date (optional — leave blank to repeat indefinitely)
                </label>
                <input
                  id="endDate"
                  name="endDate"
                  type="date"
                  className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-zinc-500 focus:outline-none"
                />
              </div>
            </div>
          )}
        </div>
      )}

      {state.error && <p className="text-sm text-red-600">{state.error}</p>}

      {isRecurringEdit && choosingScope ? (
        <div className="space-y-2">
          <p className="text-sm font-medium text-zinc-700">Apply this change to:</p>
          <div className="flex flex-wrap gap-2">
            <button
              type="submit"
              name="scope"
              value="ONE"
              disabled={pending}
              className="rounded-md border border-zinc-300 px-3 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-100 disabled:opacity-50"
            >
              Just this one
            </button>
            <button
              type="submit"
              name="scope"
              value="FUTURE"
              disabled={pending}
              className="rounded-md bg-zinc-900 px-3 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50"
            >
              This and all future occurrences
            </button>
            <button
              type="button"
              onClick={() => setChoosingScope(false)}
              className="px-3 py-2 text-sm font-medium text-zinc-500 hover:underline"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <button
          type={isRecurringEdit ? "button" : "submit"}
          onClick={isRecurringEdit ? () => setChoosingScope(true) : undefined}
          disabled={pending}
          className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50"
        >
          {pending ? "Saving…" : submitLabel}
        </button>
      )}
    </form>
  );
}
