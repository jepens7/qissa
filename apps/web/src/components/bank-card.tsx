import { t } from '../lib/i18n.ts';

/** Kartu dana masuk m-banking. */
export function BankCard({ amount, from }: { amount: string; from: string }) {
  return (
    <div className="bank">
      <small>{t('bank.masuk')}</small>
      <b>{amount}</b>
      <span>{t('bank.dari', { pengirim: from })}</span>
    </div>
  );
}
