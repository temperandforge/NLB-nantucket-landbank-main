# Performance: what we measured, changed, tried and left alone

Written 2026-10-26, from the work on the animation branch (PR #90). It records the numbers, the
method, the changes that helped, the ones that did not, and what is still open, so the next person
does not repeat the experiments. The animation system itself is in [motion.md](motion.md).

## Where the scores stand

PageSpeed Insights, mobile, reported while working (the deployed preview, so each is one run):

| Page | Mobile | Notes |
|---|---|---|
| Home, before this work | 58 | Desktop was 85. FCP and LCP both red. |
| Home, after | **81** | FCP 1.1s, Speed Index 1.1s, TBT 0ms, CLS 0. **LCP 5.3s, still red.** |
| `/about-us/history` | 85 | Reported by the client, then a drop was reported that I could not reproduce. |
| `/our-work/news` | 75 | LCP element is the hero description text. |

**A single run proves very little.** The same build of `/our-work/news` scored **80 and 91** in
back-to-back local Lighthouse runs, and `/about-us/history` scored 79, 82, 82, 81, 82 and 82 across
six. Treat the score as moving by 5 to 10 points on its own. Compare medians of 3 to 5 runs, or the
deterministic numbers (bytes, requests, simulated FCP), or the real-user field data at the top of a
PageSpeed report.

## How to measure

**In the browser or PageSpeed:** use the deployed preview. Preview deployments behind Vercel's
deployment protection cannot be reached by Google's servers.

**Locally, with Lighthouse** (what produced the numbers here). Install it into a scratch folder
*outside the repo*, with install scripts off, and run its CLI against a production build:

```bash
# once, in a scratch folder (not in the repo)
npm install --prefix <scratch>/lh --ignore-scripts --no-audit --no-fund lighthouse

# the site, as a production build
cd frontend && NODE_ENV=production npx next build && NODE_ENV=production npx next start -p 3107

# a mobile run (Lighthouse's default), performance only, JSON out
node <scratch>/lh/node_modules/lighthouse/cli/index.js "http://localhost:3107/our-work/news" \
  --only-categories=performance --output=json --output-path=<scratch>/run.json \
  --chrome-path="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" \
  --chrome-flags="--headless=new --no-sandbox" --quiet
```

Useful options and facts:

- `--blocked-url-patterns="*.mp4"` runs the page as if a file did not exist. It isolated the hero
  video's effect (below).
- Audit ids worth reading in the JSON (Lighthouse 13): `metrics` (observed and simulated values),
  `lcp-breakdown-insight` (TTFB, load delay, load duration, render delay, and the LCP element),
  `lcp-discovery-insight` (is the LCP image lazy, prioritised, discoverable), `image-delivery-insight`,
  `render-blocking-insight`, `unused-javascript`, `network-requests`, `bootup-time`.
- **Observed versus simulated.** Observed LCP on the home and news pages is about 70 to 300 ms.
  The score uses *simulated* LCP (about 3.5 to 5.5 s), which models a slow phone by counting the
  bytes the page requests before it paints: JavaScript, fonts and images. So cutting bytes before
  paint is the lever; changing how fast the real browser paints is not, as far as the score goes.
- A long task named `_lighthouse-eval.js` inflates TBT in local runs. PageSpeed itself showed 0 ms.
- Local runs scored lower than PageSpeed for the same page on a busy machine. Use them to compare
  before and after on the same machine, not as the number.
- **Bust the browser cache** (`?fresh=...`) when using a real browser tab: static pages and their
  chunks are cached, and a stale tab reported the previous build's numbers.
- `fetch()` to `cdn.sanity.io` from `localhost` fails on cross-origin rules, so image sizes have to
  come from Lighthouse's network list, not from the page. The same cause probably explains the
  `Failed to load the trails GeoJSON` console error on the map page locally (not proven).

## What was changed, and what it measured

| Change | Commit | Measured |
|---|---|---|
| Hero poster `eager` with `fetchpriority="high"`; video waits for the load event plus an idle moment, `preload="none"` | `9032982` | LCP element changed from the video to the poster; in a 390px frame, LCP 232 to 424 ms became 76 to 104 ms, and the video download moved from about 60 ms to after load. |
| Images on the animation load layer do not fade (a fade started the hero image at opacity 0) | `9032982` | Removes a regression the fade introduced. |
| `mapbox-gl` loads only near the viewport (`LazyMapboxMap`) | `5410b52` | Home page initial JavaScript from about 973 KB to 465 KB; biggest script 508 KB to 184 KB. |
| reCAPTCHA loads when someone first uses a form, not on every page | `e0e38c4` | About 350 KB plus an iframe off every page's load. Form submission tested with the API call intercepted. |
| Every hero image is eager with high priority (`BlockImage priority`) | `35f8084` | `/about-us/history`: the three LCP discovery checks went from failing to passing; image request delay 33 to 36 ms to 5 ms. Score unchanged (the insight is unscored). |
| History slider slides no longer replay their animation | `3656122` | A revealed slide no longer drops to opacity 0 and replays. |

### The hero video, in detail

The home hero is a video with a poster image. In a local run the page scored **60 with the video and 80
with the mp4 blocked**, and the poster's render delay went from 995 ms to 24 ms. The poster and video
interact, and the mp4 is large: **about 24 MB** in four range requests. Deferring its start
(above) stops it competing with the poster, but it still downloads in full, on phones too.

Against the usual checklist for a hero video:

- **Done:** poster is a server-rendered image, eager and high priority, AVIF or WebP through
  `auto=format`; `muted`, `loop`, `playsInline`; fixed `aspect-[9/5]` box with a background (CLS 0);
  video starts after load and idle with `preload="none"`; reduced motion shows the poster only; a
  Play/Pause button is always present.
- **Not done:** a `<link rel="preload">` for the poster (`fetchpriority` is used instead); a
  `navigator.connection.saveData` check; pausing when scrolled offscreen; `aria-hidden` on the
  decorative video; a smaller or WebM source for phones; a smaller poster for mobile.
- **Declined:** not autoplaying on phones. The decision was to leave autoplay as it is.
- **The real fix is the file.** Re-encode it in Sanity to a few MB (muted, no audio track, `faststart`,
  720p for mobile). That is a content change and would help every device.

## Tried and rejected (do not repeat these)

- **`experimental.inlineCss: true`.** Next documents it for Tailwind sites. It did remove the three
  render-blocking stylesheet requests (3 to 0), but the HTML grew **from 15 KB to 78 KB** and the
  simulated FCP got worse (1056 ms to 1103 to 1245 ms). Scores overlapped the baseline (86, 89, 96
  against 80 and 91). No clear win, and it costs caching. Reverted.
- **Cropping card images on the server.** The idea: the news card requests a 3:4 portrait but shows a
  roughly square box (363x375 on a phone), so crop tall photos to square and send fewer pixels. The
  result was the opposite: the two portrait images went from **78 KB and 75 KB to 115 KB and 118 KB**.
  Without a crop, Sanity serves them as **AVIF**; with a crop (`fit=crop`), `auto=format` serves
  **WebP**, about 1.5 times larger, which cancels the pixel saving and more. **Sanity's `fm` parameter has
  no AVIF option** (AVIF is only reachable through `auto=format`), so a cropped image cannot be forced
  to AVIF. Reverted, including the helper. An earlier version of the helper also clamped *landscape*
  photos to a narrower shape, which made them taller and added pixels; the check written for it caught that.
  Card box shapes vary a lot, which is another reason a fixed crop does not fit: 363x375 on a
  phone, 228x354 at tablet width, wider again on desktop.
- **Deferring `SanityLive`.** `defineLive`'s `SanityLive` is a server component that renders a client
  component inside `next-sanity`, so its chunk cannot be code-split without reaching into the
  library. Not attempted.

## Still open

In rough order of what a visitor pays:

1. **The 24 MB hero video** (above). A content re-encode, or a code decision about phones and
   Save-Data.
2. **About 183 KB of the Sanity live-updates chunk** that Lighthouse marks as unused, on every page.
   It can only go by not rendering `SanityLive` in production, which means published changes could take
   up to an hour to appear (some pages use `revalidate = 3600`). That is a product decision about live
   updates. Other first-party chunks have 22 to 31 KB unused each.
3. **Card images** flagged for about 108 KiB on the news page (a 3:4 crop delivered into a roughly
   square box, plus a little compression). The server crop does not fix it (above). Lowering `q` or
   giving the cards narrower source sizes are the remaining ideas, untested.
4. **Render-blocking CSS**, about 24 KB in three files, est. 420 to 430 ms. No good fix found.
5. **Missing source maps** for the large first-party chunk (unscored). Enabling
   `productionBrowserSourceMaps` would expose the source, so it was left.
6. **Content:** the history hero image has the alt text `---` in Sanity, which a screen reader will
   read out. Decorative images should have an empty alt.

Realistically, getting well past the 80s means cutting the framework and Sanity JavaScript baseline,
which is a larger project than any item above.

## Monitoring and automation (an idea, not built)

Discussed, not implemented. The repo's CI, Prettier, lock and validate workflows are named `.txt`, so
they are switched off; only `deploy.yml` (Sanity Studio) runs. A sensible order:

1. **Lighthouse CI on each PR** against the preview, asserting a budget (a score floor, an LCP limit).
   Take the median of 3 to 5 runs because of the noise above.
2. **A scheduled PageSpeed Insights API run on production** (needs a free Google API key as a secret)
   that opens or updates one issue labelled `performance` when a threshold is crossed. Use field data
   where it exists.
3. **A human-triggered fix:** a `perf-fix` label or an `@claude` comment lets `claude-code-action`
   open a PR, which still has to pass the PR check and be merged by a person. No auto-merge:
   performance fixes are easy to get subtly wrong, and a loop chasing lab noise would just churn.

Vercel Speed Insights (`@vercel/speed-insights`) is already installed and collects real-user data in
the Vercel dashboard.
