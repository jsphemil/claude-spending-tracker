import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db/prisma";
import { getVerifiedUserId } from "@/lib/supabase/server";
import { CATEGORY_TYPES, CATEGORY_TYPE_LABELS } from "@/lib/constants/categories";
import { DeleteCategoryButton } from "@/components/categories/DeleteCategoryButton";
import { formatMoney } from "@/lib/services/format";
import { monthLabel, monthRange, parseMonthParam } from "@/lib/services/calendar";

export default async function CategoriesPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string }>;
}) {
  const userId = await getVerifiedUserId();
  if (!userId) redirect("/login");

  const { type: rawType } = await searchParams;
  const type = rawType === "INCOME" ? "INCOME" : "EXPENSE";

  // Budget-vs-spend is always the real current month — this page has no
  // month nav (keeping it that way; "am I about to overspend this
  // category right now" is inherently a today question, not a browsable
  // history one, unlike the account pages).
  const currentMonthKey = parseMonthParam(undefined);
  const { start, end } = monthRange(currentMonthKey);

  const [categories, spendRows] = await Promise.all([
    prisma.category.findMany({ where: { userId, type }, orderBy: { name: "asc" } }),
    type === "EXPENSE"
      ? prisma.transaction.groupBy({
          by: ["categoryId"],
          where: { userId, type: "EXPENSE", date: { gte: start, lte: end } },
          _sum: { amount: true },
        })
      : Promise.resolve([]),
  ]);
  const spendByCategory = new Map(spendRows.map((r) => [r.categoryId, Number(r._sum.amount ?? 0)]));

  return (
    <div className="p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-fg">Categories</h1>
        <Link
          href={`/categories/new?type=${type}`}
          className="rounded-md bg-accent px-3 py-2 text-sm font-medium text-white hover:bg-accent-strong"
        >
          + New Category
        </Link>
      </div>

      <div className="mt-4 flex gap-1 border-b border-border">
        {CATEGORY_TYPES.map((t) => (
          <Link
            key={t}
            href={`/categories?type=${t}`}
            className={`border-b-2 px-3 py-2 text-sm font-medium ${
              type === t
                ? "border-accent text-fg"
                : "border-transparent text-fg-muted hover:text-fg"
            }`}
          >
            {CATEGORY_TYPE_LABELS[t]}
          </Link>
        ))}
      </div>

      {categories.length === 0 ? (
        <p className="mt-6 text-sm text-fg-muted">
          No {CATEGORY_TYPE_LABELS[type].toLowerCase()} categories yet.
        </p>
      ) : (
        <ul className="mt-4 space-y-2">
          {categories.map((category) => {
            const budget = category.monthlyBudget ? Number(category.monthlyBudget) : null;
            const spent = spendByCategory.get(category.id) ?? 0;
            const percent = budget ? Math.min(100, (spent / budget) * 100) : null;
            const overBudget = budget !== null && spent > budget;

            return (
              <li key={category.id} className="rounded-lg border border-border bg-surface px-4 py-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span
                      className="flex h-9 w-9 items-center justify-center rounded-full text-lg"
                      style={{ backgroundColor: category.color + "20" }}
                    >
                      {category.icon}
                    </span>
                    <p className="text-sm font-medium text-fg">{category.name}</p>
                  </div>
                  <div className="flex items-center gap-4">
                    <Link
                      href={`/categories/${category.id}/edit`}
                      className="text-sm font-medium text-fg hover:underline"
                    >
                      Edit
                    </Link>
                    <DeleteCategoryButton categoryId={category.id} type={type} />
                  </div>
                </div>

                {budget !== null && (
                  <div className="mt-2">
                    <div className="h-1.5 overflow-hidden rounded-full bg-surface-3">
                      <div
                        className={`h-full ${overBudget ? "bg-danger" : "bg-accent"}`}
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                    <p className={`mt-1 text-xs ${overBudget ? "font-medium text-danger" : "text-fg-muted"}`}>
                      {formatMoney(spent, "INR")} of {formatMoney(budget, "INR")} this {monthLabel(currentMonthKey)}
                      {overBudget && ` — ${formatMoney(spent - budget, "INR")} over`}
                    </p>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
