"use client";

import { deleteGoal } from "@/lib/actions/goals";

export function DeleteGoalButton({ goalId }: { goalId: string }) {
  return (
    <form
      action={deleteGoal.bind(null, goalId)}
      onSubmit={(e) => {
        if (!confirm("Delete this goal?")) {
          e.preventDefault();
        }
      }}
    >
      <button type="submit" className="text-xs font-medium text-red-600 hover:underline">
        Delete
      </button>
    </form>
  );
}
