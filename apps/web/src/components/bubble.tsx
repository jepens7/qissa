type Props = { side: 'in' | 'out'; text: string; from?: string; attach?: string };

/** Gelembung chat. Nama pengirim hanya ada di tampilan grup (compiler yang menentukan). */
export function Bubble({ side, text, from, attach }: Props) {
  return (
    <div className={`row ${side}`}>
      <div className="bubble">
        {from === undefined ? null : <span className="from">{from}</span>}
        {attach === undefined ? null : <span className="attach">{attach}</span>}
        {text}
      </div>
    </div>
  );
}
