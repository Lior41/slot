export default function Loading() {
  return (
    <div className="wrap narrow" role="status">
      <p className="eyebrow">SLOT</p>
      <h2>Making room for you…</h2>
      <div className="skeleton" />
      <span className="sr-only">Loading the studio</span>
    </div>
  );
}
