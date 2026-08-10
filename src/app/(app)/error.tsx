"use client";

import { useEffect } from "react";
import Link from "next/link";

// Route-segment error boundary — catches render/data errors anywhere under
// the authenticated shell so one broken page shows a recoverable message
// instead of the whole app going blank. `reset` re-renders the segment
// (worth trying first since most failures here are transient: a flaky
// query, a stale cache), and Home is the escape hatch if it isn't.
export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center p-6 text-center">
      <p className="text-3xl">⚠️</p>
      <h1 className="mt-3 text-lg font-semibold text-zinc-900">Something went wrong</h1>
      <p className="mt-1 max-w-sm text-sm text-zinc-600">
        This page hit an unexpected error. You can try again, or head back to the dashboard.
      </p>
      <div className="mt-5 flex gap-2">
        <button
          type="button"
          onClick={reset}
          className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800"
        >
          Try again
        </button>
        <Link
          href="/"
          className="rounded-md border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-100"
        >
          Go to Dashboard
        </Link>
      </div>
    </div>
  );
}
