"use client";

import { deleteCategory } from "@/lib/actions/categories";

export function DeleteCategoryButton({
  categoryId,
  type,
}: {
  categoryId: string;
  type: string;
}) {
  return (
    <form
      action={deleteCategory.bind(null, categoryId, type)}
      onSubmit={(e) => {
        if (!confirm("Delete this category?")) {
          e.preventDefault();
        }
      }}
    >
      <button
        type="submit"
        className="text-sm font-medium text-red-600 hover:underline"
      >
        Delete
      </button>
    </form>
  );
}
