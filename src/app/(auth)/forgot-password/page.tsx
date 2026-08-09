"use client";

import Link from "next/link";
import { useActionState } from "react";
import { requestPasswordReset, type AuthActionState } from "@/lib/actions/auth";

const initialState: AuthActionState = { error: null };

export default function ForgotPasswordPage() {
  const [state, formAction, pending] = useActionState(requestPasswordReset, initialState);

  return (
    <form action={formAction} className="space-y-4">
      <h2 className="text-lg font-medium text-zinc-900">Reset password</h2>
      <p className="text-sm text-zinc-600">
        Enter your email and we&apos;ll send you a link to reset your password.
      </p>

      <div className="space-y-1">
        <label htmlFor="email" className="text-sm font-medium text-zinc-700">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="email"
          className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-zinc-500 focus:outline-none"
        />
      </div>

      {state.error && <p className="text-sm text-red-600">{state.error}</p>}
      {state.message && <p className="text-sm text-emerald-700">{state.message}</p>}

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-md bg-zinc-900 px-3 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50"
      >
        {pending ? "Sending…" : "Send reset link"}
      </button>

      <div className="text-sm text-zinc-600">
        <Link href="/login" className="hover:underline">
          Back to log in
        </Link>
      </div>
    </form>
  );
}
