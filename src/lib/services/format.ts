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
