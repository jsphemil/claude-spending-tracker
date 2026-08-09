"use client";

import { deleteTransaction } from "@/lib/actions/transactions";

export function DeleteTransactionButton({
  transactionId,
  redirectTo,
}: {
  transactionId: string;
  redirectTo: string;
}) {
  return (
    <form
      action={deleteTransaction.bind(null, transactionId, redirectTo)}
      onSubmit={(e) => {
        if (!confirm("Delete this transaction?")) {
          e.preventDefault();
        }
      }}
    >
      <button type="submit" className="text-sm font-medium text-red-600 hover:underline">
        Delete
      </button>
    </form>
  );
}
