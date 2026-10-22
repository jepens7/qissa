type Props = {
  label: string;
  options: { text: string }[];
  /** Indeks opsi yang dipilih; ditandai tanpa tanda benar atau salah (SRS UI-4). */
  picked: number | null;
  disabled: boolean;
  onPick: (index: number) => void;
};

/** Blok pilihan: label lalu tiga tombol. */
export function ChoiceBlock({ label, options, picked, disabled, onPick }: Props) {
  return (
    <div className="choices">
      <p className="label">{label}</p>
      {options.map((o, i) => (
        <button
          key={i}
          type="button"
          className={picked === i ? 'choice picked' : 'choice'}
          disabled={disabled}
          onClick={() => {
            onPick(i);
          }}
        >
          {o.text}
        </button>
      ))}
    </div>
  );
}
