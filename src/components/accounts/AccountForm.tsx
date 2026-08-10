"use client";

import { useActionState, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ACCOUNT_ICONS,
  ACCOUNT_TYPES,
  ACCOUNT_TYPE_LABELS,
  CURRENCIES,
  DEFAULT_ACCOUNT_COLOR,
} from "@/lib/constants/accounts";
import type { AccountActionState } from "@/lib/actions/accounts";

const initialState: AccountActionState = { error: null };

type AccountFormValues = {
  name: string;
  type: (typeof ACCOUNT_TYPES)[number];
  color: string;
  icon: string;
  currency: string;
  openingBalance: string;
  openingBalanceDate: string;
  creditLimit: string;
  budgetModeEnabled: string; // "" = inherit, "true" | "false" = override
  monthlyBudget: string;
  showFutureTransactions: string; // "" = inherit, "true" | "false" = override
};

const emptyValues: AccountFormValues = {
  name: "",
  type: "SAVINGS",
  color: DEFAULT_ACCOUNT_COLOR,
  icon: ACCOUNT_ICONS[0],
  currency: "INR",
  openingBalance: "0",
  openingBalanceDate: new Date().toISOString().slice(0, 10),
  creditLimit: "",
  budgetModeEnabled: "",
  monthlyBudget: "",
  showFutureTransactions: "",
};

export function AccountForm({
  action,
  defaultValues,
  submitLabel,
  globalBudgetMode,
  globalShowFuture,
}: {
  action: (
    state: AccountActionState,
    formData: FormData
  ) => Promise<AccountActionState>;
  defaultValues?: Partial<AccountFormValues>;
  submitLabel: string;
  /** Profile-level defaults, shown so "Inherit" reads as what it actually resolves to. */
  globalBudgetMode: boolean;
  globalShowFuture: boolean;
}) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(action, initialState);
  const values = { ...emptyValues, ...defaultValues };
  const [type, setType] = useState<(typeof ACCOUNT_TYPES)[number]>(values.type);
  const [budgetModeEnabled, setBudgetModeEnabled] = useState(values.budgetModeEnabled);
  const effectiveBudgetMode = budgetModeEnabled === "" ? globalBudgetMode : budgetModeEnabled === "true";

  return (
    <form action={formAction} className="max-w-md space-y-4">
      <div className="space-y-1">
        <label htmlFor="name" className="text-sm font-medium text-fg">
          Name
        </label>
        <input
          id="name"
          name="name"
          required
          defaultValue={values.name}
          className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-fg focus:border-accent focus:outline-none"
        />
      </div>

      <div className="space-y-1">
        <label htmlFor="type" className="text-sm font-medium text-fg">
          Type
        </label>
        <select
          id="type"
          name="type"
          defaultValue={values.type}
          onChange={(e) => setType(e.target.value as (typeof ACCOUNT_TYPES)[number])}
          className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-fg focus:border-accent focus:outline-none"
        >
          {ACCOUNT_TYPES.map((t) => (
            <option key={t} value={t}>
              {ACCOUNT_TYPE_LABELS[t]}
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1">
          <label htmlFor="color" className="text-sm font-medium text-fg">
            Color
          </label>
          <input
            id="color"
            name="color"
            type="color"
            defaultValue={values.color}
            className="h-10 w-full rounded-md border border-border"
          />
        </div>

        <div className="space-y-1">
          <label htmlFor="icon" className="text-sm font-medium text-fg">
            Icon
          </label>
          <select
            id="icon"
            name="icon"
            defaultValue={values.icon}
            className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-fg focus:border-accent focus:outline-none"
          >
            {ACCOUNT_ICONS.map((icon) => (
              <option key={icon} value={icon}>
                {icon}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1">
          <label htmlFor="openingBalance" className="text-sm font-medium text-fg">
            Opening balance
          </label>
          <input
            id="openingBalance"
            name="openingBalance"
            type="number"
            step="0.01"
            required
            defaultValue={values.openingBalance}
            className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-fg focus:border-accent focus:outline-none"
          />
        </div>

        <div className="space-y-1">
          <label htmlFor="currency" className="text-sm font-medium text-fg">
            Currency
          </label>
          <select
            id="currency"
            name="currency"
            defaultValue={values.currency}
            className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-fg focus:border-accent focus:outline-none"
          >
            {CURRENCIES.map((c) => (
              <option key={c.code} value={c.code}>
                {c.code} — {c.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="space-y-1">
        <label htmlFor="openingBalanceDate" className="text-sm font-medium text-fg">
          Opening balance date
        </label>
        <input
          id="openingBalanceDate"
          name="openingBalanceDate"
          type="date"
          required
          defaultValue={values.openingBalanceDate}
          className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-fg focus:border-accent focus:outline-none"
        />
      </div>

      {type === "CREDIT_CARD" && (
        <div className="space-y-1">
          <label htmlFor="creditLimit" className="text-sm font-medium text-fg">
            Credit limit
          </label>
          <input
            id="creditLimit"
            name="creditLimit"
            type="number"
            step="0.01"
            min="0"
            defaultValue={values.creditLimit}
            className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-fg focus:border-accent focus:outline-none"
          />
        </div>
      )}

      <div className="space-y-4 rounded-md border border-border p-3">
        <div className="space-y-1">
          <label htmlFor="budgetModeEnabled" className="text-sm font-medium text-fg">
            Budget Mode
          </label>
          <select
            id="budgetModeEnabled"
            name="budgetModeEnabled"
            defaultValue={values.budgetModeEnabled}
            onChange={(e) => setBudgetModeEnabled(e.target.value)}
            className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-fg focus:border-accent focus:outline-none"
          >
            <option value="">Inherit global setting (currently {globalBudgetMode ? "On" : "Off"})</option>
            <option value="true">On for this account</option>
            <option value="false">Off for this account</option>
          </select>
        </div>

        {effectiveBudgetMode && (
          <div className="space-y-1">
            <label htmlFor="monthlyBudget" className="text-sm font-medium text-fg">
              Monthly budget
            </label>
            <input
              id="monthlyBudget"
              name="monthlyBudget"
              type="number"
              step="0.01"
              min="0.01"
              placeholder="e.g. 30000"
              defaultValue={values.monthlyBudget}
              className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-fg focus:border-accent focus:outline-none"
            />
          </div>
        )}

        <div className="space-y-1">
          <label htmlFor="showFutureTransactions" className="text-sm font-medium text-fg">
            Show Future Transactions
          </label>
          <select
            id="showFutureTransactions"
            name="showFutureTransactions"
            defaultValue={values.showFutureTransactions}
            className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-fg focus:border-accent focus:outline-none"
          >
            <option value="">Inherit global setting (currently {globalShowFuture ? "Show" : "Hide"})</option>
            <option value="true">Show for this account</option>
            <option value="false">Hide for this account</option>
          </select>
        </div>
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
