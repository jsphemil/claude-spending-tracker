-- Opening balance becomes a real Transaction row (see lib/actions/accounts.ts
-- syncOpeningBalanceTransaction) instead of a value special-cased on every
-- page that computes income/expense. This flag marks that system-generated
-- row so it can be displayed distinctly and excluded from normal edit/delete.
ALTER TABLE "Transaction" ADD COLUMN "isOpeningBalance" BOOLEAN NOT NULL DEFAULT false;
