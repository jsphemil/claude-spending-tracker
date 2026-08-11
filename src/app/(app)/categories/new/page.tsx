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
    <div className="mx-auto w-full max-w-2xl p-6 lg:p-10">
      <h1 className="text-xl font-semibold tracking-tight text-fg">New Category</h1>
      <div className="mt-6 rounded-2xl border border-border bg-surface p-5 shadow-sm">
        <CategoryForm action={createCategory} submitLabel="Create category" defaultValues={{ type }} />
      </div>
    </div>
  );
}
