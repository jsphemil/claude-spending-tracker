import { prisma } from "@/lib/db/prisma";

// Balance is computed from transactions, never stored — see build plan 1.2.
// This avoids drift whenever a transaction is created/edited/deleted; every
// code path that changes ledger data is automatically reflected here.
//
// `asOf` (inclusive) bounds the deltas to transactions on or before that
// date — used to compute a balance as it stood at a past point in time
// (e.g. a period's Carry Forward or Ending Balance), rather than today's.
export async function getAccountBalanceDeltas(
  userId: string,
  opts?: { asOf?: Date }
): Promise<Record<string, number>> {
  const dateFilter = opts?.asOf ? { date: { lte: opts.asOf } } : {};
  const [legTotals, transfersOut, transfersIn] = await Promise.all([
    prisma.transaction.groupBy({
      by: ["accountId", "type"],
      where: { userId, accountId: { not: null }, ...dateFilter },
      _sum: { amount: true },
    }),
    prisma.transaction.groupBy({
      by: ["fromAccountId"],
      where: { userId, type: "TRANSFER", ...dateFilter },
      _sum: { amount: true },
    }),
    prisma.transaction.groupBy({
      by: ["toAccountId"],
      where: { userId, type: "TRANSFER", ...dateFilter },
      _sum: { amount: true },
    }),
  ]);

  const deltas: Record<string, number> = {};

  for (const row of legTotals) {
    if (!row.accountId) continue;
    const amount = Number(row._sum.amount ?? 0);
    deltas[row.accountId] =
      (deltas[row.accountId] ?? 0) + (row.type === "INCOME" ? amount : -amount);
  }
  for (const row of transfersOut) {
    if (!row.fromAccountId) continue;
    deltas[row.fromAccountId] = (deltas[row.fromAccountId] ?? 0) - Number(row._sum.amount ?? 0);
  }
  for (const row of transfersIn) {
    if (!row.toAccountId) continue;
    deltas[row.toAccountId] = (deltas[row.toAccountId] ?? 0) + Number(row._sum.amount ?? 0);
  }

  return deltas;
}

export function applyDelta(openingBalance: number, deltas: Record<string, number>, accountId: string) {
  return openingBalance + (deltas[accountId] ?? 0);
}
