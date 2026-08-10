"use client";

import { useActionState, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ACCOUNT_ICONS,
  ACCOUNT_TYPES,
  ACCOUNT_TYPE_LABELS,
  COMMON_CURRENCIES,
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
};

export function AccountForm({
  action,
  defaultValues,
  submitLabel,
}: {
  action: (
    state: AccountActionState,
    formData: FormData
  ) => Promise<AccountActionState>;
  defaultValues?: Partial<AccountFormValues>;
  submitLabel: string;
}) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(action, initialState);
  const values = { ...emptyValues, ...defaultValues };
  const [type, setType] = useState<(typeof ACCOUNT_TYPES)[number]>(values.type);

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
          onChange={(e) => setType(e.target.value as (typeof ACCOUNT_TYPES)[number])}
          className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-zinc-500 focus:outline-none"
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
          <label htmlFor="openingBalance" className="text-sm font-medium text-zinc-700">
            Opening balance
          </label>
          <input
            id="openingBalance"
            name="openingBalance"
            type="number"
            step="0.01"
            required
            defaultValue={values.openingBalance}
            className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-zinc-500 focus:outline-none"
          />
        </div>

        <div className="space-y-1">
          <label htmlFor="currency" className="text-sm font-medium text-zinc-700">
            Currency
          </label>
          <select
            id="currency"
            name="currency"
            defaultValue={values.currency}
            className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-zinc-500 focus:outline-none"
          >
            {COMMON_CURRENCIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="space-y-1">
        <label htmlFor="openingBalanceDate" className="text-sm font-medium text-zinc-700">
          Opening balance date
        </label>
        <input
          id="openingBalanceDate"
          name="openingBalanceDate"
          type="date"
          required
          defaultValue={values.openingBalanceDate}
          className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-zinc-500 focus:outline-none"
        />
      </div>

      {type === "CREDIT_CARD" && (
        <div className="space-y-1">
          <label htmlFor="creditLimit" className="text-sm font-medium text-zinc-700">
            Credit limit
          </label>
          <input
            id="creditLimit"
            name="creditLimit"
            type="number"
            step="0.01"
            min="0"
            defaultValue={values.creditLimit}
            className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-zinc-500 focus:outline-none"
          />
        </div>
      )}

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
