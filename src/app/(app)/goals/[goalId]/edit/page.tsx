import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/db/prisma";
import { getVerifiedUserId } from "@/lib/supabase/server";
import { GoalForm } from "@/components/goals/GoalForm";
import { updateGoal } from "@/lib/actions/goals";

export default async function EditGoalPage({
  params,
}: {
  params: Promise<{ goalId: string }>;
}) {
  const userId = await getVerifiedUserId();
  if (!userId) redirect("/login");

  const { goalId } = await params;
  const goal = await prisma.goal.findFirst({ where: { id: goalId, userId } });
  if (!goal) notFound();

  return (
    <div className="p-6">
      <h1 className="text-xl font-semibold text-zinc-900">Edit Goal</h1>
      <div className="mt-6">
        <GoalForm
          action={updateGoal.bind(null, goal.id)}
          submitLabel="Save changes"
          defaultValues={{
            name: goal.name,
            targetAmount: goal.targetAmount.toString(),
            targetDate: goal.targetDate ? goal.targetDate.toISOString().slice(0, 10) : "",
          }}
        />
      </div>
    </div>
  );
}
