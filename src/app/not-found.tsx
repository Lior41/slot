import Link from "next/link";
export default function Page() {
  return (
    <section className="wrap narrow">
      <p className="eyebrow">404</p>
      <h1>A little off track.</h1>
      <p>This page is not on the schedule.</p>
      <Link className="button primary" href="/">
        Back to SLOT
      </Link>
    </section>
  );
}
