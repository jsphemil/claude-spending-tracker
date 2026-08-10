import { z } from "zod";
import { ACCOUNT_TYPES } from "@/lib/constants/accounts";

// "" = inherit the Profile-level global setting, "true"/"false" = override
// for this account — see lib/services/settings.ts's resolveAccountSettings.
const tristateOverride = z
  .enum(["", "true", "false"])
  .optional()
  .transform((v) => (!v ? null : v === "true"));

export const accountSchema = z
  .object({
    name: z.string().trim().min(1, "Name is required").max(100),
    type: z.enum(ACCOUNT_TYPES),
    color: z
      .string()
      .regex(/^#[0-9a-fA-F]{6}$/, "Must be a hex color"),
    icon: z.string().min(1).max(8),
    currency: z
      .string()
      .trim()
      .length(3, "Use a 3-letter currency code")
      .transform((v) => v.toUpperCase()),
    openingBalance: z.coerce.number().finite(),
    openingBalanceDate: z.coerce.date(),
    creditLimit: z.union([z.coerce.number().positive(), z.literal(""), z.undefined()]),
    budgetModeEnabled: tristateOverride,
    monthlyBudget: z.union([z.coerce.number().positive(), z.literal(""), z.undefined()]),
    showFutureTransactions: tristateOverride,
  })
  .transform((data) => ({
    ...data,
    creditLimit:
      typeof data.creditLimit === "number" && data.type === "CREDIT_CARD"
        ? data.creditLimit
        : null,
    monthlyBudget: typeof data.monthlyBudget === "number" ? data.monthlyBudget : null,
  }));

export type AccountInput = z.infer<typeof accountSchema>;

export function parseAccountFormData(formData: FormData) {
  return accountSchema.safeParse({
    name: formData.get("name"),
    type: formData.get("type"),
    color: formData.get("color"),
    icon: formData.get("icon"),
    currency: formData.get("currency"),
    openingBalance: formData.get("openingBalance"),
    openingBalanceDate: formData.get("openingBalanceDate"),
    creditLimit: formData.get("creditLimit") || undefined,
    budgetModeEnabled: formData.get("budgetModeEnabled") || undefined,
    monthlyBudget: formData.get("monthlyBudget") || undefined,
    showFutureTransactions: formData.get("showFutureTransactions") || undefined,
  });
}
