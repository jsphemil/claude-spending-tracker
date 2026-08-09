import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

// Always create a new client per request — never share across requests/renders.
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Called from a Server Component — cookies are refreshed by proxy.ts instead.
          }
        },
      },
    }
  );
}

/**
 * Verified user id for the current request, or null if unauthenticated.
 * Uses getClaims() (local JWT verification against the project's signing
 * keys) rather than getSession() (unverified cookie read) or getUser()
 * (always a network round-trip) — see @supabase/ssr auth-js docs.
 */
export async function getVerifiedUserId(): Promise<string | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();
  if (error || !data) return null;
  return data.claims.sub;
}
