import 'server-only'

import {createClient} from 'next-sanity'

import {apiVersion, dataset, projectId} from '@/sanity/lib/api'

/**
 * A client that can write, for storing submissions only. The token is server-only and is read
 * when used, so a missing token fails the submission (500) rather than the whole build. It is a
 * general Editor token for now; narrowing it is tracked in
 * https://github.com/temperandforge/NLB-nantucket-landbank-main/issues/22
 */
export function getFormWriteClient() {
  const token = process.env.SANITY_WRITE_TOKEN
  if (!token) throw new Error('Missing SANITY_WRITE_TOKEN')
  return createClient({projectId, dataset, apiVersion, token, useCdn: false, perspective: 'raw'})
}
