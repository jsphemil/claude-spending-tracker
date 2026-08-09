"use server";

import { redirect } from "next/navigation";
import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/db/prisma";
import { getVerifiedUserId } from "@/lib/supabase/server";
import { parseCategoryFormData } from "@/lib/validation/category";

export type CategoryActionState = { error: string | null };

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
