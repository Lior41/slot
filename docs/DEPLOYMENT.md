# Deployment and operations

## Local

Use Node 24, `npm ci`, and the README startup instructions. Default port: 3050. Do not store `node_modules`, a running embedded database or an active checkout in a folder subject to iCloud eviction.

## Vercel

Import only this repository as a Next.js project. Use `npm ci` and `npm run build`, with Node 24. Set `APP_ORIGIN` to the exact public HTTPS origin (no trailing slash). Verify the public page and complete the demo flow after deployment. Preview deployments need their own allowed origin when API writes are tested.

No deployment URL is a claim of verification by itself. Keep GitHub checks mandatory in the release process. A Git-connected Vercel deployment may start before CI finishes; configure promotion/gating before treating it as a production release.

## Budget

Target a personal, non-commercial portfolio on a free hosting tier. Initial local use costs $0 in provider calls. No paid plan, paid model or domain purchase is required for the default demonstration. Hosting quotas and eligibility can change: review [Vercel Hobby](https://vercel.com/docs/plans/hobby) before subscribing. Enable external providers only after approving their current budget and usage limits.

## Operational limits

Keep secrets in the hosting provider's secret configuration, never in a repository. Run migrations only against the intended database. Use separate development and production resources. The supplied Docker configuration runs an unprivileged Node process; Docker must be installed separately.

## SLOT database and payments

For hosting, set `DB_DRIVER=postgres`, `DATABASE_URL` to a dedicated PostgreSQL database and `DEMO_MODE=true` for the public portfolio. Do not use PGlite on Vercel's ephemeral filesystem. Apply `npm run db:migrate` from an authorized environment before enabling the application. Do not reuse PulseOps tables or credentials without a separate scoped database.

The compose file starts PostgreSQL 17 and the application with local-only credentials. Change credentials for any remotely accessible deployment. The database port is not published by default. Native PostgreSQL is also the CI integration target.

For optional Stripe **test** checkout, configure `STRIPE_SECRET_KEY` (`sk_test_...`) and `STRIPE_WEBHOOK_SECRET`. Send `checkout.session.completed` to `/api/stripe`. The browser success URL is informational; only the signed webhook confirms payment. Holds expire after 10 minutes, while Stripe Checkout may remain payable longer. A late payment is recorded as `REFUND_REQUIRED` without re-claiming a seat. The coach can issue a test refund. This release deliberately rejects live keys and live events. External Stripe delivery remains to be validated with an owner's test account.

For optional email, configure `RESEND_API_KEY`, a verified `EMAIL_FROM`, and a random `CRON_SECRET`. Call `GET /api/jobs` with `Authorization: Bearer <CRON_SECRET>` from an authorized scheduler every five minutes. Confirm provider and scheduler plan limits before enabling. No scheduler is silently purchased or installed. The outbox excludes demo workspaces. Delivery retries are bounded; ambiguous old deliveries require manual inspection. Messages contain current appointment state, explicit timezone and no health data. `SENT` means the provider accepted delivery, not that the recipient read it.

The same job removes expired demo workspaces after a one-day grace period, expired sessions and rate-limit buckets. Public demos expire after 24 hours; without this job, expired rows remain stored until maintenance runs.

For a controlled non-demo test studio, set temporary environment variables `STUDIO_NAME`, `COACH_NAME`, `COACH_EMAIL`, `COACH_PASSWORD`, `CLIENT_NAME`, `CLIENT_EMAIL`, `CLIENT_PASSWORD` and run `npm run studio:create`. Passwords need at least 12 characters and are hashed with Argon2. The script prints the studio ID, not the passwords. Remove the provisioning variables afterwards. Edit the fictional public copy before involving real clients. Self-service signup and password reset are outside the current scope.
