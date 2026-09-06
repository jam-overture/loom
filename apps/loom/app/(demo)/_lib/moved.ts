/**
 * An ask aimed at a page that has moved.
 *
 * **The dead end this exists to remove.** A stranger with five buttons and no
 * instruction to answer one at a time presses two of them. Both are held, both
 * cards read *Waiting on you*, and both carry **Apply this change**. They answer
 * one; the page moves to the next revision. Then they press **Apply this
 * change** on the other, and:
 *
 * - the page does not move,
 * - the buttons vanish with nothing in their place,
 * - the card still says **Waiting on you** and *“Loom will not make this change
 *   until you say yes”*, which is now false in both halves — it is not waiting
 *   and no yes will ever land it,
 * - and the only account of what happened is `applied, then not written:
 *   revision-conflict`, in the smallest type on the card.
 *
 * The visitor pressed the demo's own primary control and was told nothing, in
 * jargon, under a sentence that had become a lie.
 *
 * **Nothing in the runtime is wrong, and it is not even quiet about it.**
 * `confirmHeld` says exactly what happened: *"A hold names a revision, so a hold
 * whose tree has moved on can never apply again — it is not stale pending a
 * retry, it is dead."* It releases custody and narrates the conflict. And
 * `HeldProposal.baseRevision` exists, in the runtime's own words, *"so a reader
 * can tell a hold is stale without parsing the delta"* — a field put there for
 * a reader, which no surface had ever read.
 *
 * So this is the lane's standing diagnosis again: **the machinery was right and
 * did not reach the screen.**
 *
 * **What it teaches, which is why it is worth a card rather than a guard.** The
 * tidy fix is to stop a visitor holding two changes at once. That would remove
 * the failure and the lesson with it. A verdict in Loom belongs to *one version
 * of the page* — the Gate weighed this delta against the tree as it stood, and
 * will not carry that verdict onto a tree it never saw. That is a real and
 * distinctive property, it is the same one `0028` protects for undo, and it has
 * never been on this surface. Said plainly, at the moment it bites, it is one of
 * the better sixty seconds this demo has.
 *
 * **Both halves say the same thing, deliberately.** The demo can see a hold has
 * gone dead *before* the press, because the page has the tree and the holds in
 * hand together; a second tab, or a press that crosses another, still gets there
 * after. `record.ts` clears custody on the runtime's `commit-failed` so the late
 * path lands on the same shared state — `no-change`, *“Nothing changed — the
 * change no longer fits this page”* — rather than on a card still claiming to
 * wait. One sentence, whichever way a visitor reaches it.
 */

/** What a visitor is told, and the two numbers behind it. */
export type MovedNote = {
  /**
   * The plain sentence, for the light.
   *
   * It says *you changed the page*, not *the page changed*, because on this
   * surface the visitor is the only thing that can have moved it — and an ask
   * that fails for a reason of your own making is a different feeling from one
   * that fails for no visible reason.
   */
  readonly sentence: string
  /**
   * The same fact as the two revisions, for the disclosure. Both numbers,
   * because either alone is a number with nothing to compare it to.
   */
  readonly technical: string
  /**
   * The revision this ask was weighed against, and the one the page is at now.
   * Carried rather than only rendered: `now` is what a fresh ask has to be
   * posted against, and the card has no other way to know it.
   */
  readonly at: number
  readonly now: number
}

/** The words on the control that gets out of it. */
export const ASK_AGAIN_LABEL = "Ask for this again"

/**
 * And what pressing it means, which is the half the label cannot carry: it is a
 * new ask, weighed afresh, not this one retried. The Gate may hold it again, and
 * saying so before the press is the rule this whole rail follows
 * (`AskPanel`, `UNDO_CAUTION`).
 */
export const ASK_AGAIN_CAUTION =
  "That’s a new ask, weighed against the page as it stands now. It may wait for your yes too."

/**
 * Whether a held ask can still land, given where the page has got to.
 *
 * `baseRevision` is the hold's own field rather than the delta's, which is the
 * runtime's distinction and the right one to read: it is *the intent's promise*
 * about which page this was judged against. Absent when the two agree, so a
 * caller never has to ask whether the note it was handed means anything.
 */
export const movedOn = (baseRevision: number, revision: number): MovedNote | undefined => {
  if (baseRevision === revision) return undefined

  return {
    sentence:
      "You changed the page after asking for this. Loom weighed it against the page as it was then, and won’t apply a decision to a page it hasn’t seen.",
    technical: `weighed against revision ${baseRevision}, and the page is at ${revision}`,
    at: baseRevision,
    now: revision,
  }
}
