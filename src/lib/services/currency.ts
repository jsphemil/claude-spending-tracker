import { prisma } from "@/lib/db/prisma";

// Frankfurter itself only refreshes once/day (per spec 5.1) — a few hours
// keeps rates fresh without hammering the API on every page load.
const CACHE_TTL_MS = 6 * 60 * 60 * 1000;

// Only ever "some currency -> INR" (see ExchangeRateCache's schema
// comment) — batches every currency a caller needs into one Frankfurter
// call (base=INR, symbols=<the rest>) rather than one call per currency,
// then inverts each rate (Frankfurter gives "1 INR = X foreign", the app
// needs "1 foreign = Y INR").
export async function getRatesToINR(currencies: string[]): Promise<Record<string, number>> {
  const unique = [...new Set(currencies)].filter((c) => c !== "INR");
  if (unique.length === 0) return {};

  const cached = await prisma.exchangeRateCache.findMany({ where: { currency: { in: unique } } });
  const now = Date.now();
  const rates = new Map<string, number>(
    cached
      .filter((c) => now - c.fetchedAt.getTime() < CACHE_TTL_MS)
      .map((c) => [c.currency, Number(c.rateToInr)])
  );
  const stale = unique.filter((c) => !rates.has(c));

  if (stale.length > 0) {
    try {
      // v2's /rates takes `quotes` (not v1's `symbols`) and returns an
      // array of {date, base, quote, rate} records, not a {rates: {...}}
      // object — a genuinely different shape from v1, not just a renamed
      // path. Confirmed against the live API, not assumed from docs.
      const res = await fetch(
        `https://api.frankfurter.dev/v2/rates?base=INR&quotes=${stale.join(",")}`
      );
      if (res.ok) {
        const data: { base: string; quote: string; rate: number }[] = await res.json();
        await Promise.all(
          data.map(({ quote, rate }) => {
            const rateToInr = 1 / rate;
            rates.set(quote, rateToInr);
            return prisma.exchangeRateCache.upsert({
              where: { currency: quote },
              create: { currency: quote, rateToInr },
              update: { rateToInr, fetchedAt: new Date() },
            });
          })
        );
      }
    } catch {
      // Network/API failure — fall through to the stale-cache fallback
      // below rather than crashing whatever page asked for this.
    }

    // Anything still missing (API down and never cached, or this specific
    // currency errored) falls back to its last-known cached rate, however
    // old, rather than silently pretending it's 1:1 with INR.
    for (const currency of stale) {
      if (rates.has(currency)) continue;
      const old = cached.find((c) => c.currency === currency);
      if (old) rates.set(currency, Number(old.rateToInr));
    }
  }

  return Object.fromEntries(rates);
}

export async function convertToINR(amount: number, currency: string): Promise<number> {
  if (currency === "INR") return amount;
  const rates = await getRatesToINR([currency]);
  const rate = rates[currency];
  return rate !== undefined ? amount * rate : amount;
}

// Converts a mixed-currency list of amounts to INR and sums them — the
// primitive every portfolio-level aggregate (net worth, Carry Forward,
// Dashboard income/expense, asset allocation) is built from. One rate
// lookup for the whole list, not one per item.
export async function sumToINR(items: { amount: number; currency: string }[]): Promise<number> {
  const rates = await getRatesToINR(items.map((i) => i.currency));
  return items.reduce((sum, i) => {
    const rate = i.currency === "INR" ? 1 : (rates[i.currency] ?? 1);
    return sum + i.amount * rate;
  }, 0);
}
