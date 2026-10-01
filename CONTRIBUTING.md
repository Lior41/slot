# Contributing to SLOT

Use Node.js 24 LTS and `npm ci`. Keep changes focused and explain the user-visible outcome.

Before a pull request, run `npm run check`, `npm run build` and the relevant browser tests with `npm run test:e2e`. SLOT database changes also require `npm run test:integration` against native PostgreSQL. Never run tests on a production database.

Public copy and source comments are English. Do not commit environment files, personal data, camera recordings, generated build output, or provider keys. Clearly label fixtures and simulations. Add regression tests for domain rules rather than snapshots that merely repeat markup.

Use semantic HTML, keyboard-operable controls, and visible focus. Check a phone viewport and reduced-motion settings. Document known limitations and external validation requirements; do not report unmeasured performance or accuracy.

For a suspected security issue, do not include credentials or exploit data in a public issue. Send only a minimal reproduction using synthetic data.
