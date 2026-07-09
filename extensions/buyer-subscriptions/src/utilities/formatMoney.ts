const ZERO_DECIMAL_CURRENCIES = new Set([
  'JPY',
  'KRW',
  'VND',
  'HUF',
  'CLP',
  'PYG',
  'RWF',
  'UGX',
  'XAF',
  'XOF',
  'XPF',
  'BIF',
  'DJF',
  'GNF',
  'KMF',
  'MGA',
  'ISK',
]);

interface FormatCurrencyFn {
  (
    number: number | bigint,
    options?: {inExtensionLocale?: boolean} & Intl.NumberFormatOptions,
  ): string;
}

export function formatMoney(
  formatCurrency: FormatCurrencyFn,
  amount: number,
  currencyCode: string,
  extraOptions?: Intl.NumberFormatOptions,
) {
  const isZeroDecimal = ZERO_DECIMAL_CURRENCIES.has(currencyCode);
  return formatCurrency(amount, {
    ...extraOptions,
    currency: currencyCode,
    minimumFractionDigits: isZeroDecimal ? 0 : 2,
    maximumFractionDigits: isZeroDecimal ? 0 : 2,
  });
}
