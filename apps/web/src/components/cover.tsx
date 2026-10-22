type Props = {
  kicker: string;
  title: string;
  body: string;
  /** Kalimat yang mengingat jalur episode sebelumnya (serif), atau catatan biasa. */
  memo?: { text: string; ingat: boolean };
  length: string;
};

/** Sampul episode sebelum ketukan pertama. */
export function Cover({ kicker, title, body, memo, length }: Props) {
  return (
    <section className="cover">
      <p className="kicker">{kicker}</p>
      <h1>{title}</h1>
      <p>{body}</p>
      {memo === undefined ? null : <p className={memo.ingat ? 'memo' : undefined}>{memo.text}</p>}
      <p>{length}</p>
    </section>
  );
}
