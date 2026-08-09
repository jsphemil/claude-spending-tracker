"use server";

import { redirect } from "next/navigation";
import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/db/prisma";
import { getVerifiedUserId } from "@/lib/supabase/server";
import { parseCategoryFormData } from "@/lib/validation/category";

export type CategoryActionState = { error: string | null };

export type InlineCategoryState = {
  error: string | null;
  category: { id: string; name: string; icon: string; type: "INCOME" | "EXPENSE" } | null;
};

const DUPLICATE_ERROR = "You already have a category with that name and type.";

export async function createCategory(
  _prevState: CategoryActionState,
  formData: FormData
): Promise<CategoryActionState> {
  const userId = await getVerifiedUserId();
  if (!userId) redirect("/login");

  const parsed = parseCategoryFormData(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  try {
    await prisma.category.create({ data: { ...parsed.data, userId } });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return { error: DUPLICATE_ERROR };
    }
    throw e;
  }

  redirect(`/categories?type=${parsed.data.type}`);
}

// Used by the transaction form's inline "+ Add category" quick-add — returns
// the created category instead of redirecting, so the caller can select it
// without leaving the transaction entry flow.
export async function createCategoryInline(
  _prevState: InlineCategoryState,
  formData: FormData
): Promise<InlineCategoryState> {
  const userId = await getVerifiedUserId();
  if (!userId) redirect("/login");

  const parsed = parseCategoryFormData(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input", category: null };
  }

  try {
    const created = await prisma.category.create({ data: { ...parsed.data, userId } });
    return {
      error: null,
      category: { id: created.id, name: created.name, icon: created.icon, type: created.type },
    };
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return { error: DUPLICATE_ERROR, category: null };
    }
    throw e;
  }
}

export async function updateCategory(
  categoryId: string,
  _prevState: CategoryActionState,
  formData: FormData
): Promise<CategoryActionState> {
  const userId = await getVerifiedUserId();
  if (!userId) redirect("/login");

  const parsed = parseCategoryFormData(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  try {
    const result = await prisma.category.updateMany({
      where: { id: categoryId, userId },
      data: parsed.data,
    });
    if (result.count === 0) {
      return { error: "Category not found" };
    }
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return { error: DUPLICATE_ERROR };
    }
    throw e;
  }

  redirect(`/categories?type=${parsed.data.type}`);
}

export async function deleteCategory(categoryId: string, type: string) {
  const userId = await getVerifiedUserId();
  if (!userId) redirect("/login");

  await prisma.category.deleteMany({ where: { id: categoryId, userId } });

  redirect(`/categories?type=${type}`);
}
