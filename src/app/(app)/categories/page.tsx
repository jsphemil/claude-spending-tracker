import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db/prisma";
import { getVerifiedUserId } from "@/lib/supabase/server";
import { CATEGORY_TYPES, CATEGORY_TYPE_LABELS } from "@/lib/constants/categories";
import { DeleteCategoryButton } from "@/components/categories/DeleteCategoryButton";

export default async function CategoriesPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string }>;
}) {
  const userId = await getVerifiedUserId();
  if (!userId) redirect("/login");

  const { type: rawType } = await searchParams;
  const type = rawType === "INCOME" ? "INCOME" : "EXPENSE";

  const categories = await prisma.category.findMany({
    where: { userId, type },
    orderBy: { name: "asc" },
  });

  return (
    <div className="p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-zinc-900">Categories</h1>
        <Link
          href={`/categories/new?type=${type}`}
          className="rounded-md bg-zinc-900 px-3 py-2 text-sm font-medium text-white hover:bg-zinc-800"
        >
          + New Category
        </Link>
      </div>

      <div className="mt-4 flex gap-1 border-b border-zinc-200">
        {CATEGORY_TYPES.map((t) => (
          <Link
            key={t}
            href={`/categories?type=${t}`}
            className={`border-b-2 px-3 py-2 text-sm font-medium ${
              type === t
                ? "border-zinc-900 text-zinc-900"
                : "border-transparent text-zinc-500 hover:text-zinc-700"
            }`}
          >
            {CATEGORY_TYPE_LABELS[t]}
          </Link>
        ))}
      </div>

      {categories.length === 0 ? (
        <p className="mt-6 text-sm text-zinc-600">
          No {CATEGORY_TYPE_LABELS[type].toLowerCase()} categories yet.
        </p>
      ) : (
        <ul className="mt-4 space-y-2">
          {categories.map((category) => (
            <li
              key={category.id}
              className="flex items-center justify-between rounded-lg border border-zinc-200 bg-white px-4 py-3"
            >
              <div className="flex items-center gap-3">
                <span
                  className="flex h-9 w-9 items-center justify-center rounded-full text-lg"
                  style={{ backgroundColor: category.color + "20" }}
                >
                  {category.icon}
                </span>
                <p className="text-sm font-medium text-zinc-900">{category.name}</p>
              </div>
              <div className="flex items-center gap-4">
                <Link
                  href={`/categories/${category.id}/edit`}
                  className="text-sm font-medium text-zinc-700 hover:underline"
                >
                  Edit
                </Link>
                <DeleteCategoryButton categoryId={category.id} type={type} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
