type Props = {
  kicker: string;
  question: string;
  ask: string;
  options: { name: string; text: string }[];
  onPick: (name: string) => void;
};

/** Poll landing (SRS LIB-1): tiga tombol, tanpa tanda benar atau salah. */
export function PollCard({ kicker, question, ask, options, onPick }: Props) {
  return (
    <section className="poll">
      <p className="kicker">{kicker}</p>
      <p className="q">{question}</p>
      <p className="ask">{ask}</p>
      {options.map((o) => (
        <button
          key={o.name}
          type="button"
          className="choice"
          onClick={() => {
            onPick(o.name);
          }}
        >
          {o.text}
        </button>
      ))}
    </section>
  );
}
