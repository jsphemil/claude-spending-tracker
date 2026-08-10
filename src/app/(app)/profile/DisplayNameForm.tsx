"use client";

import { useActionState } from "react";
import { updateDisplayName, type ProfileActionState } from "@/lib/actions/profile";

const initialState: ProfileActionState = { error: null };

export function DisplayNameForm({ defaultValue }: { defaultValue: string }) {
  const [state, formAction, pending] = useActionState(updateDisplayName, initialState);

  return (
    <form action={formAction} className="space-y-2">
      <label htmlFor="displayName" className="text-sm font-medium text-zinc-700">
        Name
      </label>
      <div className="flex items-center gap-2">
        <input
          id="displayName"
          name="displayName"
          maxLength={100}
          defaultValue={defaultValue}
          placeholder="Your name"
          className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-zinc-500 focus:outline-none"
        />
        <button
          type="submit"
          disabled={pending}
          className="shrink-0 rounded-md bg-zinc-900 px-3 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50"
        >
          {pending ? "Saving…" : "Save"}
        </button>
      </div>
      {state.error && <p className="text-sm text-red-600">{state.error}</p>}
    </form>
  );
}
