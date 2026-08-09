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
      <SideNav />
      <main className="flex-1 pb-16 md:pb-0">{children}</main>
      <BottomTabBar />
      <ClaudeFabPlaceholder />
    </div>
  );
}
