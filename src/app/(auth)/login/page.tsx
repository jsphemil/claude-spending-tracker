"use client";

import Link from "next/link";
import { Suspense, useActionState } from "react";
import { useSearchParams } from "next/navigation";
import { login, type AuthActionState } from "@/lib/actions/auth";

const initialState: AuthActionState = { error: null };

function LinkError() {
  const searchParams = useSearchParams();
  const error = searchParams.get("error");
  if (!error) return null;
  return <p className="text-sm text-danger">{error}</p>;
}

export default function LoginPage() {
  const [state, formAction, pending] = useActionState(login, initialState);

  return (
    <form action={formAction} className="space-y-4">
      <h2 className="text-lg font-medium text-fg">Log in</h2>

      <Suspense fallback={null}>
        <LinkError />
      </Suspense>

      <div className="space-y-1">
        <label htmlFor="email" className="text-sm font-medium text-fg">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="email"
          className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-fg focus:border-accent focus:outline-none"
        />
      </div>

      <div className="space-y-1">
        <label htmlFor="password" className="text-sm font-medium text-fg">
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          required
          autoComplete="current-password"
          className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-fg focus:border-accent focus:outline-none"
        />
      </div>

      {state.error && <p className="text-sm text-danger">{state.error}</p>}

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-md bg-accent px-3 py-2 text-sm font-medium text-white hover:bg-accent-strong disabled:opacity-50"
      >
        {pending ? "Logging in…" : "Log in"}
      </button>

      <div className="flex justify-between text-sm text-fg-muted">
        <Link href="/signup" className="hover:underline">
          Create account
        </Link>
        <Link href="/forgot-password" className="hover:underline">
          Forgot password?
        </Link>
      </div>
    </form>
  );
}
