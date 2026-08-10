// Mirrors the backend's pkg/money supportedCurrencies list - every currency the backend knows how
// to format and calculate with.
export const SUPPORTED_CURRENCIES = [
  "AUD", "CAD", "CHF", "CNY", "EUR", "GBP", "HKD", "IDR", "INR",
  "JPY", "KRW", "MYR", "NZD", "PHP", "SGD", "THB", "USD", "VND",
] as const
