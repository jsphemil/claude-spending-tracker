import { prisma } from "@/lib/db/prisma";
import { getRatesToINR } from "@/lib/services/currency";

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

// The opening balance is itself a real Transaction row (isOpeningBalance,
// see lib/actions/accounts.ts), so it's already included in `deltas` —
// dated on openingBalanceDate, it naturally drops out of `deltas` once
// `asOf` (passed to getAccountBalanceDeltas) falls before that date. No
// separate opening-balance handling needed here.
export function applyDelta(accountId: string, deltas: Record<string, number>) {
  return deltas[accountId] ?? 0;
}

// Net worth as of each cutoff (ascending order) — one query instead of one
// per cutoff (getAccountBalanceDeltas repeated N times would be 3N queries
// for an N-month trend). Transactions are fetched once, sorted ascending,
// and folded into a running per-account delta as each cutoff is passed —
// same math as getAccountBalanceDeltas/applyDelta, just accumulated
// incrementally. An account contributes nothing before its first
// transaction (its opening-balance row), same as elsewhere.
//
// Each account's delta is still in that account's own currency (transfers
// move the same raw number between both legs — this app has no concept of
// a cross-currency transfer, so that's assumed to never mismatch); only
// the final per-cutoff sum converts to INR, one rate lookup for every
// currency in play, reused across every cutoff in the series.
export async function getNetWorthSeries(userId: string, cutoffs: Date[]): Promise<number[]> {
  if (cutoffs.length === 0) return [];

  const [accounts, transactions] = await Promise.all([
    prisma.account.findMany({ where: { userId }, select: { id: true, currency: true } }),
    prisma.transaction.findMany({
      where: { userId, date: { lte: cutoffs[cutoffs.length - 1] } },
      select: { date: true, type: true, amount: true, accountId: true, fromAccountId: true, toAccountId: true },
      orderBy: { date: "asc" },
    }),
  ]);
  const accountIds = accounts.map((a) => a.id);
  const currencyByAccount = new Map(accounts.map((a) => [a.id, a.currency]));
  const rates = await getRatesToINR(accounts.map((a) => a.currency));
  const rateFor = (accountId: string) => {
    const currency = currencyByAccount.get(accountId);
    return currency === "INR" || !currency ? 1 : (rates[currency] ?? 1);
  };

  const deltas: Record<string, number> = {};
  let i = 0;
  const series: number[] = [];

  for (const cutoff of cutoffs) {
    while (i < transactions.length && transactions[i].date <= cutoff) {
      const t = transactions[i];
      const amount = Number(t.amount);
      if (t.type === "TRANSFER") {
        if (t.fromAccountId) deltas[t.fromAccountId] = (deltas[t.fromAccountId] ?? 0) - amount;
        if (t.toAccountId) deltas[t.toAccountId] = (deltas[t.toAccountId] ?? 0) + amount;
      } else if (t.accountId) {
        deltas[t.accountId] = (deltas[t.accountId] ?? 0) + (t.type === "INCOME" ? amount : -amount);
      }
      i++;
    }
    series.push(accountIds.reduce((sum, id) => sum + (deltas[id] ?? 0) * rateFor(id), 0));
  }

  return series;
}
