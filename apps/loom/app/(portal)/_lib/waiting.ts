import type { Disposition } from "@loom/runtime"
import type { HeldProposal } from "@loom/runtime/write"

import { screenName } from "./screen-names"
import { plainMoment } from "./when"
import {
  ASK_ORIGINS,
  confidenceWord,
  ruleSentence,
  STAKES,
  type PlainState,
  type PlainWord,
} from "./vocabulary"

/**
 * Everything waiting on a person, wherever it is.
 *
 * The portal has had a review queue since day one and it has always been a
 * *section of a page screen*. That is the right place to answer a change and
 * the wrong place to find one: a reviewer who wants to know whether anything
 * needs them has to open every page in turn and scroll past a preview to find
 * out that the answer is no. `/portal` itself was a `redirect` to the page
 * list — the portal's front door was a sentence about where to go instead.
 *
 * This module is the front door's half of that: it turns a hold into the four
 * things a person triaging one actually asks, and nothing else.
 *
 * 1. **What did somebody ask for?** The utterance, verbatim. It is the one
 *    string on a hold that was typed by a human, and it is what tells two
 *    waiting changes apart at a glance far better than a proposal id does.
 * 2. **Why has it stopped?** The rule the Gate cited, in a person's words.
 * 3. **What happens if I say yes, and what happens if I say no?** See
 *    `answerOutcomes` — this is the half the portal has never said out loud.
 * 4. **Where do I go to answer it?**
 *
 * It is pure and takes a hold, so the assembly is testable without a store,
 * and so the home screen and the page screen cannot drift into describing the
 * same hold two different ways.
 */

/**
 * What each of the two buttons would actually do.
 *
 * The review queue has always shown what a change would do to the page and
 * never what *answering* it would do. Those are different questions and only
 * the second one is about the reader: "adds a heading inside n_root" describes
 * the delta, and a person hovering over two buttons wants to know what they are
 * about to set in motion and whether they can walk it back.
 *
 * Three things make these sentences true rather than reassuring, and all three
 * are properties of the runtime rather than of this screen:
 *
 * - **Yes is permission, not an override.** `confirmHeld` re-runs the Gate
 *   against the tree as it is at that moment (0002), so a change can still be
 *   refused after somebody says yes. The sentence says "checks its rules once
 *   more" for that reason and not as a hedge.
 * - **Yes is undoable exactly when the Gate said it was.** `reversible` is on
 *   the judgment already, and the whole of 0016 is that an applied change can
 *   be inverted from the log. Where the Gate recorded that it could not, the
 *   sentence says so — that is the single most consequential thing on the card
 *   and it used to be a `reversible no` pair one click down.
 * - **No throws away the change and keeps the record of it.** A discarded hold
 *   leaves the ask in the journal (0023), so "nothing is lost" is a claim about
 *   the record rather than a comfort.
 */
export type AnswerOutcomes = {
  /** What pressing "Apply this change" sets in motion. */
  readonly yes: string
  /** What pressing "No thanks" sets in motion. */
  readonly no: string
}

export const answerOutcomes = (disposition: Disposition): AnswerOutcomes => ({
  yes: disposition.reversible
    ? "Loom checks its rules once more, then makes the change and writes it into the page's history — where you can undo it."
    : "Loom checks its rules once more, then makes the change and writes it into the page's history. This one can't be undone afterwards.",
  /*
   * The screen is named rather than spelled, and this line is why the naming is
   * worth a module. It said "stays in Activity" — a sixth wording for a screen
   * the rail called `Activity`, the strip called "What's been asked" and the
   * front door called "Everything anyone has asked for" — printed at the one
   * moment a person is deciding whether to throw a change away. "Nothing is
   * lost" is only reassuring if the reader can find the place it is not lost in.
   */
  no: `The change is thrown away and the page is left exactly as it is. What was asked for stays in ${screenName("/portal/activity")}, so nothing is lost.`,
})

/**
 * One change waiting on somebody, ready to be read.
 *
 * `treeId` stays a name rather than becoming "your page": names are what tell
 * two rows apart, which is the 22 August reasoning, and a queue drawn from
 * several pages is the case that most needs them.
 */
export type WaitingChange = {
  readonly proposalId: string
  readonly treeId: string
  /** What somebody typed, verbatim. Never reworded — it is not the portal's sentence. */
  readonly asked: string
  /** The act that produced it — a visitor, a developer, the site itself. */
  readonly origin: PlainWord
  /** The name the host recorded for whoever asked, when it recorded one. */
  readonly actor: string | null
  /** The moment it stopped, for a reader. */
  readonly since: string
  /** The same moment, for a machine. */
  readonly sinceIso: string
  /** Why Loom would not do it alone, in one sentence. */
  readonly why: string
  /** The rule's own code, for the technical record. */
  readonly ruleCode: string
  /** How much is at stake, as a consequence rather than a level. */
  readonly stakes: PlainState
  /** The AI's own grade of itself, as a clause. */
  readonly confidence: string
  readonly answers: AnswerOutcomes
  /** Where the change can actually be answered. */
  readonly href: string
}

export const waitingChange = (held: HeldProposal): WaitingChange => ({
  proposalId: held.proposalId,
  treeId: held.treeId,
  asked: held.intent.utterance,
  origin: ASK_ORIGINS[held.intent.origin],
  actor: held.intent.actor ?? null,
  since: plainMoment(held.heldAt),
  sinceIso: held.heldAt,
  why: ruleSentence(held.disposition.reason.code),
  ruleCode: held.disposition.reason.code,
  stakes: STAKES[held.disposition.stakes],
  confidence: confidenceWord(held.disposition.confidence),
  answers: answerOutcomes(held.disposition),
  href: `/portal/pages/${held.treeId}`,
})

/**
 * Oldest first.
 *
 * A queue is ordered by how long something has waited, not by which page it
 * happens to sit on — the whole reason this screen exists is that the page a
 * change belongs to is the thing a reviewer should not have to think about
 * first. Ties keep the order the store returned, which is stable.
 */
export const inQueueOrder = (changes: readonly WaitingChange[]): readonly WaitingChange[] =>
  [...changes].sort((left, right) => (left.sinceIso < right.sinceIso ? -1 : left.sinceIso > right.sinceIso ? 1 : 0))

/**
 * How much of the deployment this queue actually managed to look at.
 *
 * Both fields exist for one reason, and it is the sharpest thing about this
 * screen: **its whole claim is that it is the place you find out whether
 * anything needs you.** There are two separate ways that claim can quietly stop
 * being true, and neither of them looks like a failure — both render as the same
 * confident, empty *"Nothing is waiting for you."*
 */
export type Sweep = {
  /**
   * Pages whose holds came back an error. Counted, never folded into the total:
   * a page whose holds could not be read is not a page with none.
   */
  readonly unreadable: number
  /**
   * Whether the sweep reached every page, or stopped at the first listing page.
   *
   * `TreeStore.list` is bounded by contract — one page of trees and a cursor,
   * because 0020 will not let any caller ask a store for everything it holds —
   * and this screen has to fan out one hold read per tree, since `forTree` is
   * the only listing a `HoldStore` offers. So a deployment past that bound has
   * changes waiting that this screen has not looked for.
   *
   * The version of this screen on the closed #208 took one listing page and said
   * nothing about it, so a deployment with more pages than the bound would be
   * told it was all caught up while a change sat waiting beyond it. Filed as a
   * framework finding — a hold store with no deployment-wide read is what makes
   * a complete answer cost one query per page — and said out loud here meanwhile,
   * because an incomplete answer a reader knows to distrust is worth something
   * and one they do not is worth less than nothing.
   */
  readonly complete: boolean
}

/**
 * The one sentence at the top, which is the whole screen compressed.
 *
 * It is written to be readable before the reader has looked at anything else,
 * so it answers "am I behind?" and then says where. The page count is in it
 * because "3 changes are waiting" on one page and on three pages are different
 * afternoons.
 *
 * Both caveats come after the count and neither goes inside it. A total that
 * silently absorbed a page it could not read, or pages it never reached, would
 * be a number a reader has no way to distrust — so the count says what was
 * found, and the sentences after it say what was not looked at.
 */
export const waitingSummary = (changes: readonly WaitingChange[], sweep: Sweep): string => {
  const pages = new Set(changes.map((change) => change.treeId)).size
  const unread =
    sweep.unreadable === 0
      ? ""
      : ` ${sweep.unreadable === 1 ? "One page" : `${sweep.unreadable} pages`} couldn't be checked.`
  const unreached = sweep.complete
    ? ""
    : " This deployment has more pages than this screen checks."
  const gap = `${unread}${unreached}`

  if (changes.length === 0) return `Nothing is waiting for you.${gap}`

  const count = `${changes.length} ${changes.length === 1 ? "change is" : "changes are"} waiting for your answer`

  return pages === 1 ? `${count}.${gap}` : `${count}, across ${pages} pages.${gap}`
}

/**
 * Whether the reader has been told less than the whole truth, either way.
 *
 * One question rather than two conditions spelled out at the call site, because
 * a screen that remembers to check one of them and forgets the other is exactly
 * the defect this pair exists to prevent.
 */
export const sweepIsPartial = (sweep: Sweep): boolean => sweep.unreadable > 0 || !sweep.complete
