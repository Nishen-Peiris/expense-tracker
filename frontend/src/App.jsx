import {useEffect, useState} from 'react'
import api from './api'
import {Cell, Pie, PieChart, ResponsiveContainer, Tooltip,} from 'recharts'

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
    spendingByCategory: 'Spending by Category',
    categoryReport: 'Category Report',
    allCategories: 'All Categories',
    transactions: 'Transactions',
    recentTransactions: 'Recent Transactions',
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
    deleteTransactionError: 'Could not delete the transaction.',
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
                    {toAmount(amount).toLocaleString()}
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
                {toAmount(amount).toLocaleString()}
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

    const [loading, setLoading] = useState(false)

    const [saving, setSaving] = useState(false)

    const [monthInsight, setMonthInsight] = useState(null)

    const [insightLoading, setInsightLoading] = useState(false)

    const [insightError, setInsightError] = useState(false)

    const [isSmsModalOpen, setIsSmsModalOpen] = useState(false)

    const [isInsightModalOpen, setIsInsightModalOpen] = useState(false)

    const [deletingTransactionId, setDeletingTransactionId] = useState(null)

    useEffect(() => {
        loadTransactions(selectedMonth)
    }, [selectedMonth])

    useEffect(() => {
        if (!isInsightModalOpen) {
            return
        }

        loadMonthInsight(selectedMonth)
    }, [isInsightModalOpen, selectedMonth])

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

    const loadTransactions = async (monthToLoad = selectedMonth) => {
        const dateRange = getMonthDateRange(monthToLoad)

        const response = await api.get('/transactions', {
            params: dateRange,
        })

        setTransactions(sortTransactionsByDateDesc(
            response.data.filter(transaction => isTransactionInDateRange(transaction, dateRange)),
        ))
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
                ...response.data,
                category: normalizeCategory(response.data.category, response.data.type),
                transactionDate: new Date().toISOString(),
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

    const reportSummary = summarizeTransactions(reportTransactions)

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

    const openSmsModal = () => {
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

        setIsSmsModalOpen(false)
    }

    const openInsightModal = () => {
        setIsInsightModalOpen(true)
    }

    const closeInsightModal = () => {
        setIsInsightModalOpen(false)
    }

    return (
        <div className="app-shell p-4 transition-colors">

            <div className="max-w-xl mx-auto space-y-4">

                <div className="surface-card rounded-3xl p-6 transition-colors">
                    <div className="flex items-start justify-between gap-3">
                        <p className="text-muted">{UI_TEXT.availableBalance}</p>

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

                            <button
                                type="button"
                                onClick={openInsightModal}
                                aria-label={UI_TEXT.monthInsight}
                                title={UI_TEXT.monthInsight}
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
                                    <path d="M12 3l7 4v5c0 5-3.5 8-7 9-3.5-1-7-4-7-9V7l7-4z"/>
                                    <path d="M9 12l2 2 4-4"/>
                                </svg>
                            </button>

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
                                    onChange={(e) => {
                                        if (e.target.value) {
                                            setSelectedMonth(e.target.value)
                                        }
                                    }}
                                />
                            </label>
                        </div>
                    </div>

                    <h1 className={`page-title mt-2 ${remainingToneClass}`}>
                        <CurrencyAmount
                            amount={dashboard.remaining}
                            valueClassName="tabular-nums"
                        />
                    </h1>

                    <p className="text-muted mt-2">
                        {UI_TEXT.reportingPeriod}: {formatDateRange(selectedDateRange)}
                    </p>

                    <div className="mt-6 grid grid-cols-2 gap-3">

                        <div className="surface-positive min-w-0 rounded-2xl p-3">
                            <p className="text-subtle">{UI_TEXT.income}</p>
                            <p className="report-metric-value tone-positive tabular-nums">
                                <CurrencyAmount
                                    amount={dashboard.income}
                                    variant="compact"
                                    valueClassName="tabular-nums"
                                />
                            </p>
                        </div>

                        <div className="surface-negative min-w-0 rounded-2xl p-3">
                            <p className="text-subtle">{UI_TEXT.expenses}</p>
                            <p className="report-metric-value tone-negative tabular-nums">
                                <CurrencyAmount
                                    amount={dashboard.expenses}
                                    variant="compact"
                                    valueClassName="tabular-nums"
                                />
                            </p>
                        </div>

                    </div>
                </div>

                <div className="surface-card rounded-3xl p-6 transition-colors">

                    <h2 className="section-title mb-4">
                        {UI_TEXT.spendingByCategory}
                    </h2>

                    <div className="flex flex-col items-center gap-4">
                        <div className="h-64 w-full max-w-sm">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={chartData}
                                    dataKey="value"
                                    nameKey="name"
                                    outerRadius={90}
                                    cx="50%"
                                    cy="50%"
                                >
                                    {chartData.map((entry, index) => (
                                        <Cell
                                            key={index}
                                            fill={colors[index % colors.length]}
                                        />
                                    ))}
                                </Pie>
                                <Tooltip
                                    contentStyle={tooltipStyle}
                                    itemStyle={{color: isDarkMode ? '#e2e8f0' : '#0f172a'}}
                                    formatter={(value) => [`LKR ${Number(value).toLocaleString()}`, 'Amount']}
                                />
                            </PieChart>
                        </ResponsiveContainer>
                        </div>

                        <div className="flex w-full flex-wrap justify-center gap-x-6 gap-y-3 text-center text-base">
                            {chartData.map((entry, index) => (
                                <div
                                    key={entry.name}
                                    className="flex items-center gap-2"
                                >
                                    <span
                                        className="h-3.5 w-3.5 rounded-full shrink-0"
                                        style={{backgroundColor: colors[index % colors.length]}}
                                    />
                                    <span className="text-body">
                                        {entry.name}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>

                </div>

                <div className="surface-card rounded-3xl p-6 transition-colors">

                    <h2 className="section-title mb-4">
                        {UI_TEXT.categoryReport}
                    </h2>

                    <div>
                        <label className="field-label">
                            {UI_TEXT.category}
                        </label>

                        <select
                            className="field-control mt-1"
                            value={selectedCategory}
                            onChange={(e) => setSelectedCategory(e.target.value)}
                        >
                            <option value="ALL">{UI_TEXT.allCategories}</option>
                            {REPORT_CATEGORIES.map(category => (
                                <option
                                    key={category}
                                    value={category}
                                >
                                    {category}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="mt-4 grid grid-cols-2 gap-3">
                        <div className="surface-negative rounded-2xl p-3">
                            <p className="text-subtle">{UI_TEXT.expenses}</p>
                            <p className="report-metric-value tone-negative tabular-nums">
                                <CurrencyAmount
                                    amount={reportSummary.expenses}
                                    variant="compact"
                                    valueClassName="tabular-nums"
                                />
                            </p>
                        </div>

                        <div className="surface-subtle rounded-2xl p-3">
                            <p className="text-subtle">{UI_TEXT.transactions}</p>
                            <p className="report-metric-value tabular-nums">
                                {reportTransactions.length.toLocaleString()}
                            </p>
                        </div>
                    </div>

                    <div
                        className="mt-6 border-t pt-6"
                        style={{borderColor: 'var(--app-border)'}}
                    >
                        <h3 className="section-title mb-4">
                            {selectedCategory === 'ALL'
                                ? UI_TEXT.recentTransactions
                                : selectedCategory}
                        </h3>

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
                                                .toLocaleString()}
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
                            ))}

                            {reportTransactions.length === 0 && (
                                <p className="text-muted py-6 text-center">
                                    {UI_TEXT.noTransactionsForCategory}
                                </p>
                            )}

                        </div>
                    </div>

                </div>

            </div>

            {isSmsModalOpen && (
                <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/60 p-4 sm:items-center">
                    <div className="surface-card max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-3xl p-6 transition-colors">
                        <div className="flex items-start justify-between gap-3">
                            <h2 className="section-title">
                                {parsedTransaction ? UI_TEXT.reviewTransaction : UI_TEXT.pasteBankingSms}
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

                        {!parsedTransaction ? (
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
                                        value={parsedTransaction.type || ''}
                                        onChange={(e) => setParsedTransaction({
                                            ...parsedTransaction,
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
                                        value={parsedTransaction.amount || ''}
                                        onChange={(e) => setParsedTransaction({
                                            ...parsedTransaction,
                                            amount: e.target.value,
                                        })}
                                    />
                                </div>

                                <div>
                                    <label className="field-label">{UI_TEXT.merchant}</label>

                                    <input
                                        className="field-control mt-1"
                                        value={parsedTransaction.merchant || ''}
                                        onChange={(e) => setParsedTransaction({
                                            ...parsedTransaction,
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
                                            parsedTransaction.category,
                                            parsedTransaction.type,
                                        )}
                                        onChange={(e) => setParsedTransaction({
                                            ...parsedTransaction,
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
                                            parsedTransaction.transactionDate
                                                ? parsedTransaction.transactionDate.slice(0, 16)
                                                : new Date().toISOString().slice(0, 16)
                                        }
                                        onChange={(e) => setParsedTransaction({
                                            ...parsedTransaction,
                                            transactionDate: e.target.value,
                                        })}
                                    />
                                </div>

                                <button
                                    onClick={saveTransaction}
                                    disabled={saving}
                                    className="action-button button-success"
                                >
                                    {saving ? UI_TEXT.savingTransaction : UI_TEXT.saveTransaction}
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {isInsightModalOpen && (
                <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/60 p-4 sm:items-center">
                    <div className="surface-card max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-3xl p-6 transition-colors">
                        <div className="flex items-start justify-between gap-3">
                            <div>
                                <h2 className="section-title">
                                    {UI_TEXT.monthInsight}
                                </h2>
                                <p className="text-muted mt-1">
                                    {formatDateRange(selectedDateRange)}
                                </p>
                            </div>

                            <button
                                type="button"
                                onClick={closeInsightModal}
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

                        {!monthInsight && insightLoading && (
                            <p className="text-muted mt-4">
                                {UI_TEXT.loadingMonthInsight}
                            </p>
                        )}

                        {insightError && !monthInsight && (
                            <p className="text-muted mt-4">
                                {UI_TEXT.monthInsightError}
                            </p>
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

        </div>
    )
}

export default App
