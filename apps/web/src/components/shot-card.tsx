import type { Shot } from '@qissa/script/types';
import { t } from '../lib/i18n.ts';

function IkonGambar() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <circle cx="9" cy="10" r="1.6" />
      <path d="M21 16l-5-5-8 8" />
    </svg>
  );
}

/**
 * Tangkapan layar di dalam gelembung masuk. `null` berarti belum dibuka. Di mini-chat, baris milik
 * `pov` rata kanan tanpa nama; baris lain rata kiri dengan nama pengirimnya.
 */
export function ShotCard({ shot }: { shot: Shot | null }) {
  return (
    <div className="row in">
      <div className="bubble">
        <div className="shot">
          <div className="cap">
            <IkonGambar />
            {shot === null ? t('shot.tertutup.cap') : shot.cap}
          </div>
          {shot === null ? (
            <div className="closed">{t('shot.tertutup.isi')}</div>
          ) : (
            <>
              {shot.cut === undefined ? null : <div className="cut">{shot.cut}</div>}
              {shot.lines === undefined ? null : (
                <div className="mini">
                  {shot.lines.map((l, i) =>
                    l.from === shot.pov ? (
                      <span key={i} className="n">
                        {l.text}
                      </span>
                    ) : (
                      <span key={i} className="b">{`${l.from}: ${l.text}`}</span>
                    ),
                  )}
                </div>
              )}
              {shot.cmt === undefined ? null : (
                <div className="cmt">
                  <b>{shot.cmt.handle}</b>
                  {shot.cmt.text}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
