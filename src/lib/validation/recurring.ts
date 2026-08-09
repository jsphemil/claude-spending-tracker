import { z } from "zod";

export const RECURRENCE_UNITS = ["DAY", "WEEK", "MONTH", "YEAR"] as const;

export const recurringScheduleSchema = z.object({
  intervalCount: z.coerce.number().int().positive("Must be at least 1"),
  intervalUnit: z.enum(RECURRENCE_UNITS),
  endDate: z.coerce.date().optional(),
});

export type RecurringScheduleInput = z.infer<typeof recurringScheduleSchema>;

export function parseRecurringScheduleFormData(formData: FormData) {
  const endDateRaw = formData.get("endDate");
  return recurringScheduleSchema.safeParse({
    intervalCount: formData.get("intervalCount"),
    intervalUnit: formData.get("intervalUnit"),
    endDate: endDateRaw ? endDateRaw : undefined,
  });
}
