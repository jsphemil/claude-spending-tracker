import { z } from "zod";

export const goalSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(100),
  targetAmount: z.coerce.number().positive("Target must be greater than 0"),
  targetDate: z.coerce.date().optional(),
});

export type GoalInput = z.infer<typeof goalSchema>;

export function parseGoalFormData(formData: FormData) {
  return goalSchema.safeParse({
    name: formData.get("name"),
    targetAmount: formData.get("targetAmount"),
    targetDate: formData.get("targetDate") || undefined,
  });
}
