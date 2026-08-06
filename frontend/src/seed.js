const id = (prefix, n) => `${prefix}-${String(n).padStart(3, '0')}`;
const today = new Date().toISOString().slice(0, 10);
export const emptyData = () => ({ version: 1, accounts: [], categories: [], transactions: [], budgets: [], bills: [], goals: [], holdings: [], loans: [], tags: [], events: [], snapshots: [], attachments: [], widgets: [], notifications: [], settings: { primaryCurrency: 'USD', currencies: ['USD'], rates: { USD: '1' }, locale: 'en-US', dateFormat: 'medium', monthStart: 1, theme: 'system', timezone: Intl.DateTimeFormat().resolvedOptions().timeZone, aiEnabled: false, budgetWarning: 80, overviewInsightsLimit: 2, overviewSpendingLimit: 2, overviewBudgetsLimit: 2, overviewGoalsLimit: 2, overviewBillsLimit: 2 } });
export const demoData = () => ({
  version: 1,
  settings: { primaryCurrency: 'LKR', currencies: ['LKR', 'USD'], rates: { LKR: '1', USD: '302.50' }, locale: 'en-LK', dateFormat: 'medium', monthStart: 1, theme: 'system', timezone: 'Asia/Colombo', aiEnabled: false, budgetWarning: 80, overviewInsightsLimit: 2, overviewSpendingLimit: 2, overviewBudgetsLimit: 2, overviewGoalsLimit: 2, overviewBillsLimit: 2 },
  accounts: [
    { id: id('acc', 1), name: 'Everyday Current', institution: 'Commercial Bank', type: 'current', group: 'asset', currency: 'LKR', balance: '428500.00', openingBalance: '320000.00', mask: '•••• 4821', includeNetWorth: true, archived: false, color: '#635bff', notes: '' },
    { id: id('acc', 2), name: 'Family Savings', institution: 'Sampath Bank', type: 'savings', group: 'asset', currency: 'LKR', balance: '1650000.00', openingBalance: '1200000.00', mask: '•••• 1018', includeNetWorth: true, archived: false, color: '#4069a8', notes: '' },
    { id: id('acc', 3), name: 'Home Loan', institution: 'Local lender', type: 'mortgage', group: 'liability', currency: 'LKR', balance: '6850000.00', openingBalance: '8000000.00', mask: '•••• 7302', includeNetWorth: true, archived: false, color: '#b04d4d', notes: '' }
  ],
  categories: [
    { id: id('cat', 1), name: 'Salary', type: 'income', icon: '↗', color: '#635bff', archived: false },
    { id: id('cat', 2), name: 'Groceries', type: 'expense', icon: '◫', color: '#d78a3d', archived: false },
    { id: id('cat', 3), name: 'Utilities', type: 'expense', icon: '⌁', color: '#5277b8', archived: false },
    { id: id('cat', 4), name: 'Transport', type: 'expense', icon: '◇', color: '#9467bd', archived: false },
    { id: id('cat', 5), name: 'Dining', type: 'expense', icon: '○', color: '#d16473', archived: false }
  ],
  transactions: [
    { id: id('txn', 1), date: today, description: 'Monthly salary', merchant: 'Employer', amount: '475000.00', currency: 'LKR', accountId: id('acc', 1), categoryId: id('cat', 1), type: 'income', tags: ['monthly'], status: 'cleared', notes: '' },
    { id: id('txn', 2), date: today, description: 'Weekly groceries', merchant: 'Local supermarket', amount: '32750.00', currency: 'LKR', accountId: id('acc', 1), categoryId: id('cat', 2), type: 'expense', tags: ['household'], status: 'cleared', notes: '' },
    { id: id('txn', 3), date: today, description: 'Savings transfer', merchant: 'Internal transfer', amount: '100000.00', currency: 'LKR', accountId: id('acc', 1), categoryId: '', type: 'transfer', transferAccountId: id('acc', 2), tags: [], status: 'cleared', notes: '' },
    { id: id('txn', 4), date: today, description: 'Fuel', merchant: 'Fuel station', amount: '18500.00', currency: 'LKR', accountId: id('acc', 1), categoryId: id('cat', 4), type: 'expense', tags: [], status: 'pending', notes: '' }
  ],
  budgets: [
    { id: id('bud', 1), categoryId: id('cat', 2), amount: '120000.00', period: today.slice(0, 7), method: 'rollover', warning: 80 },
    { id: id('bud', 2), categoryId: id('cat', 3), amount: '55000.00', period: today.slice(0, 7), method: 'standard', warning: 85 },
    { id: id('bud', 3), categoryId: id('cat', 4), amount: '65000.00', period: today.slice(0, 7), method: 'standard', warning: 80 }
  ],
  bills: [
    { id: id('bill', 1), name: 'Electricity', payee: 'Utility provider', categoryId: id('cat', 3), amount: '18500.00', currency: 'LKR', frequency: 'monthly', dueDate: today, accountId: id('acc', 1), autopay: false, paid: false, reminder: 3, notes: '' },
    { id: id('bill', 2), name: 'Home internet', payee: 'Internet provider', categoryId: id('cat', 3), amount: '7200.00', currency: 'LKR', frequency: 'monthly', dueDate: today, accountId: id('acc', 1), autopay: true, paid: true, reminder: 2, notes: '' }
  ],
  goals: [
    { id: id('goal', 1), name: 'Emergency fund', description: 'Six months of expenses', type: 'safety', target: '1800000.00', current: '1120000.00', monthly: '90000.00', targetDate: '2027-05-01', priority: 'high', accountIds: [id('acc', 2)], color: '#635bff', icon: '⌂', archived: false },
    { id: id('goal', 2), name: 'House construction', description: 'Next building phase', type: 'property', target: '5000000.00', current: '1950000.00', monthly: '150000.00', targetDate: '2028-03-01', priority: 'medium', accountIds: [id('acc', 2)], color: '#5277b8', icon: '□', archived: false }
  ],
  holdings: [{ id: id('hold', 1), accountId: id('acc', 2), name: 'Treasury bond fund', symbol: 'TBF', quantity: '1200.00', averageCost: '102.50', currentPrice: '110.25', currency: 'LKR', assetClass: 'Government securities', dividends: '8500.00', institution: 'Fund manager', notes: '' }],
  loans: [{ id: id('loan', 1), name: 'Home Loan', principal: '8000000.00', balance: '6850000.00', annualRate: '11.5', interestType: 'reducing', monthlyPayment: '98500.00', extraPayment: '0', startDate: '2024-01-01', term: 120, paymentDay: 5, lender: 'Local lender', accountId: id('acc', 1), notes: '' }],
  widgets: ['net-worth', 'cash', 'investments', 'debt', 'income', 'expenses', 'surplus', 'savings-rate'],
  notifications: [{ id: id('not', 1), type: 'bill', enabled: true }, { id: id('not', 2), type: 'budget', enabled: true }], tags: ['monthly', 'household'], events: [], snapshots: [], attachments: []
});
