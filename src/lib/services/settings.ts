// Effective value everywhere = account override ?? profile global — the
// pattern spec 5.5/5.6 call for, resolved once here so every page reads it
// the same way instead of repeating the `??` at each call site.
export function resolveAccountSettings(
  profile: { budgetModeGlobal: boolean; showFutureTransactionsGlobal: boolean },
  account: { budgetModeEnabled: boolean | null; showFutureTransactions: boolean | null }
) {
  return {
    budgetModeEnabled: account.budgetModeEnabled ?? profile.budgetModeGlobal,
    showFutureTransactions: account.showFutureTransactions ?? profile.showFutureTransactionsGlobal,
  };
}
