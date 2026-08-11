"use client";

import { useActionState, useState } from "react";
import { useRouter } from "next/navigation";
import type { TransactionActionState } from "@/lib/actions/transactions";
import { RECURRENCE_UNITS } from "@/lib/validation/recurring";
import { InlineCategoryCreate } from "@/components/categories/InlineCategoryCreate";

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
  tags: string;
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
  tags: "",
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
  existingTagNames = [],
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
  /** Powers the tag autocomplete suggestions. */
  existingTagNames?: string[];
  defaultValues?: Partial<TransactionFormValues>;
  submitLabel: string;
  /** Only meaningful at creation — shows the "make recurring" toggle. */
  allowRecurring?: boolean;
  /** Set when editing a transaction that's part of a recurring series. */
  recurringInfo?: { scheduleLabel: string; endDate: string } | null;
}) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(action, initialState);
  const values = { ...emptyValues, ...defaultValues };
  const [type, setType] = useState<TransactionType>(values.type);
  const [recurring, setRecurring] = useState(false);
  const [choosingScope, setChoosingScope] = useState(false);
  const [localCategories, setLocalCategories] = useState(categories);
  const [categoryId, setCategoryId] = useState(values.categoryId);
  const [addingCategory, setAddingCategory] = useState(false);

  const visibleCategories = localCategories.filter((c) => c.type === type);
  const isRecurringEdit = recurringInfo !== null;

  return (
    <form action={formAction} className="max-w-md space-y-4">
      <div className="flex gap-1 rounded-md bg-surface-2 p-1">
        {TYPE_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => {
              setType(opt.value);
              setCategoryId("");
              setAddingCategory(false);
            }}
            className={`flex-1 rounded px-3 py-1.5 text-sm font-medium ${
              type === opt.value
                ? "bg-surface text-fg shadow-sm"
                : "text-fg-muted hover:text-fg"
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>
      <input type="hidden" name="type" value={type} />

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1">
          <label htmlFor="amount" className="text-sm font-medium text-fg">
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
            className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-fg focus:border-accent focus:outline-none"
          />
        </div>
        <div className="space-y-1">
          <label htmlFor="date" className="text-sm font-medium text-fg">
            Date
          </label>
          <input
            id="date"
            name="date"
            type="date"
            required
            defaultValue={values.date}
            className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-fg focus:border-accent focus:outline-none"
          />
        </div>
      </div>

      {type === "TRANSFER" ? (
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <label htmlFor="fromAccountId" className="text-sm font-medium text-fg">
              From account
            </label>
            <select
              id="fromAccountId"
              name="fromAccountId"
              required
              defaultValue={values.fromAccountId}
              className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-fg focus:border-accent focus:outline-none"
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
            <label htmlFor="toAccountId" className="text-sm font-medium text-fg">
              To account
            </label>
            <select
              id="toAccountId"
              name="toAccountId"
              required
              defaultValue={values.toAccountId}
              className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-fg focus:border-accent focus:outline-none"
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
            <label htmlFor="accountId" className="text-sm font-medium text-fg">
              Account
            </label>
            <select
              id="accountId"
              name="accountId"
              required
              defaultValue={values.accountId}
              className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-fg focus:border-accent focus:outline-none"
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
            <div className="flex items-center justify-between">
              <label htmlFor="categoryId" className="text-sm font-medium text-fg">
                Category
              </label>
              <button
                type="button"
                onClick={() => setAddingCategory((v) => !v)}
                className="text-xs font-medium text-fg-muted hover:underline"
              >
                {addingCategory ? "Cancel" : "+ New category"}
              </button>
            </div>
            <select
              id="categoryId"
              name="categoryId"
              required
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-fg focus:border-accent focus:outline-none"
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
            {addingCategory && (
              <InlineCategoryCreate
                type={type === "INCOME" ? "INCOME" : "EXPENSE"}
                onCreated={(category) => {
                  setLocalCategories((prev) => [...prev, category]);
                  setCategoryId(category.id);
                  setAddingCategory(false);
                }}
                onCancel={() => setAddingCategory(false)}
              />
            )}
          </div>
        </div>
      )}

      <div className="space-y-1">
        <label htmlFor="description" className="text-sm font-medium text-fg">
          Description (optional)
        </label>
        <input
          id="description"
          name="description"
          defaultValue={values.description}
          className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-fg focus:border-accent focus:outline-none"
        />
      </div>

      <div className="space-y-1">
        <label htmlFor="tags" className="text-sm font-medium text-fg">
          Tags (optional)
        </label>
        <input
          id="tags"
          name="tags"
          list="tag-suggestions"
          placeholder="e.g. Dubai Trip 2026, Work reimbursement"
          defaultValue={values.tags}
          className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-fg focus:border-accent focus:outline-none"
        />
        <datalist id="tag-suggestions">
          {existingTagNames.map((name) => (
            <option key={name} value={name} />
          ))}
        </datalist>
        <p className="text-xs text-fg-subtle">
          Comma-separated. Groups transactions across accounts and categories around an
          occasion — reuses an existing tag by name, or creates a new one.
        </p>
      </div>

      {isRecurringEdit && (
        <div className="space-y-2 rounded-md bg-surface-2 px-3 py-2">
          <p className="text-sm text-fg-muted">🔁 Part of a recurring series · {recurringInfo.scheduleLabel}</p>
          <div className="space-y-1">
            <label htmlFor="endDate" className="text-xs text-fg-muted">
              End date (optional — leave blank to repeat indefinitely)
            </label>
            <input
              id="endDate"
              name="endDate"
              type="date"
              defaultValue={recurringInfo.endDate}
              className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-fg focus:border-accent focus:outline-none"
            />
            <p className="text-xs text-fg-subtle">
              Only applied if you choose &ldquo;this and all future occurrences&rdquo; below.
            </p>
          </div>
        </div>
      )}

      {allowRecurring && !isRecurringEdit && (
        <div className="space-y-2 rounded-md border border-border p-3">
          <label className="flex items-center gap-2 text-sm font-medium text-fg">
            <input
              type="checkbox"
              name="recurring"
              checked={recurring}
              onChange={(e) => setRecurring(e.target.checked)}
              className="h-4 w-4 rounded border-border"
            />
            Make recurring
          </label>

          {recurring && (
            <div className="space-y-3 pt-1">
              <div className="flex items-center gap-2">
                <span className="text-sm text-fg-muted">Repeat every</span>
                <input
                  type="number"
                  name="intervalCount"
                  min="1"
                  defaultValue="1"
                  required
                  className="w-16 rounded-md border border-border px-2 py-1.5 text-sm focus:border-accent focus:outline-none"
                />
                <select
                  name="intervalUnit"
                  defaultValue="MONTH"
                  className="rounded-md border border-border px-2 py-1.5 text-sm focus:border-accent focus:outline-none"
                >
                  {RECURRENCE_UNITS.map((unit) => (
                    <option key={unit} value={unit}>
                      {UNIT_LABELS[unit]}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <label htmlFor="endDate" className="text-sm text-fg-muted">
                  End date (optional — leave blank to repeat indefinitely)
                </label>
                <input
                  id="endDate"
                  name="endDate"
                  type="date"
                  className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-fg focus:border-accent focus:outline-none"
                />
              </div>
            </div>
          )}
        </div>
      )}

      {state.error && <p className="text-sm text-danger">{state.error}</p>}

      {isRecurringEdit && choosingScope ? (
        <div className="space-y-2">
          <p className="text-sm font-medium text-fg">Apply this change to:</p>
          <div className="flex flex-wrap gap-2">
            <button
              type="submit"
              name="scope"
              value="ONE"
              disabled={pending}
              className="rounded-md border border-border bg-surface px-3 py-2 text-sm text-fg font-medium text-fg hover:bg-surface-2 disabled:opacity-50"
            >
              Just this one
            </button>
            <button
              type="submit"
              name="scope"
              value="FUTURE"
              disabled={pending}
              className="rounded-md bg-accent px-3 py-2 text-sm font-medium text-white hover:bg-accent-strong disabled:opacity-50"
            >
              This and all future occurrences
            </button>
            <button
              type="button"
              onClick={() => setChoosingScope(false)}
              className="px-3 py-2 text-sm font-medium text-fg-muted hover:underline"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-3">
          <button
            type={isRecurringEdit ? "button" : "submit"}
            onClick={isRecurringEdit ? () => setChoosingScope(true) : undefined}
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
      )}
    </form>
  );
}
