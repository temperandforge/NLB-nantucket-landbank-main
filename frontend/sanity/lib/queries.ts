import {defineQuery} from 'next-sanity'

export const settingsQuery = defineQuery(`*[_type == "settings"][0]`)

const postFields = /* groq */ `
  _id,
  "status": select(_originalId in path("drafts.**") => "draft", "published"),
  "title": coalesce(title, "Untitled"),
  "slug": slug.current,
  excerpt,
  coverImage,
  "date": coalesce(date, _updatedAt),
  "author": author->{firstName, lastName, picture},
`

/**
 * Assembles a page's URL path from its parent chain.
 *
 * The single source of truth for how a page URL is built - reused by the page lookup,
 * generateStaticParams, the sitemap and link resolution. Do not re-inline it.
 *
 * GROQ cannot recurse, so the depth is fixed here at 3 segments (two ancestors); see
 * docs/DECISIONS.md 2.4 and 2.5. Must be evaluated in a scope where the current document is a
 * page. Raising the depth means updating this, the Presentation routes in studio/sanity.config.ts,
 * and the validation in studio/src/schemaTypes/documents/page.ts together.
 */
const pagePath = /* groq */ `select(
  defined(parent->parent) => parent->parent->slug.current + "/" + parent->slug.current + "/" + slug.current,
  defined(parent) => parent->slug.current + "/" + slug.current,
  slug.current
)`

const linkReference = /* groq */ `
  _type == "link" => {
    "page": page->{"path": ${pagePath}}.path,
    "post": post->slug.current
  }
`

const linkFields = /* groq */ `
  link {
      ...,
      ${linkReference}
      }
`

/**
 * A menu item is either a menuLink (label + link) or a menuGroup (label + nested menuLinks).
 * Both shapes resolve their links through linkFields so page/post references come back as
 * slugs, ready for linkResolver().
 */
const menuItemFields = /* groq */ `
  _key,
  _type,
  label,
  _type == "menuLink" => {
    ${linkFields}
  },
  _type == "menuGroup" => {
    children[]{
      _key,
      label,
      ${linkFields}
    }
  }
`

const menuFields = /* groq */ `
  _id,
  title,
  items[]{
    ${menuItemFields}
  }
`

// Matched on both _type and the fixed singleton id: the id alone would let any document type
// satisfy the filter, which makes the generated result type a union with an all-null variant.
export const footerQuery = defineQuery(`
  *[_type == "footer" && _id == "footer"][0]{
    newsletterHeading,
    organizationName,
    infoColumns[]{
      _key,
      heading,
      lines[]{
        _key,
        text,
        href
      }
    },
    socialLinks[]{
      _key,
      platform,
      url
    },
    "footerMenu": footerMenu->{
      ${menuFields}
    },
    "legalMenu": legalMenu->{
      ${menuFields}
    },
  }
`)

/**
 * Projects (the Land Bank properties shown on the interactive map).
 *
 * Taxonomies are dereferenced to their slug and title: the slug is the stable key the map's URL
 * filters use, the title is what a visitor reads. A dereferenced entry is null when the referenced
 * document is unpublished, so consumers must filter those out.
 *
 * Boundary geometry is not here - it lives in the single GeoJSON file on Project Settings, and
 * boundaryId says which feature in it belongs to this project.
 */
export const projectsQuery = defineQuery(`
  *[_type == "project" && defined(slug.current)] | order(name asc) {
    _id,
    name,
    "slug": slug.current,
    boundaryId,
    location,
    description,
    link,
    "image": image{"url": asset->url, alt},
    "propertyTypes": propertyTypes[]->{"slug": slug.current, title},
    "resources": resources[]->{"slug": slug.current, title}
  }
`)

/**
 * Every available filter option, not just the ones currently in use - a category the client has
 * created but not yet assigned should still appear in the dropdown.
 */
export const mapFiltersQuery = defineQuery(`{
  "propertyTypes": *[_type == "propertyType" && defined(slug.current)] | order(title asc){
    "slug": slug.current,
    title
  },
  "resources": *[_type == "resource" && defined(slug.current)] | order(title asc){
    "slug": slug.current,
    title
  }
}`)

export const mapSettingsQuery = defineQuery(`
  *[_type == "projectSettings" && _id == "projectSettings"][0]{
    eyebrow,
    heading,
    intro,
    "boundaryDataUrl": boundaryData.asset->url,
    "boundaryIdProperty": coalesce(boundaryIdProperty, "id"),
    "trailsDataUrl": trailsData.asset->url,
    defaultCenter,
    defaultZoom
  }
`)

/**
 * Look up a page by its full derived path.
 *
 * Filters on the leaf slug first so the database does the narrowing, then compares the assembled
 * path - two pages under different parents may share a leaf slug. pathOnly pages are excluded so
 * a grouping segment like /about-us resolves to nothing and the route 404s.
 */
export const getPageQuery = defineQuery(`
  *[_type == 'page' && slug.current == $leaf && !coalesce(pathOnly, false)]{
    _id,
    _type,
    name,
    slug,
    heading,
    subheading,
    "path": ${pagePath},
    "pageBuilder": pageBuilder[]{
      ...,
      _type == "callToAction" => {
        ...,
        button {
          ...,
          ${linkFields}
        }
      },
      _type == "infoSection" => {
        content[]{
          ...,
          markDefs[]{
            ...,
            ${linkReference}
          }
        }
      },
    },
  }[path == $path][0]
`)

/**
 * Sitemap entries.
 *
 * pathOnly pages are excluded because they 404, and the parentheses around the type check are
 * deliberate - without them `&& defined(slug.current)` binds only to the post branch, so pages
 * with no slug were being included.
 */
export const sitemapData = defineQuery(`
  *[
    (_type == "post" && defined(slug.current)) ||
    (_type == "page" && defined(slug.current) && !coalesce(pathOnly, false))
  ] | order(_type asc) {
    _type,
    _updatedAt,
    "slug": select(_type == "page" => ${pagePath}, slug.current),
  }
`)

export const allPostsQuery = defineQuery(`
  *[_type == "post" && defined(slug.current)] | order(date desc, _updatedAt desc) {
    ${postFields}
  }
`)

export const morePostsQuery = defineQuery(`
  *[_type == "post" && _id != $skip && defined(slug.current)] | order(date desc, _updatedAt desc) [0...$limit] {
    ${postFields}
  }
`)

export const postQuery = defineQuery(`
  *[_type == "post" && slug.current == $slug] [0] {
    content[]{
    ...,
    markDefs[]{
      ...,
      ${linkReference}
    }
  },
    ${postFields}
  }
`)

export const postPagesSlugs = defineQuery(`
  *[_type == "post" && defined(slug.current)]
  {"slug": slug.current}
`)

// pathOnly pages are excluded: they have no route, so prerendering one would 404.
export const pagesSlugs = defineQuery(`
  *[_type == "page" && defined(slug.current) && !coalesce(pathOnly, false)]
  {"slug": ${pagePath}}
`)
