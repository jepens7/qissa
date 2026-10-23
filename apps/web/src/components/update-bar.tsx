import { useRegisterSW } from 'virtual:pwa-register/react';
import { t } from '../lib/i18n.ts';

/**
 * Baris "Versi baru tersedia" (SRS PWA-3, ADR-017): muncul saat service worker baru menunggu, tanpa memaksa.
 * Region status selalu ada supaya pembaca layar mengumumkan isinya saat muncul. Di `vite dev` service worker
 * tidak aktif, jadi baris ini tidak pernah tampil.
 */
export function UpdateBar() {
  const {
    needRefresh: [perlu],
    updateServiceWorker,
  } = useRegisterSW();
  return (
    <div className="pembaruan" role="status">
      {perlu ? (
        <>
          <span>{t('pembaruan.teks')}</span>
          <button
            type="button"
            className="btn ghost"
            onClick={() => {
              void updateServiceWorker(true);
            }}
          >
            {t('pembaruan.muat')}
          </button>
        </>
      ) : null}
    </div>
  );
}
