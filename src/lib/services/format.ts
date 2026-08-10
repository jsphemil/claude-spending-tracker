// Indian numbering system throughout (e.g. ₹1,53,168.00), per spec 5.4.
// Intl.NumberFormat('en-IN') produces this grouping natively.
export function formatMoney(amount: number, currency: string) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

// Abbreviated form (₹12L, ₹3.2Cr) for chart axis ticks, where full
// precision would crowd out the labels.
export function formatMoneyCompact(amount: number, currency: string) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency,
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(amount);
}
