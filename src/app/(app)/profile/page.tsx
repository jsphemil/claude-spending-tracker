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

  const card = "rounded-2xl border border-border bg-surface p-5 shadow-sm";

  return (
    <div className="mx-auto w-full max-w-[1400px] p-6 lg:p-10">
      <div className="mb-6">
        <h1 className="text-xl font-semibold tracking-tight text-fg">Profile</h1>
        <p className="mt-1 text-sm text-fg-muted">{email}</p>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <section className={card}>
          <h2 className="mb-3 text-sm font-semibold text-fg">Name</h2>
          <DisplayNameForm defaultValue={profile.displayName ?? ""} />
        </section>

        <section className={card}>
          <h2 className="mb-3 text-sm font-semibold text-fg">Password</h2>
          <ChangePasswordForm />
        </section>

        <section className={card}>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-fg">Settings</h2>
            <Link href="/settings" className="text-[12.5px] font-medium text-accent hover:underline">
              Open →
            </Link>
          </div>
          <p className="text-sm text-fg-muted">Budget Mode and Show Future Transactions defaults.</p>
        </section>

        <section className={`${card} lg:col-span-2`}>
          <h2 className="mb-3 text-sm font-semibold text-fg">Export transactions</h2>
          <ExportTransactionsForm accounts={accounts} />
        </section>
      </div>

      <form action={logout} className="mt-6">
        <button
          type="submit"
          className="rounded-lg border border-border bg-surface px-3 py-2 text-sm font-medium text-fg hover:bg-surface-2"
        >
          Sign out
        </button>
      </form>
    </div>
  );
}
