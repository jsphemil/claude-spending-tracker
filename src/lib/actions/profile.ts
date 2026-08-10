"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/db/prisma";
import { getVerifiedUserId } from "@/lib/supabase/server";

export type ProfileActionState = { error: string | null };

export async function updateDisplayName(
  _prevState: ProfileActionState,
  formData: FormData
): Promise<ProfileActionState> {
  const userId = await getVerifiedUserId();
  if (!userId) redirect("/login");

  const name = String(formData.get("displayName") ?? "").trim();
  if (name.length > 100) {
    return { error: "Name is too long" };
  }

  await prisma.profile.update({
    where: { id: userId },
    data: { displayName: name || null },
  });

  redirect("/profile");
}
