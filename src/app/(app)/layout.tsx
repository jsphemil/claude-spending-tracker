import { redirect } from "next/navigation";
import { getVerifiedUserId } from "@/lib/supabase/server";
import { SideNav, BottomTabBar } from "@/components/nav/NavShell";
import { ClaudeFabPlaceholder } from "@/components/nav/ClaudeFabPlaceholder";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  // Defense-in-depth alongside proxy.ts — every Server Action must also
  // re-verify the user itself (Prisma bypasses Supabase RLS, see build plan).
  const userId = await getVerifiedUserId();
  if (!userId) redirect("/login");

  return (
    <div className="flex min-h-screen flex-1">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:z-50 focus:rounded-md focus:bg-accent focus:px-3 focus:py-2 focus:text-sm focus:font-medium focus:text-white"
      >
        Skip to main content
      </a>
      <SideNav />
      <main id="main-content" className="flex-1 pb-16 md:pb-0">
        {children}
      </main>
      <BottomTabBar />
      <ClaudeFabPlaceholder />
    </div>
  );
}
