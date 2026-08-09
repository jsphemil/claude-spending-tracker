"use client";

import { useActionState } from "react";
import { deleteAccount, type AccountActionState } from "@/lib/actions/accounts";

const initialState: AccountActionState = { error: null };

export function DeleteAccountButton({ accountId }: { accountId: string }) {
  const [state, formAction, pending] = useActionState(
    deleteAccount.bind(null, accountId),
    initialState
  );

  return (
    <div>
      <form
        action={formAction}
        onSubmit={(e) => {
          if (!confirm("Delete this account? This cannot be undone.")) {
            e.preventDefault();
          }
        }}
      >
        <button
          type="submit"
          disabled={pending}
          className="rounded-md border border-red-300 px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-50 disabled:opacity-50"
        >
          Delete
        </button>
      </form>
      {state.error && <p className="mt-2 text-sm text-red-600">{state.error}</p>}
    </div>
  );
}
