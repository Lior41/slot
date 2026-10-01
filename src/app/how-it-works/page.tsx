import Link from "next/link";
export default function Page() {
  return (
    <article className="wrap prose">
      <p className="eyebrow">BUILT WITH INTENTION</p>
      <h1>
        Good experiences
        <br />
        have strong foundations.
      </h1>
      <p className="lead">
        SLOT is a working portfolio application for a fictional training studio. Explore the
        product, then look under the surface.
      </p>
      <div className="story-grid">
        <section>
          <span className="big-number">01</span>
          <h2>Make a booking</h2>
          <p>
            Choose a session. A ten-minute hold reserves capacity while you complete the clearly
            labeled demo checkout.
          </p>
        </section>
        <section>
          <span className="big-number">02</span>
          <h2>Change your plans</h2>
          <p>
            Move a confirmed reservation to a compatible session or cancel it. Changes persist in
            your private database workspace.
          </p>
        </section>
        <section>
          <span className="big-number">03</span>
          <h2>Try the hard part</h2>
          <p>
            Run the two-client race. Both requests use the same booking service. Database locking
            and a capacity guard prevent the last place from being sold twice.
          </p>
        </section>
      </div>
      <h2>A small architecture with clear boundaries</h2>
      <div className="architecture">
        Browser → Next.js routes → Validated domain services → PostgreSQL
      </div>
      <p>
        Opaque session cookies identify a server-side session. Every mutation checks the request
        origin, membership and role. Each workspace owns its people, services, schedule and
        bookings. Demo role switching is available only inside your synthetic workspace.
      </p>
      <h2>Deliberate trade-offs</h2>
      <ul>
        <li>A single workspace lock favors straightforward correctness over maximum throughput.</li>
        <li>Explicit SQL migrations keep capacity triggers and time constraints visible.</li>
        <li>
          The local demo uses PGlite. Native PostgreSQL concurrency is a separate CI test target.
        </li>
        <li>No email provider is configured by default. No real messages or charges are sent.</li>
        <li>
          Real-money payments, self-service onboarding and multi-studio management are outside this
          release.
        </li>
      </ul>
      <h2>Inspect the work</h2>
      <p><a href="https://github.com/Lior41/slot">Source code</a> · <a href="https://github.com/Lior41/slot/tree/main/tests">Tests</a> · <a href="https://github.com/Lior41/slot/actions">Verification runs</a> · <Link href="/demo-video">Captioned walkthrough</Link></p>
      <Link className="button primary" href="/demo">
        Explore the demo ↗
      </Link>
    </article>
  );
}
