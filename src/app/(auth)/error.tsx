"use client";

export default function AuthError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center p-6 text-center">
      <p className="text-3xl">⚠️</p>
      <h1 className="mt-3 text-lg font-semibold text-fg">Something went wrong</h1>
      <p className="mt-1 max-w-sm text-sm text-fg-muted">Please try again.</p>
      <button
        type="button"
        onClick={reset}
        className="mt-5 rounded-md bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-strong"
      >
        Try again
      </button>
    </div>
  );
}
