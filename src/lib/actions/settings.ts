"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/db/prisma";
import { getVerifiedUserId } from "@/lib/supabase/server";

export async function updateGlobalSettings(formData: FormData) {
  const userId = await getVerifiedUserId();
  if (!userId) redirect("/login");

  await prisma.profile.update({
    where: { id: userId },
    data: {
      budgetModeGlobal: formData.get("budgetModeGlobal") === "on",
      showFutureTransactionsGlobal: formData.get("showFutureTransactionsGlobal") === "on",
    },
  });

  redirect("/settings");
}
