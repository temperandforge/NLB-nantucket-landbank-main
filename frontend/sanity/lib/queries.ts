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
      group,
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

/**
 * A form as the page renders it. `name` is the slug's string; the other field properties come
 * through as authored. Used by the page builder and by the submit route, so the browser and the
 * server see the same shape.
 */
const formProjection = /* groq */ `{
  _id,
  title,
  submitLabel,
  successMessage,
  sections[]{
    _key,
    heading,
    columns,
    fields[]{
      _key,
      "name": name.current,
      label,
      prompt,
      helperText,
      placeholder,
      fieldType,
      required,
      width,
      maxLength,
      options,
      showIf{field, equals}
    }
  }
}`

// Matched on both _type and the fixed singleton id: the id alone would let any document type
// satisfy the filter, which makes the generated result type a union with an all-null variant.
export const footerQuery = defineQuery(`
  *[_type == "footer" && _id == "footer"][0]{
    newsletterHeading,
    "newsletterForm": newsletterForm->${formProjection},
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
 * The site header. Matched on _type and the fixed singleton id, like footerQuery. The main menu
 * is null when the reference is unset or points at an unpublished menu - the header degrades.
 */
export const headerQuery = defineQuery(`
  *[_type == "header" && _id == "header"][0]{
    "mainMenu": mainMenu->{
      ${menuFields}
    }
  }
`)

/**
 * The site banner. Returns nothing unless it is switched on, so a disabled banner costs the
 * frontend no branch.
 */
export const siteBannerQuery = defineQuery(`
  *[_type == "siteBanner" && _id == "siteBanner" && enabled == true][0]{
    message,
    ${linkFields}
  }
`)

/**
 * Properties (the Land Bank properties shown on the interactive map and the archive).
 *
 * Taxonomies are dereferenced to their slug and title: the slug is the stable key the map's URL
 * filters use, the title is what a visitor reads. A dereferenced entry is null when the referenced
 * document is unpublished, so consumers must filter those out.
 *
 * Boundary geometry is not here - it lives in the single GeoJSON file on Properties Settings, and
 * boundaryId says which feature in it belongs to this property.
 */
/** What the map needs from a property. Shared by the Map Preview and Map Explorer blocks. */
const mapPropertyFields = /* groq */ `
  _id,
  name,
  "slug": slug.current,
  boundaryIds,
  location,
  disablePopup,
  description,
  "image": image{"url": asset->url, alt},
  "propertyTypes": propertyTypes[]->{"slug": slug.current, title},
  "resources": resources[]->{"slug": slug.current, title}
`

/**
 * Every available filter option, not just the ones in use: a category the client has created but
 * not yet assigned should still appear in the dropdown.
 */
const mapFiltersFields = /* groq */ `
  "propertyTypes": *[_type == "propertyType" && defined(slug.current)] | order(title asc){
    "slug": slug.current,
    title
  },
  "resources": *[_type == "resource" && defined(slug.current)] | order(title asc){
    "slug": slug.current,
    title
  }
`

/** The map's settings. Shared by the Map Preview and Map Explorer blocks. */
const mapSettingsFields = /* groq */ `
  "boundaryDataUrl": boundaryData.asset->url,
  "boundaryIdProperty": coalesce(boundaryIdProperty, "FID"),
  "trailsDataUrl": trailsData.asset->url,
  defaultCenter,
  defaultZoom
`

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
  externalUrl,
  "categories": categories[]->{"slug": slug.current, title}
`

/** The published form with this id, for validating a submission. Drafts never match. */
export const FORM_FOR_SUBMIT_QUERY = defineQuery(
  `*[_type == "form" && _id == $id][0]${formProjection}`,
)

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
        _type == "formEmbed" => {
          ...,
          form->${formProjection}
        },
        ${markDefsFields}
      }
    },
    _type == "contactForm" => {
      ...,
      details[]{
        ...,
        ${markDefsFields}
      },
      form->${formProjection}
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
      // A chosen category narrows the list; none means the latest of all news.
      "articles": *[
        _type == "article" && defined(slug.current)
        && (!defined(^.category) || ^.category._ref in categories[]._ref)
      ] | order(date desc) [0...12] {
        ${articleCardFields}
      }
    },
    _type == "newsArchive" => {
      ...,
      "articles": *[_type == "article" && defined(slug.current)] | order(date desc) {
        ${articleCardFields}
      }
    },
    _type == "recordsArchive" => {
      ...,
      "categories": *[_type == "recordCategory" && defined(slug.current)] | order(order asc, title asc) {
        _id,
        title,
        "slug": slug.current,
        order,
        sortBy,
        filters
      },
      "records": *[
        _type == "record" && defined(file.asset) && defined(category->slug.current)
      ] {
        _id,
        title,
        date,
        "fileUrl": file.asset->url,
        "fileName": file.asset->originalFilename,
        "categorySlug": category->slug.current
      }
    },
    _type == "eventsGrid" => {
      ...,
      "events": *[
        _type == "event" && defined(start)
        && dateTime(coalesce(end, start)) >= dateTime($now)
      ] | order(start asc) {
        _id,
        title,
        "slug": slug.current,
        start,
        end,
        location,
        description,
        image
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
        "slug": slug.current,
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
      "projects": *[_type == "project" && defined(slug.current)] | order(name asc) {
        _id,
        name,
        image,
        "slug": slug.current,
        "projectTypes": projectTypes[]->{"slug": slug.current, title}
      }
    },
    _type == "propertyArchive" => {
      ...,
      "properties": *[_type == "property" && defined(slug.current)] | order(name asc) {
        _id,
        name,
        "slug": slug.current,
        description,
        image,
        "propertyTypes": propertyTypes[]->{"slug": slug.current, title, order},
        "resources": resources[]->{"slug": slug.current, title, order}
      },
      "defaultImage": *[_type == "settings" && _id == "siteSettings"][0].defaultPropertyImage
    },
    _type == "imageCarousel" => {
      ...,
      "projects": select(
        source == "category" => *[
          _type == "project" && defined(slug.current)
          && ^.category._ref in projectTypes[]._ref
        ] | order(name asc) {
          _id,
          name,
          image,
          "slug": slug.current
        },
        projects[]->{
          _id,
          name,
          image,
          "slug": slug.current
        }
      ),
      "defaultImage": *[_type == "settings" && _id == "siteSettings"][0].defaultPropertyImage
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
        "slug": slug.current
      }
    },
    _type == "growers" => {
      ...,
      growers[]{
        _key,
        name,
        tag,
        image
      }
    },
    _type == "propertiesPreview" => {
      ...,
      button{
        ...,
        ${linkFields}
      },
      "properties": properties[]->{
        _id,
        name,
        "slug": slug.current,
        description,
        image,
        "propertyTypes": propertyTypes[]->{"slug": slug.current, title, order},
        "resources": resources[]->{"slug": slug.current, title, order}
      },
      "defaultImage": *[_type == "settings" && _id == "siteSettings"][0].defaultPropertyImage
    },
    _type == "mapPreview" => {
      ...,
      "properties": *[_type == "property" && defined(slug.current)] | order(name asc) {
        ${mapPropertyFields}
      },
      "settings": *[_type == "projectSettings" && _id == "projectSettings"][0]{
        ${mapSettingsFields}
      }
    },
    _type == "mapExplorer" => {
      ...,
      "properties": *[_type == "property" && defined(slug.current)] | order(name asc) {
        ${mapPropertyFields}
      },
      "filters": {
        ${mapFiltersFields}
      },
      "settings": *[_type == "projectSettings" && _id == "projectSettings"][0]{
        ${mapSettingsFields}
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
        _type == "faqAccordion" => {
          items[]{
            ...,
            answer[]{
              ...,
              ${markDefsFields}
            }
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

export const projectQuery = defineQuery(`
  *[_type == "project" && slug.current == $slug][0]{
    _id,
    _type,
    name,
    "slug": slug.current,
    description,
    image,
    // This project's own types, to find related projects.
    "projectTypeIds": projectTypes[]._ref,
    body[]{
      ...,
      _type == "anchorLinks" => {
        links[]{
          ...,
          ${linkFields}
        }
      },
      _type == "faqAccordion" => {
        items[]{
          ...,
          answer[]{
            ...,
            ${markDefsFields}
          }
        }
      },
      ${markDefsFields}
    }
  }
`)

/** Every project but this one, to be ordered and trimmed by orderRelatedProjects(). */
export const moreProjectsQuery = defineQuery(`
  *[_type == "project" && defined(slug.current) && slug.current != $slug]{
    _id,
    _createdAt,
    name,
    image,
    "slug": slug.current,
    "projectTypeIds": projectTypes[]._ref
  }
`)

/** Content shared by every project page (a singleton, so matched on its type and fixed id). */
export const singleProjectPageQuery = defineQuery(`
  *[_type == "singleProjectPage" && _id == "singleProjectPage"][0]{
    eyebrow,
    archiveLink{
      ...,
      ${linkReference}
    },
    moreProjects{
      ...,
      button{
        ...,
        ${linkFields}
      }
    }
  }
`)

/** What a property card needs; the property page's "more properties" projection too. */
const propertyCardFields = /* groq */ `
  _id,
  name,
  "slug": slug.current,
  description,
  image,
  "propertyTypes": propertyTypes[]->{"slug": slug.current, title, order},
  "resources": resources[]->{"slug": slug.current, title, order}
`

export const propertyQuery = defineQuery(`
  *[_type == "property" && slug.current == $slug][0]{
    _id,
    _type,
    name,
    "slug": slug.current,
    description,
    image,
    location,
    mapHeading,
    mapBody,
    "propertyTypes": propertyTypes[]->{"slug": slug.current, title, order},
    "propertyTypeIds": propertyTypes[]._ref,
    about[]{
      ...,
      _type == "anchorLinks" => {
        links[]{
          ...,
          ${linkFields}
        }
      },
      ${markDefsFields}
    },
    gallery[]{_key, asset, hotspot, crop, alt, caption},
    // A reference to an unpublished FAQ dereferences to null.
    "faqs": faqs[]->{
      _id,
      question,
      answer[]{
        ...,
        ${markDefsFields}
      }
    },
    "defaultImage": *[_type == "settings" && _id == "siteSettings"][0].defaultPropertyImage
  }
`)

/** Every property but this one, to be ordered and trimmed by orderRelatedProperties(). */
export const morePropertiesQuery = defineQuery(`
  *[_type == "property" && defined(slug.current) && slug.current != $slug]{
    _createdAt,
    ${propertyCardFields},
    "propertyTypeIds": propertyTypes[]._ref
  }
`)

/** What the property page's map shows: every property, as on the Map Preview block. */
export const propertyMapQuery = defineQuery(`
  {
    "properties": *[_type == "property" && defined(slug.current)] | order(name asc) {
      ${mapPropertyFields}
    },
    "settings": *[_type == "projectSettings" && _id == "projectSettings"][0]{
      ${mapSettingsFields}
    }
  }
`)

/**
 * Content shared by every property page, from the Single tab of Properties Settings
 * (a singleton, so matched on its type and fixed id).
 */
export const singlePropertyPageQuery = defineQuery(`
  *[_type == "projectSettings" && _id == "projectSettings"][0]{
    hideMap,
    faqs,
    moreProperties{
      ...,
      button{
        ...,
        ${linkFields}
      }
    }
  }
`)

export const propertySlugs = defineQuery(`
  *[_type == "property" && defined(slug.current)]{"slug": slug.current}
`)

export const propertySitemapData = defineQuery(`
  *[_type == "property" && defined(slug.current)]{_updatedAt, "slug": slug.current}
`)

export const projectSlugs = defineQuery(`
  *[_type == "project" && defined(slug.current)]{"slug": slug.current}
`)

export const projectSitemapData = defineQuery(`
  *[_type == "project" && defined(slug.current)]{_updatedAt, "slug": slug.current}
`)

export const eventQuery = defineQuery(`
  *[_type == "event" && slug.current == $slug][0]{
    _id,
    _type,
    title,
    "slug": slug.current,
    start,
    end,
    location,
    description,
    body[]{
      ...,
      ${markDefsFields}
    }
  }
`)

/** Upcoming events other than this one, for the page's closing preview. */
export const moreEventsQuery = defineQuery(`
  *[
    _type == "event" && defined(start) && slug.current != $slug
    && dateTime(coalesce(end, start)) >= dateTime($now)
  ] | order(start asc) [0...12] {
    _id,
    title,
    "slug": slug.current,
    start,
    end,
    location,
    description
  }
`)

export const eventSlugs = defineQuery(`
  *[_type == "event" && defined(slug.current)]{"slug": slug.current}
`)

export const eventSitemapData = defineQuery(`
  *[_type == "event" && defined(slug.current)]{_updatedAt, "slug": slug.current}
`)

/**
 * Site search (/search). $terms is an array of prefix patterns, one per word: `match` against an
 * array means every pattern must match, so "rain garden" needs both words (any field of the
 * document, in any order).
 *
 * What is searchable is whatever has a destination: pages (not pathOnly ones, which 404), news,
 * projects, events, properties that carry a link (they have no page of their own), and records
 * with a file. People, FAQs and the like have nowhere to send a visitor. A page is searched on its
 * name and the headings and plain-text bodies of its visible blocks.
 *
 * Titles weigh most, then everything else equally. One more row than the page shows is fetched so
 * the page can say the list was cut. Keep the types in search.ts (SEARCH_TYPES) in step.
 */
export const searchQuery = defineQuery(`
  *[
    (
      (_type == "page" && !coalesce(pathOnly, false) && defined(slug.current))
      || (_type in ["article", "project", "event", "property"] && defined(slug.current))
      || (_type == "record" && defined(file.asset))
    )
    && [
      title, name, description, pt::text(body),
      pageBuilder[!coalesce(disabled, false)].heading,
      pageBuilder[!coalesce(disabled, false)].body
    ] match $terms
  ] | score(
    boost(title match $terms, 8),
    boost(name match $terms, 8),
    description match $terms,
    pt::text(body) match $terms
  ) | order(_score desc, _updatedAt desc) [0...$limit] {
    _id,
    _type,
    "title": coalesce(title, name),
    "slug": slug.current,
    "path": select(_type == "page" => ${pagePath}),
    date,
    start,
    externalUrl,
    "fileUrl": file.asset->url,
    description,
    "body": pt::text(body),
    "blocks": pageBuilder[!coalesce(disabled, false)].body
  }
`)
