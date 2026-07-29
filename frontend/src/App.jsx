import {useEffect, useState} from 'react'
import api from './api'
import {
    Cell,
    Legend,
    Line,
    LineChart,
    Pie,
    PieChart,
    ResponsiveContainer,
    Tooltip,
} from 'recharts'

const CATEGORIES = [
    'Salary',
    'Food & Dining',
    'Fuel, Transport & Vehicle',
    'Groceries & Daily Essentials',
    'Household & Utilities',
    'Insurance & Financial Commitments',
    'Internet, Mobile & Subscriptions',
    'Other',
    'Shopping & One-off Purchases',
    "Thattha's Support",
]

const REPORT_CATEGORIES = CATEGORIES.filter(category => category !== 'Salary')

const UI_TEXT = {
    availableBalance: 'Available Balance',
    reportingPeriod: 'Reporting Period',
    monthInsight: 'Month Insight',
    income: 'Income',
    expenses: 'Expenses',
    dailyPace: 'Daily Pace',
    projectedSpend: 'Projected Spend',
    confidence: 'Confidence',
    pasteBankingSms: 'Paste Banking SMS',
    pasteBankingSmsPlaceholder: 'Paste the banking SMS here...',
    analyzeBankingSms: 'Analyze Banking SMS',
    analyzingBankingSms: 'Analyzing Banking SMS...',
    reviewTransaction: 'Review Transaction',
    type: 'Type',
    amount: 'Amount',
    merchant: 'Merchant',
    category: 'Category',
    transactionDate: 'Transaction Date',
    saveTransaction: 'Save Transaction',
    savingTransaction: 'Saving Transaction...',
    editTransaction: 'Edit Transaction',
    edit: 'Edit',
    updateTransaction: 'Update Transaction',
    updatingTransaction: 'Updating Transaction...',
    spendingByCategory: 'Spending by Category',
    allCategories: 'All Categories',
    transactions: 'Transactions',
    changes: 'What Changed',
    forecast: 'Forecast',
    watchout: 'Watch Out',
    loadingMonthInsight: 'Generating month insight...',
    refreshingMonthInsight: 'Refreshing insight...',
    monthInsightError: 'Could not generate the month insight.',
    close: 'Close',
    deleting: 'Deleting...',
    delete: 'Delete',
    noTransactionsForCategory: 'No transactions found for the selected category.',
    parseSmsError: 'Could not analyze the banking SMS.',
    saveTransactionError: 'Could not save the transaction.',
    updateTransactionError: 'Could not update the transaction.',
    deleteTransactionError: 'Could not delete the transaction.',
    loadingTransactions: 'Loading your transactions...',
    transactionsError: 'We could not load transactions for this reporting period.',
    retry: 'Try again',
    noTransactions: 'No transactions in this reporting period yet.',
    noTransactionsHelp: 'Add a banking SMS to see your balance and spending breakdown.',
    addTransaction: 'Add transaction',
    noCategorySpending: 'No expense data to chart for this selection.',
    expenseComparison: 'Expense Comparison',
    cashFlow: 'Cash Flow',
    currentPeriod: 'Current period',
    previousPeriod: 'Previous period',
    comparisonError: 'We could not load both reporting periods for comparison.',
    noComparisonData: 'No expenses are available to compare across these periods.',
    periodProgress: 'Period Progress',
}

const defaultCategoryForType = (type) => {
    return type === 'INCOME'
        ? 'Salary'
        : 'Shopping & One-off Purchases'
}

const normalizeCategory = (category, type) => {
    return CATEGORIES.includes(category)
        ? category
        : defaultCategoryForType(type)
}

const formatType = (type) => {
    return type === 'INCOME' ? 'Income' : 'Expense'
}

const formatConfidence = (confidence) => {
    if (!confidence) {
        return 'Unknown'
    }

    return `${confidence.charAt(0)}${confidence.slice(1).toLowerCase()}`
}

const toAmount = (amount) => Number(amount) || 0
const numberFormatter = new Intl.NumberFormat('en-LK', {maximumFractionDigits: 2})
const formatLkrValue = (amount) => numberFormatter.format(toAmount(amount))

const toTransactionFormState = (transaction) => ({
    ...transaction,
    category: normalizeCategory(transaction.category, transaction.type),
    transactionDate: transaction.transactionDate
        ? transaction.transactionDate.slice(0, 16)
        : new Date().toISOString().slice(0, 16),
})

const padDatePart = (value) => String(value).padStart(2, '0')

const formatDateInputValue = (date) => {
    return [
        date.getFullYear(),
        padDatePart(date.getMonth() + 1),
        padDatePart(date.getDate()),
    ].join('-')
}

const formatMonthInputValue = (date) => {
    return [
        date.getFullYear(),
        padDatePart(date.getMonth() + 1),
    ].join('-')
}

const getDefaultSelectedMonth = (date = new Date()) => {
    const selectedDate = new Date(date)

    if (selectedDate.getDate() >= 25) {
        selectedDate.setMonth(selectedDate.getMonth() + 1)
    }

    return formatMonthInputValue(selectedDate)
}

const getMonthDateRange = (selectedMonth) => {
    if (!selectedMonth) {
        return getMonthDateRange(getDefaultSelectedMonth())
    }

    const [year, month] = selectedMonth.split('-').map(Number)

    return {
        from: formatDateInputValue(new Date(year, month - 2, 25)),
        to: formatDateInputValue(new Date(year, month - 1, 24)),
    }
}

const getPreviousMonthInputValue = (selectedMonth) => {
    const [year, month] = selectedMonth.split('-').map(Number)
    return formatMonthInputValue(new Date(year, month - 2, 1))
}

const parseDateInputValue = (value) => {
    const [year, month, day] = value.split('-').map(Number)
    return new Date(year, month - 1, day)
}

const toLocalDayNumber = (date) => Date.UTC(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
)

const formatDateRange = ({from, to}) => {
    const dateFormatter = new Intl.DateTimeFormat('en-LK', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
    })

    return `${dateFormatter.format(parseDateInputValue(from))} – ${dateFormatter.format(parseDateInputValue(to))}`
}

const getReportingPeriodProgress = ({from, to}, today = new Date()) => {
    const startDate = parseDateInputValue(from)
    const endDate = parseDateInputValue(to)
    const dayMilliseconds = 24 * 60 * 60 * 1000
    const startDay = toLocalDayNumber(startDate)
    const endDay = toLocalDayNumber(endDate)
    const todayDay = toLocalDayNumber(today)
    const totalDays = Math.round((endDay - startDay) / dayMilliseconds) + 1
    const elapsedDays = todayDay < startDay
        ? 0
        : todayDay > endDay
            ? totalDays
            : Math.floor((todayDay - startDay) / dayMilliseconds) + 1

    return {
        elapsedDays,
        totalDays,
        percentage: Math.round((elapsedDays / totalDays) * 100),
    }
}

const isTransactionInDateRange = (transaction, {from, to}) => {
    const transactionDate = new Date(transaction.transactionDate)
    const fromDate = new Date(`${from}T00:00:00`)
    const toDate = new Date(`${to}T23:59:59.999`)

    return transactionDate >= fromDate && transactionDate <= toDate
}

const sortTransactionsByDateDesc = (transactionsToSort) => {
    return [...transactionsToSort].sort((a, b) => {
        return new Date(b.transactionDate) - new Date(a.transactionDate)
    })
}

const summarizeTransactions = (transactionsToSummarize) => {
    return transactionsToSummarize.reduce((totals, transaction) => {
        const amount = toAmount(transaction.amount)

        if (transaction.type === 'INCOME') {
            return {
                ...totals,
                income: totals.income + amount,
                remaining: totals.remaining + amount,
            }
        }

        return {
            ...totals,
            expenses: totals.expenses + amount,
            remaining: totals.remaining - amount,
        }
    }, {
        income: 0,
        expenses: 0,
        remaining: 0,
    })
}

const buildExpenseComparison = (
    currentTransactions,
    previousTransactions,
    currentRange,
    previousRange,
    today = new Date(),
) => {
    const currentStart = parseDateInputValue(currentRange.from)
    const currentEnd = parseDateInputValue(currentRange.to)
    const previousStart = parseDateInputValue(previousRange.from)
    const previousEnd = parseDateInputValue(previousRange.to)
    const dayMilliseconds = 24 * 60 * 60 * 1000
    const currentStartDay = toLocalDayNumber(currentStart)
    const currentEndDay = toLocalDayNumber(currentEnd)
    const previousStartDay = toLocalDayNumber(previousStart)
    const previousEndDay = toLocalDayNumber(previousEnd)
    const todayDay = toLocalDayNumber(today)
    const totalDays = Math.round((currentEndDay - currentStartDay) / dayMilliseconds) + 1
    const currentCutoff = todayDay < currentStartDay
        ? -1
        : Math.min(Math.floor((todayDay - currentStartDay) / dayMilliseconds), totalDays - 1)

    const expenseByDay = (items, startDay) => items.reduce((totals, transaction) => {
        if (transaction.type !== 'EXPENSE') {
            return totals
        }

        const transactionDate = new Date(transaction.transactionDate)
        const dayIndex = Math.floor(
            (toLocalDayNumber(transactionDate) - startDay) / dayMilliseconds,
        )
        totals[dayIndex] = (totals[dayIndex] || 0) + toAmount(transaction.amount)
        return totals
    }, {})

    const currentByDay = expenseByDay(currentTransactions, currentStartDay)
    const previousByDay = expenseByDay(previousTransactions, previousStartDay)
    const previousDays = Math.round((previousEndDay - previousStartDay) / dayMilliseconds) + 1
    let currentTotal = 0
    let previousTotal = 0

    return Array.from({length: Math.max(totalDays, previousDays)}, (_, dayIndex) => {
        currentTotal += currentByDay[dayIndex] || 0
        previousTotal += previousByDay[dayIndex] || 0

        return {
            day: dayIndex + 1,
            current: dayIndex <= currentCutoff && dayIndex < totalDays ? currentTotal : null,
            previous: dayIndex < previousDays ? previousTotal : null,
        }
    })
}

const getStoredTheme = () => {
    if (typeof window === 'undefined') {
        return 'light'
    }

    return window.matchMedia('(prefers-color-scheme: dark)').matches
        ? 'dark'
        : 'light'
}

const CurrencyAmount = ({
    amount,
    className = '',
    currencyClassName = '',
    valueClassName = '',
    variant = 'inline',
}) => {
    if (variant === 'compact') {
        return (
            <span className={`currency-amount-compact ${className}`.trim()}>
                <span className={`currency-label-compact ${currencyClassName}`.trim()}>
                    LKR
                </span>
                <span className={`currency-value-compact ${valueClassName}`.trim()}>
                    {formatLkrValue(amount)}
                </span>
            </span>
        )
    }

    return (
        <span className={`currency-amount-inline ${className}`.trim()}>
            <span className={`currency-label-inline ${currencyClassName}`.trim()}>
                LKR
            </span>
            <span className={valueClassName}>
                {formatLkrValue(amount)}
            </span>
        </span>
    )
}

function App() {

    const [transactions, setTransactions] = useState([])

    const [selectedMonth, setSelectedMonth] = useState(getDefaultSelectedMonth)

    const [selectedCategory, setSelectedCategory] = useState('ALL')

    const [sms, setSms] = useState('')

    const [parsedTransaction, setParsedTransaction] = useState(null)

    const [editingTransaction, setEditingTransaction] = useState(null)

    const [loading, setLoading] = useState(false)

    const [saving, setSaving] = useState(false)

    const [monthInsight, setMonthInsight] = useState(null)

    const [insightLoading, setInsightLoading] = useState(false)

    const [insightError, setInsightError] = useState(false)

    const [isSmsModalOpen, setIsSmsModalOpen] = useState(false)

    const [activeView, setActiveView] = useState('overview')

    const [deletingTransactionId, setDeletingTransactionId] = useState(null)

    const [transactionsLoading, setTransactionsLoading] = useState(true)

    const [transactionsError, setTransactionsError] = useState(false)

    const [previousTransactions, setPreviousTransactions] = useState([])

    const [comparisonLoading, setComparisonLoading] = useState(true)

    const [comparisonError, setComparisonError] = useState(false)

    const [chartSlide, setChartSlide] = useState(0)

    const [chartTouchStart, setChartTouchStart] = useState(null)

    useEffect(() => {
        loadTransactions(selectedMonth)
        loadPreviousTransactions(selectedMonth)
    }, [selectedMonth])

    useEffect(() => {
        if (activeView !== 'insight') {
            return
        }

        loadMonthInsight(selectedMonth)
    }, [activeView, selectedMonth])

    useEffect(() => {
        if (typeof window === 'undefined') {
            return undefined
        }

        const root = window.document.documentElement
        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')

        const applyTheme = () => {
            const resolvedTheme = getStoredTheme()

            root.classList.toggle('dark', resolvedTheme === 'dark')
            root.style.colorScheme = resolvedTheme
        }

        applyTheme()

        mediaQuery.addEventListener('change', applyTheme)

        return () => {
            mediaQuery.removeEventListener('change', applyTheme)
        }
    }, [])

    const selectedDateRange = getMonthDateRange(selectedMonth)
    const previousDateRange = getMonthDateRange(getPreviousMonthInputValue(selectedMonth))

    const loadTransactions = async (monthToLoad = selectedMonth) => {
        const dateRange = getMonthDateRange(monthToLoad)

        setTransactionsLoading(true)
        setTransactionsError(false)

        try {
            const response = await api.get('/transactions', {
                params: dateRange,
            })

            setTransactions(sortTransactionsByDateDesc(
                response.data.filter(transaction => isTransactionInDateRange(transaction, dateRange)),
            ))
        } catch (e) {
            setTransactions([])
            setTransactionsError(true)
        } finally {
            setTransactionsLoading(false)
        }
    }

    const loadPreviousTransactions = async (monthToLoad = selectedMonth) => {
        const previousMonth = getPreviousMonthInputValue(monthToLoad)
        const dateRange = getMonthDateRange(previousMonth)

        setComparisonLoading(true)
        setComparisonError(false)

        try {
            const response = await api.get('/transactions', {params: dateRange})
            setPreviousTransactions(response.data.filter(transaction => (
                isTransactionInDateRange(transaction, dateRange)
            )))
        } catch (e) {
            setPreviousTransactions([])
            setComparisonError(true)
        } finally {
            setComparisonLoading(false)
        }
    }

    const loadMonthInsight = async (monthToLoad = selectedMonth) => {
        const dateRange = getMonthDateRange(monthToLoad)

        setInsightLoading(true)
        setInsightError(false)

        try {
            const response = await api.get('/ai/month-insight', {
                params: dateRange,
            })

            setMonthInsight(response.data)
        } catch (e) {
            setInsightError(true)
        } finally {
            setInsightLoading(false)
        }
    }

    const parseSms = async () => {

        if (!sms) {
            return
        }

        setLoading(true)

        try {

            const response = await api.post('/ai/parse-sms', {
                sms,
            })

            setParsedTransaction({
                ...toTransactionFormState(response.data),
                transactionDate: new Date().toISOString().slice(0, 16),
            })

        } catch (e) {
            alert(UI_TEXT.parseSmsError)
        }

        setLoading(false)
    }

    const saveTransaction = async () => {

        if (!parsedTransaction) {
            return
        }

        const transactionToSave = {
            ...parsedTransaction,
            amount: toAmount(parsedTransaction.amount),
            category: normalizeCategory(
                parsedTransaction.category,
                parsedTransaction.type,
            ),
        }

        setSaving(true)

        try {

            await api.post('/transactions', transactionToSave)
            await loadTransactions()

            setParsedTransaction(null)
            setSms('')
            setIsSmsModalOpen(false)

        } catch (e) {
            alert(UI_TEXT.saveTransactionError)
        } finally {
            setSaving(false)
        }
    }

    const updateTransaction = async () => {

        if (!editingTransaction?.id) {
            return
        }

        const transactionToUpdate = {
            ...editingTransaction,
            amount: toAmount(editingTransaction.amount),
            category: normalizeCategory(
                editingTransaction.category,
                editingTransaction.type,
            ),
        }

        setSaving(true)

        try {

            await api.put(`/transactions/${editingTransaction.id}`, transactionToUpdate)
            await loadTransactions()

            setEditingTransaction(null)
            setIsSmsModalOpen(false)

        } catch (e) {
            alert(UI_TEXT.updateTransactionError)
        } finally {
            setSaving(false)
        }
    }

    const deleteTransaction = async (transaction) => {

        if (!transaction?.id) {
            return
        }

        const merchant = transaction.merchant || transaction.category
        const confirmed = window.confirm(`Delete "${merchant}" from your transactions?`)

        if (!confirmed) {
            return
        }

        setDeletingTransactionId(transaction.id)

        try {

            await api.delete(`/transactions/${transaction.id}`)
            await loadTransactions()

        } catch (e) {
            alert(UI_TEXT.deleteTransactionError)
        } finally {
            setDeletingTransactionId(null)
        }
    }

    const dashboard = summarizeTransactions(transactions)

    const reportTransactions = selectedCategory === 'ALL'
        ? transactions
        : transactions.filter(transaction => transaction.category === selectedCategory)

    const categoryTotals = {}

    transactions.forEach(transaction => {

        if (transaction.type === 'EXPENSE') {

            if (!categoryTotals[transaction.category]) {
                categoryTotals[transaction.category] = 0
            }

            categoryTotals[transaction.category] += toAmount(transaction.amount)
        }
    })

    const chartData = Object.keys(categoryTotals).map(category => ({
        name: category,
        value: categoryTotals[category],
    }))

    const expenseComparisonData = buildExpenseComparison(
        transactions,
        previousTransactions,
        selectedDateRange,
        previousDateRange,
    )
    const hasExpenseComparisonData = expenseComparisonData.some(day => (
        (day.current || 0) > 0 || (day.previous || 0) > 0
    ))

    const colors = [
        'var(--app-chart-1)',
        'var(--app-chart-2)',
        'var(--app-chart-3)',
        'var(--app-chart-4)',
        'var(--app-chart-5)',
        'var(--app-chart-6)',
        'var(--app-chart-7)',
        'var(--app-chart-8)',
        'var(--app-chart-9)',
    ]

    const tooltipStyle = {
        backgroundColor: 'var(--app-surface)',
        borderColor: 'var(--app-border-strong)',
        borderRadius: '16px',
        color: 'var(--app-text)',
        fontSize: '14px',
    }

    const remainingToneClass = dashboard.remaining > 0
        ? 'tone-positive'
        : dashboard.remaining < 0
            ? 'tone-negative'
            : 'tone-default'

    const spentPercentage = dashboard.income > 0
        ? Math.round((dashboard.expenses / dashboard.income) * 100)
        : dashboard.expenses > 0
            ? 100
            : 0

    const cashFlowToneClass = spentPercentage > 100 ? 'is-over' : ''
    const cashFlowScale = Math.max(dashboard.income, dashboard.expenses, 1)
    const cashFlowExpenseWidth = (dashboard.expenses / cashFlowScale) * 100
    const cashFlowIncomeMarker = (dashboard.income / cashFlowScale) * 100
    const reportingPeriodProgress = getReportingPeriodProgress(selectedDateRange)
    const paceDifference = spentPercentage - reportingPeriodProgress.percentage
    const paceMessage = dashboard.income <= 0
        ? 'Record income to compare spending pace with time elapsed.'
        : reportingPeriodProgress.elapsedDays === 0
            ? 'This reporting period has not started yet.'
            : Math.abs(paceDifference) <= 5
                ? 'Spending and time elapsed are closely aligned.'
                : paceDifference > 0
                    ? `Spending is ${numberFormatter.format(paceDifference)} percentage points ahead of time.`
                    : `Spending is ${numberFormatter.format(Math.abs(paceDifference))} percentage points behind time.`

    const finishChartSwipe = (touchEnd) => {
        if (chartTouchStart === null) {
            return
        }

        const distance = chartTouchStart - touchEnd

        if (Math.abs(distance) > 40) {
            setChartSlide(currentSlide => (
                distance > 0
                    ? Math.min(currentSlide + 1, 2)
                    : Math.max(currentSlide - 1, 0)
            ))
        }

        setChartTouchStart(null)
    }

    const openSmsModal = () => {
        setIsSmsModalOpen(true)
    }

    const openEditTransaction = (transaction) => {
        setParsedTransaction(null)
        setEditingTransaction(toTransactionFormState(transaction))
        setIsSmsModalOpen(true)
    }

    const tryPasteSmsFromClipboard = async () => {
        if (typeof navigator === 'undefined' || !navigator.clipboard?.readText) {
            return
        }

        if (sms.trim() || parsedTransaction) {
            return
        }

        try {
            const clipboardText = await navigator.clipboard.readText()

            if (clipboardText?.trim()) {
                setSms((currentSms) => currentSms.trim() ? currentSms : clipboardText)
            }
        } catch (e) {
            // Clipboard access is best-effort and may be blocked by the browser.
        }
    }

    const openSmsModalWithClipboard = () => {
        openSmsModal()
        void tryPasteSmsFromClipboard()
    }

    const closeSmsModal = () => {
        if (saving || loading) {
            return
        }

        setParsedTransaction(null)
        setEditingTransaction(null)
        setIsSmsModalOpen(false)
    }

    const transactionForm = parsedTransaction || editingTransaction
    const isEditingTransaction = Boolean(editingTransaction)

    const MonthSelector = () => (
        <label className="relative block h-10 w-10 shrink-0">
                <span
                    aria-label="Select month"
                    title="Select month"
                    className="surface-subtle text-muted flex h-10 w-10 items-center justify-center rounded-xl"
                >
                    <svg
                        aria-hidden="true"
                        viewBox="0 0 24 24"
                        className="h-5 w-5"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    >
                        <path d="M8 2v4"/>
                        <path d="M16 2v4"/>
                        <path d="M3 10h18"/>
                        <rect x="3" y="4" width="18" height="18" rx="2"/>
                    </svg>
                </span>

                <input
                    type="month"
                    aria-label="Month"
                    className="absolute inset-0 h-10 w-10 cursor-pointer opacity-0"
                    value={selectedMonth}
                    onChange={(event) => {
                        if (event.target.value) {
                            setSelectedMonth(event.target.value)
                        }
                    }}
                />
        </label>
    )

    return (
        <div className="app-shell p-4 transition-colors">

            <div
                className="app-view-stack max-w-xl mx-auto"
                style={{display: activeView === 'insight' ? 'none' : undefined}}
            >

                {activeView === 'overview' && (
                <div className="surface-card overview-balance-card rounded-3xl p-6 transition-colors">
                    <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                            <h1 className="section-title">{UI_TEXT.availableBalance}</h1>
                            <p className="text-muted mt-1">{formatDateRange(selectedDateRange)}</p>
                        </div>

                        <div className="flex flex-wrap items-center justify-end gap-2">
                            <button
                                type="button"
                                onClick={openSmsModalWithClipboard}
                                aria-label={UI_TEXT.pasteBankingSms}
                                title={UI_TEXT.pasteBankingSms}
                                className="surface-subtle text-muted flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
                            >
                                <svg
                                    aria-hidden="true"
                                    viewBox="0 0 24 24"
                                    className="h-5 w-5"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                >
                                    <path d="M12 5v14"/>
                                    <path d="M5 12h14"/>
                                </svg>
                            </button>

                            <MonthSelector/>
                        </div>
                    </div>

                    <p className={`page-title mt-2 ${remainingToneClass}`}>
                        <CurrencyAmount
                            amount={dashboard.remaining}
                            valueClassName="tabular-nums"
                        />
                    </p>
                </div>
                )}

                {activeView === 'transactions' && (
                <div className="surface-card rounded-3xl p-6 transition-colors">
                    <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                            <h2 className="section-title">{UI_TEXT.transactions}</h2>
                            <p className="text-muted mt-1">{formatDateRange(selectedDateRange)}</p>
                        </div>
                        <MonthSelector/>
                    </div>

                    <label className="field-label mt-4 block" htmlFor="category-filter">
                        {UI_TEXT.category}
                    </label>
                    <select
                        id="category-filter"
                        className="field-control mt-1 mb-4"
                        value={selectedCategory}
                        onChange={(e) => setSelectedCategory(e.target.value)}
                    >
                        <option value="ALL">{UI_TEXT.allCategories}</option>
                        {REPORT_CATEGORIES.map(category => (
                            <option key={category} value={category}>{category}</option>
                        ))}
                    </select>

                    {transactionsLoading && (
                        <div className="empty-state" role="status">
                            <p className="text-muted">{UI_TEXT.loadingTransactions}</p>
                        </div>
                    )}

                    {!transactionsLoading && transactionsError && (
                        <div className="empty-state" role="alert">
                            <p className="text-body font-medium">{UI_TEXT.transactionsError}</p>
                            <button type="button" className="empty-state-action" onClick={() => loadTransactions(selectedMonth)}>
                                {UI_TEXT.retry}
                            </button>
                        </div>
                    )}

                    {!transactionsLoading && !transactionsError && reportTransactions.length === 0 && (
                        <div className="empty-state">
                            <p className="text-body font-medium">
                                {transactions.length === 0 ? UI_TEXT.noTransactions : UI_TEXT.noTransactionsForCategory}
                            </p>
                            <p className="text-muted mt-1">{UI_TEXT.noTransactionsHelp}</p>
                            <button type="button" className="empty-state-action" onClick={openSmsModalWithClipboard}>
                                {UI_TEXT.addTransaction}
                            </button>
                        </div>
                    )}

                    {!transactionsLoading && !transactionsError && reportTransactions.length > 0 && (
                        <div className="recent-transactions-list space-y-3">
                            {reportTransactions.map(transaction => (
                                <div
                                    key={transaction.id}
                                    className="recent-transaction-item flex items-center justify-between gap-4 border-b pb-3"
                                    style={{borderColor: 'var(--app-border)'}}
                                >
                                    <div className="min-w-0">
                                        <p className="text-body font-medium">
                                            {transaction.merchant || transaction.category}
                                        </p>

                                        <p className="text-muted">
                                            {transaction.category}
                                        </p>

                                        <p className="text-subtle mt-1">
                                            {new Date(transaction.transactionDate)
                                                .toLocaleString('en-LK')}
                                        </p>
                                    </div>

                                    <div className="text-right shrink-0">
                                        <p className="text-body font-semibold">
                                            <CurrencyAmount
                                                amount={transaction.amount}
                                                className="justify-end"
                                                currencyClassName="text-subtle"
                                                valueClassName="tabular-nums"
                                            />
                                        </p>

                                        <p className="text-subtle">
                                            {formatType(transaction.type)}
                                        </p>

                                        <div className="transaction-actions">
                                            <button
                                                type="button"
                                                onClick={() => openEditTransaction(transaction)}
                                                className="edit-button"
                                            >
                                                {UI_TEXT.edit}
                                            </button>

                                            <button
                                                type="button"
                                                onClick={() => deleteTransaction(transaction)}
                                                disabled={deletingTransactionId === transaction.id}
                                                className="delete-button"
                                            >
                                                {deletingTransactionId === transaction.id
                                                    ? UI_TEXT.deleting
                                                    : UI_TEXT.delete}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                </div>
                )}

                {activeView === 'overview' && (
                <div className="surface-card overview-category-card rounded-3xl p-6 transition-colors">
                    <div
                        className="chart-carousel"
                        onTouchStart={(event) => setChartTouchStart(event.touches[0].clientX)}
                        onTouchEnd={(event) => finishChartSwipe(event.changedTouches[0].clientX)}
                    >
                    <div
                        className="chart-carousel-track"
                        style={{transform: `translateX(-${chartSlide * (100 / 3)}%)`}}
                    >
                    <section
                        className="chart-carousel-slide"
                        aria-hidden={chartSlide !== 0}
                        inert={chartSlide !== 0}
                    >
                        <h2 className="section-title">{UI_TEXT.expenseComparison}</h2>
                        <p className="text-muted mt-1">Cumulative spending by reporting-period day</p>

                        {(comparisonLoading || transactionsLoading) && (
                            <div className="empty-state mt-4" role="status">
                                <p className="text-muted">Loading expense comparison...</p>
                            </div>
                        )}

                        {!comparisonLoading && !transactionsLoading && (comparisonError || transactionsError) && (
                            <div className="empty-state mt-4" role="alert">
                                <p className="text-body font-medium">{UI_TEXT.comparisonError}</p>
                                <button
                                    type="button"
                                    className="empty-state-action"
                                    onClick={() => {
                                        loadTransactions(selectedMonth)
                                        loadPreviousTransactions(selectedMonth)
                                    }}
                                >
                                    {UI_TEXT.retry}
                                </button>
                            </div>
                        )}

                        {!comparisonLoading
                            && !transactionsLoading
                            && !comparisonError
                            && !transactionsError
                            && hasExpenseComparisonData && (
                            <div className="expense-comparison-chart mt-4">
                                <ResponsiveContainer width="100%" height="100%">
                                    <LineChart data={expenseComparisonData} margin={{top: 12, right: 12, left: 12, bottom: 8}}>
                                        <Tooltip
                                            contentStyle={tooltipStyle}
                                            formatter={(value, name) => [
                                                `LKR ${formatLkrValue(value)}`,
                                                name === 'current' ? UI_TEXT.currentPeriod : UI_TEXT.previousPeriod,
                                            ]}
                                            labelFormatter={(day) => `Reporting period day ${day}`}
                                        />
                                        <Legend
                                            formatter={(value) => (
                                                value === 'current' ? UI_TEXT.currentPeriod : UI_TEXT.previousPeriod
                                            )}
                                        />
                                        <Line
                                            type="monotone"
                                            dataKey="previous"
                                            stroke="var(--app-chart-2)"
                                            strokeWidth={3}
                                            dot={false}
                                            activeDot={{r: 5, strokeWidth: 0}}
                                        />
                                        <Line
                                            type="monotone"
                                            dataKey="current"
                                            stroke="var(--app-chart-1)"
                                            strokeWidth={3}
                                            dot={false}
                                            activeDot={{r: 5, strokeWidth: 0}}
                                            connectNulls={false}
                                        />
                                    </LineChart>
                                </ResponsiveContainer>
                            </div>
                        )}

                        {!comparisonLoading
                            && !transactionsLoading
                            && !comparisonError
                            && !transactionsError
                            && !hasExpenseComparisonData && (
                            <div className="empty-state mt-4">
                                <p className="text-body font-medium">{UI_TEXT.noComparisonData}</p>
                                <p className="text-muted mt-1">{UI_TEXT.noTransactionsHelp}</p>
                                <button
                                    type="button"
                                    className="empty-state-action"
                                    onClick={openSmsModalWithClipboard}
                                >
                                    {UI_TEXT.addTransaction}
                                </button>
                            </div>
                        )}
                    </section>

                    <section
                        className="chart-carousel-slide"
                        aria-hidden={chartSlide !== 1}
                        inert={chartSlide !== 1}
                    >
                    <h2 className="section-title">{UI_TEXT.spendingByCategory}</h2>
                    <p className="text-muted mt-1">Expense share across categories</p>

                    {transactionsLoading && (
                        <div className="empty-state mt-4" role="status">
                            <p className="text-muted">{UI_TEXT.loadingTransactions}</p>
                        </div>
                    )}

                    {!transactionsLoading && transactionsError && (
                        <div className="empty-state mt-4" role="alert">
                            <p className="text-body font-medium">{UI_TEXT.transactionsError}</p>
                            <button
                                type="button"
                                className="empty-state-action"
                                onClick={() => loadTransactions(selectedMonth)}
                            >
                                {UI_TEXT.retry}
                            </button>
                        </div>
                    )}

                    {!transactionsLoading && !transactionsError && chartData.length > 0 ? (
                        <div className="mt-4 flex flex-col items-center gap-4">
                            <div className="category-chart w-full max-w-sm">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie data={chartData} dataKey="value" nameKey="name" outerRadius={82}>
                                            {chartData.map((entry, index) => (
                                                <Cell key={entry.name} fill={colors[index % colors.length]}/>
                                            ))}
                                        </Pie>
                                        <Tooltip
                                            contentStyle={tooltipStyle}
                                            itemStyle={{color: 'var(--app-text)'}}
                                            formatter={(value, _name, item) => [
                                                `LKR ${formatLkrValue(value)}`,
                                                item.payload.name,
                                            ]}
                                        />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>

                            <div className="category-legend">
                                {chartData.map((entry, index) => (
                                    <div key={entry.name} className="category-legend-item">
                                        <span
                                            className="h-3 w-3 shrink-0 rounded-full"
                                            style={{backgroundColor: colors[index % colors.length]}}
                                        />
                                        <span className="min-w-0">
                                            <span className="text-body block truncate">{entry.name}</span>
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ) : !transactionsLoading && !transactionsError && (
                        <div className="empty-state mt-4">
                            <p className="text-body font-medium">{UI_TEXT.noCategorySpending}</p>
                            <p className="text-muted mt-1">{UI_TEXT.noTransactionsHelp}</p>
                            <button type="button" className="empty-state-action" onClick={openSmsModalWithClipboard}>
                                {UI_TEXT.addTransaction}
                            </button>
                        </div>
                    )}
                    </section>

                    <section
                        className="chart-carousel-slide"
                        aria-hidden={chartSlide !== 2}
                        inert={chartSlide !== 2}
                    >
                        <h2 className="section-title">{UI_TEXT.cashFlow}</h2>
                        <p className="text-muted mt-1">Expenses measured against recorded income</p>

                        <div className="cash-flow-chart mt-6">
                            <div
                                className={`cash-flow-bullet ${cashFlowToneClass}`.trim()}
                                role="img"
                                aria-label={
                                    dashboard.income > 0
                                        ? `${numberFormatter.format(spentPercentage)} percent of income spent`
                                        : 'No income recorded for this period'
                                }
                            >
                                <span
                                    className="cash-flow-bullet-fill"
                                    style={{width: `${cashFlowExpenseWidth}%`}}
                                />
                                {dashboard.income > 0 && (
                                    <span
                                        className="cash-flow-income-marker"
                                        style={{left: `${cashFlowIncomeMarker}%`}}
                                    >
                                        <span>Income</span>
                                    </span>
                                )}
                            </div>

                            <p className={`cash-flow-chart-caption ${spentPercentage > 100 ? 'tone-negative' : 'text-muted'}`}>
                                {dashboard.income > 0
                                    ? `${numberFormatter.format(spentPercentage)}% of income spent`
                                    : dashboard.expenses > 0
                                        ? 'Expenses recorded with no income in this period'
                                        : 'Add income and expenses to see your cash flow'}
                            </p>

                            <div className="period-progress">
                                <div className="period-progress-heading">
                                    <span className="text-body">{UI_TEXT.periodProgress}</span>
                                    <span className="text-subtle tabular-nums">
                                        Day {numberFormatter.format(reportingPeriodProgress.elapsedDays)}
                                        {' '}of {numberFormatter.format(reportingPeriodProgress.totalDays)}
                                    </span>
                                </div>
                                <div
                                    className="period-progress-track"
                                    role="progressbar"
                                    aria-label="Reporting period elapsed"
                                    aria-valuemin="0"
                                    aria-valuemax={reportingPeriodProgress.totalDays}
                                    aria-valuenow={reportingPeriodProgress.elapsedDays}
                                    aria-valuetext={
                                        `${reportingPeriodProgress.elapsedDays} of ${reportingPeriodProgress.totalDays} days elapsed`
                                    }
                                >
                                    <span
                                        className="period-progress-fill"
                                        style={{width: `${reportingPeriodProgress.percentage}%`}}
                                    />
                                </div>
                                <p className={`cash-flow-chart-caption ${
                                    paceDifference > 5 && dashboard.income > 0
                                        ? 'tone-negative'
                                        : 'text-muted'
                                }`}>
                                    {paceMessage}
                                </p>
                            </div>

                            <div className="cash-flow-metrics">
                                <div className="cash-flow-metric-item">
                                    <span
                                        className="h-3 w-3 shrink-0 rounded-full"
                                        style={{backgroundColor: 'var(--app-chart-2)'}}
                                    />
                                    <div className="min-w-0">
                                        <p className="text-body">{UI_TEXT.income}</p>
                                        <p className="cash-flow-metric tone-positive">
                                            <CurrencyAmount amount={dashboard.income} variant="compact"/>
                                        </p>
                                    </div>
                                </div>
                                <div className="cash-flow-metric-item">
                                    <span
                                        className="h-3 w-3 shrink-0 rounded-full"
                                        style={{backgroundColor: 'var(--app-chart-1)'}}
                                    />
                                    <div className="min-w-0">
                                        <p className="text-body">{UI_TEXT.expenses}</p>
                                        <p className="cash-flow-metric tone-negative">
                                            <CurrencyAmount amount={dashboard.expenses} variant="compact"/>
                                        </p>
                                    </div>
                                </div>
                                <div className="cash-flow-metric-item">
                                    <span
                                        className="h-3 w-3 shrink-0 rounded-full"
                                        style={{backgroundColor: 'var(--app-chart-3)'}}
                                    />
                                    <div className="min-w-0">
                                        <p className="text-body">{UI_TEXT.availableBalance}</p>
                                        <p className={`cash-flow-metric ${remainingToneClass}`}>
                                            <CurrencyAmount amount={dashboard.remaining} variant="compact"/>
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </section>
                    </div>
                    </div>

                    <div className="chart-carousel-controls" aria-label="Chart selection">
                        {[UI_TEXT.expenseComparison, UI_TEXT.spendingByCategory, UI_TEXT.cashFlow].map((label, index) => (
                            <button
                                key={label}
                                type="button"
                                className={`chart-carousel-dot ${chartSlide === index ? 'is-active' : ''}`.trim()}
                                aria-label={`Show ${label}`}
                                aria-pressed={chartSlide === index}
                                onClick={() => setChartSlide(index)}
                            />
                        ))}
                    </div>
                </div>
                )}

            </div>

            {isSmsModalOpen && (
                <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/60 p-4 sm:items-center">
                    <div className="surface-card max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-3xl p-6 transition-colors">
                        <div className="flex items-start justify-between gap-3">
                            <h2 className="section-title">
                                {transactionForm
                                    ? isEditingTransaction
                                        ? UI_TEXT.editTransaction
                                        : UI_TEXT.reviewTransaction
                                    : UI_TEXT.pasteBankingSms}
                            </h2>

                            <button
                                type="button"
                                onClick={closeSmsModal}
                                aria-label={UI_TEXT.close}
                                title={UI_TEXT.close}
                                className="surface-subtle text-muted flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
                            >
                                <svg
                                    aria-hidden="true"
                                    viewBox="0 0 24 24"
                                    className="h-5 w-5"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                >
                                    <path d="M18 6L6 18"/>
                                    <path d="M6 6l12 12"/>
                                </svg>
                            </button>
                        </div>

                        {!transactionForm ? (
                            <>
                                <textarea
                                    className="field-control mt-4 h-32 rounded-2xl"
                                    placeholder={UI_TEXT.pasteBankingSmsPlaceholder}
                                    value={sms}
                                    onChange={(e) => setSms(e.target.value)}
                                />

                                <button
                                    onClick={parseSms}
                                    disabled={loading}
                                    className="action-button button-neutral mt-4"
                                >
                                    {loading ? UI_TEXT.analyzingBankingSms : UI_TEXT.analyzeBankingSms}
                                </button>
                            </>
                        ) : (
                            <div className="mt-4 space-y-4">
                                <div>
                                    <label className="field-label">{UI_TEXT.type}</label>

                                    <select
                                        className="field-control mt-1"
                                        value={transactionForm.type || ''}
                                        onChange={(e) => (isEditingTransaction ? setEditingTransaction : setParsedTransaction)({
                                            ...transactionForm,
                                            type: e.target.value,
                                        })}
                                    >
                                        <option value="EXPENSE">Expense</option>
                                        <option value="INCOME">Income</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="field-label">{UI_TEXT.amount}</label>

                                    <input
                                        type="number"
                                        className="field-control mt-1"
                                        value={transactionForm.amount || ''}
                                        onChange={(e) => (isEditingTransaction ? setEditingTransaction : setParsedTransaction)({
                                            ...transactionForm,
                                            amount: e.target.value,
                                        })}
                                    />
                                </div>

                                <div>
                                    <label className="field-label">{UI_TEXT.merchant}</label>

                                    <input
                                        className="field-control mt-1"
                                        value={transactionForm.merchant || ''}
                                        onChange={(e) => (isEditingTransaction ? setEditingTransaction : setParsedTransaction)({
                                            ...transactionForm,
                                            merchant: e.target.value,
                                        })}
                                    />
                                </div>

                                <div>
                                    <label className="field-label">
                                        {UI_TEXT.category}
                                    </label>

                                    <select
                                        className="field-control mt-1"
                                        value={normalizeCategory(
                                            transactionForm.category,
                                            transactionForm.type,
                                        )}
                                        onChange={(e) => (isEditingTransaction ? setEditingTransaction : setParsedTransaction)({
                                            ...transactionForm,
                                            category: e.target.value,
                                        })}
                                    >
                                        {CATEGORIES.map(category => (
                                            <option
                                                key={category}
                                                value={category}
                                            >
                                                {category}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="field-label">
                                        {UI_TEXT.transactionDate}
                                    </label>

                                    <input
                                        type="datetime-local"
                                        className="field-control mt-1"
                                        value={
                                            transactionForm.transactionDate
                                                ? transactionForm.transactionDate.slice(0, 16)
                                                : new Date().toISOString().slice(0, 16)
                                        }
                                        onChange={(e) => (isEditingTransaction ? setEditingTransaction : setParsedTransaction)({
                                            ...transactionForm,
                                            transactionDate: e.target.value,
                                        })}
                                    />
                                </div>

                                <button
                                    onClick={isEditingTransaction ? updateTransaction : saveTransaction}
                                    disabled={saving}
                                    className="action-button button-success"
                                >
                                    {saving
                                        ? (isEditingTransaction
                                            ? UI_TEXT.updatingTransaction
                                            : UI_TEXT.savingTransaction)
                                        : (isEditingTransaction
                                            ? UI_TEXT.updateTransaction
                                            : UI_TEXT.saveTransaction)}
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {activeView === 'insight' && (
                <div className="app-view-stack mx-auto max-w-xl">
                    <div className="surface-card w-full rounded-3xl p-6 transition-colors">
                        <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                                <h2 className="section-title">
                                    {UI_TEXT.monthInsight}
                                </h2>
                                <p className="text-muted mt-1">{formatDateRange(selectedDateRange)}</p>
                            </div>
                            <MonthSelector/>
                        </div>

                        {!monthInsight && insightLoading && (
                            <p className="text-muted mt-4">
                                {UI_TEXT.loadingMonthInsight}
                            </p>
                        )}

                        {insightError && !monthInsight && (
                            <div className="empty-state mt-4" role="alert">
                                <p className="text-body font-medium">{UI_TEXT.monthInsightError}</p>
                                <button
                                    type="button"
                                    className="empty-state-action"
                                    onClick={() => loadMonthInsight(selectedMonth)}
                                >
                                    {UI_TEXT.retry}
                                </button>
                            </div>
                        )}

                        {monthInsight && (
                            <>
                                {insightLoading && (
                                    <p className="text-subtle mt-4">
                                        {UI_TEXT.refreshingMonthInsight}
                                    </p>
                                )}

                                <p className="text-body mt-4 font-medium">
                                    {monthInsight.headline}
                                </p>

                                <div className="mt-4 grid grid-cols-2 gap-3">
                                    <div className="surface-negative rounded-2xl p-3">
                                        <p className="text-subtle">{UI_TEXT.expenses}</p>
                                        <p className="report-metric-value tone-negative tabular-nums">
                                            <CurrencyAmount
                                                amount={monthInsight.expensesSoFar}
                                                variant="compact"
                                                valueClassName="tabular-nums"
                                            />
                                        </p>
                                    </div>

                                    <div className="surface-subtle rounded-2xl p-3">
                                        <p className="text-subtle">{UI_TEXT.availableBalance}</p>
                                        <p className="report-metric-value tabular-nums">
                                            <CurrencyAmount
                                                amount={monthInsight.remainingSoFar}
                                                variant="compact"
                                                valueClassName="tabular-nums"
                                            />
                                        </p>
                                    </div>

                                    <div className="surface-subtle rounded-2xl p-3">
                                        <p className="text-subtle">{UI_TEXT.dailyPace}</p>
                                        <p className="report-metric-value tabular-nums">
                                            <CurrencyAmount
                                                amount={monthInsight.dailyExpensePace}
                                                variant="compact"
                                                valueClassName="tabular-nums"
                                            />
                                        </p>
                                    </div>

                                    <div className="surface-subtle rounded-2xl p-3">
                                        <p className="text-subtle">{UI_TEXT.projectedSpend}</p>
                                        <p className="report-metric-value tabular-nums">
                                            <CurrencyAmount
                                                amount={monthInsight.projectedMonthEndExpenses}
                                                variant="compact"
                                                valueClassName="tabular-nums"
                                            />
                                        </p>
                                    </div>
                                </div>

                                <div className="mt-5 space-y-4">
                                    <div>
                                        <p className="field-label">{UI_TEXT.changes}</p>
                                        <p className="text-body mt-1">{monthInsight.changes}</p>
                                    </div>

                                    <div>
                                        <p className="field-label">{UI_TEXT.forecast}</p>
                                        <p className="text-body mt-1">{monthInsight.forecast}</p>
                                    </div>

                                    <div>
                                        <p className="field-label">{UI_TEXT.watchout}</p>
                                        <p className="text-body mt-1">{monthInsight.watchout}</p>
                                    </div>
                                </div>

                                <div className="mt-5 grid grid-cols-2 gap-3">
                                    <div className="surface-subtle rounded-2xl p-3">
                                        <p className="text-subtle">{UI_TEXT.reportingPeriod}</p>
                                        <p className="text-body mt-1">
                                            {monthInsight.daysElapsed} / {monthInsight.totalDays} days
                                        </p>
                                    </div>

                                    <div className="surface-subtle rounded-2xl p-3">
                                        <p className="text-subtle">{UI_TEXT.confidence}</p>
                                        <p className="report-metric-value">
                                            {formatConfidence(monthInsight.confidence)}
                                        </p>
                                    </div>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            )}

            <nav className="app-navigation" aria-label="Primary navigation">
                <div className="app-navigation-inner">
                    {[
                        ['overview', 'Overview'],
                        ['transactions', UI_TEXT.transactions],
                        ['insight', UI_TEXT.monthInsight],
                    ].map(([view, label]) => (
                        <button
                            key={view}
                            type="button"
                            className={`app-navigation-item ${activeView === view ? 'is-active' : ''}`.trim()}
                            aria-current={activeView === view ? 'page' : undefined}
                            onClick={() => setActiveView(view)}
                        >
                            {label}
                        </button>
                    ))}
                </div>
            </nav>

        </div>
    )
}

export default App
