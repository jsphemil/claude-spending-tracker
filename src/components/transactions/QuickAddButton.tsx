"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { TransactionForm } from "@/components/transactions/TransactionForm";
import { quickAddTransaction } from "@/lib/actions/transactions";

type AccountOption = { id: string; name: string; icon: string; currency: string };
type CategoryOption = { id: string; name: string; icon: string; type: "INCOME" | "EXPENSE" };

// Matches /accounts/<id> exactly (not /accounts/new or /accounts/<id>/edit)
// so the button can default Quick Add to whichever account you're already
// looking at, without locking you to it.
const ACCOUNT_DETAIL_PATH = /^\/accounts\/(?!new$)([^/]+)$/;

export function QuickAddButton({
  accounts,
  categories,
  existingTagNames,
}: {
  accounts: AccountOption[];
  categories: CategoryOption[];
  existingTagNames: string[];
}) {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const currentAccountId = pathname.match(ACCOUNT_DETAIL_PATH)?.[1];

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  // Nothing to log a transaction against yet — the full New Account flow
  // is the right next step for a brand-new user, not this shortcut.
  if (accounts.length === 0) return null;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Quick add transaction"
        title="Quick add transaction"
        className="fixed bottom-36 right-4 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-accent text-white shadow-lg hover:bg-accent-strong md:bottom-24"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" className="h-6 w-6">
          <path d="M12 5v14M5 12h14" strokeLinecap="round" />
        </svg>
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 md:items-center md:p-6"
          onClick={() => setOpen(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Quick add transaction"
            onClick={(e) => e.stopPropagation()}
            className="max-h-[90vh] w-full overflow-y-auto rounded-t-2xl border border-border bg-surface p-5 shadow-lg md:max-w-md md:rounded-2xl"
          >
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-base font-semibold text-fg">Quick add</h2>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close"
                className="text-fg-muted hover:text-fg"
              >
                ✕
              </button>
            </div>
            <TransactionForm
              action={quickAddTransaction}
              accounts={accounts}
              categories={categories}
              existingTagNames={existingTagNames}
              submitLabel="Add transaction"
              allowRecurring
              defaultValues={
                currentAccountId
                  ? { accountId: currentAccountId, fromAccountId: currentAccountId }
                  : undefined
              }
              onCancel={() => setOpen(false)}
              onSuccess={() => {
                setOpen(false);
                router.refresh();
              }}
            />
          </div>
        </div>
      )}
    </>
  );
}
