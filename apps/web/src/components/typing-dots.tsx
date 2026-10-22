/** Indikator mengetik sementara; header ikut menampilkan "mengetik…". */
export function TypingDots() {
  return (
    <div className="row in" aria-hidden="true">
      <div className="bubble">
        <span className="dots">
          <i />
          <i />
          <i />
        </span>
      </div>
    </div>
  );
}
