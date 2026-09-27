import type { Disposition } from "@jam-overture/loom"
import { describeHoldError, type HeldProposal, type HoldError } from "@jam-overture/loom/write"

import { screenName } from "./screen-names"
import { unreadableClause, type UnreadableChange } from "./unreadable-change"
import type { WaitingTriage } from "./waiting-effect"
import { plainMoment } from "./when"
import {
  ASK_ORIGINS,
  confidenceWord,
  ruleSentence,
  STAKES,
  unreadableQueue,
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
 * 3. **What would it actually do?** See `waiting-effect.ts`. This was the
 *    question the front door could not answer, and it is the one that decides
 *    which of three waiting changes a person opens first — a queue that cannot
 *    tell "rewords a heading" from "deletes the pricing section" has sorted
 *    nothing for anybody.
 * 4. **What happens if I say yes, and what happens if I say no?** See
 *    `answerOutcomes` — this is the half the portal has never said out loud.
 * 5. **Where do I go to answer it?**
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
  /**
   * What it would do to the page, read against the page as it is now.
   *
   * `undefined` when that page could not be read, which is a state the card
   * says out loud rather than rendering as a change with no steps in it. It is
   * an argument rather than something read here for the reason every other
   * field of this module is pure: a queue row is one of several drawn from one
   * fan-out, and a function that reached for a store per row would turn one
   * listing into one read per waiting change.
   */
  readonly effect: WaitingTriage | undefined
  /** Where the change can actually be answered. */
  readonly href: string
}

export const waitingChange = (
  held: HeldProposal,
  effect: WaitingTriage | undefined
): WaitingChange => ({
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
  effect,
  href: `/portal/pages/${held.treeId}`,
})

/**
 * Where a change sits in the queue.
 *
 * A queue is ordered by how long something has waited, not by which page it
 * happens to sit on — the whole reason this screen exists is that the page a
 * change belongs to is the thing a reviewer should not have to think about
 * first.
 *
 * The sort itself moved to `unreadable-change.ts` on 20 September, because a
 * queue has two kinds of row in it now and they go in one order. This is the
 * half that is about a `WaitingChange`: what instant it is filed under. Passed
 * to `inQueueOrder` rather than assumed by it, so the page screen — whose rows
 * are shaped differently and just as correctly — can use the same ordering
 * without this module's type.
 */
export const waitingSince = (change: WaitingChange): string => change.sinceIso

/**
 * How much of the deployment this queue actually managed to look at.
 *
 * Both fields exist for one reason, and it is the sharpest thing about this
 * screen: **its whole claim is that it is the place you find out whether
 * anything needs you.** There are two separate ways that claim can quietly stop
 * being true, and neither of them looks like a failure — both render as the same
 * confident, empty *"Nothing is waiting for you."*
 */
/**
 * A page this screen asked and could not get an answer out of.
 *
 * It was a number. `Sweep.unreadable` counted the pages whose holds came back an
 * error and threw away which ones they were — so the screen said *"One page
 * couldn't be checked."* over a notice whose one piece of advice was **"open the
 * page you are worried about"**, to a reader with no way to know which page that
 * was. The front door holds the answer at the moment it forms the count: the
 * fan-out is one read per listed page, in listing order, so the failure and the
 * page it belongs to are side by side and one of them was being dropped.
 *
 * That is the misreading this surface is being rebuilt against, in its purest
 * form — information the screen already had, removed to make the screen
 * simpler. Naming the pages costs no read that was not already made.
 *
 * The name is not here. A page is named by reading its head, the front door
 * already does that for every page it lists, and a row holding its own copy of
 * the name would be a second source for a string this portal keeps in one
 * (`page-name.ts`). So a row carries the id it can be looked up by, and the
 * screen pairs it with the name it already has in hand.
 */
export type UnreadablePage = {
  readonly treeId: string
  /** Why nothing can be said about this page, in a person's words. */
  readonly why: string
  /** The store's own account of the same failure. */
  readonly technical: string
  /** Where a reader can go and look for themselves, which is the only move there is. */
  readonly href: string
}

export const unreadablePage = (treeId: string, error: HoldError): UnreadablePage => ({
  treeId,
  why: unreadableQueue(error.code),
  technical: describeHoldError(error),
  href: `/portal/pages/${treeId}`,
})

/**
 * The pages a fan-out could not get an answer out of, paired back up with the
 * pages they were about.
 *
 * Here rather than inline on the front door, and that is not tidiness. This
 * lane filed a finding on 17 September saying `page.tsx` is a file no test can
 * reach — it is an `async` Server Component that reads cookies and a store, so
 * every reading it computes is tested as a function and never as a *wiring*,
 * and a defect restored by deleting one argument in it leaves the whole suite
 * green. A zip written in that file would be one more of those, and it is the
 * half of this unit most likely to go wrong quietly: an index that slips by one
 * names the wrong page in a warning, which is worse than the count it replaced.
 *
 * So the pairing is a function, and the alignment it depends on is an argument
 * rather than an assumption. A result with no page beside it is dropped rather
 * than guessed at: naming the wrong page is a worse failure than the count this
 * replaced, and a screen cannot tell the two apart once it is drawn.
 */
export const unreadableIn = <Page extends { readonly treeId: string }>(
  pages: readonly Page[],
  answers: readonly { readonly ok: boolean; readonly error?: HoldError }[]
): readonly UnreadablePage[] =>
  answers.flatMap((answer, index) => {
    const page = pages[index]

    return answer.ok || page === undefined || answer.error === undefined
      ? []
      : [unreadablePage(page.treeId, answer.error)]
  })

export type Sweep = {
  /**
   * The pages whose holds came back an error. Never folded into the total: a
   * page whose holds could not be read is not a page with none.
   */
  readonly unreadable: readonly UnreadablePage[]
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
export const waitingSummary = (
  changes: readonly WaitingChange[],
  /**
   * The rows in this same queue that nobody can answer.
   *
   * A third argument rather than a field on `Sweep`, and the distinction is the
   * one this whole unit turns on. `Sweep` is *what this screen did not manage
   * to look at* — pages it could not ask, pages it never reached — and both of
   * its members make `sweepIsPartial` true, which raises a notice telling the
   * reader to go and open the page themselves. These are the opposite: the page
   * answered, the queue is known, and the row is **on this screen**, in the
   * list, in its place in time. Telling a reader to go and look at it would
   * send them to a screen that fails on the same row.
   */
  unreadable: readonly UnreadableChange[],
  sweep: Sweep
): string => {
  const pages = new Set(changes.map((change) => change.treeId)).size
  const unchecked = sweep.unreadable.length
  const unread =
    unchecked === 0
      ? ""
      : ` ${unchecked === 1 ? "One page" : `${unchecked} pages`} couldn't be checked, and ${unchecked === 1 ? "it is named" : "they are named"} below.`
  const unreached = sweep.complete
    ? ""
    : " This deployment has more pages than this screen checks."
  const stuck = unreadableClause(unreadable, changes.length)
  const gap = `${stuck}${unread}${unreached}`

  /*
   * Two different empty queues, and only one of them is good news.
   *
   * "Nothing is waiting for you." over a queue holding a row nobody can read is
   * the exact failure this surface is being rebuilt against — a confident,
   * cheerful sentence that is false, with the thing that makes it false sitting
   * three lines below it. The second wording keeps the reassurance that is
   * still true (there is nothing here for *you* to do) and drops the part that
   * is not.
   */
  if (changes.length === 0) {
    return unreadable.length === 0
      ? `Nothing is waiting for you.${gap}`
      : `Nothing is waiting that you can answer.${gap}`
  }

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
export const sweepIsPartial = (sweep: Sweep): boolean =>
  sweep.unreadable.length > 0 || !sweep.complete
