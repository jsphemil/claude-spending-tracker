import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getVerifiedUserId } from "@/lib/supabase/server";
import { toCsv } from "@/lib/services/csv";
import type { Prisma } from "@/generated/prisma/client";

export async function GET(request: NextRequest) {
  const userId = await getVerifiedUserId();
  if (!userId) return NextResponse.redirect(new URL("/login", request.url));

  const { searchParams } = new URL(request.url);
  // A native GET <form> with several same-named checkboxes serializes as
  // repeated accountIds=x&accountIds=y params — getAll, not get.
  const requestedAccountIds = searchParams.getAll("accountIds").filter(Boolean);
  const from = searchParams.get("from");
  const to = searchParams.get("to");

  // Never trust client-supplied account ids directly — only export accounts
  // that actually belong to this user, same discipline every other query
  // in this app follows since Prisma bypasses Supabase RLS.
  let accountIds: string[] | null = null;
  if (requestedAccountIds.length > 0) {
    const owned = await prisma.account.findMany({
      where: { id: { in: requestedAccountIds }, userId },
      select: { id: true },
    });
    accountIds = owned.map((a) => a.id);
  }

  const where: Prisma.TransactionWhereInput = { userId };
  if (from || to) {
    where.date = {
      ...(from ? { gte: new Date(from) } : {}),
      ...(to ? { lte: new Date(to) } : {}),
    };
  }
  if (accountIds) {
    where.OR = [
      { accountId: { in: accountIds } },
      { fromAccountId: { in: accountIds } },
      { toAccountId: { in: accountIds } },
    ];
  }

  const transactions = await prisma.transaction.findMany({
    where,
    orderBy: { date: "asc" },
    include: {
      account: true,
      category: true,
      fromAccount: true,
      toAccount: true,
      tags: { include: { tag: true } },
    },
  });

  const rows = transactions.map((t) => [
    t.date.toISOString().slice(0, 10),
    t.type,
    t.type === "TRANSFER" ? `${t.fromAccount?.name} → ${t.toAccount?.name}` : (t.account?.name ?? ""),
    t.isOpeningBalance ? "Opening Balance" : (t.category?.name ?? (t.type === "TRANSFER" ? "" : "Uncategorized")),
    t.description ?? "",
    Number(t.amount),
    t.type === "TRANSFER" ? "INR" : (t.account?.currency ?? "INR"),
    t.tags.map((tt) => tt.tag.name).join("; "),
    t.recurringRuleId ? "Yes" : "No",
  ]);

  const csv = toCsv(
    ["Date", "Type", "Account", "Category", "Description", "Amount", "Currency", "Tags", "Recurring"],
    rows
  );

  const filename =
    from && to ? `transactions_${from}_to_${to}.csv` : "transactions_export.csv";

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
