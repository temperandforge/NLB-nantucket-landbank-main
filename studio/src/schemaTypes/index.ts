import {commissioner} from './documents/commissioner'
import {department} from './documents/department'
import {person} from './documents/person'
import {page} from './documents/page'
import {post} from './documents/post'
import {staffMember} from './documents/staffMember'
import {callToAction} from './objects/callToAction'
import {infoSection} from './objects/infoSection'
import {settings} from './singletons/settings'
import {commissionersPage} from './singletons/commissionersPage'
import {staffPage} from './singletons/staffPage'
import {link} from './objects/link'
import {blockContent} from './objects/blockContent'
import button from './objects/button'
import {blockContentTextOnly} from './objects/blockContentTextOnly'

// Export an array of all the schema types.  This is used in the Sanity Studio configuration. https://www.sanity.io/docs/studio/schema-types

export const schemaTypes = [
  // Singletons
  settings,
  commissionersPage,
  staffPage,
  // Documents
  page,
  post,
  person,
  commissioner,
  staffMember,
  department,
  // Objects
  button,
  blockContent,
  blockContentTextOnly,
  infoSection,
  callToAction,
  link,
]
