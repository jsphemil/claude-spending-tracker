import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/db/prisma";
import { getVerifiedUserId } from "@/lib/supabase/server";
import { formatMoney } from "@/lib/services/format";
import { ensureMaterialized } from "@/lib/services/recurrence";

export default async function TagSummaryPage({
  params,
}: {
  params: Promise<{ tagName: string }>;
}) {
  const userId = await getVerifiedUserId();
  if (!userId) redirect("/login");

  await ensureMaterialized(userId);

  const { tagName: rawTagName } = await params;
  const tagName = decodeURIComponent(rawTagName);

  const tag = await prisma.tag.findFirst({ where: { userId, name: tagName } });
  if (!tag) notFound();

  const transactions = await prisma.transaction.findMany({
    where: { userId, tags: { some: { tagId: tag.id } } },
    orderBy: { date: "desc" },
    include: { account: true, category: true, fromAccount: true, toAccount: true },
  });

  // Transfers move money between the user's own accounts rather than being
  // income or spending, so — same as the transactions summary band and
  // calendar totals — they're excluded here too.
  const income = transactions
    .filter((t) => t.type === "INCOME")
    .reduce((sum, t) => sum + Number(t.amount), 0);
  const expense = transactions
    .filter((t) => t.type === "EXPENSE")
    .reduce((sum, t) => sum + Number(t.amount), 0);
  const net = income - expense;

  return (
    <div className="p-6">
      <Link href="/transactions" className="text-sm font-medium text-fg-muted hover:underline">
        ← Back to Transactions
      </Link>
      <h1 className="mt-4 text-xl font-semibold text-fg">🏷️ {tag.name}</h1>

      <div className="mt-6 grid grid-cols-3 gap-4 rounded-lg border border-border bg-surface p-4">
        <div>
          <p className="text-xs text-fg-muted">Income</p>
          <p className="text-lg font-semibold text-success">{formatMoney(income, "INR")}</p>
        </div>
        <div>
          <p className="text-xs text-fg-muted">Expense</p>
          <p className="text-lg font-semibold text-danger">{formatMoney(expense, "INR")}</p>
        </div>
        <div>
          <p className="text-xs text-fg-muted">Net</p>
          <p className={`text-lg font-semibold ${net >= 0 ? "text-success" : "text-danger"}`}>
            {formatMoney(net, "INR")}
          </p>
        </div>
      </div>

      {transactions.length === 0 ? (
        <p className="mt-6 text-sm text-fg-muted">No transactions carry this tag.</p>
      ) : (
        <ul className="mt-4 space-y-2">
          {transactions.map((t) => (
            <li
              key={t.id}
              className="flex items-center justify-between rounded-lg border border-border bg-surface px-4 py-3"
            >
              <div className="flex items-center gap-3">
                <span
                  className="flex h-9 w-9 items-center justify-center rounded-full text-lg"
                  style={{
                    backgroundColor:
                      (t.type === "TRANSFER" ? "#3b82f6" : t.category?.color ?? "#71717a") + "20",
                  }}
                >
                  {t.type === "TRANSFER" ? "🔁" : t.category?.icon ?? "❓"}
                </span>
                <div>
                  <p className="text-sm font-medium text-fg">
                    {t.type === "TRANSFER"
                      ? `${t.fromAccount?.name} → ${t.toAccount?.name}`
                      : `${t.category?.name ?? "Uncategorized"} · ${t.account?.name}`}
                  </p>
                  <p className="text-xs text-fg-muted">
                    {t.date.toISOString().slice(0, 10)}
                    {t.description ? ` · ${t.description}` : ""}
                  </p>
                </div>
              </div>
              <p
                className={`text-sm font-medium ${
                  t.type === "INCOME"
                    ? "text-success"
                    : t.type === "EXPENSE"
                      ? "text-danger"
                      : "text-fg"
                }`}
              >
                {t.type === "INCOME" ? "+" : t.type === "EXPENSE" ? "−" : ""}
                {formatMoney(
                  Number(t.amount),
                  t.type === "TRANSFER" ? "INR" : (t.account?.currency ?? "INR")
                )}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
