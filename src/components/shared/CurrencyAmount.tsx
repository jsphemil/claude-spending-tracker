import { formatMoney } from "@/lib/services/format";

// Conversion is async (server-side, cached), so the INR-equivalent is
// computed by the caller and passed in — this stays a plain presentational
// component. Renders just the native amount when there's nothing to
// convert (already INR, or the caller didn't compute an equivalent).
export function CurrencyAmount({
  amount,
  currency,
  inrEquivalent,
  className,
}: {
  amount: number;
  currency: string;
  inrEquivalent?: number;
  className?: string;
}) {
  if (currency === "INR" || inrEquivalent === undefined) {
    return <span className={className}>{formatMoney(amount, currency)}</span>;
  }

  return (
    <span className={className}>
      {formatMoney(amount, currency)}
      <span className="ml-1 font-normal text-zinc-400">≈ {formatMoney(inrEquivalent, "INR")}</span>
    </span>
  );
}
