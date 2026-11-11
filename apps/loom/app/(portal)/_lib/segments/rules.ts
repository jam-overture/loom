import {
  describeAudienceOverlayError,
  memoryAudienceOverlayStore,
  type ApplicationId,
  type AudienceOverlayError,
  type AudienceOverlayStore,
  type AudienceRule,
  type AudienceRuleRevision,
} from "@jam-overture/loom/store"
import { treeIdSchema } from "@jam-overture/loom"
import { postgresAudienceOverlayStore } from "@jam-overture/loom/postgres"

import { PORTAL_READ_BUDGET_MS } from "@/app/_lib/app/bounded"
import { readWithin, unavailable } from "@/app/_lib/app/bounded-store"
import type { PublishedPage } from "@/app/_lib/pages/published"

import { portalDatabase } from "../database"
import { pageLabelOf, pageChoicesOf } from "../goals/goal-view"

/**
 * One application's audience rules, read and written through 0376's store
 * (0371 clause 3): Postgres when one is configured and memory when not,
 * memoised per application on a global carrier for `write.ts`'s reason, where
 * a second construction in memory is a second, empty store.
 */
const CARRIER_KEY = Symbol.for("loom.portal.audience-rules")

type Carrier = { [CARRIER_KEY]?: Map<ApplicationId, AudienceOverlayStore> }

const kept = ((globalThis as unknown as Carrier)[CARRIER_KEY] ??= new Map())

export const audienceRulesFor = (application: ApplicationId): AudienceOverlayStore => {
  const known = kept.get(application)

  if (known !== undefined) return known

  const made =
    portalDatabase === undefined
      ? memoryAudienceOverlayStore()
      : postgresAudienceOverlayStore(portalDatabase, { application })

  kept.set(application, made)

  return made
}

/** A page the site published, as the rules are read for it. */
export type RulesPage = { readonly treeId: string; readonly name: string }

/** The site's published pages, by the heading each gives itself, as *New goal* lists them. */
export const rulesPagesOf = (published: readonly PublishedPage[]): readonly RulesPage[] =>
  pageChoicesOf(published).map((page) => ({ treeId: page.treeId, name: pageLabelOf(page) }))

/** A page as its rules are asked for: by id, and with whatever the asker reads it by. */
type RulesFor = { readonly treeId: string }

export type RulesReading<P extends RulesFor = RulesPage> =
  | {
      readonly ok: true
      /** `head` is `undefined` for a page nobody has written rules for. */
      readonly pages: readonly (P & { readonly head: AudienceRuleRevision | undefined })[]
    }
  | { readonly ok: false; readonly detail: string }

/**
 * Every page's current rules, read at once and each within the portal's
 * budget. One page that cannot be read makes the whole reading unreadable
 * rather than a list missing that page's: a segment's order and its pages are
 * only true of every page at once, and the read door must never answer pages
 * beside rules that leave one out (0371 clause 4).
 */
export const readPageRules = async <P extends RulesFor>(
  store: AudienceOverlayStore,
  pages: readonly P[]
): Promise<RulesReading<P>> => {
  type Read = P & { readonly head: AudienceRuleRevision | undefined }
  type Outcome =
    | { readonly ok: true; readonly page: Read }
    | { readonly ok: false; readonly detail: string }

  const read = await Promise.all(
    pages.map(async (page): Promise<Outcome> => {
      const treeId = treeIdSchema.safeParse(page.treeId)

      if (!treeId.success) return { ok: false, detail: `${page.treeId} is not a page id` }

      const head = await readWithin<AudienceRuleRevision | undefined, AudienceOverlayError>(
        () => store.rules(treeId.data),
        unavailable,
        PORTAL_READ_BUDGET_MS
      )

      return head.ok
        ? { ok: true, page: { ...page, head: head.value } }
        : { ok: false, detail: describeAudienceOverlayError(head.error) }
    })
  )

  const failed = read.find((outcome) => !outcome.ok)

  return failed === undefined || failed.ok
    ? { ok: true, pages: read.flatMap((outcome) => (outcome.ok ? [outcome.page] : [])) }
    : { ok: false, detail: failed.detail }
}

/** One page's new rules, and the revision they were worked out from. */
export type RulesWrite = {
  readonly treeId: string
  readonly expectedRevision: number
  readonly rules: readonly AudienceRule[]
}

export type WritesOutcome = {
  readonly written: number
  /** Pages whose rules moved on since they were read, so nothing was written to them. */
  readonly moved: readonly string[]
  readonly failed: readonly string[]
}

/**
 * Records each page's new rules against the revision it was read at, so an
 * edit made while somebody else changed the same page is refused on that page
 * rather than overwriting their order. Pages are written one at a time: 0376
 * keeps one log per page, and there is no write across pages to make atomic,
 * so the outcome says which pages took the change.
 */
export const writePageRules = async (
  store: AudienceOverlayStore,
  writes: readonly RulesWrite[],
  actor: string,
  recordedAt: string
): Promise<WritesOutcome> => {
  const outcomes = await Promise.all(
    writes.map(async (write) => {
      const treeId = treeIdSchema.safeParse(write.treeId)

      if (!treeId.success) return { treeId: write.treeId, code: "failed" as const }

      const recorded = await store.recordRules(treeId.data, {
        rules: write.rules,
        actor,
        recordedAt,
        expectedRevision: write.expectedRevision,
      })

      return {
        treeId: write.treeId,
        code: recorded.ok
          ? ("written" as const)
          : recorded.error.code === "out-of-date"
            ? ("moved" as const)
            : ("failed" as const),
      }
    })
  )

  return {
    written: outcomes.filter((outcome) => outcome.code === "written").length,
    moved: outcomes.filter((outcome) => outcome.code === "moved").map(({ treeId }) => treeId),
    failed: outcomes.filter((outcome) => outcome.code === "failed").map(({ treeId }) => treeId),
  }
}
