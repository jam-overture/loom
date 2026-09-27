import { assertNever, type AuthorKind } from "@jam-overture/loom"
import type { NodeChange, NodeAttribution, NodeTouch, TreeAttribution } from "@jam-overture/loom/store"

/**
 * Who put a node here, in the words a reviewer reads.
 *
 * The runtime answers this as a chain of log entries (`attributeTree`). That is
 * the right shape to reason with and the wrong shape to read: a reviewer
 * pointing at a heading wants one line saying who asked for it and one saying
 * what has happened to it since.
 *
 * Phrases rather than whole sentences, because a revision is a place a reviewer
 * can go (0043) and the number has to survive as a number to become a link. The
 * words are still assembled here — the joining left to JSX is punctuation.
 *
 * Pure, no React, and flat — the same two constraints `outline.ts` works under,
 * and for the same two reasons. The wording is the part worth testing, and this
 * crosses into a Client Component, so a credit may not carry a `StoredRevision`
 * with a whole delta hanging off it down the wire.
 */

/**
 * One later change to the node, as the two parts a reader needs separately.
 *
 * The revision is not folded into the text for the reason the placement's is
 * not: a revision is somewhere a reviewer can go (0043), and a sentence with the
 * number buried in it is a sentence they have to retype into a URL.
 */
export type CreditTouch = {
  /** "configured by bob" — everything except the revision it happened at. */
  readonly text: string
  readonly revision: number
}

export type NodeCredit = {
  /**
   * What the placing revision did — or, when nothing placed it, the whole
   * account, since there is no revision to hang the rest of a sentence off.
   */
  readonly placed: string
  /** Who asked, who wrote it, and who allowed it. Null when nothing placed it. */
  readonly by: string | null
  /**
   * The revision that placed it, or null when nothing did. Separate from the
   * sentence because it is the only part of a credit that links anywhere.
   */
  readonly revision: number | null
  /** What has touched it since, oldest first. Empty when nothing has. */
  readonly since: readonly CreditTouch[]
  /** Touches older than the ones listed, counted rather than named. */
  readonly omitted: number
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

const placedBy = (touch: NodeTouch): string => {
  const { provenance, answeredBy } = touch.entry
  const allowed = answeredBy === undefined ? "" : `, allowed by ${answeredBy}`

  return `${askedBy(provenance.actor)} asked, ${wroteIt(provenance.authoredBy)}${allowed}`
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

const shownTouches = (touches: readonly NodeTouch<NodeChange>[]): readonly CreditTouch[] =>
  touches.slice(-TOUCH_LIMIT).map((touch) => ({
    text: `${effectVerb(touch.effect)} by ${askedBy(touch.entry.provenance.actor)}`,
    revision: touch.entry.revision,
  }))

export const creditFor = (attribution: NodeAttribution): NodeCredit => {
  const since = shownTouches(attribution.since)
  const omitted = attribution.since.length - since.length

  switch (attribution.outcome) {
    case "placed":
      return {
        placed: placedPhrase(attribution.placed),
        by: placedBy(attribution.placed),
        revision: attribution.placed.entry.revision,
        since,
        omitted,
        partial: false,
      }
    case "seeded":
      return {
        placed: "here from the start — no change put it here",
        by: null,
        revision: null,
        since,
        omitted,
        partial: false,
      }
    case "undetermined":
      return {
        placed: "put here further back than this page looked",
        by: null,
        revision: null,
        since,
        omitted,
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
