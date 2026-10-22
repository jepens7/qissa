type Props = { num: string; title: string; teaser: string; status: string; onOpen: () => void };

/** Kartu episode di home; seluruh kartu adalah satu tombol. */
export function EpisodeCard({ num, title, teaser, status, onOpen }: Props) {
  return (
    <button type="button" className="epcard" onClick={onOpen}>
      <span className="num">{num}</span>
      <span className="ttl">{title}</span>
      <span className="tz">{teaser}</span>
      <span className="st">{status}</span>
    </button>
  );
}
