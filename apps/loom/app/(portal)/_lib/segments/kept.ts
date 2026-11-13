import { err, ok, randomIdFactory, type LoomTree, type Result } from "@jam-overture/loom"
import type { ApplicationId } from "@jam-overture/loom/store"

import { portalDatabase } from "../database"
import type { PageCopy } from "../proposing/copies"
import { followsItsSite, pageCopiesFor } from "../proposing/stores"
import { governedPagesFor } from "../write"
import { audienceRulesFor } from "./rules"
import type { SegmentChangeStore } from "./segment-changes"
import { memorySegmentChangeStore } from "./segment-changes-memory"
import { postgresSegmentChangeStore } from "./segment-changes-postgres"
import {
  rebuildSegmentForms,
  type SegmentFormsError,
  type SegmentFormsGiven,
} from "./segment-forms"

/**
 * One application's changes for segments, and what writing their forms needs,
 * wired to this deployment: Postgres when one is configured and memory when
 * not, memoised per application on a global carrier for `write.ts`'s reason,
 * where a second construction in memory is a second, empty map.
 */
const CARRIER_KEY = Symbol.for("loom.portal.segment-changes")

type Carrier = { [CARRIER_KEY]?: Map<ApplicationId, SegmentChangeStore> }

const kept = ((globalThis as unknown as Carrier)[CARRIER_KEY] ??= new Map())

export const segmentChangesFor = (application: ApplicationId): SegmentChangeStore => {
  const known = kept.get(application)

  if (known !== undefined) return known

  const made =
    portalDatabase === undefined
      ? memorySegmentChangeStore()
      : postgresSegmentChangeStore(portalDatabase, { application })

  kept.set(application, made)

  return made
}

/** Everything writing a segment's form needs, given the copies already read. */
export const segmentFormsGivenFor = (
  application: ApplicationId,
  copies: readonly PageCopy[]
): SegmentFormsGiven => ({
  live: { trees: governedPagesFor(application), copies, follows: followsItsSite(application) },
  changes: segmentChangesFor(application),
  forms: audienceRulesFor(application),
  deltaId: randomIdFactory.deltaId,
  now: Date.now,
})

/**
 * Brings every segment's form of these pages up to the page as it is now
 * live, after something moved them: a change for everyone made, a change
 * undone, a newer version of the site's page followed.
 *
 * Run after the write it follows and never deciding it. A form it could not
 * bring up to date is behind its page, which the site already answers by
 * serving that segment's readers the page as it is for everyone (0392 clause
 * 4), so the result is for a caller that wants to say so.
 */
export const rebuildSegmentFormsFor = async (
  application: ApplicationId,
  published: readonly LoomTree[]
): Promise<Result<void, SegmentFormsError>> => {
  const copies = await pageCopiesFor(application).list()

  if (!copies.ok) return err({ code: "store", detail: copies.error.detail })

  const given = segmentFormsGivenFor(application, copies.value)

  for (const page of published) {
    const rebuilt = await rebuildSegmentForms(given, page)

    if (!rebuilt.ok) return rebuilt
  }

  return ok(undefined)
}
