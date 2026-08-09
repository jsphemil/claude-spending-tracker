"use client";

import { useRouter, useSearchParams } from "next/navigation";

type AccountOption = { id: string; name: string; icon: string };
type CategoryOption = { id: string; name: string; icon: string };

export function TransactionFilters({
  accounts,
  categories,
}: {
  accounts: AccountOption[];
  categories: CategoryOption[];
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  function updateParam(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(key, value);
    else params.delete(key);
    router.push(`/transactions?${params.toString()}`);
  }

  const hasFilters = ["accountId", "categoryId", "from", "to"].some((k) =>
    searchParams.get(k)
  );

  return (
    <div key={searchParams.toString()} className="flex flex-wrap items-center gap-2">
      <select
        defaultValue={searchParams.get("accountId") ?? ""}
        onChange={(e) => updateParam("accountId", e.target.value)}
        className="rounded-md border border-zinc-300 px-2 py-1.5 text-sm"
      >
        <option value="">All accounts</option>
        {accounts.map((a) => (
          <option key={a.id} value={a.id}>
            {a.icon} {a.name}
          </option>
        ))}
      </select>

      <select
        defaultValue={searchParams.get("categoryId") ?? ""}
        onChange={(e) => updateParam("categoryId", e.target.value)}
        className="rounded-md border border-zinc-300 px-2 py-1.5 text-sm"
      >
        <option value="">All categories</option>
        {categories.map((c) => (
          <option key={c.id} value={c.id}>
            {c.icon} {c.name}
          </option>
        ))}
      </select>

      <input
        type="date"
        aria-label="From date"
        defaultValue={searchParams.get("from") ?? ""}
        onChange={(e) => updateParam("from", e.target.value)}
        className="rounded-md border border-zinc-300 px-2 py-1.5 text-sm"
      />
      <span className="text-sm text-zinc-400">to</span>
      <input
        type="date"
        aria-label="To date"
        defaultValue={searchParams.get("to") ?? ""}
        onChange={(e) => updateParam("to", e.target.value)}
        className="rounded-md border border-zinc-300 px-2 py-1.5 text-sm"
      />

      {hasFilters && (
        <button
          type="button"
          onClick={() => router.push("/transactions")}
          className="text-sm font-medium text-zinc-500 hover:underline"
        >
          Clear
        </button>
      )}
    </div>
  );
}
