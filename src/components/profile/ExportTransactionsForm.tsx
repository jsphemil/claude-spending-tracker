"use client";

type AccountOption = { id: string; name: string; icon: string };

export function ExportTransactionsForm({ accounts }: { accounts: AccountOption[] }) {
  const today = new Date().toISOString().slice(0, 10);
  const startOfYear = `${new Date().getUTCFullYear()}-01-01`;

  return (
    <form action="/api/export/transactions" method="GET" className="space-y-3">
      <div className="space-y-1">
        <p className="text-sm font-medium text-zinc-700">Accounts</p>
        <div className="space-y-1 rounded-md border border-zinc-200 p-2">
          {accounts.length === 0 ? (
            <p className="text-sm text-zinc-500">No accounts yet.</p>
          ) : (
            accounts.map((a) => (
              <label key={a.id} className="flex items-center gap-2 text-sm text-zinc-700">
                <input
                  type="checkbox"
                  name="accountIds"
                  value={a.id}
                  className="h-4 w-4 rounded border-zinc-300"
                />
                {a.icon} {a.name}
              </label>
            ))
          )}
        </div>
        <p className="text-xs text-zinc-400">Leave all unchecked to export every account.</p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <label htmlFor="export-from" className="text-sm font-medium text-zinc-700">
            From
          </label>
          <input
            id="export-from"
            name="from"
            type="date"
            defaultValue={startOfYear}
            className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-zinc-500 focus:outline-none"
          />
        </div>
        <div className="space-y-1">
          <label htmlFor="export-to" className="text-sm font-medium text-zinc-700">
            To
          </label>
          <input
            id="export-to"
            name="to"
            type="date"
            defaultValue={today}
            className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-zinc-500 focus:outline-none"
          />
        </div>
      </div>

      <button
        type="submit"
        className="rounded-md bg-zinc-900 px-3 py-2 text-sm font-medium text-white hover:bg-zinc-800"
      >
        Export as CSV
      </button>
      <p className="text-xs text-zinc-400">
        Opens directly in Excel, Sheets, or Numbers — no separate .xlsx format needed.
      </p>
    </form>
  );
}
