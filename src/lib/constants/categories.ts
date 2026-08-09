export const CATEGORY_TYPES = ["EXPENSE", "INCOME"] as const;

export const CATEGORY_TYPE_LABELS: Record<(typeof CATEGORY_TYPES)[number], string> = {
  EXPENSE: "Expense",
  INCOME: "Income",
};

export const CATEGORY_ICONS = [
  "🛍️",
  "🍽️",
  "✈️",
  "🏠",
  "🛒",
  "💡",
  "🎬",
  "💊",
  "💼",
  "🏢",
  "🎁",
  "📈",
  "🚗",
  "📚",
  "👕",
  "🐾",
  "🎓",
  "🔧",
  "📱",
  "❓",
] as const;

export const DEFAULT_CATEGORY_COLOR = "#3b82f6";
