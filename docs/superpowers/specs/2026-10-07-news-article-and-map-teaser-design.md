# News article page and the interactive map block

Status: draft for review. Figma (Nantucket - Website): the interactive map block is node `1910:9569`
("Interactive Map Block"), the news article page is node `1910:14863` ("news_content_desktop").

## Goal

1. An article has a page of its own at `/news/<slug>`, built to the Figma news template.
2. The Map Teaser block takes the Figma Interactive Map Block design.

## 1. News article page

**Route.** `app/news/[slug]/page.tsx`. A static route beats the catch-all (`app/[...slug]`), as
`/map` does, so a CMS page can still live at `/news` (the archive, slice 3) but not beneath it.
Unknown slugs return 404; a draft article opens in Presentation.

**Layout (from the Figma template).** A background curve; a 820px column holding the eyebrow
"Nantucket News", the article title (the page's H1), category tags, "Published: MM/DD/YYYY", a rule,
the body (paragraphs, a full-width rounded image, headings), and a **Share** row; then the News
Preview block's latest articles; then the footer. The header in the design is not rendered: the
repo's layout has it switched off.

**Content model.** `article` gains `body` (rich text: paragraphs, images, H3-H6, anchor links). It
keeps `title`, `slug`, `date`, `image` (now also the share image), `categories`, and `link` (an
optional override: an external story, or a redirect). Nothing is stored that can be derived: the
URL is `/news/` + slug, the date is formatted at render.

**Links to an article.** A news tile goes to `link` when it resolves (not empty, not `#`), otherwise
to `/news/<slug>`. This replaces "plain tile" for articles; the plain tile remains for a CTA tile
with no link.

**Share row.** Copy link, Facebook and LinkedIn. Instagram is left out: it has no web share address
(decision recorded; the design shows it). Buttons use the current page address in the browser, so
no site URL setting is needed. Copy link reports success or failure in text a screen reader reads.

**More news.** The latest articles other than this one, reusing the News Preview tiles. The call to
action tile is omitted: its destination, the archive, does not exist yet
([#11](https://github.com/temperandforge/NLB-nantucket-landbank-main/issues/11)). With no other
article the section is not shown.

**Also.** Page title and Open Graph image from the article; the sitemap lists articles; Presentation
maps `/news/:slug` to the article and the article to its URL.

## 2. Map Teaser rebuilt

Two panels (Figma `1910:9569`): a brown panel with an eyebrow ("Our interactive map"), a large
headline, body text and line art; a map panel with a static map illustration, a gold pin, a property
detail card (photo, name, short description) and a "View the map" button. The map is artwork, not a
live map: the block does not load Mapbox.

**Fields.** `eyebrow`, `heading`, `body`, `featuredProject` (a reference to a `project`, whose name,
photo and description fill the card), `button` (the shared button: label and link, defaulting to
"View the map" and `/map`). The card is hidden when no project is chosen or it has no name.
Superseded: the theme's empty grey preview box and issue
[#13](https://github.com/temperandforge/NLB-nantucket-landbank-main/issues/13).

## Assets

Committed, never hotlinked, copied into `frontend/public/images/blocks/`: the map panel's two line
drawings, the pin, and the article page's curve; the link icon becomes an inline SVG component. The
shell cannot download from Figma, so the user runs one command block to fetch them (the plan has
it).

## Deferred

- The news archive, filters, pagination ([#11](https://github.com/temperandforge/NLB-nantucket-landbank-main/issues/11)).
- The "more news" call-to-action tile, until the archive exists.
- Instagram in the share row.

## Verification

Typegen, type-check, lint, `tsc`, schema validate and the three check scripts; a new check for the
share addresses. A production build lists `/news/[slug]`. The user reviews the article page and the
map block in Presentation and against Figma; I cannot render them here.
