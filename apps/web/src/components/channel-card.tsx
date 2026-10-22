import { t } from '../lib/i18n.ts';

type Props = { url: string; text: string; primary: boolean; onFollow: () => void };

/** Ajakan ikut Saluran WhatsApp; hanya ditampilkan bila URL saluran dikonfigurasi. */
export function ChannelCard({ url, text, primary, onFollow }: Props) {
  return (
    <section className="chan">
      <p>{text}</p>
      <a
        className={primary ? 'btn' : 'btn ghost'}
        href={url}
        target="_blank"
        rel="noopener"
        onClick={onFollow}
      >
        {t('saluran.ikuti')}
      </a>
    </section>
  );
}
