import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { logout } from "@/lib/actions/auth";
import { ChangePasswordForm } from "./ChangePasswordForm";

export default async function ProfilePage() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const email = data?.claims.email as string | undefined;

  return (
    <div className="max-w-md space-y-8 p-6">
      <div>
        <h1 className="text-xl font-semibold text-zinc-900">Profile</h1>
        <p className="mt-2 text-sm text-zinc-600">{email}</p>
      </div>

      <Link
        href="/settings"
        className="block rounded-md border border-zinc-200 px-3 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-100"
      >
        Budget Mode and Show Future Transactions settings →
      </Link>

      <ChangePasswordForm />

      <form action={logout}>
        <button
          type="submit"
          className="rounded-md border border-zinc-300 px-3 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-100"
        >
          Sign out
        </button>
      </form>
    </div>
  );
}
