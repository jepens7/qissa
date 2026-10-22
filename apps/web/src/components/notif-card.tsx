/** Dua huruf ikon aplikasi dari dua kata pertama namanya, mis. "Gacor Family" menjadi "GF". */
export function inisialAplikasi(app: string): string {
  return app
    .split(/\s+/)
    .filter((k) => k !== '')
    .slice(0, 2)
    .map((k) => k.charAt(0).toUpperCase())
    .join('');
}

type Props = { app: string; text: string; time: string };

/** Kartu notifikasi dengan ikon kotak dua huruf. */
export function NotifCard({ app, text, time }: Props) {
  return (
    <div className="notif">
      <div className="app" aria-hidden="true">
        {inisialAplikasi(app)}
      </div>
      <div>
        <b>{app}</b>
        <span>{text}</span>
      </div>
      <time>{time}</time>
    </div>
  );
}
