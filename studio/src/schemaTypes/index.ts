import {menu} from './documents/menu'
import {page} from './documents/page'
import {project} from './documents/project'
import {projectType} from './documents/projectType'
import {property} from './documents/property'
import {article} from './documents/article'
import {commissioner} from './documents/commissioner'
import {event} from './documents/event'
import {faq} from './documents/faq'
import {job} from './documents/job'
import {form} from './documents/form'
import {formSubmission} from './documents/formSubmission'
import {staffMember} from './documents/staffMember'
import {record} from './documents/record'
import {department, faqCategory, newsCategory, recordCategory} from './documents/taxonomies'
import {propertyType} from './documents/propertyType'
import {resource} from './documents/resource'
import {heroVideo} from './objects/heroVideo'
import {hero} from './objects/hero'
import {heroImage} from './objects/heroImage'
import {heroSecondary} from './objects/heroSecondary'
import {heroTertiary} from './objects/heroTertiary'
import {basicLeftRightText} from './objects/basicLeftRightText'
import {jumpNavContent} from './objects/jumpNavContent'
import {downloadBlock} from './objects/downloadBlock'
import {growers} from './objects/growers'
import {mapExplorer} from './objects/mapExplorer'
import {mapPreview} from './objects/mapPreview'
import {mapTeaser} from './objects/mapTeaser'
import {contactForm} from './objects/contactForm'
import {imageCarousel} from './objects/imageCarousel'
import {timeline} from './objects/timeline'
import {seo} from './objects/seo'
import {settings} from './singletons/settings'
import {footer} from './singletons/footer'
import {header} from './singletons/header'
import {siteBanner} from './singletons/siteBanner'
import {faqSettings} from './singletons/faqSettings'
import {projectSettings} from './singletons/projectSettings'
import {singleNewsPage} from './singletons/singleNewsPage'
import {singleProjectPage} from './singletons/singleProjectPage'
import {link} from './objects/link'
import {anchorLinks} from './objects/anchorLinks'
import {faqAccordion} from './objects/faqAccordion'
import {peopleGrid} from './objects/peopleGrid'
import {projectGrid} from './objects/projectGrid'
import {propertyArchive} from './objects/propertyArchive'
import {recordsArchive} from './objects/recordsArchive'
import {projectPreview} from './objects/projectPreview'
import {propertiesPreview} from './objects/propertiesPreview'
import {faqList} from './objects/faqList'
import {jobListings} from './objects/jobListings'
import {formField} from './objects/formField'
import {formEmbed} from './objects/formEmbed'
import {newsPreview} from './objects/newsPreview'
import {eventsGrid} from './objects/eventsGrid'
import {newsArchive} from './objects/newsArchive'
import {eventsPreview} from './objects/eventsPreview'
import {missionStatement} from './objects/missionStatement'
import {ctaContact} from './objects/ctaContact'
import {menuGroup} from './objects/menuGroup'
import {menuLink} from './objects/menuLink'
import {infoColumn} from './objects/infoColumn'
import {infoLine} from './objects/infoLine'
import {socialLink} from './objects/socialLink'
import {blockContent} from './objects/blockContent'
import button from './objects/button'
import {blockContentTextOnly} from './objects/blockContentTextOnly'
import {blockContentWithForm} from './objects/blockContentWithForm'

// Export an array of all the schema types.  This is used in the Sanity Studio configuration. https://www.sanity.io/docs/studio/schema-types

export const schemaTypes = [
  // Singletons
  settings,
  footer,
  header,
  siteBanner,
  projectSettings,
  faqSettings,
  singleNewsPage,
  singleProjectPage,
  // Documents
  page,
  menu,
  property,
  project,
  article,
  event,
  staffMember,
  commissioner,
  faq,
  job,
  form,
  formSubmission,
  record,
  // Categorisation for the above - referenced, so the client can extend them without a deploy
  newsCategory,
  department,
  faqCategory,
  recordCategory,
  // Categorisation for properties - referenced, so the client can extend either without a deploy
  propertyType,
  projectType,
  resource,
  // Objects
  button,
  blockContent,
  blockContentTextOnly,
  blockContentWithForm,
  heroVideo,
  hero,
  heroImage,
  heroSecondary,
  heroTertiary,
  basicLeftRightText,
  jumpNavContent,
  imageCarousel,
  timeline,
  downloadBlock,
  growers,
  mapExplorer,
  seo,
  mapPreview,
  mapTeaser,
  contactForm,
  link,
  anchorLinks,
  faqAccordion,
  missionStatement,
  newsPreview,
  newsArchive,
  faqList,
  jobListings,
  peopleGrid,
  projectGrid,
  propertyArchive,
  recordsArchive,
  projectPreview,
  propertiesPreview,
  eventsPreview,
  eventsGrid,
  ctaContact,
  formField,
  formEmbed,
  // Menu building blocks - menuGroup nests menuLink, capped at two levels
  menuGroup,
  menuLink,
  // Footer info columns and social links
  infoColumn,
  infoLine,
  socialLink,
]
