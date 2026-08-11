# Expense Tracker App — Draft Spec (v1)

> This is a starting draft based on screenshots of an existing app, plus the choices made so far. Add, remove, or change anything below — this is meant to be edited before we start building.

## 1. What this app is

A personal finance app for tracking money across multiple accounts (bank accounts, credit cards, cash, savings, investments). Inspired by an existing app, but not a copy — features will change and grow over time.

## 2. Platform

- **v1 (built):** Web app — works well in a browser on both desktop and mobile (responsive design, not a desktop layout squeezed onto a small screen). See section 8 for what's actually live.
- **v2 (planned — not started, see section 10):** A real native Android (and later iOS) app, installable from the Play Store, wrapping the same core app via Capacitor rather than a separate rebuild.
  - **Critical v2 requirement:** the mobile app must be fully usable with no internet connection — not just tolerant of brief drops. Viewing balances, browsing transaction history, and adding/editing transactions all need to work offline, syncing to the cloud whenever a connection is available.
- End goal: reachable both by opening a website (any device's browser, cloud-backed, requires connectivity) and by opening an installed Android/iOS app (offline-capable, local-first).

## 3. Where data lives

- **v1 (built):** Data lives in the cloud (Supabase/Postgres) — the same whether you log in from your phone, laptop, or any other device. The web app saves directly to the cloud and requires an internet connection to save changes; there is no offline mode on web.
- **v2 (planned — not started, see section 10):**
  - **Native mobile app:** saves **locally first** (on-device database), then syncs to the cloud automatically whenever a connection is available. Transactions can be logged fully offline; they just wait to sync rather than failing to save. Conflict handling (the same account edited offline on two devices before either syncs) needs a concrete strategy before this is built — flagged as an open decision in section 10.2, not forgotten.
  - **Backup & restore:** a way to back up all app data and restore it — covering both "I lost my phone" and "I'm reinstalling the app" — independent of whether the cloud sync itself is working. See section 10.3.
  - **Third-party sync (Dropbox-style):** possibly using a service like Dropbox as a sync/backup destination the user controls themselves, as an alternative or supplement to our own cloud backend. Open question on scope — see section 10.4.

## 4. Logging in

- **Recommended for v1: Email + password.** Reason: it's the simplest to build first and doesn't need you to set up a Google or Apple developer account before we can even start. We can add "Sign in with Google/Apple" later as a convenience, without changing how the rest of the app works.

## 5. Core features for Version 1

Everything below is the "must-have" list. Anything not listed here (dark theme, Dropbox sync, passcode lock, recurring transactions, budgets, reminders, etc.) is intentionally left out of v1 and can be added in a later version.

### 5.1 Accounts

- Create, edit, delete accounts (e.g. "Cash", "HDFC Salary", "Credit Card")
- Each account has: a name, a type, a color or icon, and a running balance
- Supported account types: Savings, Investment, Deposit (FD/RD-style), Wallet/Cash, Credit Card — this list is final for v1
- **Credit Card accounts:** balance is naturally negative (expenses are logged first, the bill payment is the "income" that brings it back toward zero). Credit Card accounts have an optional **Credit Limit** field, which enables:
    - showing "available credit" (limit − amount owed)
    - a **visual usage bar** — fills up as expenses reduce the available credit, so utilization is visible at a glance rather than just as a number
    - this can later power a warning as you approach the limit
    - **Credit Card accounts use an entirely different ring, not the regular income-vs-expense one** — the fill shows % of the credit limit used (not % of income spent), and the center figure is the net amount currently owed (expenses minus any bill payments already made), not the period's raw expense total. Going over the credit limit triggers the same second warning lap as overspending does elsewhere
- When creating an account, you enter an **opening balance** as of the creation date — this becomes the starting point the account builds from
- Accounts can be in a **currency other than INR** (e.g. a Dirham cash account). The app converts the balance to INR using a live/real-time exchange rate for any total that mixes currencies
    - **Recommended source: the Frankfurter API** (`api.frankfurter.dev`) — free, open-source, no API key or signup required, no usage limits. Use the newer v2 endpoint specifically (sources from 84 central banks, 201 currencies, includes AED) rather than the older v1/ECB-only version, which only covers ~30 major currencies and would miss AED
- View a list of all accounts with their current balances
- **Tapping into an account** opens that account's own detail page, using the same balance-ring summary view as the Dashboard, scoped to just that account's income and expenses for the period (plus its own transaction list and the credit-limit line, if applicable)
- Every account view has 3 clear buttons: **Income**, **Expense**, **Transfer**

### 5.2 Transactions

**Every transaction captures:** amount, date, category, account, and an optional description.

**Three types of transactions:**

- **Income** — money coming in
- **Expense** — money going out
- **Transfer** — money moving between two of your own accounts
    - Has a "from account" and a "to account"
    - Shows up in the "from" account's ledger as an outgoing amount (negative)
    - Shows up in the "to" account's ledger as an incoming amount (positive)
    - Example: transferring ₹100 from Account A to Account B shows as −₹100 in A and +₹100 in B

**Recurring transactions:**

- Any transaction (income, expense, or transfer) can be set to repeat on a custom schedule
- **The "make recurring" option is visible right on the transaction entry screen itself** — a toggle alongside amount, category, account, date, etc. — not a separate setup step. It's available for all three types: Income, Expense, and Transfer entries
- **Schedule format:** "repeat every [N] [day / week / month / year]" — a number plus a unit dropdown, so it covers everything from "every 3 days" to "every 2 years" without needing separate preset options
- **Optional end date:** a recurring transaction can be given an end date (when it should stop repeating). This is optional — left blank, it repeats indefinitely until manually stopped or deleted
- Recurring transactions automatically appear in the ledger for every period they occur in, not just the day they were created

**Editing & deleting:**

- Editing or deleting any transaction — normal, transfer, or recurring — must correctly update every place it appears (the account balance, the ledger/transaction list, and the monthly summary)
- **Editing a recurring transaction always asks**: "just this one" or "this and all future occurrences" — every time, not a fixed default

**Viewing transactions:**

- View all transactions in a list, newest first
- Filter transactions by account, category, or date range
- **Summary band:** a two-color bar pinned above the list — green showing total income, red/pink showing total expenses — for whatever is currently being viewed (all accounts or one account, for the selected month). Updates instantly as the filter changes
- **Calendar view:** a calendar where you can add a transaction on a specific day, and each day shows that day's total expenses at a glance

### 5.3 Categories

- Separate lists for Expense categories and Income categories
- Create, edit, delete categories
- Each category has a name, an icon, **and a color** (chosen when the category is created — used for icons, chart segments, etc.)
- A starter set of common categories will be created automatically for new users (e.g. Shopping, Eating Out, Travel, Rent, Salary), which they can change

### 5.3a Tags

- A **separate, optional label** that can be added to any transaction (income, expense, or transfer) at entry time — alongside account, category, date, etc. A transaction keeps its normal account and category; the tag is additional, not a replacement for either
- **Purpose:** grouping transactions that span multiple accounts and multiple categories around a single occasion — the clearest example is a trip. A hotel booked on a credit card, a meal paid from one bank account, a cab paid from another, and money received back from friends splitting costs can all carry the same tag (e.g. "Dubai Trip 2026"), even though each transaction has its own separate account and category
- **Tags apply to income too** — money received (e.g. a friend paying back their share) can carry the same tag as the expenses it's offsetting
- **A tag has its own summary view**, same shape as an account or category summary: total tagged income, total tagged expense, and the net figure (e.g. "Net cost of trip: ₹8,850.00") — plus the full list of transactions carrying that tag, regardless of which account or category each one actually belongs to
- Tags are free-form (create a new one anytime while adding a transaction) and reusable beyond trips — the same mechanism works for things like "Wedding costs" or "Office reimbursements" without needing a separate feature for each
- **Why tags instead of a category-per-trip:** categories describe _what kind_ of spending something is (Food, Travel, Shopping); a trip is an _occasion_, not a kind of spending. Using categories for trips would either lose the real category on each transaction or clutter the category list (and skew the category pie chart) with a new entry per trip. Tags keep these as two separate, independent dimensions

### 5.4 Spending Summary

- Pick a month (or "all accounts" vs. a single account) and see:
    - Total income for the period
    - Total expenses for the period, broken down by category (largest first)
    - **Carry Forward** — the balance rolled in from the end of the previous period, shown as its own labeled line (not silently merged into income)
    - Ending balance for the period
- Switch between months using next/previous controls
- **Monthly pie chart:** one pie chart for income by category and one for expenses by category, for the selected month
- The **"All Accounts" total** always displays in INR, converting any foreign-currency accounts using the current exchange rate
- The **"All Accounts" total is a true net worth figure** — credit card balances (which are negative) are included and pull the total down, the same way a real net worth calculation would. Credit card debt is also broken out and shown as its own separate line, so it's visible at a glance rather than just buried in the total
- **Income/Expense shown as numbers, not just the ring:** every balance-ring view (Dashboard's all-accounts view, and each individual account's page) also shows the period's total Income and total Expense as plain figures alongside it — the ring gives the at-a-glance read, the numbers give the precise one
- **Foreign currency accounts** show both figures wherever an amount appears (balance, income, expense) — the native currency amount and its INR equivalent, e.g. "AED 500.00 · ≈ ₹11,310.00"
- **Number format:** Indian numbering system throughout (e.g. ₹1,53,168.00, not ₹153,168.00)

### 5.5 Budget Mode

- A toggle in **Settings**, available both **globally** (whole app) and **per account**
- **Budget limits are set per account, not per category.** When Budget Mode is turned on for an account, it asks for that account's **monthly budget amount**
- Once set, the app can compare actual spending on that account against its budget (e.g. in the account's own ring/summary view)

### 5.6 Show/Hide Future Transactions

- A toggle that controls whether transactions dated in the future show up in lists/summaries
- Can be set **globally** or **per account**, same pattern as Budget Mode

### 5.7 Smart Features (powered by Claude)

- **Add transactions by typing plain English**, e.g. "spent 200 on lunch today from HDFC card" — the app reads this, figures out the amount, category, account, and date, shows you what it understood, and only adds it to the ledger after you confirm it's correct
- **Ask questions about your spending** in plain English, e.g. "how much did I spend on eating out last month?" or "which account has the highest expenses this year?" — the app answers using your real transaction data
- **Entry point:** a floating round icon, always visible in the bottom corner of the screen (the familiar "chat bubble" pattern used by website chat widgets). Tapping it opens a chat-style panel where you can either type a transaction to log or ask a question — both go through the same window

### 5.8 Dashboard (Landing Page)

- The first screen you see after logging in
- Shows an at-a-glance overview of your whole financial picture:
    - Overall balance across all accounts (in INR)
    - The balance ring/progress view (income vs. expense for the current month)
    - A list of your accounts with individual balances
    - Recent transactions (a short list, with a link to see all)
    - Quick access to the Income / Expense / Transfer actions
- Acts as the "home base" you can always return to

### 5.9 Navigation

- A persistent way to move between the main sections (Dashboard, Accounts, Transactions, Categories, Profile) from anywhere in the app — e.g. a bottom tab bar on mobile-width screens, a side or top nav on wider screens
- The floating Claude assistant icon (section 5.7) stays visible and accessible no matter which page you're on
- The floating Quick Add button (section 5.12) also stays visible from anywhere in the app, independent of the Claude assistant icon's slot

### 5.10 Profile Page

- Basic account details: name, email
- Change/reset password
- Export transactions (CSV) by account and date range
- Sign out
- (Currency/date-format preferences could live here too — see open questions)

### 5.11 Mobile Home Screen Widget (later, mobile app phase)

- Once the app is packaged as a native mobile app, add a home-screen widget for quick entry without opening the app
- **Setting up the widget:** when adding the widget to the home screen, you're asked to pick which account it should track (so you can pin your most-used account, e.g. your daily spending account)
- Shows: the selected account's name and current balance
- Two quick-action buttons right on the widget: **+ Expense** and **+ Income**, so a transaction can be logged in a couple of taps from the phone's home screen
- **Changing the account at entry time:** tapping + Expense or + Income opens the transaction entry screen pre-filled with the widget's account, but that account can still be changed there before the transaction is confirmed — the widget's account is a default, not a lock
- This depends on the native app wrapper (section 2), so it comes after the web app is working, not in the very first version

### 5.12 Quick Add (Floating Button)

- A floating button, visible from any page in the app (not just the Dashboard), for quickly logging a transaction without navigating away from whatever you're looking at
- Opens the same Income/Expense/Transfer entry form used elsewhere in the app, as a modal/overlay rather than a full page navigation, so you land back where you were after saving
- If you're on a specific account's page when you tap it, that account is pre-filled as the default — same "default, not a lock" pattern as the mobile home-screen widget (section 5.11)
- Distinct from the Claude assistant icon (section 5.7) — this is a direct, form-based fast path; the Claude icon is for typed/conversational entry. Both can coexist once 5.7 is built
- Applies to both the current web app and the future mobile app — not gated on the v2 mobile work in section 10

## 6. Explicitly out of scope for v1

(Move these up if you want them sooner — just say so.)

- ~~Dark mode / theme customization~~ — **shipped, see section 8**
- ~~Mobile app (iOS/Android)~~ — **promoted to v2, see section 10**
- ~~Dropbox or other third-party backup/sync~~ — **promoted to v2, see section 10**
- Passcode/biometric lock
- Reminders/notifications
- Reports/charts beyond the monthly summary and pie charts

## 7. Open questions / things to decide

- [ ] (Add your own notes here)

## 8. Build Progress

_Updated after every commit so it's always clear what's live and what's left. Brief notes on completed items describe what was actually built, not just the plan._

### Done

- **Phase 0 — Scaffold, Auth, Deploy.** Next.js/TypeScript/Tailwind app on Vercel, auto-deploying from `main`. Supabase email+password auth (signup, login, logout, password reset) backed by Prisma/Postgres. Protected app shell with nav (bottom tabs on mobile, side nav on desktop).
- **Phase 1 — Accounts.** Full CRUD for all 5 account types (Savings, Investment, Deposit, Wallet/Cash, Credit Card), optional credit limit field, balances computed live from transactions (never stored), deletion blocked while an account has transaction history.
- **Phase 2 — Categories.** Separate Expense/Income lists, full CRUD, deleting a category reassigns its transactions to "Uncategorized" rather than blocking.
- **Phase 3 — Transactions core.** Entry form for Income/Expense/Transfer, list view with account/category/date filters, summary band, edit/delete with correct balance recalculation everywhere.
- **Phase 4 — Calendar view.** Month grid with per-day expense totals and day-level transaction entry.
- **Phase 5 — Recurring transactions.** "Make recurring" toggle at entry time, real transaction rows materialized on a rolling 3-month horizon (lazy on read + daily cron backstop), "just this one" vs "this and all future occurrences" for both edits and deletes.
- **Phase 6 — Tags.** Free-form, reusable, cross-account/cross-category labels; inline creation while tagging a transaction; per-tag summary view (income/expense/net + full transaction list); inherited automatically into recurring occurrences.
- **Phase 6.5 — Editing polish & account insights.** Cancel button on the transaction form; inline "+ New category" quick-add from within the transaction form (no detour to the Categories page); per-account monthly summary (income/expense/transfers-in/transfers-out totals, category breakdown, transfer breakdown by counterpart account) plus a full chronological transaction list for the selected month.
- **Default categories.** 15 expense + 6 income starter categories (expanded from the original 12) seeded automatically for every new signup and backfilled onto existing accounts, so the starting set is standard across all users; custom categories anyone adds stay private to their own account.
- **Default tags.** 8 starter tags (Personal, Work, Family, Shared Expense, Reimbursable, Emergency, Gift, Recurring), seeded and backfilled the same way as default categories; custom tags stay private per user.
- **Phase 7 — Dashboard, Summary, Charts (superseded by the redesign below).** Original ring-based build has since been replaced; see "Dashboard/cash-flow redesign."
- **Balance model fix.** Every balance figure is computed **as of the end of whichever month is being viewed**, not "as of today" — so a future month's already-materialized recurring transactions no longer inflate the current month's numbers, and a past month correctly excludes anything from later months. Also fixed: an account's opening balance was leaking backward into every period before the account existed (e.g. a new account with a ₹1,00,000 opening balance would incorrectly show up in last month's Carry Forward) — an account now contributes nothing to any period before its `openingBalanceDate`.
- **Opening balance as income/expense.** An account's opening balance now also counts as income (if positive) or expense (if negative) in whichever month it falls in — so spending against a freshly-opened account's starting balance no longer reads as "overspending" (Carry Forward + Total In − Total Out reconciles exactly, including in an account's opening month).
- **Dashboard/cash-flow redesign (final).** Replaced the ring visual and the separate `/summary` page entirely — the Dashboard is the single home for everything, month-navigable:
    - A 2-segment **pie chart** (Income green, Expense red — transfers excluded, since they cancel out across the whole portfolio) with data labels on each slice and **Net Worth in the center**
    - Below it: **Carry Forward**, **Income**, **Expense**, **Credit card debt** (broken out separately; credit balances are negative and pull net worth down naturally — ₹2L in FD + ₹1.5L credit card due = ₹50K net worth, not ₹2L)
    - The month **calendar grid** (day-level expense totals, shared component with `/transactions/calendar`) embedded below that, sharing the Dashboard's own month nav
    - **Account pages** keep the richer 4-segment version (Income/Expense/Transfer In/Transfer Out — not symmetric per-account, so transfers stay) with data labels, **Balance available in the center**, and **% of available funds spent** underneath (Total Out ÷ (Carry Forward + Total In)); Carry Forward/Total In/Total Out/Left to Spend shown below; credit cards get a simple ％-used bar
    - **Accounts list page** also gained month nav — each tile shows that month's Income, Expense, net Transfers, and Balance available. Fixed a real bug here: the page previously showed an all-time unbounded balance, which silently included already-materialized future recurring transactions (e.g. an indefinite recurring salary starting next month inflated this month's figure to a meaningless number)
    - **Back navigation** added to the account detail and tag summary pages (previously only escapable via the tab bar)
    - **Transactions list** now defaults to the current month instead of all-time (was dumping every future-materialized recurring row with no filter applied) — "Clear (show all time)" still available
    - Fixed a related account-deletion bug surfaced during testing: the pre-delete check only counted *active* recurring rules, but the DB relation is `onDelete: Restrict` even for closed ones — attempting to delete an account with recurring history (even stopped) crashed with a raw DB error instead of a friendly message
- **Auth config fix.** Supabase's Site URL was still set to `localhost:3000`, so confirmation/reset emails linked nowhere useful outside local dev — corrected to the production URL.
- **Opening balance is now a real transaction.** Previously it was a value on the `Account` row, manually re-added into income/expense math on the Dashboard/Account/Accounts-list pages — which meant the Transactions list (and its summary bar) never saw it, since it queried real `Transaction` rows only. Fixed at the root: account create/update now generates a matching system transaction (`isOpeningBalance: true`, dated on the opening date), kept in sync on edit and cleaned up on delete; existing accounts were backfilled. It now shows up everywhere a transaction would — lists, calendars, summaries — labeled "🏦 Opening balance," not directly editable/deletable (routes to the account's own edit page instead). `applyDelta`/`openingBalanceInPeriod` special-casing removed from `balance.ts` and all three pages that had it.
- **Credit card pie redesigned as a limit-scaled gauge.** The account-detail pie for a credit card previously showed that period's cash flow (Income/Expense/Transfer In/Out) — for a card with only expenses, that's just a 100%-red circle, and if a debt carried over into a month with zero new transactions the pie rendered nothing at all ("No data for this period"), hiding exactly the balance the user needed to see. Now, for credit cards with a limit set, the pie shows **Owed vs. Available Credit** scaled to the credit limit (royal purple for available, red for owed) — Owed is the account's actual carried-forward balance, so it renders correctly even with no activity that month. Replaced the separate redundant usage bar underneath; kept the plain credit-limit/available-credit text lines.
- **Found and fixed a P2028 risk while doing the above.** Supabase's pooled connection (pgbouncer transaction mode) can't reliably run Prisma's interactive `$transaction(async (tx) => {...})` — it times out. `lib/actions/accounts.ts` now does the account-write + opening-balance-transaction-sync as sequential calls instead. The same pattern still exists in `lib/services/recurrence.ts`'s "this and all future" recurring edit and is a likely latent bug there too — flagged separately, not yet fixed.
- **Bug batch from live user testing.** Cancel button added to account create/edit (was missing — only the transaction form had one). "Left to Spend" on the account detail page was computed as `Total In − Total Out`, ignoring Carry Forward entirely, so it disagreed with the pie's own balance figure the moment there was any carry-forward (a ₹55,631 carry forward showing "Left to Spend: ₹27,840" instead of ₹83,471) — for a credit card the same bug read as a huge negative number instead of available credit. Fixed by reading the same figure the pie's center already computes (`endingBalance`, or `availableCredit` for a credit card). Recurring transaction edits had the date field locked/disabled — the schema always supported the actual date diverging from the schedule's `occurrenceDate`, but neither the UI nor `editSingleOccurrence`/`editFutureOccurrences` touched it; now editable, and editing "this and all future" reschedules the series' anchor date instead of only being usable for amount/category. (The "just this one / this and all future" scope choice on edit was already implemented and working — confirmed live, not a bug.) Recurring materialization was hard-capped at today+3 months regardless of which month a page was viewing, so an indefinite rule silently stopped appearing past that point even when the user explicitly browsed further out (e.g. an indefinite rule starting in a future month only showed 3 months of occurrences, nothing beyond) — `ensureMaterialized` now takes an optional `through` date and every month-scoped page passes the month it's viewing, so browsing forward extends materialization to match; the today+3-month rolling horizon is still the default when no specific date is being viewed.

- **Roadmap #1 — Daily "safe to spend" number.** Account detail page now shows Left to Spend ÷ days remaining in the month (e.g. "₹425.00/day, 22 days left"), directly under Left to Spend. Only shown while viewing the actual current month (a daily pace is meaningless for a past month you're reviewing or a future one you haven't started spending in) and only for non-credit accounts. New `daysRemainingInMonth()` helper in `calendar.ts`.
- **Roadmap #2 — Net worth trend chart.** Dashboard now shows a 12-month line chart of net worth ending at whichever month is being viewed (so paging the Dashboard backward shifts the trend window too), right below the Carry Forward/Income/Expense panel. New `getNetWorthSeries()` in `balance.ts` computes all 12 points from a single transactions query (sorted ascending, folded into a running per-account delta as each month-end cutoff is passed) rather than 12 separate balance queries. New `NetWorthTrendChart` component (Recharts `LineChart`) and `formatMoneyCompact()`/`monthShortLabel()` helpers for axis labels. Verified live against real history: flat at ₹0 before any account existed, jumping at account creation, tracking real balance changes since.
- **Roadmap #3 — Fixed Commitments page.** New `/commitments` page (own nav tab) lists every active recurring rule, normalized to a monthly-equivalent figure via new `monthlyEquivalent()` in `recurrence.ts` (so a yearly and a weekly charge sum meaningfully — uses average month/week length, 365.25/12 days, not a fixed 30). Grouped into Recurring Expenses / Recurring Transfers & Investments / Recurring Income (reference only), with a total-committed figure and % of recurring income when there's income data to compare against. Verified live against real recurring rules (Netflix ₹700/mo + gym ₹200/mo = ₹900/mo, correct). Adding a 6th nav item overflowed the mobile bottom tab bar and pushed Profile off-screen (flex items don't shrink below their content's natural width without `min-width: 0`) — fixed alongside (`min-w-0` + truncation on each tab).
- **Roadmap #4 — Spend-pace / month-end projection — built, then reverted.** Shipped an "At this rate, by month-end: ₹X" projection on the account detail page, verified working correctly, then removed at the user's request the same session — not wanted. See roadmap table for status.
- **Roadmap #5 — Duplicate-last-transaction quick entry.** "Duplicate" link added next to Edit/Delete on the Transactions list and account detail's month list (skipped the Dashboard's recent-transactions widget — a glance view, not a management surface). Routes to `/transactions/new?duplicateId=<id>`, which prefills type/amount/account/category/description/tags from the source transaction but defaults the date to *today*, not the original date — a duplicate is a new occurrence happening now. Opening-balance rows excluded, same as their edit/delete guards. Verified live: duplicating a ₹450 Groceries/HDFC Salary transaction from Aug 15 correctly prefilled amount and category with today's date (Aug 10), not Aug 15.
- **Roadmap #6 — Asset Allocation view.** New Dashboard section below the net worth trend chart: a composition pie of positive balances grouped by account type — Liquid (Savings/Wallet, blue), Deposits (FD/RD, amber), Invested (violet) — reusing the existing `CategoryPieChart` in its normal flow-ratio mode, since composition is a ratio question, not a capacity gauge (unlike the Used/Available ones above it). Credit card balances are debt, not an asset, so they're excluded from the pie and called out as a separate "Credit card debt: ₹X" line instead. No new queries — reuses the Dashboard's already-fetched account balances. Zero-value buckets filtered out before rendering so they don't clutter the legend (same convention as the other pies). Verified live: with only Savings/Wallet accounts, correctly shows a single 100% Liquid segment matching net worth exactly, no stray zero-value legend entries.
- **Roadmap #8 — Goals.** New `Goal` model (name, targetAmount, optional targetDate) and `/goals` CRUD pages, plus a compact teaser on the Dashboard. v1 tracks net worth only, not a specific account — covers the stated use case ("reach ₹10L net worth by Dec 2027") without needing a parallel per-account growth-rate series alongside `getNetWorthSeries`. Each goal shows a progress bar, % there, amount remaining, and — using the trailing 6-month net worth growth rate — a projected completion month, flagged red if that's later than the goal's own target date. No growth (or negative growth) shows "Not currently trending toward this goal" instead of a fabricated date. The dedicated `/goals` page always uses *today's* real net worth; the Dashboard teaser uses whichever month the Dashboard is viewing (consistent with everything else there) — the two can legitimately show different percentages for the same goal, which is by design, not a bug. Verified live: ₹18,800 today's net worth ÷ ₹36,700 target = 51% on `/goals`, vs 50% on the Dashboard teaser (August month-end net worth ₹18,350) — both correct for what each page means by "now."
- **Roadmap #9 — Debt payoff projection.** Credit card account detail page now shows "At your trailing 6-month pace (₹X/mo), projected debt-free around <Month Year>" below the credit limit text, anchored to today's real owed balance (not the viewed month, same reasoning as Goals). Compares owed today vs. owed 6 months ago to get a monthly reduction rate; no projection (with an explicit "not currently trending toward payoff" note) when the balance isn't shrinking. Verified live: a test card with ₹20,000 opening debt 6 months ago and a ₹5,000 payment this month correctly computed ₹833.33/mo reduction and projected Feb 2028 payoff (15,000 remaining ÷ 833.33 = 18 months).
- **Roadmap #11 — Category-level budgets.** Built as a standalone feature rather than waiting on Phase 9 (account-level budget mode hasn't been built at all yet, so "extends Phase 9" from the original scoring wasn't achievable as written) — new `Category.monthlyBudget` field (Expense categories only, cleared automatically if the category type isn't Expense, same pattern as `Account.creditLimit`). Categories page shows a progress bar and spend-vs-budget text under any category with a budget set, using the real current calendar month (deliberately not tied to a browsable month — "am I about to overspend this category right now" is a today question, matching how account pages already treat pace/projection stats). Dashboard gets a minimal red banner (not a full new section) when any budgeted category is over for the month, linking to Categories — reuses the Dashboard's already-fetched period transactions, one small additional category query. Verified live: Groceries budget ₹300 vs. ₹450 already spent showed "₹150.00 over" correctly on both the Categories page and the Dashboard banner; clearing the budget removed both.
- **Dashboard/account pies rebuilt as gauges, not flow-ratio pies.** The Dashboard (Income vs Expense) and account-detail (Income/Transfer In/Expense/Transfer Out) pies previously sized each slice against the others — informative as a ratio, but the "how much is left" relationship only ever showed up as small subtext, never in the ring itself. Now every account-facing pie uses the same 2-segment gauge the credit card page already had: a total capacity, a red "Used" slice eating into it, and a green "Available" slice for the remainder (purple stays for credit cards' Available Credit, per the earlier request). Dashboard: capacity = Carry Forward + Income (transfers excluded, portfolio-wide), Available = Net Worth exactly. Account: capacity = Carry Forward + Total In, Available = the same `endingBalance`/"Left to Spend" already shown below. Category/counterpart-account detail didn't disappear — it's still in the account page's Breakdown section, just no longer encoded in slice size. Added "Net position: −₹X" / "Overdrawn by ₹X" notes for the negative case, mirroring the credit card's existing "Over limit by X".
- **Phase 9 — Budget Mode + Show/Hide Future Transactions.** New `/settings` page (linked from Profile) for the two Profile-level globals; per-account overrides added to the account form as tri-state selects ("Inherit global setting (currently X)" / On / Off), resolved via new `resolveAccountSettings()` in `lib/services/settings.ts`. Budget Mode, when effectively on with a monthly budget set, shows a spend-vs-budget progress bar on the account detail page (Total Out vs. `Account.monthlyBudget`) — same visual language as the category budgets from roadmap #11, but account-scoped. Show Future Transactions, when effectively off, hides future-dated *rows* from the account detail page's current-month transaction list only — deliberately doesn't touch totals, balance, or the gauge, since a future-dated transaction is still a real recorded commitment (the whole balance model this session was built around treating it that way); only applies while viewing the actual current month, not a month browsed to explicitly. A "N upcoming transaction(s) hidden" note links back to Settings. (Scoped to the account detail page only for v1 — not yet applied to the Transactions list or Dashboard, where "which account's setting applies" is ambiguous for a multi-account view; flagged as a possible future extension.) Verified live: Budget Mode ₹16,150 spent vs ₹10,000 budget showed "₹6,150.00 over" correctly; Show Future off correctly hid the one future-dated Groceries transaction from the list while Total Out/Left to Spend/Balance available all stayed at their complete, correct values.
- **Currency list expanded, then corrected.** First pass replaced the curated 9-option list with what was believed to be Frankfurter's supported set — but wrongly assumed the older ECB-only v1 endpoint (~31 currencies), dropping AED even though spec 5.1 explicitly names AED as the reason to use v2 instead ("sources from 84 central banks, 201 currencies, includes AED... rather than the older v1/ECB-only version, which only covers ~30 major currencies and would miss AED"). Corrected when actually building the FX integration below: regenerated `CURRENCIES` from the live `GET /v2/currencies` response (160 real currencies after excluding precious-metal/SDR pseudo-currencies — XAU/XAG/XPD/XPT/XDR — and MRO, a deprecated duplicate of MRU with the same display name), AED included. `COMMON_CURRENCIES` (bare codes) renamed to `CURRENCIES` ({code, name} objects, alphabetical by code) in `lib/constants/accounts.ts`; dropdown shows "USD — United States Dollar" instead of a bare code.
- **Section 5.10 — Profile page completed.** Added the pieces the spec called for that weren't there yet: an editable **Name** field (`Profile.displayName`, new `updateDisplayName` action) alongside the existing read-only email and password-change form. New **Export Transactions** feature: account checkboxes (none checked = export every account) plus a from/to date range, submitting a plain GET form to a new `/api/export/transactions` route handler — no client JS needed for the actual download. Exports as CSV rather than a true `.xlsx` — Excel/Sheets/Numbers all open CSV natively, so this reaches the same outcome without adding an xlsx-writing dependency; noted directly in the UI so it doesn't read as a missing "Excel" option. CSV includes a leading BOM (Excel guesses text encoding from the first bytes, not the file extension — without it, the ₹ sign and non-ASCII text render as mojibake) and proper RFC 4180 quoting for fields containing commas. Account ids from the query string are always re-verified against the signed-in user's own accounts server-side before querying — never trusted directly, same discipline as every other query in the app. Verified live via direct fetch: correct headers/filename, correct CSV content for both the all-accounts export and a single-account filter (Cash Wallet only, correctly including the transfer that touches it).
- **Phase 8 — Multi-currency.** New `ExchangeRateCache` model — one row per foreign currency, always "currency → INR" (INR is the app's fixed reporting currency per spec 5.8, so there's no need for a general bidirectional rate table). New `lib/services/currency.ts`: `getRatesToINR()` batches every currency a caller needs into one Frankfurter call rather than one per currency, caches for 6 hours (Frankfurter itself only refreshes once/day), and falls back to the last-known cached rate (however old) rather than crashing or silently treating a foreign currency as 1:1 with INR if the API is ever down and uncached. Building this surfaced that **v2's actual API shape differs from v1 in more than just the URL** — `/v2/rates` takes a `quotes` param (not v1's `symbols`) and returns an array of `{date, base, quote, rate}` records, not a `{rates: {...}}` object; confirmed against the live API rather than assumed from docs, since assuming wrong here would have silently produced empty conversions everywhere. New `CurrencyAmount` component shows "native (≈ INR)" wherever a non-INR account's balance is displayed (Dashboard's Accounts list, the standalone Accounts list) — conversion is computed server-side and passed in as a prop, so the component itself stays a plain presentational one. True net-worth "in INR" now real: Dashboard's Net Worth, Carry Forward, Credit card debt, Asset Allocation, and portfolio Income/Expense all convert each account's own-currency amount to INR before summing (previously these summed raw numbers regardless of currency — silently wrong for any non-INR account). `getNetWorthSeries()` (the trend chart, also used by Goals) does the same per-cutoff. Per-account figures (account pages, Accounts list) stay in that account's native currency, as they should — only portfolio-level aggregates convert. Cross-currency transfers aren't modeled (a transfer still moves the same raw number between both legs regardless of each account's currency) — assumed out of scope, not stated in spec. Verified live: adding a $1,000 USD test account (rate 95.238 INR/USD from the live API) correctly added ₹95,238.10 to Net Worth (₹18,350 → ₹1,13,588.10), Income, Asset Allocation, and the trend chart, all in exact agreement; Accounts list showed "$1,000.00 ≈ ₹95,238.10" correctly.

- **Phase 10 — Polish & responsive nav.** Loading states: new `(app)/loading.tsx` (generic skeleton, shown by Next.js during route-segment data fetching — previously navigation just froze until the query resolved). Error states: `(app)/error.tsx` and `(auth)/error.tsx` (route-segment boundaries with a "Try again"/"Go to Dashboard" recovery), root `not-found.tsx` (styled 404, replacing the framework default — verified live for both a nonexistent route and a `notFound()` call on a missing account id) and `global-error.tsx` (last-resort boundary for failures in the root layout itself). Empty states audited — every list page already had a "No X yet" message, nothing missing. Accessibility: `aria-current="page"` on the active nav link in both `SideNav` and `BottomTabBar`, `aria-label` distinguishing the two `<nav>` landmarks (both were unlabeled "Main navigation" duplicates otherwise), a skip-to-main-content link (visually hidden until focused) landing on a new `#main-content` id on `<main>`; audited every button/icon-only control and found nothing else missing a label (already using visible text or existing `aria-label`s throughout — `CalendarMonthGrid`'s add links, `ClaudeFabPlaceholder`, date filter inputs). N+1 review: found and fixed two real ones — `resolveTagIds()` (`lib/services/tags.ts`) did one sequential `upsert` round-trip per tag name (up to 10 per transaction save); now one `createMany`+`findMany` pair regardless of tag count. `ensureMaterialized()`'s per-rule materialization loop (`lib/services/recurrence.ts`, runs on nearly every page load) awaited each independent rule sequentially; now `Promise.all`'d since rules share no state. (`ensureMaterializedForAllUsers`, the daily cron backstop, stays sequential across users deliberately — no per-page latency to justify the added DB load.) Verified live: 404 page, error boundary (forced a real throw and reverted it), skip link, and `aria-current` all confirmed via direct DOM inspection; mobile bottom-tab-bar still doesn't overflow with all 6 items and the Claude FAB placeholder still sits clear of it.

- **Visual redesign (dark-first design system + Dashboard desktop grid).** Prompted by the user reacting to the mobile-stretched desktop layout and asking for a "minimalist, futuristic" look; agreed on direction via an Artifact mockup before building. New CSS custom-property token system in `globals.css` (`--bg/--surface/--surface-2/--surface-3/--border/--border-strong/--fg/--fg-muted/--fg-subtle/--accent/--accent-soft/--accent-strong/--success/--success-soft/--danger/--danger-soft`), light by default, dark via `prefers-color-scheme`, and an explicit `data-theme` override for a manual toggle — mapped into Tailwind's `@theme inline` so components use plain utilities (`bg-surface`, `text-fg-muted`, etc.), plus a `--font-data` monospace stack (`font-data` utility) applied to every money figure for a "fintech terminal" feel. Fixed a latent bug found while wiring this up: `globals.css` had `body { font-family: Arial... }` silently overriding the Geist variable fonts that were already configured — Geist now actually renders. `ThemeToggle` (new) flips `data-theme` and persists to `localStorage`; a synchronous inline script in the root layout applies the saved choice before first paint to avoid a flash-of-wrong-theme. Nav shell rebuilt: `SideNav` is now a 72px icon-only rail (was a 224px text-label list) with a brand mark, active-item accent bar, and the theme toggle docked at the bottom; `BottomTabBar` gained icons above each label (mobile), reading better at a glance even though long labels ("Transactions", "Commitments") still truncate at 375px — acceptable, matches the approved mockup, not a regression from before. Dashboard (`(app)/page.tsx`) rebuilt into a responsive grid (`grid-cols-1` on mobile, `lg:grid-cols-12` at desktop widths) matching the approved mockup: net worth ring + trend chart share a row, a 4-up metric strip below, Asset Allocation and Goals side by side, then Accounts and Recent Transactions side by side — same data and logic as before, only the layout and visual language changed. New `NetWorthRing` component replaces the old thick Recharts pie for the hero figure with a slim custom SVG gauge (colors set via inline `style` so the CSS custom properties resolve reliably, unlike passing `var(...)` as a raw SVG attribute). Found and fixed a real bug while verifying this live: pages not yet touched by the redesign (Accounts, Transactions, Categories, Goals, Commitments, Profile, Settings, all forms, auth pages) still hardcoded old Tailwind `zinc-900`/`white`/`emerald`/`rose`/`blue`/`red` classes — since the page background is now dark by default, `text-zinc-900` on the new dark `bg-bg` rendered as **invisible near-black-on-near-black text**, not just visually inconsistent. Fixed with a systematic find-and-replace across every `.tsx` file in `src/app` and `src/components` (`zinc-900→fg`, `zinc-500/600→fg-muted`, `zinc-300/400→fg-subtle`, `bg-white→bg-surface`, `zinc-200/100/50→border/surface-2/surface-3` as appropriate, `emerald→success`, `rose/red→danger`, `blue→accent`), plus adding explicit `bg-surface`/`text-fg` to every form `<input>`/`<select>` that previously had no background class at all (invisible bug in isolation, but rendered as a jarring stray white box in dark mode since the browser's UA-default white input background was never overridden). This pass intentionally only changed *colors*, not layout — the other pages still use their original single-column structure and will get the same desktop-grid treatment as Dashboard in a future pass if requested. Verified live in both themes at both mobile and desktop widths: Dashboard grid, Accounts list, Account detail (still old layout, new colors), New Account form, and Categories all read correctly with no invisible or stray-white elements in dark mode.

- **Desktop-grid rollout to the rest of the app.** Extends the Dashboard's grid treatment everywhere else: Account detail is now a card grid (gauge+credit/debt-payoff card, this-period stats + budget mode card, Breakdown, and a Transactions list card, 2-up on desktop); Accounts/Categories/Goals list pages became responsive card grids (`md:grid-cols-2 xl:grid-cols-3`) instead of single-column stacked lists; Commitments' three sections (Expenses/Transfers/Income) now sit side by side as their own cards on desktop instead of stacking; Transactions list and the Calendar and the per-tag summary page kept their single-column list shape (a transaction list reads better wide than wrapped into cards) but gained the same wide `max-w-[1400px]` canvas and card chrome as everywhere else; Profile became a 2×2 card grid (Name / Password / Settings link / Export, the last spanning both columns). All 8 create/edit form pages (`accounts`, `categories`, `goals`, `transactions` × new/edit) and Settings moved off an unconstrained `p-6` div — previously a bare `<input>` could stretch edge-to-edge on a wide screen — onto a centered `max-w-2xl`/`max-w-xl` card; each form component's own internal `max-w-md` still caps individual field width inside that card. Every new section reuses the same card/grid pattern established for Dashboard (`rounded-2xl border border-border bg-surface p-5 shadow-sm`, `font-data`+`tabular-nums` on money figures) — no new visual language introduced. Layout only; no data/logic changes. Verified live across Accounts, Account detail, Transactions, Categories, Goals (including its empty state), Commitments, Profile, Settings, and the New Account form, in both themes and at both mobile and desktop widths.
- **Net worth trend chart fixes.** Two issues flagged from a live screenshot: (1) the trend window was always a fixed 12 months back from whichever month is being viewed, so a profile only a few months old showed a misleading flat-₹0 line for every month before it existed; (2) the trend card also repeated Income/Expense/Carry Forward figures that aren't plotted on the line at all and already appear once in the metric strip directly below. Fixed (1) by looking up the user's actual earliest transaction (covers opening-balance rows too, since those are real `Transaction` rows) and sizing the window to `min(12, months since that transaction)` — new `monthsBetween()` helper in `calendar.ts`; the card's "Last 12 months" label becomes "Since &lt;month&gt;" whenever the window is shorter than 12. Fixed (2) by deleting the duplicated figures row from the trend card entirely — that data still lives in the metric strip. Verified live: a seed account with its earliest transaction in January correctly trimmed the chart to "Since Jan '26" (8 points) instead of 12 with 4 months of flat-zero padding, and the trend card now shows only the chart.
- **Five fixes from live testing.** (1) Editing a recurring transaction had no way to change its end date — the "make recurring" schedule fields (interval, end date) only ever rendered at creation time; editing a series showed a static "Repeats every X" line with nothing editable. Added an editable end-date field to the edit view (interval still isn't editable in v1 — unchanged scope), wired through a new `parseEndDateFormData()` and an optional `newEndDate` param on `editFutureOccurrences()` — only takes effect when the user picks "this and all future occurrences," matching how every other field on that scope already works. Verified live: set an indefinite gym-membership rule to end Dec 2026, confirmed it persisted onto the newly-split rule, then reverted it back to indefinite. (2) `/transactions` could only filter by account/category/date — added a Type filter (Income/Expense/Transfer) to `TransactionFilters`, combinable with the rest. (3) Transfers rendered in plain `text-fg` (white in dark mode) in every mixed transaction list, indistinguishable from a glance — added a `--transfer`/`--transfer-soft` token pair (gold/amber, tuned per-theme) and switched all four unified list views (Dashboard recent transactions, Transactions list, Account detail, tag summary) plus the two remaining transfer icon backgrounds (previously a leftover hardcoded blue) onto it. Breakdown's separate transfer-in/transfer-out color coding on the account page was left as-is — that's categorical, not the "blends into income/expense" problem being fixed. (4) Account detail's Breakdown section listed every category/account under Income/Expense/Transfers with no section total — added a subtotal next to each section heading, reusing the `income`/`expense`/`transferIn`/`transferOut` figures already computed for the stats card above (no new query). (5) Dashboard's "Recent transactions → View all" always linked to bare `/transactions`, which defaults to the *current* real month regardless of which month the Dashboard was actually showing — now links to `/transactions?from=<viewed-month-start>&to=<viewed-month-end>`, so paging the Dashboard to October and clicking View all lands on October's transactions, not whichever month is "now."

- **Section 5.12 — Quick Add floating button.** New floating `+` button (`QuickAddButton`), visible from every page in the `(app)` shell, positioned above the (still inert) Claude FAB placeholder with clear spacing on both mobile and desktop. Opens the same `TransactionForm` used everywhere else, as a modal rather than a page navigation — recurring setup is deliberately left off this form (stays on the full New Transaction page) to keep it genuinely quick. New `quickAddTransaction` server action mirrors `createTransaction`'s validation/creation path but returns `{ success: true }` instead of `redirect()`-ing to the account page, since a modal opened from an arbitrary page should leave you there, not bounce you to `/accounts/:id`. `TransactionForm` gained two optional props to support this: `onCancel` (Cancel button closes the modal instead of `router.back()`, which would otherwise navigate away from wherever the modal was opened) and `onSuccess` (closes the modal and calls `router.refresh()` so the page underneath — Dashboard net worth, an account's balance, a transaction list — reflects the new transaction immediately, without a full reload). If you're already on a specific account's detail page, that account comes pre-filled in the form (both the plain account field and the Transfer "from" field) — same "default, not a lock" pattern as the mobile widget in 5.11. The button hides itself entirely for a brand-new user with zero accounts, since there's nothing to log a transaction against yet. Fetches accounts/categories/tags once in the `(app)` layout (shared with nothing else currently, but a natural place for it) rather than duplicating the query per page. Verified live: submitting a test expense from the Dashboard closed the modal and updated Net Worth in place with no navigation; opening from the Cash Wallet account page correctly pre-selected Cash Wallet; Cancel closes without navigating; both themes and desktop/mobile spacing (24px clear of the Claude FAB) checked directly via computed styles and DOM `getBoundingClientRect()` (screenshot capture in this environment has a known rendering artifact on this page, noted in earlier sessions — DOM inspection is the reliable source of truth here).

### Remaining

- **Section 5.7 — Smart Features (Claude-powered).** On hold, per explicit user instruction — do not start without being asked again.
- **Roadmap #12 — Threshold alerts/notifications.** On hold, per explicit user instruction — do not start without being asked again.
- **Section 10 — Mobile, Offline & Backup (v2).** Not started — needs the open architecture decisions (conflict resolution, backup format/destination, Dropbox's role) resolved first. See section 10 for details.

---

## 9. Improvement Roadmap — Value/Effort Prioritization

The app's core promise: a user who logs transactions regularly should (a) never overspend, (b) always know their net worth short- and long-term, (c) always know their fixed commitments. Each idea below scored 1–10 on **Value** (impact toward that promise, including how much it lowers the friction to keep logging — the whole thing is worthless if people stop entering transactions) and **Effort** (engineering cost against the current codebase, schema, and infra). **Priority = Value − Effort**; ties broken by higher Value. Built top to bottom; as each ships, it moves into section 8's Done list and gets struck through here.

| # | Feature | Value | Effort | Priority |
|---|---|---|---|---|
| ~~1~~ | ~~Daily "safe to spend" number~~ — **Shipped** | 8 | 2 | **+6** |
| ~~2~~ | ~~Net worth trend chart~~ — **Shipped** | 9 | 4 | **+5** |
| ~~3~~ | ~~Fixed Commitments & Subscriptions rollup~~ — **Shipped** | 8 | 3 | **+5** |
| ~~4~~ | ~~Spend-pace / month-end projection~~ — **built, then reverted — user doesn't want it** | 8 | 4 | **+4** |
| ~~5~~ | ~~Duplicate-last-transaction quick entry~~ — **Shipped** | 6 | 2 | **+4** |
| ~~6~~ | ~~Asset allocation view~~ — **Shipped** | 6 | 3 | **+3** |
| ~~7~~ | ~~Investment mark-to-market affordance~~ — **dropped, user doesn't want it** | — | — | — |
| ~~8~~ | ~~Goals~~ — **Shipped** | 6 | 5 | **+1** |
| ~~9~~ | ~~Debt payoff projection~~ — **Shipped** | 5 | 4 | **+1** |
| 10 | Natural-language quick entry (Claude-powered, section 5.7's reserved FAB) | 9 | 9 | **0** |
| ~~11~~ | ~~Category-level budgets~~ — **Shipped** | 7 | 7 | **0** |
| 12 | Threshold alerts / notifications (budget crossed, unusual transaction) | 6 | 8 | **−2** |

Note on #10: it scores low on pure ROI despite being the single biggest differentiator from manual-entry competitors, purely because the effort is genuinely large (new LLM integration subsystem, parsing/disambiguation UX, API costs) — not because it isn't valuable. Worth revisiting once the cheaper wins below it are shipped.

---

## 10. Version 2 — Mobile, Offline & Backup (Planned — not started)

v1 (sections 1–9) delivered a complete web app covering essentially the full original feature list; what's genuinely left from v1 itself is just section 5.7 (Claude-powered smart entry) and roadmap #12 (threshold alerts), both explicitly on hold. Everything below is new scope: turning this into a real cross-platform app that works with or without an internet connection, plus giving users a way to protect and move their own data. None of this has been built yet — it needs its own design pass before coding starts, flagged here so the shape of the problem isn't lost.

### 10.1 Native mobile app (Android first, then iOS)

- Wrap the existing Next.js app with **Capacitor**, per the original section 2 plan — same core app, packaged as an installable Android app (Play Store), later iOS
- Everything in sections 5.1–5.12 needs to work inside that wrapper, including the quick-add floating button and (whenever built) the Claude assistant icon
- Section 5.11 (home-screen widget) depends on this and stays gated behind it, as originally scoped

### 10.2 Offline-first local storage & sync

This is the highest-risk, highest-effort piece of v2 — the app currently assumes the cloud (Supabase/Postgres via Prisma) is the *only* copy of the data, and balances/summaries/recurring materialization are all computed live from it on every request.

- The mobile app needs a **local, on-device database** (e.g. SQLite via a Capacitor plugin) that mirrors the same schema, so the whole app — viewing balances, browsing history, adding/editing transactions, even recurring materialization — works with zero connectivity
- A **sync engine** reconciles the local database with the cloud whenever a connection is available: pushing local changes made while offline, pulling changes made elsewhere (web, another device)
- **Open decision — conflict resolution strategy.** What happens when the same record (e.g. an account, or a transaction) is edited offline on two devices before either syncs? Options range from simple (last-write-wins by an `updatedAt` timestamp — easy to build, occasionally silently discards a change) to robust (per-field merge or a CRDT-based approach — much more engineering, no silent data loss). Needs a decision before this phase starts; flagged in v1 too and still unresolved
- **Open decision — sync trigger.** Automatic background sync on reconnect (simplest for the user, needs Capacitor background-task support) vs. sync-on-app-open only (simpler to build, staler between opens)

### 10.3 Backup & restore

- A way to export a complete backup of a user's data, and restore it — covering "I lost my phone," "I'm switching devices," and "I want a local copy of everything" — independent of whether cloud sync is working
- v1 already has a partial building block: Profile's CSV export (section 5.10) — but CSV is transactions-only and one-way (export, no import). A real backup needs to cover accounts, categories, tags, goals, recurring rules, and settings too, and be re-importable
- **Open decision — backup format & destination.** A single downloadable file (JSON, most likely) that the user saves themselves and re-uploads to restore is the simplest version and works identically on web and mobile with no third-party integration. A "connect your Dropbox/Google Drive" flow (see 10.4) is a nicer experience but is a materially bigger lift (OAuth, token storage, background upload) — worth sequencing after the simple file-based version exists, not instead of it

### 10.4 Third-party sync (Dropbox-style)

- Idea raised: let users optionally sync their data through a service like Dropbox that they already control, rather than (or in addition to) relying solely on our own backend
- **Open question this needs before it can be scoped:** is this meant as (a) an easier/alternative *backup destination* for 10.3 — periodically write the backup file to the user's connected Dropbox instead of a manual download — or (b) a genuine *alternative sync transport* to replace/supplement the Supabase backend, closer to how apps like Actual Budget let a Dropbox-hosted file be the actual source of truth? (a) is a moderate addition on top of 10.3; (b) is a fundamentally different architecture from what's built today and would need its own plan
- No architecture decision made yet — needs to be resolved before any of 10.4 is built

---

_v1 is effectively feature-complete (see section 8). The next concrete, low-risk step is the Quick Add floating button (5.12) — it's well-scoped and adds value to the app as it exists today, independent of the v2 mobile/offline questions above. The v2 items in section 10 need their open decisions resolved (conflict resolution, backup format/destination, Dropbox's actual role) before implementation starts — worth a dedicated planning conversation before writing code._