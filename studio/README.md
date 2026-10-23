# Sanity Clean Content Studio

Congratulations, you have now installed the Sanity Content Studio, an open-source real-time content editing environment connected to the Sanity backend.

Now you can do the following things:

- [Read “getting started” in the docs](https://www.sanity.io/docs/introduction/getting-started?utm_source=readme)
- [Join the community Slack](https://slack.sanity.io/?utm_source=readme)
- [Extend and build plugins](https://www.sanity.io/docs/content-studio/extending?utm_source=readme)

## Auto-redirects (Sanity Function)

Renaming or moving a page writes `redirect` documents (`origin: auto`) from its old URL, and its
descendants' old URLs, to the page. This is a Sanity Function, `functions/auto-redirect/`, declared
in `sanity.blueprint.ts`. It triggers on publish of a `page` whose slug, parent or `pathOnly`
changed. The path logic is in `src/lib/redirectDiff.ts`; the function bundler follows the relative
imports into `src/lib/`.

### Deploy

```bash
cd studio
npx sanity blueprints deploy
```

- **Deploy it per dataset.** A function acts on the project and dataset it is deployed to, so repeat
  it for every dataset that should generate redirects (production, and staging if you use one).
- **It is not part of the Studio or frontend deploys.** `sanity deploy` and the frontend's hosting
  do not touch it. Redeploy the blueprint whenever `functions/auto-redirect/`, `src/lib/redirectDiff.ts`,
  `src/lib/pageHierarchy.ts` or `src/lib/redirectSource.ts` changes, or the live function keeps the
  old logic.
- **Plan availability is unconfirmed.** Whether Functions are available on this project's plan
  (including the Free plan) has not been checked. If `blueprints deploy` is refused, the fallback is
  the same handler as a Studio document action.

### Test locally (does not deploy)

```bash
cd studio
npx sanity exec scripts/verifyAutoRedirect.ts   # handler logic against an in-memory dataset
npx sanity functions test auto-redirect \
  --file-before functions/auto-redirect/event-ancestor-rename.before.json \
  --file-after functions/auto-redirect/event-ancestor-rename.after.json \
  --project-id <projectId> --dataset <dataset>
```

`functions test` runs the real handler. It reads the named dataset and, if it finds something to
write, WRITES to it when a token is available, so point it at a throwaway dataset.

### Logs

```bash
npx sanity functions logs auto-redirect
```

Each run logs its plan (`auto-redirect: plan ...`) and what it wrote.

### Disabled redirects are reused, not duplicated

If an old path already has a disabled redirect, the function does not create a second one (the
`source` validator would then reject both). A disabled redirect it created itself (`origin: auto`) is
re-enabled and pointed at the page. One an editor disabled by hand is left untouched and logged, so
that old path stays without a redirect until the editor turns it back on.

### A missed run leaves a gap

The function runs once per publish. If a run fails or is skipped (a timeout, an outage, a page whose
parent was unpublished at the time, the function not deployed to that dataset), the redirect is not
created and **nothing flags it**: the old URL simply 404s. Check the logs after a rename of a page
with inbound links, and add the redirect by hand in Studio if one is missing.
