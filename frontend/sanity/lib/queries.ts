import {defineQuery} from 'next-sanity'

export const settingsQuery = defineQuery(`*[_type == "settings"][0]`)

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
    "page": page->{"path": ${pagePath}}.path
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
 * Both shapes resolve their links through linkFields so page references come back as
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
 * Properties (the Land Bank properties shown on the interactive map and the archive).
 *
 * Taxonomies are dereferenced to their slug and title: the slug is the stable key the map's URL
 * filters use, the title is what a visitor reads. A dereferenced entry is null when the referenced
 * document is unpublished, so consumers must filter those out.
 *
 * Boundary geometry is not here - it lives in the single GeoJSON file on Project Settings, and
 * boundaryId says which feature in it belongs to this property.
 */
export const propertiesQuery = defineQuery(`
  *[_type == "property" && defined(slug.current)] | order(name asc) {
    _id,
    name,
    "slug": slug.current,
    boundaryIds,
    location,
    disablePopup,
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
 * Resolves page references inside a Portable Text field's link annotations. A constant, not a
 * function of the field name: a function call inside a template literal widens the query's type
 * to `string`, and typegen's result map is keyed by the literal.
 */
const markDefsFields = /* groq */ `
  markDefs[]{
    ...,
    ${linkReference}
  }
`

/** What a news tile needs. Shared by the News Preview block and the article page's "more news". */
const articleCardFields = /* groq */ `
  _id,
  title,
  "slug": slug.current,
  date,
  image,
  link{
    ...,
    ${linkReference}
  },
  "categories": categories[]->{"slug": slug.current, title}
`

/**
 * The page builder's sections. Blocks marked "Hide this block" are dropped here, so their content
 * never reaches a visitor's browser; $includeHidden is true only in draft mode (Presentation),
 * where hidden blocks are shown with a badge. Each block type that holds a reference, a file or Portable Text
 * adds a branch here; plain fields come through the spread.
 */
const pageBuilderFields = /* groq */ `
  pageBuilder[$includeHidden || !coalesce(disabled, false)]{
    ...,
    _type == "heroVideo" => {
      ...,
      "videoUrl": video.asset->url
    },
    _type == "basicLeftRightText" => {
      ...,
      buttons[]{
        ...,
        ${linkFields}
      },
      rightContent[]{
        ...,
        _type == "anchorLinks" => {
          links[]{
            ...,
            ${linkFields}
          }
        },
        ${markDefsFields}
      }
    },
    _type == "missionStatement" => {
      ...,
      links[]{
        ...,
        ${linkFields}
      }
    },
    _type == "ctaContact" => {
      ...,
      button{
        ...,
        ${linkFields}
      }
    },
    _type == "newsPreview" => {
      ...,
      ctaLink{
        ...,
        ${linkReference}
      },
      "articles": *[_type == "article" && defined(slug.current)] | order(date desc) [0...12] {
        ${articleCardFields}
      }
    },
    _type == "eventsPreview" => {
      ...,
      "events": *[
        _type == "event" && defined(start)
        && dateTime(coalesce(end, start)) >= dateTime($now)
      ] | order(start asc) [0...12] {
        _id,
        title,
        start,
        end,
        location,
        description
      }
    },
    _type == "faqList" => {
      ...,
      "ungrouped": *[_type == "faq" && !defined(category->_id)] | order(order asc, question asc) {
        _id,
        question,
        answer[]{
          ...,
          ${markDefsFields}
        }
      },
      "groups": *[_type == "faqCategory"] | order(order asc, title asc) {
        _id,
        title,
        "faqs": *[_type == "faq" && category._ref == ^._id] | order(order asc, question asc) {
          _id,
          question,
          answer[]{
            ...,
            ${markDefsFields}
          }
        }
      }[count(faqs) > 0]
    },
    _type == "jobListings" => {
      ...,
      "jobs": *[_type == "job"] | order(order asc, title asc) {
        _id,
        title,
        description,
        location,
        employmentType,
        "department": department->{"slug": slug.current, title},
        applyLink{
          ...,
          ${linkReference}
        }
      }
    },
    _type == "peopleGrid" => {
      ...,
      "staff": *[_type == "staffMember" && ^.source == "staff"] | order(order asc, name asc) {
        _id,
        name,
        title,
        headshot,
        "department": department->{"slug": slug.current, title, order}
      },
      "commissioners": *[_type == "commissioner" && ^.source == "commissioners"] | order(order asc, name asc) {
        _id,
        name,
        title,
        termDate,
        headshot
      }
    },
    _type == "projectGrid" => {
      ...,
      "projects": *[_type == "property" && defined(slug.current)] | order(name asc) {
        _id,
        name,
        image,
        link,
        "propertyTypes": propertyTypes[]->{"slug": slug.current, title, order}
      }
    },
    _type == "propertyArchive" => {
      ...,
      "properties": *[_type == "property" && defined(slug.current)] | order(name asc) {
        _id,
        name,
        description,
        link,
        image,
        "propertyTypes": propertyTypes[]->{"slug": slug.current, title, order},
        "resources": resources[]->{"slug": slug.current, title, order}
      },
      "defaultImage": *[_type == "settings" && _id == "siteSettings"][0].defaultPropertyImage
    },
    _type == "imageCarousel" => {
      ...,
      images[]{
        ...,
        ${linkFields}
      }
    },
    _type == "projectPreview" => {
      ...,
      button{
        ...,
        ${linkFields}
      },
      "projects": projects[]->{
        _id,
        name,
        image,
        link
      }
    },
    _type == "mapTeaser" => {
      ...,
      button{
        ...,
        ${linkFields}
      },
      "featuredProject": featuredProject->{name, description, image}
    },
    _type == "downloadBlock" => {
      ...,
      downloads[]{
        ...,
        "fileUrl": file.asset->url,
        "fileName": file.asset->originalFilename
      }
    },
    _type == "jumpNavContent" => {
      ...,
      content[]{
        ...,
        _type == "anchorLinks" => {
          links[]{
            ...,
            ${linkFields}
          }
        },
        ${markDefsFields}
      }
    },
  }
`

/**
 * The projection shared by every query that renders a page, so a page looked up by path and the
 * landing page chosen in Site Settings come back in the same shape.
 */
const pageFields = /* groq */ `
  _id,
  _type,
  name,
  slug,
  "path": ${pagePath},
  ${pageBuilderFields}
`

/**
 * Look up a page by its full derived path.
 *
 * Filters on the leaf slug first so the database does the narrowing, then compares the assembled
 * path - two pages under different parents may share a leaf slug. pathOnly pages are excluded so
 * a grouping segment like /about-us resolves to nothing and the route 404s.
 */
export const getPageQuery = defineQuery(`
  *[_type == 'page' && slug.current == $leaf && !coalesce(pathOnly, false)]{
    ${pageFields}
  }[path == $path][0]
`)

/**
 * The page chosen as the site's landing page in Site Settings. Null when none is set, or when the
 * chosen page is unpublished or a pathOnly grouping segment (which has no page of its own).
 * Matched on _type and the fixed singleton id for the same reason as footerQuery.
 */
export const landingPageQuery = defineQuery(`
  *[
    _type == "page" && !coalesce(pathOnly, false)
    && _id == *[_type == "settings" && _id == "siteSettings"][0].landingPage._ref
  ][0]{
    ${pageFields}
  }
`)

/**
 * Sitemap entries.
 *
 * pathOnly pages are excluded because they 404.
 */
export const sitemapData = defineQuery(`
  *[
    _type == "page" && defined(slug.current) && !coalesce(pathOnly, false)
  ] {
    _type,
    _updatedAt,
    "slug": ${pagePath},
  }
`)

// pathOnly pages are excluded: they have no route, so prerendering one would 404.
export const pagesSlugs = defineQuery(`
  *[_type == "page" && defined(slug.current) && !coalesce(pathOnly, false)]
  {"slug": ${pagePath}}
`)

export const articleQuery = defineQuery(`
  *[_type == "article" && slug.current == $slug][0]{
    _id,
    _type,
    title,
    "slug": slug.current,
    date,
    image,
    "categories": categories[]->{"slug": slug.current, title},
    // The article's own category documents, to find related articles.
    "categoryIds": categories[]._ref,
    body[]{
      ...,
      _type == "anchorLinks" => {
        links[]{
          ...,
          ${linkFields}
        }
      },
      ${markDefsFields}
    }
  }
`)

/**
 * The articles to show under the one being read: never that one, those that share a category with
 * it first (the more they share, the earlier), then the latest of the rest. Ranked by a count of
 * shared categories, not filtered, so a thin category is topped up instead of left short. The
 * count is null for an article with no categories (null does not compare with numbers), hence the
 * coalesce. Up to 12 come back; the page shows as many as the Single News Page settings ask for.
 */
export const moreNewsQuery = defineQuery(`
  *[_type == "article" && defined(slug.current) && slug.current != $slug]
    | order(count(coalesce(categories, [])[_ref in $categoryIds]) desc, date desc) [0...12] {
    ${articleCardFields}
  }
`)

/** Content shared by every news article page (a singleton, so matched on its type and fixed id). */
export const singleNewsPageQuery = defineQuery(`
  *[_type == "singleNewsPage" && _id == "singleNewsPage"][0]{
    eyebrow,
    publishedLabel,
    shareLabel,
    moreNews{
      ...,
      ctaLink{
        ...,
        ${linkReference}
      }
    }
  }
`)

export const articleSlugs = defineQuery(`
  *[_type == "article" && defined(slug.current)]{"slug": slug.current}
`)

export const articleSitemapData = defineQuery(`
  *[_type == "article" && defined(slug.current)]{_updatedAt, "slug": slug.current}
`)
