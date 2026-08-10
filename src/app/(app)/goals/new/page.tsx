import { redirect } from "next/navigation";
import { getVerifiedUserId } from "@/lib/supabase/server";
import { GoalForm } from "@/components/goals/GoalForm";
import { createGoal } from "@/lib/actions/goals";

export default async function NewGoalPage() {
  const userId = await getVerifiedUserId();
  if (!userId) redirect("/login");

  return (
    <div className="p-6">
      <h1 className="text-xl font-semibold text-fg">New Goal</h1>
      <div className="mt-6">
        <GoalForm action={createGoal} submitLabel="Create goal" />
      </div>
    </div>
  );
}
