import {menu} from './documents/menu'
import {page} from './documents/page'
import {project} from './documents/project'
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
import {mapTeaser} from './objects/mapTeaser'
import {contactForm} from './objects/contactForm'
import {imageCarousel} from './objects/imageCarousel'
import {timeline} from './objects/timeline'
import {settings} from './singletons/settings'
import {footer} from './singletons/footer'
import {projectSettings} from './singletons/projectSettings'
import {link} from './objects/link'
import {anchorLinks} from './objects/anchorLinks'
import {menuGroup} from './objects/menuGroup'
import {menuLink} from './objects/menuLink'
import {infoColumn} from './objects/infoColumn'
import {infoLine} from './objects/infoLine'
import {socialLink} from './objects/socialLink'
import {blockContent} from './objects/blockContent'
import button from './objects/button'
import {blockContentTextOnly} from './objects/blockContentTextOnly'

// Export an array of all the schema types.  This is used in the Sanity Studio configuration. https://www.sanity.io/docs/studio/schema-types

export const schemaTypes = [
  // Singletons
  settings,
  footer,
  projectSettings,
  // Documents
  page,
  menu,
  project,
  // Categorisation for projects - referenced, so the client can extend either without a deploy
  propertyType,
  resource,
  // Objects
  button,
  blockContent,
  blockContentTextOnly,
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
  mapTeaser,
  contactForm,
  link,
  anchorLinks,
  // Menu building blocks - menuGroup nests menuLink, capped at two levels
  menuGroup,
  menuLink,
  // Footer info columns and social links
  infoColumn,
  infoLine,
  socialLink,
]
