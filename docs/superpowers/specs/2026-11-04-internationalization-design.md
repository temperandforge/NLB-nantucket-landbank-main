# Internationalization, localization and translation

Status: draft for review. Nothing here is built. The scope questions at the end need client answers
before any of it is.

## Goal

Decide how the site would serve more than one language: how URLs carry a locale, how interface
strings are translated, how editors translate Sanity content, and what that does to the rules in
AGENTS.md. This is a recommendation with the trade-offs, not a commitment.

## Where we are

The site is single-language (English). `frontend` and `studio` have no locale, intl or translation
dependency, no `language` field on any document type, and no i18n entry in `docs/DECISIONS.md`.
Routing is `app/[...slug]` plus specific static routes (`/news/<slug>`), with page URLs derived from
the `parent` chain by the `pagePath` expression in `frontend/sanity/lib/queries.ts`.

The old WordPress site has some Spanish content: the CSV export spec flags it as `language:es`
([wordpress-content-csv-export](2026-11-03-wordpress-content-csv-export-design.md)). That is the one
concrete signal of demand so far.

## Terms

- **Internationalization (i18n):** making the code able to serve any locale: routing, string lookup,
  formatting.
- **Localization (l10n):** the per-locale result: translated content plus formatting for dates,
  numbers and plurals.
- **Locale:** language, optionally with region (`es`, `es-US`). Use language-only codes unless a
  regional difference is real.

## Three separate problems

### 1. Locale routing

Next.js 16's App Router has no built-in i18n routing. The bundled guide
(`node_modules/next/dist/docs/01-app/02-guides/internationalization.md`) describes the manual
pattern: nest everything under `app/[lang]/`, detect the locale from `Accept-Language` in `proxy.ts`,
redirect to a prefixed path.

**Recommendation: sub-path routing, `/es/...`, with English unprefixed.** Subdomains and separate
domains add DNS, certificate and `siteUrl` complexity for no gain here. Unprefixed English keeps
every existing URL, link and redirect valid, so nothing already indexed moves.

Detection: do **not** auto-redirect on `Accept-Language`. A redirect on a cached, statically rendered
page is fragile, makes `/` unlinkable for search engines, and surprises visitors. Offer a language
switcher and remember the choice in a cookie; at most, show a dismissible banner suggesting the
visitor's language.

### 2. Interface strings

Navigation chrome, form labels, buttons, error messages, `aria-label`s, "Share", "Read more", date
formats. Options:

| Option | Notes |
|---|---|
| **next-intl** | The common App Router choice. Server and client components, ICU plurals and dates, typed message keys, optional localized pathnames. |
| Hand-rolled dictionaries | The Next.js guide's pattern. No dependency; plurals and formatting are ours to maintain. Fine below ~50 strings. |
| Paraglide (inlang) | Compiled, tree-shakeable. Lighter, less established with Next. |
| react-i18next | Built for the Pages Router; poor fit for server components. |

**Recommendation: next-intl**, but only if there is more than a handful of strings. Note that most
visitor-facing text on this site is editor-authored content in Sanity, not code, so the string
catalog is small. Before adopting a library, inventory the hardcoded strings in
`frontend/components` and `frontend/app`; if the count is small, a typed dictionary is enough and
can be swapped for next-intl later without touching Sanity.

Strings that editors should control (a form's labels, the footer's text) already live in Sanity and
are covered by section 3, not the catalog.

### 3. Translating Sanity content

Two standard patterns:

- **Document-level.** Each translation is its own document with a `language` field, tied together by
  a `translation.metadata` document (`@sanity/document-internationalization`). Slug, SEO and publish
  state differ per language. Editors switch language in the Studio.
- **Field-level.** Each translatable field holds one value per language
  (`sanity-plugin-internationalized-array`). One document, one publish state.

**Recommendation: document-level for content, field-level only for singletons and taxonomy titles.**

| Type | Approach | Why |
|---|---|---|
| `page`, `article`, `event`, `project`, `property`, `job`, `record` | Document-level | Long Portable Text bodies, per-language slugs and SEO, a translation may lag or never exist. |
| `faq`, `commissioner`, `staffMember` | Decide per type | A person's name does not translate; their bio might. Likely document-level for `faq`, untranslated for people. |
| `settings`, footer, `projectSettings` | Field-level where text exists | Singletons; one document is easier than a language switcher per singleton. |
| `propertyType`, `resource`, `projectType` | Field-level title, language-neutral slug | The slug is the stable key and filters use it, so it must not vary by language. |
| `menu` | Document-level, one menu per language | Menus reference pages; a Spanish menu must reference Spanish pages. |
| `redirect`, `formSubmission` | Untranslated | Operational data. |
| `projectSettings.boundaryData` | Untranslated | Geometry is language-neutral. |

Untranslated content falls back to English with a visible indicator, never a 404, unless the page is
intentionally English-only (then the switcher omits that language for it).

Machine translation is an option for first drafts: Sanity's AI Assist translation actions and the
Agent Actions translate API both work inside the Studio. Drafts need editor review before publish; a
property or notice mistranslated is worse than one in English only.

## What this changes in existing rules

Each item below is a decision this spec makes, to be recorded in `docs/DECISIONS.md` if accepted.

**Page URLs.** `page.slug` stays a single segment and the path stays derived from the `parent` chain,
now within one language: a Spanish page's `parent` must be a Spanish page. The full path is
`/<locale>` + the `pagePath` result for non-default locales. The two copies of the depth rule
(`MAX_PAGE_DEPTH` in `studio/src/lib/pageHierarchy.ts`, `pagePath` in `queries.ts`) are unaffected,
but the locale prefix is added in one place only, a shared constant, so it does not become a third
copy. "A page URL is never derivable from its slug alone" gets stronger: it is also not derivable
without the document's language.

**Slug uniqueness.** Per-sibling uniqueness becomes per-sibling *within a language*. The Studio's
`isUnique` check needs the `language` field in its filter.

**Catch-all.** `app/[...slug]` moves under `app/[lang]/` (with `lang` optional for the default
locale, via a rewrite in `proxy.ts` or a route group). More specific static routes keep winning.
Unmatched paths still call `notFound()`. An unknown first segment is treated as part of the page
path, not a locale, so a typo cannot render the default locale's home page.

**SEO and structured data.** `buildMetadata` adds `alternates.languages` (hreflang) from the
document's translation group, including `x-default`. Canonical is still derived from the page's own
address, per language. The sitemap lists every language version with its alternates. JSON-LD builders
gain `inLanguage`. `html lang` is set from the locale in the root layout. `settings.siteUrl` stays
the single origin. All of this is derived at render, never authored.

**Redirects.** The Sanity Function that creates redirects on rename or move must scope to a language
so a Spanish rename does not redirect the English URL, and redirects need a locale-aware source path.

**Presentation.** `mainDocuments` routes and `defineLocations` need the locale prefix in both
directions, per the existing "both directions wired" rule.

**Menus and footer.** Resolved by locale at render. A region that has no menu in the current locale
falls back to the default locale's menu rather than throwing, as site-wide regions must degrade.

**Taxonomy filters.** URL filters keep using the slug, so `?type=conservation` works in every
language. Only the label changes.

**Formatting.** Dates, numbers and plurals go through `Intl` with the locale. No hardcoded
`en-US` formats.

**Search.** Search results must be filtered to the current language, or the index split by language.
The search implementation needs checking before this is scoped.

**Typegen and queries.** `language` becomes part of most queries' filters. Derive types from the
generated query results as now. The list of supported languages lives in one place, shared by the
Studio and frontend config, and is not restated elsewhere. Unlike a taxonomy, adding a language
changes routing, so it needs a deploy (open decision 5).

## Migration

1. Add the `language` field and install the plugin, defaulting new documents to English.
2. A script, `studio/scripts/stampLanguage.ts`, sets `language: 'en'` on existing translatable
   documents. Idempotent, matches on `_id`, with `--dry`, run through
   `sanity exec ... --with-user-token`. It overwrites nothing but the missing field.
3. Seed the English menu and footer references so each has a language.
4. Create translations from the Studio, or import them from the WordPress export.

The WordPress export already flags Spanish pages. If those are kept, they import as `language: 'es'`
documents linked to their English counterpart, which the CSV would need a `translation_of` column
for. That is a change to the export spec, not made here.

## Verification when built

A new `studio/scripts/verifyLocalization.ts`, importing the real definitions rather than restating
them:

- every translatable document has a `language`;
- every non-default page's `parent` has the same language;
- no two siblings share a slug within a language;
- every translation group has at most one document per language;
- the generated `/es/...` path of each page resolves to exactly that document.

Plus the existing `verifyPageRouting.ts`, `checkStructuredData.ts` and `verifyStructuredData.ts`,
extended to check hreflang reciprocity (if A lists B as an alternate, B lists A).

## Alternatives rejected

- **Auto-redirect on `Accept-Language`.** Fragile with static rendering and bad for crawlers.
- **A translation proxy or overlay (Google Translate widget, Weglot).** Quick, but content is not
  indexable per language, editors cannot correct it, and it ignores the Sanity model. It is a
  reasonable stopgap if the need is small and urgent.
- **Field-level for everything.** One document per page is tidy, but long Portable Text with per-
  language slugs and SEO becomes unmanageable, and a half-translated page publishes as a unit.
- **Locale in a query parameter (`?lang=es`).** Not crawlable as distinct pages.

## Open decisions

1. **Which languages, and are any right-to-left?** Spanish is the only signal so far. RTL adds
   layout work throughout and is out of scope unless asked for.
2. **Scope.** A few key pages, or a full mirror including properties and articles? This sets how many
   types get the `language` field. Recommendation: pages and the notices people act on first.
3. **Who translates.** Editors by hand, machine draft plus review, or an agency? This decides whether
   to integrate a translation service.
4. **Where `/es` content lives for properties.** Property names and addresses are proper nouns; a
   translated property page may only need the description. Whether `property` is document-level or
   stays English with translated labels is open.
5. **Adding a language later.** It needs a routing change and a deploy, even if the content does not.
   Accept that, or design for editor-added languages (more complex, probably not worth it).
6. **Legal and accessibility.** Whether public notices, meeting agendas or forms must be offered in
   Spanish is a policy question for the client, and a reason to translate `record` and `form` early.

## Deferred

Nothing is deferred yet, because nothing is built. When a slice ships, anything cut from it (search
per language, translated forms, RTL) gets a GitHub issue and is linked here, per the deferred-work
rule.
