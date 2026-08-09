export const ACCOUNT_TYPES = [
  "SAVINGS",
  "INVESTMENT",
  "DEPOSIT",
  "WALLET",
  "CREDIT_CARD",
] as const;

export const ACCOUNT_TYPE_LABELS: Record<(typeof ACCOUNT_TYPES)[number], string> = {
  SAVINGS: "Savings",
  INVESTMENT: "Investment",
  DEPOSIT: "Deposit (FD/RD)",
  WALLET: "Wallet / Cash",
  CREDIT_CARD: "Credit Card",
};

export const ACCOUNT_ICONS = [
  "🏦",
  "💰",
  "💳",
  "📈",
  "🏧",
  "👛",
  "💵",
  "🪙",
  "🏠",
  "🚗",
] as const;

export const COMMON_CURRENCIES = [
  "INR",
  "USD",
  "EUR",
  "GBP",
  "AED",
  "JPY",
  "AUD",
  "CAD",
  "SGD",
] as const;

export const DEFAULT_ACCOUNT_COLOR = "#3b82f6";
