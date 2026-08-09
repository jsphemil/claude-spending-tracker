"use client";

import { startTransition, useActionState, useEffect, useRef } from "react";
import { CATEGORY_ICONS, DEFAULT_CATEGORY_COLOR } from "@/lib/constants/categories";
import { createCategoryInline, type InlineCategoryState } from "@/lib/actions/categories";

const initialState: InlineCategoryState = { error: null, category: null };

// Quick-add panel embedded in the transaction form so a missing category
// doesn't force a detour to /categories/new — creates and selects it inline.
// Deliberately not a nested <form>: it lives inside TransactionForm's own
// <form>, and HTML forbids a <form> inside a <form>. useActionState's
// dispatcher can be invoked directly with a manually-built FormData instead.
export function InlineCategoryCreate({
  type,
  onCreated,
  onCancel,
}: {
  type: "INCOME" | "EXPENSE";
  onCreated: (category: { id: string; name: string; icon: string; type: "INCOME" | "EXPENSE" }) => void;
  onCancel: () => void;
}) {
  const [state, dispatch, pending] = useActionState(createCategoryInline, initialState);
  const nameRef = useRef<HTMLInputElement>(null);
  const iconRef = useRef<HTMLSelectElement>(null);

  useEffect(() => {
    if (state.category) onCreated(state.category);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.category]);

  function handleAdd() {
    const formData = new FormData();
    formData.set("name", nameRef.current?.value ?? "");
    formData.set("type", type);
    formData.set("color", DEFAULT_CATEGORY_COLOR);
    formData.set("icon", iconRef.current?.value ?? CATEGORY_ICONS[0]);
    startTransition(() => {
      dispatch(formData);
    });
  }

  return (
    <div className="mt-2 space-y-2 rounded-md border border-zinc-200 bg-zinc-50 p-3">
      <div className="flex gap-2">
        <select
          ref={iconRef}
          defaultValue={CATEGORY_ICONS[0]}
          className="rounded-md border border-zinc-300 px-2 py-1.5 text-sm focus:border-zinc-500 focus:outline-none"
        >
          {CATEGORY_ICONS.map((icon) => (
            <option key={icon} value={icon}>
              {icon}
            </option>
          ))}
        </select>
        <input
          ref={nameRef}
          required
          autoFocus
          placeholder="Category name"
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              handleAdd();
            }
          }}
          className="w-full rounded-md border border-zinc-300 px-3 py-1.5 text-sm focus:border-zinc-500 focus:outline-none"
        />
      </div>
      {state.error && <p className="text-xs text-red-600">{state.error}</p>}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={handleAdd}
          disabled={pending}
          className="rounded-md bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-zinc-800 disabled:opacity-50"
        >
          {pending ? "Adding…" : "Add category"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="text-xs font-medium text-zinc-500 hover:underline"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
