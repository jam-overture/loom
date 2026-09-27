import type { UnreadableHold } from "@jam-overture/loom/write"

import { plainMoment } from "./when"

/**
 * One change that is in the queue and cannot be taken out of it.
 *
 * ## What this is, and why it is not the same thing as an unreadable page
 *
 * `waiting.ts` already has an `UnreadablePage`: a page the front door asked
 * *what is waiting on you* and got an error back from. Nothing at all is known
 * about that page's queue — it may hold nothing, it may hold nine things.
 *
 * This is the other one, and 0175 is what made it possible to tell them apart.
 * A listing now answers `{ held, unreadable }`: the page **was** read, the
 * queue **is** known, and one row in it is a row this build could place and
 * could not parse. So the four changes beside it are not taken off the queue by
 * the fifth — which is the whole point of the shape — and the fifth is not
 * silently gone either, which is this module.
 *
 * The distinction matters on screen because the two want opposite next moves.
 * *This page could not be checked* sends a reader to the page, where they will
 * see for themselves. *This page was checked and one change on it cannot be
 * read* sends them nowhere: the page screen reads the same store and will fail
 * on the same row. Telling somebody to go and look at a thing that cannot be
 * looked at is worse than telling them nothing.
 *
 * ## The three facts a row carries, and the one it does not
 *
 * An `UnreadableHold` is a `HoldPosition` and a reason — `proposalId`,
 * `heldAt`, `detail` — and that is deliberately almost nothing. There is no
 * utterance, because the intent is one of the fields that would not parse;
 * there is no rule, no stakes, no confidence and no effect, because every one
 * of those lives inside a shape this build rejected.
 *
 * So the only human-facing fact on the row is **when it stopped**, and it is
 * the one worth having: a row stuck since this morning and a row stuck since
 * July are the same error and different problems. It is why these sort into the
 * queue with the answerable changes rather than into a footnote — the position
 * in time *is* the information.
 *
 * ## Why there is no "answer" here
 *
 * Every other row in this queue ends in two buttons. This one cannot, and the
 * card says so in words rather than rendering a disabled pair: confirming a
 * hold means handing the runtime a delta to apply, and the delta is the part
 * that would not read. A greyed-out *Apply this change* invites a reader to
 * wonder what they are missing. "There is nothing here to say yes or no to" is
 * the fact.
 */
export type UnreadableChange = {
  /** The row's own name in the store, which is what a developer will search for. */
  readonly proposalId: string
  readonly treeId: string
  /** When it stopped, for a reader. */
  readonly since: string
  /** The same moment, for a machine — and what puts this row in queue order. */
  readonly sinceIso: string
  /** What happened, in a person's words. */
  readonly why: string
  /**
   * What to do, given that answering it is not on the list.
   *
   * Every screen in this portal answers *what do I do now?*, and this is the
   * one row where the honest answer is **not you**. Saying so plainly is worth
   * more than a link: a reader who is told to open the page, opens the page,
   * and meets the same row has learned only that the portal is wasting their
   * afternoon.
   */
  readonly next: string
  /** The store's own account of which field disagreed. */
  readonly detail: string
}

/**
 * Why nothing here can be answered, said once.
 *
 * One sentence rather than a table over a code, because there is no code: an
 * `UnreadableHold` carries a `detail` string and nothing to switch on. The
 * sentence is therefore the same every time and the `detail` is what tells two
 * rows apart, which is exactly the shape `UnreadablePages` already uses — the
 * plain line on the surface, the account that differs one click down.
 */
const WHY =
  "Loom found this change, and couldn't make sense of what it says. There's nothing here to say yes or no to, because nothing here can tell you what you'd be agreeing to."

/**
 * Waiting is the thing that will not help, and it is the thing a queue teaches.
 *
 * Every other row on this screen clears by somebody reading it and pressing a
 * button, so a reader who has learned this screen has learned that rows leave
 * when they are answered. This row will sit there forever. Saying that out loud
 * is the difference between a queue with an old item in it and a queue a person
 * has quietly stopped trusting.
 */
const NEXT =
  "Waiting won't clear it and neither will opening the page — whoever looks after this deployment needs to. Nothing has been lost: the change is still exactly where it was."

export const unreadableChange = (treeId: string, row: UnreadableHold): UnreadableChange => ({
  proposalId: row.proposalId,
  treeId,
  since: plainMoment(row.heldAt),
  sinceIso: row.heldAt,
  why: WHY,
  next: NEXT,
  detail: row.detail,
})

/**
 * Every unreadable row of one page's listing, described.
 *
 * Takes the listing rather than the rows so that a caller cannot reach for
 * `.held` and forget this exists, which is precisely the defect this module was
 * filed against: a field landed on the listing on 20 September and all three
 * screens that read it took `.held` and dropped the rest.
 */
export const unreadableChangesIn = (
  treeId: string,
  listing: { readonly unreadable: readonly UnreadableHold[] }
): readonly UnreadableChange[] => listing.unreadable.map((row) => unreadableChange(treeId, row))

/**
 * One row of a review queue: a change somebody can answer, or one nobody can.
 *
 * Generic over the answerable half because the two screens that draw a queue
 * describe a hold differently and correctly so. The front door cannot show the
 * page, so its row is `WaitingChange` — triage, and a link to where the
 * question can be answered. The page screen has the page on it, so its row is a
 * `HeldChange` with a before and an after. Neither is the other's, and the
 * *ordering* is the same question on both: what has been stuck longest.
 */
export type QueueRow<Change> =
  | { readonly kind: "answerable"; readonly change: Change }
  | { readonly kind: "unreadable"; readonly row: UnreadableChange }

/**
 * Both kinds in one order, oldest first.
 *
 * ## Why they interleave rather than sitting in a section of their own
 *
 * 0175 put `unreadable` in `compareHolds` order alongside the rows that parsed
 * for exactly this: *"a caller can render it in place rather than re-joining
 * two lists."* Taking it up is not tidiness. A queue is ordered by how long
 * something has waited — that is the entire claim `inQueueOrder` makes — and a
 * row lifted out into a box at the bottom has had the one fact it carries taken
 * off it. A change stuck since July belongs at the top of the queue whether or
 * not anybody can answer it, because *how long has this been sitting here* is
 * the question the order is built to answer.
 *
 * Vercel does not put failed builds in a separate list either. They are in the
 * deployments list, in time order, marked.
 *
 * ## Why it is a function rather than a `sort` at each call site
 *
 * Both screens that draw a queue are files a test cannot reach — `page.tsx` is
 * an `async` Server Component that reads cookies and a store, which is this
 * lane's 17 September finding. A merge written in one of them is a wiring no
 * test runs, and a queue that silently sorted its unreadable rows last would
 * look entirely correct in a screenshot of a deployment where they happen to be
 * newest.
 *
 * Ties keep the order the arguments arrived in, with the answerable row first.
 * That is arbitrary and it is stable, which is what a screenshot of the same
 * store twice depends on.
 */
export const inQueueOrder = <Change>(
  changes: readonly Change[],
  unreadable: readonly UnreadableChange[],
  when: (change: Change) => string
): readonly QueueRow<Change>[] => {
  const rows: QueueRow<Change>[] = [
    ...changes.map((change) => ({ kind: "answerable" as const, change })),
    ...unreadable.map((row) => ({ kind: "unreadable" as const, row })),
  ]

  const at = (row: QueueRow<Change>): string =>
    row.kind === "answerable" ? when(row.change) : row.row.sinceIso

  return rows
    .map((row, index) => ({ row, index }))
    .sort((left, right) => {
      const leftAt = at(left.row)
      const rightAt = at(right.row)

      return leftAt < rightAt ? -1 : leftAt > rightAt ? 1 : left.index - right.index
    })
    .map((entry) => entry.row)
}

/**
 * What a queue says about the rows it cannot answer, as a clause.
 *
 * Appended to a screen's own count rather than folded into it, because the two
 * numbers are different claims and merging them would make the first one
 * unusable. *"5 changes are waiting for your answer"* over a queue where one of
 * them cannot be answered is a promise the screen does not keep; *"4 changes
 * are waiting for your answer. 1 more was found and couldn't be read"* is two
 * true sentences and a reader who knows which is which.
 *
 * `alongside` is how many answerable rows the same queue holds, and it is here
 * for one word. *"1 more"* is the right phrase beside four other rows and a
 * small lie beside none — more than what? A queue whose only row is one nobody
 * can read is the case a reader is most likely to meet on a screen that
 * otherwise says *you're all caught up*, so it is the one the sentence must get
 * right.
 *
 * Empty when there are none, so a caller can concatenate unconditionally.
 */
export const unreadableClause = (
  unreadable: readonly UnreadableChange[],
  alongside: number
): string => {
  if (unreadable.length === 0) return ""

  const many = unreadable.length > 1
  const found =
    alongside === 0
      ? `${unreadable.length} ${many ? "changes were" : "change was"} found`
      : `${unreadable.length} more ${many ? "were" : "was"} found`

  return ` ${found} and couldn't be read; ${many ? "they're" : "it's"} in the list below.`
}

/**
 * What one page's row on the pages index has to count.
 *
 * `waiting` is `null` when that page's queue could not be read at all, which is
 * a third state and not a zero: the row already renders no badge for it, and
 * the total below skips it rather than treating it as nothing waiting.
 */
export type PageQueue = {
  readonly waiting: number | null
  readonly unreadable: number
}

/**
 * The sentence over the pages index.
 *
 * ## Why the count stayed at `held.length`
 *
 * The 20 September finding put the choice plainly: *waiting* on this index can
 * mean **answerable** (4, with a mark) or **in the queue** (5, with a mark),
 * and it recommended the first. This takes that, and the reason is what the
 * number is for. A reviewer reads this index to decide which page to open and
 * how much of their afternoon it costs, and an unreadable row costs them
 * nothing because there is nothing they can do with it. A 5 that is really a 4
 * sends somebody to a page to answer a change that cannot be answered.
 *
 * So the count is of what can be answered, and the rows that cannot are a
 * second sentence and a second mark. Nothing is removed — it is separated,
 * because the two are different claims.
 *
 * ## Why the clause is not the queue's
 *
 * `unreadableClause` ends *"it's in the list below"*, which is true on the two
 * screens that draw a queue and false here: the list below this sentence is
 * pages. A reader sent to scan a list of pages for a change would not find one.
 * So this one names where the mark actually is.
 */
export const pagesWaitingSummary = (pages: readonly PageQueue[]): string => {
  const waiting = pages.reduce((total, page) => total + (page.waiting ?? 0), 0)
  const unreadable = pages.reduce((total, page) => total + page.unreadable, 0)

  const stuck =
    unreadable === 0
      ? ""
      : ` ${unreadable} ${unreadable === 1 ? "change couldn't be read" : "changes couldn't be read"} — ${unreadable === 1 ? "the page it's on is marked" : "the pages they're on are marked"} below.`

  if (waiting === 0) {
    return unreadable === 0
      ? "Nothing is waiting for you. Open a page to see it or to ask for a change."
      : `Nothing is waiting that you can answer.${stuck}`
  }

  return `${waiting} ${waiting === 1 ? "change is" : "changes are"} waiting for your answer.${stuck}`
}

/**
 * The mark beside a count, as one string.
 *
 * One string rather than `{count} can&rsquo;t be read` in the markup, and it is
 * a photograph that made the case. Both screens shipped the interpolated form
 * and both rendered **`1can't be read`**: JSX collapses the newline and indent
 * between an expression and the text after it, so the space a reader needs is
 * exactly the one the formatter takes away. Every test passed — a `toContain`
 * on either half is satisfied by the run-together string, which is the
 * 24 August lesson in its purest form — and `prerender:check` never sees these
 * screens, because both are rendered per request.
 *
 * So the join happens where a test can assert the whole of it, and the wording
 * lives in one place for the two screens that show it.
 */
export const unreadableMark = (count: number): string => `${count} can’t be read`
