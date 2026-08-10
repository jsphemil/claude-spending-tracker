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

// Matches exactly what Phase 8's planned FX provider (Frankfurter, ECB
// reference rates) supports — picking a currency here must guarantee it can
// later be converted, so this list can't drift from the converter's own
// supported set. AED (UAE Dirham) isn't an ECB reference currency, so it's
// not offered even though earlier drafts of this list included it.
export const CURRENCIES = [
  { code: "AUD", name: "Australian Dollar" },
  { code: "BGN", name: "Bulgarian Lev" },
  { code: "BRL", name: "Brazilian Real" },
  { code: "CAD", name: "Canadian Dollar" },
  { code: "CHF", name: "Swiss Franc" },
  { code: "CNY", name: "Chinese Yuan" },
  { code: "CZK", name: "Czech Koruna" },
  { code: "DKK", name: "Danish Krone" },
  { code: "EUR", name: "Euro" },
  { code: "GBP", name: "British Pound" },
  { code: "HKD", name: "Hong Kong Dollar" },
  { code: "HUF", name: "Hungarian Forint" },
  { code: "IDR", name: "Indonesian Rupiah" },
  { code: "ILS", name: "Israeli Shekel" },
  { code: "INR", name: "Indian Rupee" },
  { code: "ISK", name: "Icelandic Krona" },
  { code: "JPY", name: "Japanese Yen" },
  { code: "KRW", name: "South Korean Won" },
  { code: "MXN", name: "Mexican Peso" },
  { code: "MYR", name: "Malaysian Ringgit" },
  { code: "NOK", name: "Norwegian Krone" },
  { code: "NZD", name: "New Zealand Dollar" },
  { code: "PHP", name: "Philippine Peso" },
  { code: "PLN", name: "Polish Zloty" },
  { code: "RON", name: "Romanian Leu" },
  { code: "SEK", name: "Swedish Krona" },
  { code: "SGD", name: "Singapore Dollar" },
  { code: "THB", name: "Thai Baht" },
  { code: "TRY", name: "Turkish Lira" },
  { code: "USD", name: "US Dollar" },
  { code: "ZAR", name: "South African Rand" },
] as const;

export const DEFAULT_ACCOUNT_COLOR = "#3b82f6";
