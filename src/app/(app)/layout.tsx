import { redirect } from "next/navigation";
import { prisma } from "@/lib/db/prisma";
import { getVerifiedUserId } from "@/lib/supabase/server";
import { SideNav, BottomTabBar } from "@/components/nav/NavShell";
import { ClaudeFabPlaceholder } from "@/components/nav/ClaudeFabPlaceholder";
import { QuickAddButton } from "@/components/transactions/QuickAddButton";
import { ThemeToggle } from "@/components/theme/ThemeToggle";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  // Defense-in-depth alongside proxy.ts — every Server Action must also
  // re-verify the user itself (Prisma bypasses Supabase RLS, see build plan).
  const userId = await getVerifiedUserId();
  if (!userId) redirect("/login");

  const [accounts, categories, tags] = await Promise.all([
    prisma.account.findMany({
      where: { userId },
      orderBy: { createdAt: "asc" },
      select: { id: true, name: true, icon: true, currency: true },
    }),
    prisma.category.findMany({
      where: { userId },
      orderBy: { name: "asc" },
      select: { id: true, name: true, icon: true, type: true },
    }),
    prisma.tag.findMany({ where: { userId }, orderBy: { name: "asc" }, select: { name: true } }),
  ]);

  return (
    <div className="flex h-[100dvh] overflow-hidden">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:z-50 focus:rounded-md focus:bg-accent focus:px-3 focus:py-2 focus:text-sm focus:font-medium focus:text-white"
      >
        Skip to main content
      </a>
      <SideNav />
      <main id="main-content" className="flex-1 overflow-y-auto pb-16 md:pb-0">
        {children}
      </main>
      <ThemeToggle className="fixed right-4 top-4 z-40 h-9 w-9 shadow-sm md:hidden" />
      <BottomTabBar />
      <QuickAddButton accounts={accounts} categories={categories} existingTagNames={tags.map((t) => t.name)} />
      <ClaudeFabPlaceholder />
    </div>
  );
}
