export default function Page() {
  return (
    <article className="wrap prose">
      <p className="eyebrow">YOUR SPACE</p>
      <h1>
        Small footprint.
        <br />
        Clear boundaries.
      </h1>
      <p>
        The portfolio demo uses fictional people. A necessary HTTP-only cookie identifies your
        private workspace. It expires after eight hours; demo workspaces stop accepting access after
        24 hours.
      </p>
      <p>
        Bookings and studio actions are stored on the application server. Please do not enter
        sensitive information. No advertising trackers are used. Starting a new demo changes your
        workspace; expired workspaces are removed by the documented maintenance command.
      </p>
      <p>
        Payments in the default demo are simulations. No payment card or real transaction is
        required. The optional Stripe integration accepts test-mode credentials only.
      </p>
      <p>
        Photography is illustrative and does not identify the fictional coach. See the repository’s
        asset credits for provenance.
      </p>
    </article>
  );
}
