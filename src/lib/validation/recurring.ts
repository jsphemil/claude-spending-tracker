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

// Used on the "this and all future occurrences" edit path, where only the
// end date is editable (not the cadence) — a blank field means "repeat
// indefinitely," same convention as creation.
export function parseEndDateFormData(formData: FormData): { success: true; data: Date | null } | { success: false } {
  const raw = formData.get("endDate");
  if (!raw || typeof raw !== "string" || raw.trim() === "") return { success: true, data: null };
  const parsed = z.coerce.date().safeParse(raw);
  if (!parsed.success) return { success: false };
  return { success: true, data: parsed.data };
}
