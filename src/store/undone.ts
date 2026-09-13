import type { StoredRevision } from "./store.js"

/**
 * Which changes in a log have been put back.
 *
 * `Provenance.undoes` makes the link a field, so a surface reading a log it did
 * not write can follow it without parsing the sentence the runtime composed for
 * people. Following it once is not the whole question, though, and the gap
 * between the two is why this is here rather than left to each surface.
 *
 * **An undo is a change, so an undo can be undone.** If revision 5 puts revision
 * 3 back, and revision 7 puts revision 5 back, then 3 is live again — and if 9
 * puts 7 back, 3 is put back once more. Asking `undoes` alone answers "did
 * anything ever undo this", which is a different question from "is this undone
 * now", and the two disagree exactly when a person changed their mind twice. A
 * surface showing a history is asking the second one.
 *
 * So a revision counts as undone only when some entry undoing it **stands** —
 * is not itself undone by an entry that stands. That resolves without recursion:
 * an undo is always appended after what it undoes, so walking newest-first
 * settles every undoer before the entry it acts on.
 *
 * Nothing is read here. This is a fold over entries the caller already has,
 * because the caller — a history screen — has just paged them to draw them, and
 * a second bounded read to answer a question about the page in hand would be the
 * one this module exists to save.
 */

/**
 * The entries that claim to undo each revision, newest last.
 *
 * A revision can legally have more than one: two undos of the same change is an
 * odd log rather than an impossible one, and reporting only the first would hide
 * the second from a screen that shows what happened.
 */
const undoersByRevision = (
  entries: readonly StoredRevision[]
): ReadonlyMap<number, readonly StoredRevision[]> => {
  const undoers = new Map<number, StoredRevision[]>()

  for (const entry of entries) {
    const undone = entry.provenance.undoes
    if (undone === undefined) continue

    const found = undoers.get(undone)
    if (found) found.push(entry)
    else undoers.set(undone, [entry])
  }

  return undoers
}

/**
 * Which revisions in this stretch of log are put back, and by which entry.
 *
 * The map holds only revisions whose undo still stands, keyed by the revision
 * that was put back. Where more than one standing entry undoes the same
 * revision, the oldest is the one reported: it is the entry that actually put
 * the change back, and the rest re-applied an inverse to a tree that already
 * had it.
 *
 * **Bounded by what it is given.** An undo that lives outside `entries` is not
 * seen, so a page read from the middle of a long log can report a revision as
 * standing that a later page undoes. That is a property of any bounded read
 * (`attributeTree` reports `examinedTo` for the same reason) and the honest
 * reading of an absence here is "not undone within this stretch".
 */
export const undoneRevisions = (
  entries: readonly StoredRevision[]
): ReadonlyMap<number, StoredRevision> => {
  const undoers = undoersByRevision(entries)
  const newestFirst = [...entries].sort((left, right) => right.revision - left.revision)

  /**
   * Whether each entry's own effect is live. Filled newest-first, so every
   * undoer of an entry is already settled when that entry is reached — an undo
   * is appended after what it undoes, always.
   *
   * A log that broke that ordering would leave an undoer unsettled, and an
   * unsettled undoer is read as not standing. That is the conservative answer:
   * it reports a change as live, which is what the tree itself would show.
   */
  const stands = new Map<number, boolean>()

  for (const entry of newestFirst) {
    const against = undoers.get(entry.revision) ?? []
    stands.set(
      entry.revision,
      !against.some((undoer) => stands.get(undoer.revision) ?? false)
    )
  }

  const undone = new Map<number, StoredRevision>()

  for (const [revision, against] of undoers) {
    const standing = [...against]
      .sort((left, right) => left.revision - right.revision)
      .find((undoer) => stands.get(undoer.revision) ?? false)

    if (standing) undone.set(revision, standing)
  }

  return undone
}
