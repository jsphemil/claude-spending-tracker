import { createBrowserClient } from "@supabase/ssr";

// Auth flows only (signInWithPassword, signUp, signOut, resetPasswordForEmail).
// Never used for data queries — those go through Server Actions backed by Prisma.
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
