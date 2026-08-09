import { z } from "zod";
import { CATEGORY_TYPES } from "@/lib/constants/categories";

export const categorySchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(100),
  type: z.enum(CATEGORY_TYPES),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/, "Must be a hex color"),
  icon: z.string().min(1).max(8),
});

export type CategoryInput = z.infer<typeof categorySchema>;

export function parseCategoryFormData(formData: FormData) {
  return categorySchema.safeParse({
    name: formData.get("name"),
    type: formData.get("type"),
    color: formData.get("color"),
    icon: formData.get("icon"),
  });
}
