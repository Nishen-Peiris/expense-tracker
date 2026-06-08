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

    const [deletingTransactionId, setDeletingTransactionId] = useState(null)

    useEffect(() => {
        loadTransactions(selectedMonth)
    }, [selectedMonth])

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
            alert('Failed to parse SMS')
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

        } catch (e) {
            alert('Failed to save transaction')
        } finally {
            setSaving(false)
        }
    }

    const deleteTransaction = async (transaction) => {

        if (!transaction?.id) {
            return
        }

        const merchant = transaction.merchant || transaction.category
        const confirmed = window.confirm(`Delete
        ${merchant} from your transactions?`)

        if (!confirmed) {
            return
        }

        setDeletingTransactionId(transaction.id)

        try {

            await api.delete(`/transactions/${transaction.id}`)
            await loadTransactions()

        } catch (e) {
            alert('Failed to delete transaction')
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

    return (
        <div className="app-shell p-4 transition-colors">

            <div className="max-w-xl mx-auto space-y-4">

                <div className="surface-card rounded-3xl p-6 transition-colors">
                    <div className="flex items-start justify-between gap-3">
                        <p className="text-muted">Available</p>

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

                    <h1 className={`page-title mt-2 ${remainingToneClass}`}>
                        <CurrencyAmount
                            amount={dashboard.remaining}
                            valueClassName="tabular-nums"
                        />
                    </h1>

                    <p className="text-muted mt-2">
                        Based on {formatDateRange(selectedDateRange)}
                    </p>

                    <div className="grid grid-cols-2 gap-4 mt-6">

                        <div className="surface-positive rounded-2xl p-4">
                            <p className="metric-title">Income</p>
                            <h2 className="metric-value tone-positive">
                                <CurrencyAmount
                                    amount={dashboard.income}
                                    variant="compact"
                                    valueClassName="tabular-nums"
                                />
                            </h2>
                        </div>

                        <div className="surface-negative rounded-2xl p-4">
                            <p className="metric-title">Expenses</p>
                            <h2 className="metric-value tone-negative">
                                <CurrencyAmount
                                    amount={dashboard.expenses}
                                    variant="compact"
                                    valueClassName="tabular-nums"
                                />
                            </h2>
                        </div>

                    </div>
                </div>

                <div className="surface-card rounded-3xl p-6 transition-colors">

                    <h2 className="section-title mb-4">
                        Paste Banking SMS
                    </h2>

                    <textarea
                        className="field-control h-32 rounded-2xl"
                        placeholder="Paste your banking SMS here..."
                        value={sms}
                        onChange={(e) => setSms(e.target.value)}
                    />

                    <button
                        onClick={parseSms}
                        disabled={loading}
                        className="action-button button-neutral mt-4"
                    >
                        {loading ? 'Analyzing SMS...' : 'Analyze SMS'}
                    </button>

                </div>

                {parsedTransaction && (
                    <div className="surface-card space-y-4 rounded-3xl p-6 transition-colors">

                        <h2 className="section-title">
                            Parsed Transaction
                        </h2>

                        <div>
                            <label className="field-label">Type</label>

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
                            <label className="field-label">Amount</label>

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
                            <label className="field-label">Merchant</label>

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
                                Category
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
                                Transaction Date
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
                            {saving ? 'Saving Transaction...' : 'Save Transaction'}
                        </button>

                    </div>
                )}

                <div className="surface-card rounded-3xl p-6 transition-colors">

                    <h2 className="section-title mb-4">
                        Expense Categories
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
                        Reports
                    </h2>

                    <div>
                        <label className="field-label">
                            Category
                        </label>

                        <select
                            className="field-control mt-1"
                            value={selectedCategory}
                            onChange={(e) => setSelectedCategory(e.target.value)}
                        >
                            <option value="ALL">All Categories</option>
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

                    {selectedCategory === 'ALL' ? (
                        <>
                            <div className="mt-4 grid grid-cols-2 gap-3">
                                <div className="surface-positive rounded-2xl p-3">
                                    <p className="text-subtle">Income</p>
                                    <p className="report-metric-value tone-positive tabular-nums">
                                        <CurrencyAmount
                                            amount={reportSummary.income}
                                            variant="compact"
                                            valueClassName="tabular-nums"
                                        />
                                    </p>
                                </div>

                                <div className="surface-negative rounded-2xl p-3">
                                    <p className="text-subtle">Expenses</p>
                                    <p className="report-metric-value tone-negative tabular-nums">
                                        <CurrencyAmount
                                            amount={reportSummary.expenses}
                                            variant="compact"
                                            valueClassName="tabular-nums"
                                        />
                                    </p>
                                </div>
                            </div>

                            <div className="surface-subtle mt-3 rounded-2xl p-4">
                                <p className="metric-title">Net</p>
                                <p className={`summary-net-value tabular-nums ${remainingToneClass}`}>
                                    <CurrencyAmount
                                        amount={reportSummary.remaining}
                                        valueClassName="tabular-nums"
                                    />
                                </p>
                            </div>
                        </>
                    ) : (
                        <div className="mt-4 grid grid-cols-2 gap-3">
                            <div className="surface-negative rounded-2xl p-3">
                                <p className="text-subtle">Expenses</p>
                                <p className="report-metric-value tone-negative tabular-nums">
                                    <CurrencyAmount
                                        amount={reportSummary.expenses}
                                        variant="compact"
                                        valueClassName="tabular-nums"
                                    />
                                </p>
                            </div>

                            <div className="surface-subtle rounded-2xl p-3">
                                <p className="text-subtle">Transactions</p>
                                <p className="report-metric-value tabular-nums">
                                    {reportTransactions.length.toLocaleString()}
                                </p>
                            </div>
                        </div>
                    )}

                </div>

                <div className="surface-card rounded-3xl p-6 transition-colors">

                    <h2 className="section-title mb-4">
                        {selectedCategory === 'ALL'
                            ? 'Recent Transactions'
                            : selectedCategory}
                    </h2>

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
                                            ? 'Deleting...'
                                            : 'Delete'}
                                    </button>
                                </div>

                            </div>
                        ))}

                        {reportTransactions.length === 0 && (
                            <p className="text-muted py-6 text-center">
                                No transactions found for this category.
                            </p>
                        )}

                    </div>

                </div>

            </div>

        </div>
    )
}

export default App
