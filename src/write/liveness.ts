import { everyMemberOf } from "../closed-set.js"
import type { TreeId } from "../ids.js"
import type { StoreError } from "../store/errors.js"
import type { TreeReader } from "../store/store.js"

import type { HeldProposal } from "./held.js"

/**
 * Which of the changes waiting for an answer can still happen.
 *
 * `confirmHeld` compares the revision a proposal was judged against to the head
 * it would land on, and when they differ it releases the hold and reports
 * `revision-conflict` — dead rather than stale, because the delta can never
 * apply again and a second attempt at something impossible is worse than no
 * attempt. That is the right behaviour and it arrives too late to be useful to
 * the person doing the answering.
 *
 * Nothing said so beforehand. `forTree` hands back every waiting proposal with
 * no reference to where the page has got to, and `waiting` does the same across
 * a deployment, so a review queue built the documented way lists dead changes
 * and live ones together, oldest first, indistinguishable. The only way to find
 * out which is which was to answer one: read the change, decide, click yes, and
 * be told it never could have worked. Filed by `Loom docs` on 7 September, who
 * met it writing *When something looks wrong* and taught it on the page because
 * it was true.
 *
 * The comparison is one line, which is the reason it belongs here rather than in
 * every host: it has a direction, `confirmHeld` already fixed which one, and a
 * queue that got it backwards would badge exactly the wrong half.
 */

/**
 * What can be said about a hold, given what is known about its tree.
 *
 * `unknown` is a third answer rather than an optimistic `live` because the
 * question is asked over a page of holds spanning many trees, and a head that
 * could not be read is not evidence that nothing moved. A queue that shows no
 * badge is honest; one that shows *live* on a tree nobody could reach is the
 * failure this module exists to remove, restated one level up.
 */
export type HoldLiveness = "live" | "dead" | "unknown"

/**
 * The three answers, as a list a host can walk.
 *
 * The shape settled in `closed-set.ts`, here for the usual reason: a queue wants
 * a bucket per answer to exist before the first row arrives, and a legend wants
 * to describe all three without keeping its own copy of them.
 */
export const HOLD_LIVENESS: readonly HoldLiveness[] = everyMemberOf<HoldLiveness>()([
  "live",
  "dead",
  "unknown",
])

/**
 * The one comparison, in the direction `confirmHeld` makes it.
 *
 * Inequality rather than `headRevision > hold.baseRevision`, deliberately: the
 * write path refuses any head that is not the exact revision the Gate judged
 * against, so a hold naming a revision ahead of head — which a log cannot
 * produce, and a restored backup or a mistyped fixture can — is dead by the same
 * rule that will refuse it. A helper that judged it live would disagree with the
 * only opinion that matters.
 *
 * A head of `undefined` means the caller has no revision for this tree, and the
 * answer is `unknown`. It is not an error: the two listings are unpaged and
 * paged respectively, and a caller assembling heads for a page of holds may
 * legitimately be missing one.
 */
export const holdLiveness = (hold: HeldProposal, headRevision: number | undefined): HoldLiveness => {
  if (headRevision === undefined) return "unknown"

  return headRevision === hold.baseRevision ? "live" : "dead"
}

/**
 * A hold and what is known about whether answering it could work.
 *
 * `headRevision` is carried rather than left for the caller to look up again
 * because a queue that badges a row wants to say what it compared — *held
 * against 3, the page is at 4* is the sentence that stops a reviewer wondering
 * whether the badge is a bug.
 */
export type MarkedHold = {
  readonly held: HeldProposal
  readonly liveness: HoldLiveness
  /** Absent exactly when `liveness` is `unknown`. */
  readonly headRevision?: number
}

/**
 * Marks a page of holds against the revisions the caller already knows.
 *
 * Pure, and total: every hold comes back marked, in the order it arrived, so a
 * queue keeps `compareHolds` order and gains a column. Holds against a tree the
 * map does not name are `unknown` rather than dropped — a listing that quietly
 * lost rows because a head was missing would be a worse failure than the one
 * this fixes.
 */
export const markHolds = (
  holds: readonly HeldProposal[],
  heads: ReadonlyMap<TreeId, number>
): readonly MarkedHold[] =>
  holds.map((held) => {
    const headRevision = heads.get(held.treeId)
    const liveness = holdLiveness(held, headRevision)

    return headRevision === undefined ? { held, liveness } : { held, liveness, headRevision }
  })

/**
 * The trees a page of holds is waiting on, each named once, in first-seen order.
 *
 * A queue reads one head per tree and not one per hold: three changes held
 * against the same page are three rows and one question. First-seen order rather
 * than sorted, so the reads a caller issues follow the order the holds are shown
 * in and the first row on screen is the first one answered.
 */
export const treesAwaitingAnswer = (holds: readonly HeldProposal[]): readonly TreeId[] => [
  ...new Set(holds.map((held) => held.treeId)),
]

/**
 * The same page of holds, marked against heads read from the store.
 *
 * What a host would otherwise write, and the reason to write it once: read each
 * distinct head, compare in the direction the write path compares, keep the
 * order.
 */
export type MarkedHolds = {
  readonly marked: readonly MarkedHold[]
  /**
   * One per tree whose head could not be read. Those holds are `unknown`, and
   * the errors are handed back rather than swallowed so a host can log them or
   * say so on the page.
   */
  readonly unreadable: readonly StoreError[]
}

/**
 * Reads what it needs and never fails.
 *
 * A `Result` was the first shape and is the wrong one. A queue over every page
 * of a deployment spans many trees, and one tree being unavailable is not a
 * reason for a reviewer to see nothing: the honest answer is the rest of the
 * queue badged and that tree's rows unbadged. Fail-fast would have made this
 * module's own point — *say what you cannot say, rather than guessing* —
 * unavailable to the caller in exactly the case it was written for.
 *
 * `not-found` is `unknown` and not `dead`, which is the one classification here
 * worth arguing with. A hold against a tree that is not there cannot be
 * confirmed either — but it fails as `not-found`, not as a revision conflict,
 * and a badge reading *the page moved on* about a page that is gone would be a
 * true-sounding sentence about the wrong fault. This predicate answers one
 * question and declines the neighbouring one.
 *
 * `TreeReader` rather than `TreeStore`, because badging a queue is a read and
 * nothing here should be handed something that can append.
 */
export const markHoldsFromStore = async (
  reader: TreeReader,
  holds: readonly HeldProposal[]
): Promise<MarkedHolds> => {
  const heads = new Map<TreeId, number>()
  const unreadable: StoreError[] = []

  for (const treeId of treesAwaitingAnswer(holds)) {
    const head = await reader.head(treeId)

    if (head.ok) heads.set(treeId, head.value.revision)
    else unreadable.push(head.error)
  }

  return { marked: markHolds(holds, heads), unreadable }
}
