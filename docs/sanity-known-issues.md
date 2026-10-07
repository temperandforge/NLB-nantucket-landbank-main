# Sanity known issues

Upstream bugs in Sanity Studio that affect this project. None can be fixed in our code; this file
records the symptom, cause and workaround so nobody re-investigates them.

## Presentation tool crashes on a preview URL ending in a backslash

**Symptom.** Typing `http://localhost:3000/\` into the Presentation URL bar and pressing Enter
shows "The presentation tool crashed — Failed to construct 'URL': Invalid URL". The same happens
for any input that normalises to `//`.

**Cause.** The input is stored as the path `/\`. On the next render, `PreviewLocationInput`
(bundled in Sanity's `PresentationToolGrantsCheck` chunk) calls `new URL(value, targetOrigin)`
without a try/catch. URL parsing treats `\` as `/`, so `/\` becomes `//`, a protocol-relative URL
with no host, and the constructor throws. The Enter handler guards its own `new URL` call; the
render-time one is unguarded.

```js
new URL("/\\", "http://localhost:3000") // TypeError: Invalid URL
```

**Not ours.** Our `presentationTool` config in `studio/sanity.config.ts` doesn't touch the
location input.

**Workaround.** Remove the `?preview=` parameter from the Studio URL (or open `/presentation`
afresh) and click Retry. Don't type backslashes into the URL bar.

**Status.** Not yet reported upstream (sanity-io/sanity). Patching the dependency was rejected as
disproportionate for a typo-level input.
