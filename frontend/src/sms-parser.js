import { money } from './domain.js';

const currencyAliases = { RS:'LKR', LKR:'LKR', USD:'USD', EUR:'EUR', GBP:'GBP', INR:'INR' };
const cleanMerchant = (value) => value.replace(/\s+(?:on|at)\s+\d{1,4}[-/.]\d{1,2}[-/.]\d{1,4}.*$/i, '').replace(/[.,;:]$/, '').trim();

/** Parse a banking notification locally. It deliberately does not contain institution names. */
export function parseBankingSms(rawSms, { accounts = [], categories = [], primaryCurrency = 'USD' } = {}) {
  const sms = String(rawSms || '').replace(/\s+/g, ' ').trim();
  if (sms.length < 12) throw new Error('Paste the complete banking SMS');
  const amountMatch = sms.match(/\b(LKR|USD|EUR|GBP|INR|Rs\.?)\s*([\d,]+(?:\.\d{1,2})?)/i) || sms.match(/\b([\d,]+(?:\.\d{1,2})?)\s*(LKR|USD|EUR|GBP|INR)\b/i);
  if (!amountMatch) throw new Error('Could not find an amount and currency in this SMS');
  const prefixCurrency = /[A-Za-z]/.test(amountMatch[1]);
  const currencyToken = (prefixCurrency ? amountMatch[1] : amountMatch[2]).replace('.','').toUpperCase();
  const amount = prefixCurrency ? amountMatch[2] : amountMatch[1];
  money(amount);
  const credit = /\b(credited|credit|received|deposit(?:ed)?|salary|refund)\b/i.test(sms);
  const debit = /\b(debited|debit|purchase|spent|paid|payment|withdrawn|withdrawal|charged)\b/i.test(sms);
  if (!credit && !debit) throw new Error('Could not determine whether this is a debit or credit');
  const merchantMatch = (credit ? sms.match(/\bfrom\s+([^.;]+?)(?=\s+(?:on|dated|using|via|ref|reference|available|balance)\b|[.;]|$)/i) : null) || sms.match(/\b(?:at|to|from|merchant)\s+([^.;]+?)(?=\s+(?:on|dated|using|via|ref|reference|available|balance)\b|[.;]|$)/i);
  const referenceMatch = sms.match(/\b(?:ref(?:erence)?)[\s:#-]*([A-Z0-9-]{4,})/i);
  const dateMatch = sms.match(/\b(20\d{2})[-/](\d{1,2})[-/](\d{1,2})\b/) || sms.match(/\b(\d{1,2})[-/](\d{1,2})[-/](20\d{2})\b/);
  let date = new Date().toISOString().slice(0,10);
  if (dateMatch) date = dateMatch[1].length === 4 ? `${dateMatch[1]}-${dateMatch[2].padStart(2,'0')}-${dateMatch[3].padStart(2,'0')}` : `${dateMatch[3]}-${dateMatch[2].padStart(2,'0')}-${dateMatch[1].padStart(2,'0')}`;
  const digits = [...sms.matchAll(/(?:x{2,}|\*{2,}|ending|a\/c|account)\s*[-:]?\s*(\d{3,6})/ig)].map((match) => match[1]);
  const account = accounts.find((item) => digits.some((suffix) => String(item.mask || '').replace(/\D/g,'').endsWith(suffix))) || null;
  const type = credit && !debit ? 'income' : 'expense';
  const category = categories.find((item) => item.type === type && Array.isArray(item.smsKeywords) && item.smsKeywords.some((keyword) => sms.toLowerCase().includes(String(keyword).toLowerCase()))) || null;
  const merchant = merchantMatch ? cleanMerchant(merchantMatch[1]) : (type === 'income' ? 'Bank credit' : 'Card transaction');
  return { date, description: referenceMatch ? `SMS import · Ref ${referenceMatch[1]}` : 'Imported from banking SMS', merchant, amount: amount.replaceAll(',',''), currency: currencyAliases[currencyToken] || primaryCurrency, accountId: account?.id || '', categoryId: category?.id || '', type, status:'cleared', rawSms:sms, importSource:'banking-sms' };
}
