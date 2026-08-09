"use client";

import { deleteAccount } from "@/lib/actions/accounts";

export function DeleteAccountButton({ accountId }: { accountId: string }) {
  return (
    <form
      action={deleteAccount.bind(null, accountId)}
      onSubmit={(e) => {
        if (!confirm("Delete this account? This cannot be undone.")) {
          e.preventDefault();
        }
      }}
    >
      <button
        type="submit"
        className="rounded-md border border-red-300 px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-50"
      >
        Delete
      </button>
    </form>
  );
}
