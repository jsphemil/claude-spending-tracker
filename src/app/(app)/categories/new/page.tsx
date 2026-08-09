import { CategoryForm } from "@/components/categories/CategoryForm";
import { createCategory } from "@/lib/actions/categories";

export default async function NewCategoryPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string }>;
}) {
  const { type: rawType } = await searchParams;
  const type = rawType === "INCOME" ? "INCOME" : "EXPENSE";

  return (
    <div className="p-6">
      <h1 className="text-xl font-semibold text-zinc-900">New Category</h1>
      <div className="mt-6">
        <CategoryForm action={createCategory} submitLabel="Create category" defaultValues={{ type }} />
      </div>
    </div>
  );
}
