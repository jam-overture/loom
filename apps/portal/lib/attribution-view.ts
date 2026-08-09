import { assertNever, type AuthorKind } from "@loom/runtime"
import type { NodeChange, NodeAttribution, NodeTouch, TreeAttribution } from "@loom/runtime/store"

/**
 * Who put a node here, in the words a reviewer reads.
 *
 * The runtime answers this as a chain of log entries (`attributeTree`). That is
 * the right shape to reason with and the wrong shape to read: a reviewer
 * pointing at a heading wants one line saying who asked for it and one saying
 * what has happened to it since.
 *
 * Pure, no React, and flat — the same two constraints `outline.ts` works under,
 * and for the same two reasons. The wording is the part worth testing, and this
 * crosses into a Client Component, so a credit may not carry a `StoredRevision`
 * with a whole delta hanging off it down the wire.
 */

export type NodeCredit = {
  /** Who asked, who wrote it, and when — the headline. */
  readonly placed: string
  /**
   * The revision that placed it, or null when nothing did. Separate from the
   * sentence because it is the only part of a credit that links anywhere.
   */
  readonly revision: number | null
  /** What has touched it since, or null when nothing has. */
  readonly since: string | null
  /**
   * Set when the walk stopped before it found a placement. The credit above is
   * still true; it is just not the whole story, and a page that did not say so
   * would present a bounded read as a complete one.
   */
  readonly partial: boolean
}

const ANONYMOUS = "someone unrecorded"

/**
 * A model wrote it, or the runtime did. There is no third author, and the
 * difference matters to a reviewer: an undo the runtime computed had no opinion
 * to be right or wrong about, which is why calibration ignores it (0031).
 */
const wroteIt = (authoredBy: AuthorKind): string =>
  authoredBy === "model" ? "the model wrote it" : "the runtime wrote it"

const askedBy = (actor: string | undefined): string => actor ?? ANONYMOUS

/**
 * The distinction `NodeTouch.named` exists for. "The model added a card" and
 * "the model added the heading inside a card it added" are different sentences,
 * and only one of them is true of a node that was carried in.
 */
const placedPhrase = (touch: NodeTouch): string =>
  touch.named ? "added" : "brought in as part of a larger change"

const placedSentence = (touch: NodeTouch): string => {
  const { provenance, revision, answeredBy } = touch.entry
  const allowed = answeredBy === undefined ? "" : `, allowed by ${answeredBy}`

  return `${placedPhrase(touch)} at revision ${revision} — ${askedBy(provenance.actor)} asked, ${wroteIt(
    provenance.authoredBy
  )}${allowed}`
}

const effectVerb = (effect: NodeChange): string => {
  switch (effect) {
    case "configured":
      return "configured"
    case "moved":
      return "moved"
    default:
      return assertNever(effect, "effectVerb")
  }
}

/**
 * How many touches get named before the rest become a number.
 *
 * A node reconfigured forty times is a fact about the node, not forty facts, and
 * a pane that listed them would push everything else off the screen. The count
 * of what is not shown is always stated — the rule `audit-view.ts` already sets.
 */
export const TOUCH_LIMIT = 3

const sinceSentence = (touches: readonly NodeTouch<NodeChange>[]): string | null => {
  if (touches.length === 0) return null

  const shown = touches.slice(-TOUCH_LIMIT)
  const omitted = touches.length - shown.length
  const listed = shown
    .map((touch) => `${effectVerb(touch.effect)} by ${askedBy(touch.entry.provenance.actor)} at revision ${touch.entry.revision}`)
    .join(", ")

  return omitted === 0 ? `since: ${listed}` : `since: ${listed} (and ${omitted} earlier)`
}

export const creditFor = (attribution: NodeAttribution): NodeCredit => {
  const since = sinceSentence(attribution.since)

  switch (attribution.outcome) {
    case "placed":
      return {
        placed: placedSentence(attribution.placed),
        revision: attribution.placed.entry.revision,
        since,
        partial: false,
      }
    case "seeded":
      return {
        placed: "part of the tree from the start — no revision placed it",
        revision: null,
        since,
        partial: false,
      }
    case "undetermined":
      return {
        placed: "placed further back than this page looked",
        revision: null,
        since,
        partial: true,
      }
    default:
      return assertNever(attribution, "creditFor")
  }
}

/**
 * Credits by node id, ready to hand to a Client Component.
 *
 * A plain record rather than the runtime's `Map`, because this is what crosses
 * the server/client boundary and a `Map` does not survive it.
 */
export const nodeCredits = (attribution: TreeAttribution): Record<string, NodeCredit> =>
  Object.fromEntries(
    Array.from(attribution.nodes, ([nodeId, found]) => [nodeId, creditFor(found)])
  )
