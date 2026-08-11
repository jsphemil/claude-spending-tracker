import { redirect } from "next/navigation";
import { getVerifiedUserId } from "@/lib/supabase/server";
import { GoalForm } from "@/components/goals/GoalForm";
import { createGoal } from "@/lib/actions/goals";

export default async function NewGoalPage() {
  const userId = await getVerifiedUserId();
  if (!userId) redirect("/login");

  return (
    <div className="mx-auto w-full max-w-2xl p-6 lg:p-10">
      <h1 className="text-xl font-semibold tracking-tight text-fg">New Goal</h1>
      <div className="mt-6 rounded-2xl border border-border bg-surface p-5 shadow-sm">
        <GoalForm action={createGoal} submitLabel="Create goal" />
      </div>
    </div>
  );
}
