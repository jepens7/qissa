import { StoryContentError } from '@qissa/engine';
import { Component, type ReactNode } from 'react';
import { t } from '../lib/i18n.ts';

type Props = { children: ReactNode; onHome: () => void };
type State = { galat: unknown };

/**
 * Pesan berbahasa Indonesia bila episode gagal diputar (ARCHITECTURE §13). Format yang belum didukung
 * meminta pembaca memperbarui aplikasi (ADR-015). Error boundary harus berupa komponen kelas.
 */
export class ErrorBoundary extends Component<Props, State> {
  override state: State = { galat: null };

  static getDerivedStateFromError(galat: unknown): State {
    return { galat };
  }

  override render() {
    const { galat } = this.state;
    if (galat === null) {
      return this.props.children;
    }
    const format = galat instanceof StoryContentError && galat.format !== null;
    return (
      <section className="card">
        <p>{t(format ? 'galat.format' : 'galat.konten')}</p>
        <button type="button" className="btn" onClick={this.props.onHome}>
          {t('galat.kembali')}
        </button>
      </section>
    );
  }
}
