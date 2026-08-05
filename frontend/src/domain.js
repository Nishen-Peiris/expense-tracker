/** Decimal-safe financial functions. Monetary amounts use integer minor units. */
export const money = (value) => {
  const normalized = String(value ?? '0').trim().replace(/,/g, '');
  if (!/^-?\d+(\.\d{0,2})?$/.test(normalized)) throw new Error('Enter a valid amount with up to two decimal places');
  const negative = normalized.startsWith('-');
  const [whole, fraction = ''] = normalized.replace('-', '').split('.');
  const result = BigInt(whole) * 100n + BigInt((fraction + '00').slice(0, 2));
  return negative ? -result : result;
};
export const decimal = (minor) => `${minor < 0n ? '-' : ''}${(minor < 0n ? -minor : minor) / 100n}.${String((minor < 0n ? -minor : minor) % 100n).padStart(2, '0')}`;
export const sum = (values) => values.reduce((total, value) => total + money(value), 0n);
export const ratio = (part, total, scale = 10000n) => total === 0n ? 0n : part * scale / total;
export const convert = (amount, rate) => money(decimal(money(amount) * money(rate) / 100n));
export const netWorth = (accounts, rates = {}) => accounts.filter((a) => a.includeNetWorth && !a.archived).reduce((total, account) => {
  const converted = convert(account.balance, rates[account.currency] || '1');
  return total + (account.group === 'liability' ? -converted : converted);
}, 0n);
export const cashFlow = (transactions) => transactions.filter((t) => t.status !== 'pending' && t.type !== 'transfer').reduce((result, t) => {
  if (t.type === 'income' || t.type === 'refund') result.income += money(t.amount);
  if (t.type === 'expense') result.expenses += money(t.amount);
  return result;
}, { income: 0n, expenses: 0n });
export const savingsRate = (income, expenses) => income === 0n ? 0n : ratio(income - expenses, income);
export const budgetProgress = (budgeted, spent, warning = 80) => {
  const used = ratio(money(spent), money(budgeted));
  return { used, remaining: money(budgeted) - money(spent), status: used >= 10000n ? 'exceeded' : used >= BigInt(warning * 100) ? 'warning' : 'healthy' };
};
export const goalProjection = (current, target, monthly) => {
  const remaining = money(target) - money(current);
  if (remaining <= 0n) return { months: 0, completion: 10000n };
  const contribution = money(monthly);
  return { months: contribution <= 0n ? null : Number((remaining + contribution - 1n) / contribution), completion: ratio(money(current), money(target)) };
};
export const investmentGain = (quantity, averageCost, currentPrice) => {
  const q = money(quantity); // hundredths of a unit
  const value = q * money(currentPrice) / 100n;
  return { value, gain: value - q * money(averageCost) / 100n };
};
export const nextOccurrence = (date, frequency) => {
  const next = new Date(`${date}T12:00:00`);
  const days = { weekly: 7, biweekly: 14 }[frequency];
  if (days) next.setDate(next.getDate() + days);
  else next.setMonth(next.getMonth() + ({ monthly: 1, bimonthly: 2, quarterly: 3, semiannual: 6, annual: 12 }[frequency] || 1));
  return next.toISOString().slice(0, 10);
};
export const amortize = ({ principal, annualRate, monthlyPayment, extraPayment = '0', maxMonths = 1200 }) => {
  let balance = money(principal); const payment = money(monthlyPayment) + money(extraPayment); const schedule = []; let totalInterest = 0n;
  const rateMillionths = BigInt(Math.round(Number(annualRate) * 1000000 / 1200));
  if (payment <= 0n) throw new Error('Monthly payment must be positive');
  for (let month = 1; balance > 0n && month <= maxMonths; month += 1) {
    const interest = balance * rateMillionths / 1000000n;
    const principalPaid = payment - interest > balance ? balance : payment - interest;
    if (principalPaid <= 0n) throw new Error('Payment does not cover interest');
    balance -= principalPaid; totalInterest += interest;
    schedule.push({ month, payment: principalPaid + interest, principal: principalPaid, interest, balance });
  }
  return { schedule, totalInterest, remaining: balance };
};
export const periodChange = (current, previous) => ({ amount: current - previous, percent: previous === 0n ? 0n : ratio(current - previous, previous < 0n ? -previous : previous) });
export const reportingMonthOffset = (reportingMonth, offset) => {
  if (!/^\d{4}-\d{2}$/.test(reportingMonth) || !Number.isInteger(offset)) throw new Error('Invalid reporting month');
  const [year, month] = reportingMonth.split('-').map(Number);
  if (month < 1 || month > 12) throw new Error('Invalid reporting month');
  return new Date(Date.UTC(year, month - 1 + offset, 1)).toISOString().slice(0, 7);
};
export const financialPeriod = (reportingMonth, startDay = 1) => {
  if (!/^\d{4}-\d{2}$/.test(reportingMonth)) throw new Error('Invalid reporting month');
  const day = Number(startDay);
  if (!Number.isInteger(day) || day < 1 || day > 28) throw new Error('Financial month start must be between 1 and 28');
  const [year, month] = reportingMonth.split('-').map(Number);
  const endOfReportingMonth = new Date(Date.UTC(year, month, 0));
  if (day === 1) return { from:`${reportingMonth}-01`, to:endOfReportingMonth.toISOString().slice(0,10) };
  const from = new Date(Date.UTC(year, month - 2, day));
  const to = new Date(Date.UTC(year, month - 1, day - 1));
  return { from:from.toISOString().slice(0,10), to:to.toISOString().slice(0,10) };
};
