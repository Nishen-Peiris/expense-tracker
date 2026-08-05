Act as a senior product designer and frontend engineer. Review the existing personal-finance dashboard implementation and improve the mobile experience shown in the supplied screenshots.

Do not rebuild the application from scratch. Preserve the current data model, APIs, configurable accounts, categories, budgets, financial-month settings, import/export behavior, and existing business logic unless a verified bug requires correction.

First inspect the repository and identify:

- Frontend framework and styling approach
- Shared page-shell, header, card, table, form, navigation, and chart components
- Responsive breakpoints
- Existing calculation utilities
- Existing component and end-to-end tests

Then implement the improvements below.

## Primary goal

Make the dashboard feel polished, compact, trustworthy, and purpose-built for mobile, while maintaining a Monarch Money-inspired visual direction without copying its exact UI.

The current mobile screenshots reveal these problems:

- Transaction tables overflow and columns are cut off.
- Content is hidden behind or crowded by the fixed bottom navigation.
- Bottom navigation icons are inconsistent, including emoji-like icons.
- The same large month selector and “Add transaction” button appear on pages where they are unnecessary.
- “Add transaction” appears more than once on the Transactions page.
- Summary cards are too tall and consume excessive vertical space.
- Identical placeholder sparklines and “4.2%” values are shown on unrelated metrics.
- Total Debt shows LKR 0 but still displays a positive trend, which is misleading.
- Empty-state cards such as Goals and Liabilities are excessively tall.
- Budget rows are cramped and resemble an overflowing desktop table.
- Settings is one long unstructured form without clear sections or save feedback.
- Some text and controls are too close to screen edges.
- Charts and legends do not adapt cleanly to narrow screens.
- The browser safe area and iPhone bottom inset are not handled properly.
- Several pages have excessive whitespace and weak information hierarchy.
- Calculations and rounding need verification.
- The UI should not display fabricated trends when historical data is unavailable.

## 1. Create a proper responsive application shell

Refactor the shared mobile page shell.

Requirements:

- Respect `env(safe-area-inset-top)` and `env(safe-area-inset-bottom)`.
- Add enough bottom padding so page content is never covered by the fixed navigation.
- Keep the mobile bottom navigation fixed and visually separated from content.
- Use one coherent SVG icon set already installed in the project, or add a lightweight accessible icon library if none exists.
- Do not use emoji as navigation icons.
- Active navigation items must have clear but subtle emphasis.
- Include accessible labels and a minimum 44 × 44 px touch target.
- Desktop navigation must continue to work.
- Avoid horizontal page scrolling at every supported viewport width.

Test at least these widths:

- 320 px
- 375 px
- 390 px
- 430 px
- 768 px
- 1024 px and above

## 2. Simplify the page header

Create a shared, responsive page-header component.

The header should support:

- Date greeting only on Overview, or where genuinely useful
- Page title
- Optional compact period selector
- Optional primary page action
- Optional subtitle or period-range badge

Rules:

- Do not render “Add transaction” on Settings.
- Do not render it automatically on every page.
- Transactions should have exactly one primary “Add transaction” action.
- Budget should prioritize “Add budget”; adding transactions may be secondary or omitted.
- Accounts should prioritize “Add account.”
- Settings should have no financial-period selector unless a setting is period-specific.
- Accounts should show current balances or an “as of” date, not imply that accounts belong to one month.
- On narrow screens, stack controls cleanly or use a compact action menu.
- Avoid oversized controls occupying half the screen width unnecessarily.

## 3. Improve Overview cards

Redesign the mobile Overview summary.

For desktop:

- Keep a multi-column summary-card grid.

For mobile:

- Use a compact two-column grid where space allows.
- At 320–375 px, use either a one-column compact layout or a horizontally scrollable summary strip.
- Reduce card height substantially.
- Keep metric label, value, period change, and a small sparkline only when meaningful.
- Do not show fake or identical sparklines.
- Do not show a percentage change when no historical comparison exists.
- For zero debt, display “No debt” or LKR 0 without a misleading positive trend.
- Use real historical values from the backend or show a neutral empty-data state.
- Each metric must use the correct semantic direction:
  - Increased net worth is positive.
  - Increased income is positive.
  - Increased expenses or debt should not automatically be green.
- Ensure large LKR values do not wrap awkwardly.

Verify that Net Worth is calculated from included assets minus included liabilities rather than copied from Cash & Bank.

## 4. Correct financial calculations and rounding

Audit all financial calculations used by the screenshots.

At minimum verify:

- Net worth
- Cash and bank totals
- Monthly income
- Monthly expenses
- Remaining disposable income
- Savings/retention percentage
- Budget spent and remaining amounts
- Assets and liabilities totals
- Transfer exclusion
- Period boundary logic

Use precise decimal arithmetic and a consistent rounding policy.

For the screenshot example:

- `945,135 - 363,016 = 582,119`, not 582,120 unless an explicit rounding rule justifies it.

Ensure:

- Displayed totals equal their component values.
- Percentages are calculated from unrounded values and rounded only for display.
- The configured financial month start day is consistently applied.
- Labels clearly explain custom periods such as July 25–August 24.

Add automated tests for these cases.

## 5. Redesign the Cash Flow section

Improve its mobile presentation.

Requirements:

- Keep the retained percentage visible.
- Ensure the chart does not dominate the card.
- On mobile, stack the donut and values or use a compact horizontal layout when space allows.
- Align labels and amounts consistently.
- Use distinct semantic colors for income, expenses, and remaining funds.
- Include an accessible text summary independent of the chart.
- Do not use a donut if it makes the data harder to read at small sizes; a horizontal breakdown is acceptable.

## 6. Improve Spending by Category

On mobile:

- Show the top five categories.
- Use compact rows containing:
  - Category icon or color marker
  - Category name
  - Amount
  - Percentage or progress bar
- Prevent category names from colliding with amounts.
- Long category names should wrap gracefully without squeezing the amount column.
- Add “View report” as a clear secondary action.
- Use real category colors from configuration.

Do not cut off rows beneath the fixed navigation.

## 7. Redesign Budget Progress and Budget page

The current budget rows are too cramped.

Create a responsive budget-card component.

Each mobile budget item should display:

- Category name
- Amount spent
- Budget amount
- Remaining amount
- Percentage used
- Progress bar
- Status
- Edit action

Layout requirements:

- Put the category and percentage/status on the first row.
- Put spent/budget and remaining values below.
- Use a full-width progress bar.
- Place Edit in an overflow menu or compact secondary button.
- Never force the name, values, progress bar, percentage, and Edit button into one desktop-style row on mobile.
- Use green below the warning threshold, amber near the threshold, and red when exceeded.
- Clearly distinguish exactly 0% from missing data.
- Preserve configurable category budgets and financial-month behavior.
- Keep “Copy previous month” but make it responsive and confirm before overwriting existing budgets.

## 8. Replace the mobile Transactions table

Do not render the wide desktop table unchanged on mobile.

At widths below an appropriate breakpoint, use transaction cards or compact list rows.

Each mobile transaction item should show:

- Date
- Merchant or description
- Account
- Category
- Amount
- Income/expense/transfer styling
- Pending/imported status where relevant

Additional data may appear after tapping or expanding the row.

Requirements:

- No clipped columns.
- No horizontal page overflow.
- Amount must remain visible.
- Use positive/negative semantic formatting.
- Add filters through a compact filter drawer or sheet.
- Keep search usable on small screens.
- Place Rows/Page Size inside pagination controls rather than beside the search field.
- Ensure only one “Add transaction” action exists.
- Keep CSV Import and Export as secondary actions, perhaps inside an overflow menu on mobile.
- Preserve sortable desktop table behavior.
- Pagination controls must fit on a 320 px screen.
- Show a clear empty state when no transactions match.

Review whether future-dated records represent scheduled transactions. If so, label them accordingly rather than mixing them with completed transactions without explanation.

## 9. Improve Accounts page

On mobile:

- Use compact account cards.
- Clearly separate Assets and Liabilities.
- Each account card should show:
  - Name
  - Institution
  - Masked account identifier
  - Type
  - Current balance
  - Optional last-updated date
  - Overflow menu
- Avoid a large dedicated Edit button when an overflow action is cleaner.
- Empty liability state should be compact and include one clear Add liability action.
- Do not reserve hundreds of pixels of empty vertical space.
- Ensure account totals reconcile with account balances.
- Sorting controls must fit naturally on narrow screens.

## 10. Improve Goals and Upcoming Bills

Goals empty state:

- Reduce its height.
- Use a compact empty-state illustration/icon.
- Include one clear Add goal button.
- Do not leave a nearly blank half-screen card.

Upcoming Bills:

- Make the amount, due date, recurrence, account, and status easy to scan.
- Do not use “Reopen” unless the bill was explicitly marked paid or closed.
- Use context-appropriate actions such as Mark paid, Edit, Skip, or Reopen.
- Prevent text wrapping from making the bill card visually unbalanced.
- Show overdue, due soon, upcoming, and paid statuses consistently.
- Support configurable recurrence and autopay flags.

## 11. Reorganize Settings

Replace the single long form with clear sections:

- General
- Financial period
- Currency and locale
- Appearance
- Budget defaults
- Accounts
- Categories
- Dashboard widgets
- Notifications
- Import/export and backup
- Security and privacy

Requirements:

- On mobile, use grouped cards, accordions, or subpages.
- Add clear Save/Cancel behavior or implement reliable autosave with visible status.
- Show validation inline.
- Use suitable controls:
  - Select for currency and theme
  - Searchable time-zone selector
  - Numeric input with min/max for financial-month start
  - Percentage input with validation for budget warning threshold
- Do not display the month selector or Add transaction button on Settings.
- Include unsaved-change protection where applicable.

## 12. Establish a consistent design system

Create or refine reusable design tokens:

- Spacing scale
- Typography scale
- Border radius
- Card border and shadow
- Semantic colors
- Form control heights
- Responsive breakpoints
- Focus states

Visual direction:

- Calm off-white background
- Dark neutral typography
- Deep muted green accent
- Limited amber and red for warnings
- Subtle borders rather than heavy shadows
- Consistent 16–20 px mobile card padding
- Compact but breathable vertical spacing

Avoid:

- Random icon styles
- Emoji UI controls
- Oversized empty cards
- Excessively large page headings
- Identical placeholder charts
- Unexplained decorative percentages
- Desktop tables squeezed into mobile screens

## 13. Accessibility

Implement:

- Semantic headings
- Proper form labels
- Screen-reader labels for icons
- Keyboard navigation
- Visible focus states
- Sufficient contrast
- Chart text alternatives
- `aria-current` on active navigation
- Reduced-motion support where appropriate
- Minimum touch-target sizes

## 14. Loading, empty, and error states

Every data-driven section must have:

- Loading skeleton
- Empty state
- Error state
- Retry action where relevant

Avoid displaying zero values as if they were fetched successfully when the request actually failed.

## 15. Testing requirements

Add or update tests for:

- No horizontal overflow at supported mobile widths
- Fixed navigation does not cover content
- Transactions switch from desktop table to mobile list
- Header actions differ correctly by page
- No duplicate Add transaction button
- Settings does not show period or transaction controls
- Budget mobile layout
- Correct financial calculations
- Correct zero-debt presentation
- Missing historical data does not produce fabricated trends
- Custom financial-month period boundaries
- Accessible navigation and form labels

Add at least one end-to-end mobile test that:

1. Opens the Overview at 390 px width.
2. Scrolls to the bottom without content being covered.
3. Navigates through Transactions, Budget, Accounts, and Settings.
4. Adds or edits a transaction.
5. Verifies updated totals.
6. Confirms no horizontal page scrolling.

## Working method

1. Inspect the repository.
2. Summarize the root causes of the mobile problems.
3. Present a short implementation plan.
4. Implement shared components first.
5. Update each page incrementally.
6. Run formatter, lint, type checks, unit tests, and end-to-end tests.
7. Test at all required viewport sizes.
8. Fix every new failure.
9. Provide a final summary containing:
   - Files changed
   - Components created or refactored
   - Calculation bugs fixed
   - Responsive behavior changed
   - Tests added
   - Commands run
   - Test results
   - Any remaining limitations

Do not claim the mobile experience is fixed unless you have tested it at 320, 375, 390, and 430 px widths.

Do not modify unrelated backend functionality.

Do not hard-code the screenshot values.

Use the existing configurable accounts, categories, budgets, goals, bills, currencies, settings, and dashboard preferences as the data source.
