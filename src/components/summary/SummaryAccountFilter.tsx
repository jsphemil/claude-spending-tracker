"use client";

import { useRouter, useSearchParams } from "next/navigation";

export function SummaryAccountFilter({
  accounts,
}: {
  accounts: { id: string; name: string; icon: string }[];
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  function updateAccount(value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set("accountId", value);
    else params.delete("accountId");
    router.push(`/summary?${params.toString()}`);
  }

  return (
    <select
      key={searchParams.toString()}
      defaultValue={searchParams.get("accountId") ?? ""}
      onChange={(e) => updateAccount(e.target.value)}
      className="rounded-md border border-zinc-300 px-2 py-1.5 text-sm"
    >
      <option value="">All accounts</option>
      {accounts.map((a) => (
        <option key={a.id} value={a.id}>
          {a.icon} {a.name}
        </option>
      ))}
    </select>
  );
}
