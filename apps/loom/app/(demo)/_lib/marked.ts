import type { Spotlight, SpotTone } from "./spotlight"

/**
 * What the rail says about the marks on the page, and which card owns which one.
 *
 * **The gap this closes.** A visitor may have two questions open at once — five
 * buttons, and nothing telling a stranger to answer one at a time — and the page
 * drew a single mark. The newest ask won it, silently. So the screen held two
 * cards reading *Waiting on you*, each with its own **Apply this change**, one
 * amber ring on the page, and one line above the cards reading:
 *
 * > The page is marked where **this** would happen, if you say yes.
 *
 * *This* had two referents and the sentence chose neither. Nothing was false —
 * which is why it survived six runs of this lane — and a stranger still had to
 * work out by hand which of two identical-looking questions the ring belonged
 * to, from a rule the screen never states.
 *
 * `spotlightsAcross` fixes the marking half: every open question is marked. This
 * file is the other half, and it is two sentences and a pill:
 *
 * - **the rail's line** stops pointing at *this* the moment there is more than
 *   one thing it could mean, and says instead that each question below carries
 *   its own mark;
 * - **each card wears its own mark's words**, in the mark's own colors, so the
 *   pairing is a thing to *look* at rather than a sentence to reason about — the
 *   same amber pill reading *Something new would go here* on the card and on the
 *   band it is pointing at.
 *
 * **The pill is there only when there is more than one mark**, and that is the
 * decision in this file worth arguing with. It answers *which of these is mine?*
 * — a question a visitor only has when there are two, and a second badge beside
 * the state on the first card a stranger ever sees would cost that card the
 * one-glance reading six runs have tuned it for.
 */

/** What the rail says when the page is marked for one change, and it landed. */
export const MARKED_APPLIED = "The page is marked where this happened."

/** And when it is one change that is still asking. */
export const MARKED_AWAITING = "The page is marked where this would happen, if you say yes."

/**
 * And when there is more than one, where the old sentence's *this* stopped
 * having a referent.
 *
 * It says *in its own words* rather than naming the asks, because the words are
 * already on the page and on the card: naming them here would be a third place
 * for the same sentence to drift from itself, and a rail line that grows a
 * clause per open question.
 */
export const MARKED_MANY = "Each question below is marked on the page, in its own words."

/** One change, and the marks the page drew for it. */
export type MarkedChange = {
  readonly recordId: string
  readonly spots: readonly Spotlight[]
}

export type MarkedPage = {
  /** The rail's one line, absent when the page carries no mark to explain. */
  readonly line?: string
  /** The color of the dot beside it, which is the color of the marks. */
  readonly tone?: SpotTone
  /**
   * The chip's own words, by record — and only when more than one change is
   * marked, because a lone mark has nothing to be told apart from.
   *
   * A change whose every node was already marked by an earlier one draws nothing
   * and is absent here, which is the truthful answer: a card must not claim a
   * mark the page is not carrying.
   */
  readonly words: ReadonlyMap<string, string>
}

/**
 * What to say about the marks, given the marks that were actually drawn.
 *
 * Read from the drawn spotlights rather than from the changes that asked for
 * them, because those are two different counts and the difference is exactly
 * where a sentence goes wrong: a change can be marked-worthy and draw nothing —
 * a re-theme configures the page root, and a ring around the whole stage points
 * at nothing (`spotFor`) — and the rail promising two marks over a page carrying
 * one is the failure this file exists to fix, in the other direction.
 */
export const markedPage = (changes: readonly MarkedChange[]): MarkedPage => {
  const drawn = changes.filter((change) => change.spots.length > 0)
  const first = drawn[0]

  if (first === undefined) return { words: new Map() }

  const tone = first.spots[0]!.tone

  if (drawn.length === 1) {
    return {
      line: tone === "applied" ? MARKED_APPLIED : MARKED_AWAITING,
      tone,
      words: new Map(),
    }
  }

  return {
    line: MARKED_MANY,
    tone,
    /**
     * The first mark of each, because a change drawing two of them is drawing
     * them in one color with one set of words to be told apart by, and the card
     * repeating the second adds a line without adding an answer.
     */
    words: new Map(drawn.map((change) => [change.recordId, change.spots[0]!.label])),
  }
}
