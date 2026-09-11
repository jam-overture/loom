import type { SpotTone } from "./spotlight"

/**
 * What the demo says to a visitor it has carried away from the record.
 *
 * On a wide screen there is nothing to say: the rail is its own scroller, the
 * card stays where it was, and the stage moves under it. On a narrow one the two
 * panes share the document's one scroller, so bringing a marked band into view
 * carries the rail — and the record on it — off the top of the screen. The
 * change is then the only thing a visitor can see, which is the demo reduced to
 * the one claim `docs/rollout.md` calls the least novel thing here: *an AI
 * changed a page*.
 *
 * So this is the sentence that goes with the way back, and there are exactly two
 * of them because a mark has exactly two tones (`SpotTone`). Both are written to
 * the same rule the rest of this surface follows — plain first, the record one
 * click away — which here means the sentence never describes the record's
 * contents. It says what Loom did, or what Loom is waiting for, and the button
 * beside it is the click.
 *
 * `said` is deliberately about *Loom* rather than about the page. A visitor
 * looking at a green chip already knows the page changed; what they cannot see
 * from where they are standing is that something wrote it down.
 */
export type Reach = {
  /** The claim, in the fewest words that still make one. */
  readonly said: string
  /** The button's own words. A verb, because it is a place to go. */
  readonly action: string
}

const REACH: Readonly<Record<SpotTone, Reach>> = {
  applied: { said: "Loom wrote down what it just did.", action: "Show the record" },
  /**
   * The louder of the two, and the only one that is a question. A held change
   * has two buttons in the rail and nothing on the page can answer it, so a
   * visitor who has scrolled down to look at the amber ring is looking at the
   * one state this surface cannot proceed from.
   */
  awaiting: { said: "Loom is waiting for your answer.", action: "Answer it" },
}

export const reachFor = (tone: SpotTone): Reach => REACH[tone]
