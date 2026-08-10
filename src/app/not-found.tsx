import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-6 text-center">
      <p className="text-3xl">🔍</p>
      <h1 className="mt-3 text-lg font-semibold text-fg">Page not found</h1>
      <p className="mt-1 max-w-sm text-sm text-fg-muted">
        The page you&apos;re looking for doesn&apos;t exist or may have moved.
      </p>
      <Link
        href="/"
        className="mt-5 rounded-md bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-strong"
      >
        Go to Dashboard
      </Link>
    </div>
  );
}
