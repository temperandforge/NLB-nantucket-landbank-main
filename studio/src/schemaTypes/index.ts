import {commissioner} from './documents/commissioner'
import {department} from './documents/department'
import {menu} from './documents/menu'
import {person} from './documents/person'
import {page} from './documents/page'
import {post} from './documents/post'
import {project} from './documents/project'
import {propertyType} from './documents/propertyType'
import {resource} from './documents/resource'
import {staffMember} from './documents/staffMember'
import {callToAction} from './objects/callToAction'
import {infoSection} from './objects/infoSection'
import {settings} from './singletons/settings'
import {footer} from './singletons/footer'
import {commissionersPage} from './singletons/commissionersPage'
import {projectSettings} from './singletons/projectSettings'
import {staffPage} from './singletons/staffPage'
import {link} from './objects/link'
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
  commissionersPage,
  staffPage,
  projectSettings,
  // Documents
  page,
  post,
  person,
  commissioner,
  staffMember,
  department,
  menu,
  project,
  // Categorisation for projects - referenced, so the client can extend either without a deploy
  propertyType,
  resource,
  // Objects
  button,
  blockContent,
  blockContentTextOnly,
  infoSection,
  callToAction,
  link,
  // Menu building blocks - menuGroup nests menuLink, capped at two levels
  menuGroup,
  menuLink,
  // Footer info columns and social links
  infoColumn,
  infoLine,
  socialLink,
]
