import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/db/prisma";
import { getVerifiedUserId } from "@/lib/supabase/server";
import { logout } from "@/lib/actions/auth";
import { ChangePasswordForm } from "./ChangePasswordForm";
import { DisplayNameForm } from "./DisplayNameForm";
import { ExportTransactionsForm } from "@/components/profile/ExportTransactionsForm";

export default async function ProfilePage() {
  const userId = await getVerifiedUserId();
  if (!userId) redirect("/login");

  const supabase = await createClient();
  const [{ data }, profile, accounts] = await Promise.all([
    supabase.auth.getClaims(),
    prisma.profile.findUniqueOrThrow({ where: { id: userId } }),
    prisma.account.findMany({
      where: { userId },
      orderBy: { createdAt: "asc" },
      select: { id: true, name: true, icon: true },
    }),
  ]);
  const email = data?.claims.email as string | undefined;

  return (
    <div className="max-w-md space-y-8 p-6">
      <div>
        <h1 className="text-xl font-semibold text-fg">Profile</h1>
        <p className="mt-2 text-sm text-fg-muted">{email}</p>
      </div>

      <DisplayNameForm defaultValue={profile.displayName ?? ""} />

      <Link
        href="/settings"
        className="block rounded-md border border-border bg-surface px-3 py-2 text-sm text-fg font-medium text-fg hover:bg-surface-2"
      >
        Budget Mode and Show Future Transactions settings →
      </Link>

      <ChangePasswordForm />

      <div className="space-y-2">
        <h2 className="text-sm font-semibold text-fg">Export Transactions</h2>
        <ExportTransactionsForm accounts={accounts} />
      </div>

      <form action={logout}>
        <button
          type="submit"
          className="rounded-md border border-border bg-surface px-3 py-2 text-sm text-fg font-medium text-fg hover:bg-surface-2"
        >
          Sign out
        </button>
      </form>
    </div>
  );
}
