export const APP_CONFIG = {
  currency: {
    symbol: 'Bs',
    locale: 'es-BO',
    code: 'BOB',
  },
};

export function formatMoney(amount: number): string {
  return `${APP_CONFIG.currency.symbol} ${amount.toFixed(2)}`;
}
