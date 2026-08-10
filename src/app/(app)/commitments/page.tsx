import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db/prisma";
import { getVerifiedUserId } from "@/lib/supabase/server";
import { formatMoney } from "@/lib/services/format";
import { describeSchedule, monthlyEquivalent } from "@/lib/services/recurrence";

export default async function CommitmentsPage() {
  const userId = await getVerifiedUserId();
  if (!userId) redirect("/login");

  const rules = await prisma.recurringRule.findMany({
    where: { userId, isActive: true },
    include: { account: true, fromAccount: true, toAccount: true, category: true },
    orderBy: { amount: "desc" },
  });

  const rows = rules.map((rule) => ({
    rule,
    monthly: monthlyEquivalent(Number(rule.amount), rule.intervalCount, rule.intervalUnit),
  }));

  const expenseRows = rows.filter((r) => r.rule.type === "EXPENSE").sort((a, b) => b.monthly - a.monthly);
  const transferRows = rows.filter((r) => r.rule.type === "TRANSFER").sort((a, b) => b.monthly - a.monthly);
  const incomeRows = rows.filter((r) => r.rule.type === "INCOME").sort((a, b) => b.monthly - a.monthly);

  const totalExpenseMonthly = expenseRows.reduce((sum, r) => sum + r.monthly, 0);
  const totalTransferMonthly = transferRows.reduce((sum, r) => sum + r.monthly, 0);
  const totalCommitmentMonthly = totalExpenseMonthly + totalTransferMonthly;
  const totalIncomeMonthly = incomeRows.reduce((sum, r) => sum + r.monthly, 0);
  const percentOfIncome = totalIncomeMonthly > 0 ? (totalCommitmentMonthly / totalIncomeMonthly) * 100 : null;

  return (
    <div className="max-w-md p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-fg">Fixed Commitments</h1>
        <Link href="/" className="text-sm font-medium text-fg-muted hover:underline">
          Dashboard
        </Link>
      </div>
      <p className="mt-1 text-sm text-fg-muted">
        Everything you&rsquo;re locked into every month, normalized from each rule&rsquo;s own cadence — a
        yearly charge and a weekly one both roll into one monthly figure here.
      </p>

      <div className="mt-4 rounded-lg border border-border bg-surface p-4">
        <p className="text-xs text-fg-muted">Total committed</p>
        <p className="text-2xl font-semibold text-danger">{formatMoney(totalCommitmentMonthly, "INR")}/mo</p>
        {percentOfIncome !== null && (
          <p className="mt-1 text-xs text-fg-muted">
            {percentOfIncome.toFixed(0)}% of your {formatMoney(totalIncomeMonthly, "INR")}/mo recurring income
          </p>
        )}
      </div>

      {rows.length === 0 ? (
        <p className="mt-6 text-sm text-fg-muted">
          No active recurring rules yet — mark a transaction &ldquo;recurring&rdquo; when you add it to
          start tracking commitments here.
        </p>
      ) : (
        <>
          {[
            { title: "Recurring Expenses", rows: expenseRows, color: "text-danger" },
            { title: "Recurring Transfers & Investments", rows: transferRows, color: "text-accent" },
            { title: "Recurring Income (for reference)", rows: incomeRows, color: "text-success" },
          ]
            .filter((section) => section.rows.length > 0)
            .map((section) => (
              <div key={section.title} className="mt-8">
                <h2 className="text-sm font-semibold text-fg">{section.title}</h2>
                <ul className="mt-2 space-y-2">
                  {section.rows.map(({ rule, monthly }) => (
                    <li
                      key={rule.id}
                      className="rounded-lg border border-border bg-surface px-4 py-3"
                    >
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium text-fg">
                          {rule.type === "TRANSFER"
                            ? `${rule.fromAccount?.name} → ${rule.toAccount?.name}`
                            : `${rule.category?.icon ?? "❓"} ${rule.category?.name ?? "Uncategorized"} · ${rule.account?.name}`}
                        </p>
                        <p className={`text-sm font-medium ${section.color}`}>
                          {formatMoney(monthly, "INR")}/mo
                        </p>
                      </div>
                      <p className="mt-0.5 text-xs text-fg-muted">
                        {formatMoney(Number(rule.amount), "INR")} · {describeSchedule(rule.intervalCount, rule.intervalUnit)}
                        {rule.description ? ` · ${rule.description}` : ""}
                      </p>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
        </>
      )}
    </div>
  );
}
