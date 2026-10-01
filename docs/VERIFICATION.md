# Verification record

Verified on 2026-10-01. [GitHub Actions run 36835982974](https://github.com/Lior41/slot/actions/runs/36835982974) passed against commit `77ad1dd`.

- TypeScript, ESLint, production build and 4 unit tests passed.
- 10 integration tests passed against native PostgreSQL 17 in CI (and locally against PGlite).
- Playwright desktop/mobile Chromium journeys passed in CI: booking, confirmation, rescheduling, cancellation, workspace isolation, role/origin checks and last-seat contention.
- A manual local browser walkthrough also verified booking, simulated payment, rescheduling, the coach timetable and the last-seat result.

Local Playwright browser launch was blocked by the macOS sandbox; CI provides the browser execution evidence. The PGlite demo serializes transactions within one process and is not a throughput benchmark.

Docker has not been executed. Real Stripe Checkout/webhook delivery, refunds and Resend delivery have not been exercised with external credentials. The default payment is explicitly simulated. No deployment is claimed by this record.
