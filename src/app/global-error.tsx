"use client";

// Catches errors in the root layout itself (outside every other error
// boundary), so it must render its own <html>/<body> — this is the last
// line of defense if something above (app)/error.tsx breaks.
export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="en">
      <body className="flex min-h-screen flex-col items-center justify-center bg-surface-2 p-6 text-center text-fg">
        <p className="text-3xl">⚠️</p>
        <h1 className="mt-3 text-lg font-semibold">Something went wrong</h1>
        <p className="mt-1 max-w-sm text-sm text-fg-muted">
          The app hit an unexpected error. Please try again.
        </p>
        <button
          type="button"
          onClick={reset}
          className="mt-5 rounded-md bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-strong"
        >
          Try again
        </button>
      </body>
    </html>
  );
}
