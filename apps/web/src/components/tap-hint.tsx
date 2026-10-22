type Props = { text: string; hidden: boolean; onTap: () => void };

/** "Ketuk untuk lanjut": tombol nyata supaya bisa dicapai keyboard dan pembaca layar. */
export function TapHint({ text, hidden, onTap }: Props) {
  return (
    <button type="button" className="hint" hidden={hidden} onClick={onTap}>
      {text}
    </button>
  );
}
