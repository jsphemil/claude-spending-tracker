import { Skeleton } from "@/components/ui/Skeleton";

// Shown by Next.js while a route segment in this group is fetching data —
// every (app) page is an async Server Component with no client-side
// fallback otherwise, so without this the screen just freezes on
// navigation. Shape is a generic approximation (header + a few card rows),
// not per-page, since it only shows for a moment during data fetch.
export default function AppLoading() {
  return (
    <div className="max-w-md p-6" aria-live="polite" aria-busy="true">
      <span className="sr-only">Loading…</span>
      <Skeleton className="h-6 w-32" />
      <div className="mt-4 flex items-center justify-between">
        <Skeleton className="h-8 w-20" />
        <Skeleton className="h-5 w-28" />
        <Skeleton className="h-8 w-20" />
      </div>
      <Skeleton className="mt-6 h-48 w-full" />
      <div className="mt-6 space-y-2">
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-16 w-full" />
      </div>
    </div>
  );
}
