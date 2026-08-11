import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db/prisma";
import { getVerifiedUserId } from "@/lib/supabase/server";
import { updateGlobalSettings } from "@/lib/actions/settings";

export default async function SettingsPage() {
  const userId = await getVerifiedUserId();
  if (!userId) redirect("/login");

  const profile = await prisma.profile.findUniqueOrThrow({ where: { id: userId } });

  return (
    <div className="mx-auto w-full max-w-xl p-6 lg:p-10">
      <Link href="/profile" className="text-sm font-medium text-fg-muted hover:underline">
        ← Back to Profile
      </Link>
      <h1 className="mt-4 text-xl font-semibold tracking-tight text-fg">Settings</h1>
      <p className="mt-1 text-sm text-fg-muted">
        Global defaults — any account can override these individually from its own edit page.
      </p>

      <form
        action={updateGlobalSettings}
        className="mt-6 space-y-4 rounded-2xl border border-border bg-surface p-5 shadow-sm"
      >
        <div className="rounded-xl bg-surface-2 p-3.5">
          <label className="flex items-start gap-3">
            <input
              type="checkbox"
              name="budgetModeGlobal"
              defaultChecked={profile.budgetModeGlobal}
              className="mt-0.5 h-4 w-4 rounded border-border"
            />
            <span>
              <span className="block text-sm font-medium text-fg">Budget Mode</span>
              <span className="block text-xs text-fg-muted">
                When on, accounts with a monthly budget set show spend-vs-budget progress.
              </span>
            </span>
          </label>
        </div>

        <div className="rounded-xl bg-surface-2 p-3.5">
          <label className="flex items-start gap-3">
            <input
              type="checkbox"
              name="showFutureTransactionsGlobal"
              defaultChecked={profile.showFutureTransactionsGlobal}
              className="mt-0.5 h-4 w-4 rounded border-border"
            />
            <span>
              <span className="block text-sm font-medium text-fg">Show Future Transactions</span>
              <span className="block text-xs text-fg-muted">
                When off, transactions dated after today are hidden from this month&rsquo;s transaction
                list (totals and balances are unaffected — they already count every recorded
                transaction, same as always).
              </span>
            </span>
          </label>
        </div>

        <button
          type="submit"
          className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-strong"
        >
          Save settings
        </button>
      </form>
    </div>
  );
}
