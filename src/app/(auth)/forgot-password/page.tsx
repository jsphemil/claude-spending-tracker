"use client";

import Link from "next/link";
import { useActionState } from "react";
import { requestPasswordReset, type AuthActionState } from "@/lib/actions/auth";

const initialState: AuthActionState = { error: null };

export default function ForgotPasswordPage() {
  const [state, formAction, pending] = useActionState(requestPasswordReset, initialState);

  return (
    <form action={formAction} className="space-y-4">
      <h2 className="text-lg font-medium text-fg">Reset password</h2>
      <p className="text-sm text-fg-muted">
        Enter your email and we&apos;ll send you a link to reset your password.
      </p>

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

      {state.error && <p className="text-sm text-danger">{state.error}</p>}
      {state.message && <p className="text-sm text-success">{state.message}</p>}

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-md bg-accent px-3 py-2 text-sm font-medium text-white hover:bg-accent-strong disabled:opacity-50"
      >
        {pending ? "Sending…" : "Send reset link"}
      </button>

      <div className="text-sm text-fg-muted">
        <Link href="/login" className="hover:underline">
          Back to log in
        </Link>
      </div>
    </form>
  );
}
