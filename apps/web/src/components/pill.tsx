/** Pil sistem dan label pergantian chat. */
export function Pill({ text }: { text: string }) {
  return (
    <div className="pill">
      <span>{text}</span>
    </div>
  );
}
