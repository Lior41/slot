"use client";
export default function Error({ reset }: { reset: () => void }) {
  return (
    <section className="wrap narrow">
      <h1>Let’s try that again.</h1>
      <p>The studio could not be loaded. Your confirmed reservations remain stored.</p>
      <button className="button primary" onClick={reset}>
        Try again
      </button>
    </section>
  );
}
