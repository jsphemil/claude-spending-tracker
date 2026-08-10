"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/db/prisma";
import { getVerifiedUserId } from "@/lib/supabase/server";
import { parseGoalFormData } from "@/lib/validation/goal";

export type GoalActionState = { error: string | null };

export async function createGoal(
  _prevState: GoalActionState,
  formData: FormData
): Promise<GoalActionState> {
  const userId = await getVerifiedUserId();
  if (!userId) redirect("/login");

  const parsed = parseGoalFormData(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  await prisma.goal.create({
    data: {
      userId,
      name: parsed.data.name,
      targetAmount: parsed.data.targetAmount,
      targetDate: parsed.data.targetDate ?? null,
    },
  });

  redirect("/goals");
}

export async function updateGoal(
  goalId: string,
  _prevState: GoalActionState,
  formData: FormData
): Promise<GoalActionState> {
  const userId = await getVerifiedUserId();
  if (!userId) redirect("/login");

  const parsed = parseGoalFormData(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const result = await prisma.goal.updateMany({
    where: { id: goalId, userId },
    data: {
      name: parsed.data.name,
      targetAmount: parsed.data.targetAmount,
      targetDate: parsed.data.targetDate ?? null,
    },
  });

  if (result.count === 0) {
    return { error: "Goal not found" };
  }

  redirect("/goals");
}

export async function deleteGoal(goalId: string, _formData: FormData) {
  const userId = await getVerifiedUserId();
  if (!userId) redirect("/login");

  await prisma.goal.deleteMany({ where: { id: goalId, userId } });

  redirect("/goals");
}
