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
    currentPeriod: 'Current period',
    previousPeriod: 'Previous period',
    comparisonError: 'We could not load both reporting periods for comparison.',
    noComparisonData: 'No expenses are available to compare across these periods.',
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

const formatDateRange = ({from, to}) => {
    const dateFormatter = new Intl.DateTimeFormat(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
    })

    const parseDateInputValue = (value) => {
        const [year, month, day] = value.split('-').map(Number)

        return new Date(year, month - 1, day)
    }

    return `${dateFormatter.format(parseDateInputValue(from))} - ${dateFormatter.format(parseDateInputValue(to))}`
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
    const parseDate = (value) => {
        const [year, month, day] = value.split('-').map(Number)
        return new Date(year, month - 1, day)
    }
    const currentStart = parseDate(currentRange.from)
    const currentEnd = parseDate(currentRange.to)
    const previousStart = parseDate(previousRange.from)
    const previousEnd = parseDate(previousRange.to)
    const dayMilliseconds = 24 * 60 * 60 * 1000
    const totalDays = Math.round((currentEnd - currentStart) / dayMilliseconds) + 1
    const currentCutoff = today < currentStart
        ? -1
        : Math.min(Math.floor((today - currentStart) / dayMilliseconds), totalDays - 1)

    const expenseByDay = (items, startDate) => items.reduce((totals, transaction) => {
        if (transaction.type !== 'EXPENSE') {
            return totals
        }

        const transactionDate = new Date(transaction.transactionDate)
        const dayIndex = Math.floor((transactionDate - startDate) / dayMilliseconds)
        totals[dayIndex] = (totals[dayIndex] || 0) + toAmount(transaction.amount)
        return totals
    }, {})

    const currentByDay = expenseByDay(currentTransactions, currentStart)
    const previousByDay = expenseByDay(previousTransactions, previousStart)
    const previousDays = Math.round((previousEnd - previousStart) / dayMilliseconds) + 1
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

    const isDarkMode = getStoredTheme() === 'dark'

    const tooltipStyle = {
        backgroundColor: isDarkMode ? '#0f172a' : '#ffffff',
        borderColor: isDarkMode ? '#334155' : '#dbe2ea',
        borderRadius: '16px',
        color: isDarkMode ? '#e2e8f0' : '#0f172a',
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

    const cashFlowProgress = Math.min(spentPercentage, 100)
    const cashFlowToneClass = spentPercentage > 100 ? 'is-over' : ''

    const finishChartSwipe = (touchEnd) => {
        if (chartTouchStart === null) {
            return
        }

        const distance = chartTouchStart - touchEnd

        if (Math.abs(distance) > 40) {
            setChartSlide(distance > 0 ? 1 : 0)
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

            <div className="max-w-xl mx-auto space-y-4">

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

                    <div className="cash-flow-summary mt-5">
                        <div className="cash-flow-values">
                            <div className="min-w-0">
                                <span className="text-subtle">{UI_TEXT.income}</span>
                                <p className="cash-flow-value tone-positive tabular-nums">
                                    <CurrencyAmount amount={dashboard.income} variant="compact"/>
                                </p>
                            </div>
                            <div className="min-w-0 text-right">
                                <span className="text-subtle">{UI_TEXT.expenses}</span>
                                <p className="cash-flow-value tone-negative tabular-nums">
                                    <CurrencyAmount amount={dashboard.expenses} variant="compact"/>
                                </p>
                            </div>
                        </div>

                        <div
                            className={`cash-flow-track ${cashFlowToneClass}`.trim()}
                            role="progressbar"
                            aria-label="Expenses as a percentage of income"
                            aria-valuemin="0"
                            aria-valuemax="100"
                            aria-valuenow={cashFlowProgress}
                        >
                            <span
                                className="cash-flow-fill"
                                style={{width: `${cashFlowProgress}%`}}
                            />
                        </div>

                        <p className={`cash-flow-caption ${spentPercentage > 100 ? 'tone-negative' : 'text-subtle'}`}>
                            {dashboard.income > 0
                                ? `${numberFormatter.format(spentPercentage)}% of income spent`
                                : dashboard.expenses > 0
                                    ? 'Expenses recorded with no income in this period'
                                    : 'Add income and expenses to track cash flow'}
                        </p>
                    </div>
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
                        style={{transform: `translateX(-${chartSlide * 50}%)`}}
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
                                            itemStyle={{color: isDarkMode ? '#e2e8f0' : '#0f172a'}}
                                            formatter={(value) => [`LKR ${formatLkrValue(value)}`, 'Amount']}
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
                                            <span className="text-subtle tabular-nums">
                                                LKR {formatLkrValue(entry.value)}
                                            </span>
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
                    </div>
                    </div>

                    <div className="chart-carousel-controls" aria-label="Chart selection">
                        {[UI_TEXT.expenseComparison, UI_TEXT.spendingByCategory].map((label, index) => (
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
                <div className="mx-auto mt-4 max-w-xl">
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
