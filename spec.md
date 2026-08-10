# Expense Tracker App — Draft Spec (v1)

> This is a starting draft based on screenshots of an existing app, plus the choices made so far. Add, remove, or change anything below — this is meant to be edited before we start building.

## 1. What this app is

A personal finance app for tracking money across multiple accounts (bank accounts, credit cards, cash, savings, investments). Inspired by an existing app, but not a copy — features will change and grow over time.

## 2. Platform

- **First build:** Web app — must work well in a browser on both desktop and mobile (responsive design, not just a desktop layout squeezed onto a small screen)
- **Later:** Wrapped as a native app (via Capacitor) so it's also installable from the Play Store/App Store, without needing to rebuild the core app — same code, packaged differently
- End goal: reachable both by opening a website (any device's browser) and by opening an installed app

## 3. Where data lives

- Data is stored in the cloud, so it's the same whether you log in from your phone, laptop, or any other device.
- **Web app:** saves directly to the cloud. Requires an internet connection to save changes (no offline mode on web for v1).
- **Native mobile app (later phase):** saves **locally first**, then syncs to the cloud automatically whenever an internet connection is available. This means transactions can still be logged offline on the phone; they just wait to sync rather than failing to save. Conflict handling (e.g. the same account edited offline on two devices before either syncs) is a detail to work out when we get to that phase — flagging it now so it's not forgotten later.

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

### 5.10 Profile Page

- Basic account details: name, email
- Change/reset password
- Sign out
- (Currency/date-format preferences could live here too — see open questions)

### 5.11 Mobile Home Screen Widget (later, mobile app phase)

- Once the app is packaged as a native mobile app, add a home-screen widget for quick entry without opening the app
- **Setting up the widget:** when adding the widget to the home screen, you're asked to pick which account it should track (so you can pin your most-used account, e.g. your daily spending account)
- Shows: the selected account's name and current balance
- Two quick-action buttons right on the widget: **+ Expense** and **+ Income**, so a transaction can be logged in a couple of taps from the phone's home screen
- **Changing the account at entry time:** tapping + Expense or + Income opens the transaction entry screen pre-filled with the widget's account, but that account can still be changed there before the transaction is confirmed — the widget's account is a default, not a lock
- This depends on the native app wrapper (section 2), so it comes after the web app is working, not in the very first version

## 6. Explicitly out of scope for v1

(Move these up if you want them sooner — just say so.)

- Dark mode / theme customization
- Dropbox or other third-party backup/sync
- Passcode/biometric lock
- Reminders/notifications
- Reports/charts beyond the monthly summary and pie charts
- Mobile app (iOS/Android)

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
- **Dashboard/account pies rebuilt as gauges, not flow-ratio pies.** The Dashboard (Income vs Expense) and account-detail (Income/Transfer In/Expense/Transfer Out) pies previously sized each slice against the others — informative as a ratio, but the "how much is left" relationship only ever showed up as small subtext, never in the ring itself. Now every account-facing pie uses the same 2-segment gauge the credit card page already had: a total capacity, a red "Used" slice eating into it, and a green "Available" slice for the remainder (purple stays for credit cards' Available Credit, per the earlier request). Dashboard: capacity = Carry Forward + Income (transfers excluded, portfolio-wide), Available = Net Worth exactly. Account: capacity = Carry Forward + Total In, Available = the same `endingBalance`/"Left to Spend" already shown below. Category/counterpart-account detail didn't disappear — it's still in the account page's Breakdown section, just no longer encoded in slice size. Added "Net position: −₹X" / "Overdrawn by ₹X" notes for the negative case, mirroring the credit card's existing "Over limit by X".

### Remaining

- **Phase 8 — Multi-currency.** Live FX rates (Frankfurter API) with caching, `CurrencyAmount` display component, true net-worth "All Accounts" total across currencies.
- **Phase 9 — Budget Mode + Show/Hide Future toggle.** Per-account monthly budgets (global + per-account settings), toggle for whether future-dated transactions appear in lists/summaries.
- **Phase 10 — Polish & responsive nav.** Bottom-tab vs. side-nav refinement, loading/empty/error states, accessibility pass, index/N+1 review.
- **Section 5.7 — Smart Features (Claude-powered).** Explicitly deferred; only a placeholder FAB currently sits in the UI.

---

## 9. Improvement Roadmap — Value/Effort Prioritization

The app's core promise: a user who logs transactions regularly should (a) never overspend, (b) always know their net worth short- and long-term, (c) always know their fixed commitments. Each idea below scored 1–10 on **Value** (impact toward that promise, including how much it lowers the friction to keep logging — the whole thing is worthless if people stop entering transactions) and **Effort** (engineering cost against the current codebase, schema, and infra). **Priority = Value − Effort**; ties broken by higher Value. Built top to bottom; as each ships, it moves into section 8's Done list and gets struck through here.

| # | Feature | Value | Effort | Priority |
|---|---|---|---|---|
| ~~1~~ | ~~Daily "safe to spend" number~~ — **Shipped** | 8 | 2 | **+6** |
| 2 | Net worth trend chart (line graph over last 12/24 months) | 9 | 4 | **+5** |
| 3 | Fixed Commitments & Subscriptions rollup (total ₹/month from active recurring rules) | 8 | 3 | **+5** |
| 4 | Spend-pace / month-end projection ("at this rate you'll spend ₹X by month-end") | 8 | 4 | **+4** |
| 5 | Duplicate-last-transaction quick entry | 6 | 2 | **+4** |
| 6 | Asset allocation view (% liquid / invested / debt, by account type) | 6 | 3 | **+3** |
| 7 | Investment mark-to-market affordance (default "Market Gain/Loss" categories + hint on Investment accounts) | 5 | 2 | **+3** |
| 8 | Goals (target net worth/amount by date, progress tracking) | 6 | 5 | **+1** |
| 9 | Debt payoff projection (credit card/loan, at current payment rate) | 5 | 4 | **+1** |
| 10 | Natural-language quick entry (Claude-powered, section 5.7's reserved FAB) | 9 | 9 | **0** |
| 11 | Category-level budgets (extends Phase 9 beyond account-level) | 7 | 7 | **0** |
| 12 | Threshold alerts / notifications (budget crossed, unusual transaction) | 6 | 8 | **−2** |

Note on #10: it scores low on pure ROI despite being the single biggest differentiator from manual-entry competitors, purely because the effort is genuinely large (new LLM integration subsystem, parsing/disambiguation UX, API costs) — not because it isn't valuable. Worth revisiting once the cheaper wins below it are shipped.

---

_Once this file reflects what you want, the next step is setting up Claude Code and starting the build — we'll walk through that together, one step at a time._