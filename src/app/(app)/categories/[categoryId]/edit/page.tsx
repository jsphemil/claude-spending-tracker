import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/db/prisma";
import { getVerifiedUserId } from "@/lib/supabase/server";
import { CategoryForm } from "@/components/categories/CategoryForm";
import { updateCategory } from "@/lib/actions/categories";

export default async function EditCategoryPage({
  params,
}: {
  params: Promise<{ categoryId: string }>;
}) {
  const userId = await getVerifiedUserId();
  if (!userId) redirect("/login");

  const { categoryId } = await params;
  const category = await prisma.category.findFirst({
    where: { id: categoryId, userId },
  });
  if (!category) notFound();

  return (
    <div className="mx-auto w-full max-w-2xl p-6 lg:p-10">
      <h1 className="text-xl font-semibold tracking-tight text-fg">Edit {category.name}</h1>
      <div className="mt-6 rounded-2xl border border-border bg-surface p-5 shadow-sm">
        <CategoryForm
          action={updateCategory.bind(null, category.id)}
          submitLabel="Save changes"
          lockType
          defaultValues={{
            name: category.name,
            type: category.type,
            color: category.color,
            icon: category.icon,
            monthlyBudget: category.monthlyBudget ? category.monthlyBudget.toString() : "",
          }}
        />
      </div>
    </div>
  );
}
