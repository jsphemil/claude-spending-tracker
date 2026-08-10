import { formatMoney } from "@/lib/services/format";

// Two-color bar pinned above the transaction list — green for income, red
// for expense — scoped to whatever filter is currently applied (spec 5.2).
export function SummaryBand({
  income,
  expense,
  currency,
}: {
  income: number;
  expense: number;
  currency: string;
}) {
  const total = income + expense;
  const incomePct = total > 0 ? (income / total) * 100 : 50;

  return (
    <div className="overflow-hidden rounded-lg border border-border">
      <div className="flex h-2">
        <div className="bg-success" style={{ width: `${incomePct}%` }} />
        <div className="bg-danger" style={{ width: `${100 - incomePct}%` }} />
      </div>
      <div className="flex justify-between px-4 py-3 text-sm">
        <div>
          <span className="text-fg-muted">Income </span>
          <span className="font-medium text-success">
            {formatMoney(income, currency)}
          </span>
        </div>
        <div>
          <span className="text-fg-muted">Expense </span>
          <span className="font-medium text-danger">
            {formatMoney(expense, currency)}
          </span>
        </div>
      </div>
    </div>
  );
}
