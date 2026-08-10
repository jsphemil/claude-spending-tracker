"use client";

import { useState } from "react";
import { deleteTransaction } from "@/lib/actions/transactions";

export function DeleteTransactionButton({
  transactionId,
  redirectTo,
  isRecurring = false,
}: {
  transactionId: string;
  redirectTo: string;
  isRecurring?: boolean;
}) {
  const [choosingScope, setChoosingScope] = useState(false);
  const action = deleteTransaction.bind(null, transactionId, redirectTo);

  if (isRecurring && choosingScope) {
    return (
      <form action={action} className="flex items-center gap-2">
        <span className="text-xs text-fg-muted">Delete:</span>
        <button type="submit" name="scope" value="ONE" className="text-xs font-medium text-danger hover:underline">
          Just this one
        </button>
        <button
          type="submit"
          name="scope"
          value="FUTURE"
          className="text-xs font-medium text-danger hover:underline"
        >
          This and future
        </button>
        <button
          type="button"
          onClick={() => setChoosingScope(false)}
          className="text-xs font-medium text-fg-subtle hover:underline"
        >
          Cancel
        </button>
      </form>
    );
  }

  return (
    <form
      action={action}
      onSubmit={(e) => {
        if (isRecurring) {
          e.preventDefault();
          setChoosingScope(true);
          return;
        }
        if (!confirm("Delete this transaction?")) {
          e.preventDefault();
        }
      }}
    >
      <button type="submit" className="text-sm font-medium text-danger hover:underline">
        Delete
      </button>
    </form>
  );
}
