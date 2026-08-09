import { z } from "zod";

const baseFields = {
  amount: z.coerce.number().positive("Amount must be greater than 0"),
  date: z.coerce.date(),
  description: z
    .string()
    .trim()
    .max(500)
    .optional()
    .transform((v) => (v ? v : undefined)),
};

export const transactionSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("INCOME"),
    ...baseFields,
    accountId: z.string().min(1, "Account is required"),
    categoryId: z.string().min(1, "Category is required"),
  }),
  z.object({
    type: z.literal("EXPENSE"),
    ...baseFields,
    accountId: z.string().min(1, "Account is required"),
    categoryId: z.string().min(1, "Category is required"),
  }),
  z
    .object({
      type: z.literal("TRANSFER"),
      ...baseFields,
      fromAccountId: z.string().min(1, "From account is required"),
      toAccountId: z.string().min(1, "To account is required"),
    })
    .refine((data) => data.fromAccountId !== data.toAccountId, {
      message: "From and to accounts must be different",
      path: ["toAccountId"],
    }),
]);

export type TransactionInput = z.infer<typeof transactionSchema>;

export function parseTransactionFormData(formData: FormData) {
  const type = formData.get("type");
  const common = {
    type,
    amount: formData.get("amount"),
    date: formData.get("date"),
    description: formData.get("description") || undefined,
  };

  if (type === "TRANSFER") {
    return transactionSchema.safeParse({
      ...common,
      fromAccountId: formData.get("fromAccountId"),
      toAccountId: formData.get("toAccountId"),
    });
  }

  return transactionSchema.safeParse({
    ...common,
    accountId: formData.get("accountId"),
    categoryId: formData.get("categoryId"),
  });
}
