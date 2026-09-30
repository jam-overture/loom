import { applyDelta, type LoomTree, type TreeId, type TreeOperation } from "@jam-overture/loom"
import {
  describeStoreError,
  type StoredRevision,
  type TreeReader,
} from "@jam-overture/loom/store"

import { firstNamed, namesInOperations, namesInTree, type PartName } from "./part-name"
import { revisionView, type RevisionView } from "./revision-view"
import { versionOnTheRecord } from "./version"
import { plainMoment } from "./when"

/**
 * Every version a page has ever been, as trees you can draw.
 *
 * ## What this is for
 *
 * `docs/portal.md` phase 3 asks three questions of one page — *what it looks
 * like*, *what it looked like*, and *what it would look like* — and says they
 * are one mechanism: **a tree the record produced rather than the one being
 * served.** This is the middle question, and it is the one nothing else in the
 * ecosystem can answer. A page in Loom was never written as markup, so there is
 * no file to check out and no diff to read: the only record of what the page
 * looked like three changes ago is the change log, and the only way to see it is
 * to fold the log and draw the result.
 *
 * `/portal/history` already reads that log as **sentences**. This reads it as
 * **pictures**, which is a different thing and not a prettier one: a sentence
 * saying *set the heading to “Autumn arrivals”* is exactly true and does not tell
 * you the page then had two headings in a row.
 *
 * ## Why it folds with `applyDelta` and not with `replayTree`
 *
 * `replayTree` is the published fold and it returns two things: the tree, and an
 * id history derived from a seed **the caller has promised is revision 0**
 * (0028, 0038). Folding one change at a time means handing it a tree from the
 * middle of the log, and the second half of its answer would then be a claim
 * that is not true — it would report ids that arrived with a later change as
 * original. Passing something a wrong premise and ignoring half its answer is
 * worse than using the smaller function underneath: `applyDelta` is one change
 * onto one tree, which is precisely what a step of a progression is, and it is
 * published on the package's own entry point (0018).
 *
 * The consecutiveness check `replayTree` performs is kept, because it is the
 * thing that separates *a page with a gap in its record* from *a page*, and a
 * progression that quietly stepped over a gap would be drawing a page that never
 * existed. It is one comparison, not a reimplemented fold.
 *
 * **This is not an auditor and must not be read as one.** Whether a page still
 * adds up — whether its record, folded from the start, still produces what is
 * being served — is `auditSnapshot`'s verdict and `/portal/checkup`'s screen.
 * What this does when the fold will not go any further is stop, say where, and
 * send the reader there.
 *
 * ## The ceiling, and why it is a window rather than a sample
 *
 * A player holds every version it can move between, so the trees are sent to the
 * browser once and every frame after that is free — the same decision
 * `picked-parts.tsx` argues at length, and the only one that can be played: a
 * round trip per frame is not a progression, it is a slideshow that buffers.
 *
 * That puts a ceiling on how many versions may be drawn, and the ceiling is a
 * **contiguous window at the newest end**. Not a sample, and not the oldest
 * versions: a sample has holes and a hole is indistinguishable from a page that
 * jumped, which is the one thing phase 3 says a progression must never do. The
 * window says how many versions it is a window into, so a reader is never shown
 * eight versions of a page that has had ninety and left to assume that is all of
 * them.
 */

/**
 * How many versions may be drawn at once.
 *
 * Every one of them is a whole tree in the page's payload. Twenty-four is four
 * seconds of playback at the player's own step, which is long enough to read a
 * page's recent life and short enough that the payload stays smaller than the
 * rendered markup of the page this screen already sends once.
 */
export const MOST_VERSIONS_DRAWN = 24

/** What was done to the previous version to produce this one. */
export type VersionChange = {
  /** Who asked, who allowed it, how sure the thing that wrote it was, what it did. */
  readonly view: RevisionView
  /** When it landed, as something to read, and the instant it reads from. */
  readonly when: string
  readonly at: string
  /**
   * The runtime's own name for this version, and the operations themselves —
   * both for the disclosure beneath the picture, never on the surface.
   */
  readonly onTheRecord: string
  readonly operations: readonly TreeOperation[]
}

export type Version = {
  /** The number this page's own record gives this state. Identity, so it stays. */
  readonly version: number
  readonly tree: LoomTree
  /**
   * Absent on the oldest version in the window, and for two different reasons a
   * reader is told apart on the screen: version 0 is where the page began, and
   * any other oldest version is simply where this window starts.
   */
  readonly change: VersionChange | undefined
}

export type Progression =
  /**
   * This host cannot reproduce the page's original shape, so nothing before the
   * version being served can be rebuilt at all (0028). Not a failure — a limit,
   * and one the reader can be told the shape of.
   */
  | { readonly kind: "unknown-start" }
  /** The record could not be read. Nothing is wrong with the page. */
  | { readonly kind: "unreadable"; readonly detail: string }
  | {
      readonly kind: "replayed"
      /** Oldest first, contiguous, never empty — version 0 is a version. */
      readonly versions: readonly Version[]
      /**
       * The highest version the page's own record names, whether or not it is
       * drawn here.
       *
       * Read from the record rather than from the fold, and the difference is
       * the whole reason it is a separate number: a window that has slid holds
       * the newest end, but a fold that **stopped** holds everything *before*
       * where it stopped — so the newest picture on the screen is not the page's
       * newest version, and a screen that took the last drawing for the page
       * would be the quietest possible lie about it.
       */
      readonly newest: number
      /**
       * Where the fold would not go any further, if it would not. The versions
       * above it are still true; everything after it is unknown, and saying so
       * in place is the whole of what phase 3 asks for here.
       */
      readonly stopped: { readonly after: number; readonly detail: string } | undefined
    }

/**
 * The names this screen can put in a sentence about one change.
 *
 * Both sides of it, which is a thing only this screen is in a position to do.
 * `/portal/history` names parts from the page **as it stands** and recovers a
 * deleted one from the change's own inverse, because that is all it has. Here
 * the tree before the change and the tree after it are both in hand, so a part
 * a change removed is named from the version that still had it — no inverse, no
 * second walk of the record.
 *
 * The order is the reason it reads correctly: the tree the change produced comes
 * first, so a part it renamed is called what it was renamed **to**, and the tree
 * before it only supplies what has since gone.
 */
const namesAround = (
  before: LoomTree,
  after: LoomTree,
  operations: readonly TreeOperation[]
): ReadonlyMap<string, PartName> =>
  firstNamed(namesInTree(after), namesInTree(before), namesInOperations(operations))

const changeOf = (
  entry: StoredRevision,
  before: LoomTree,
  after: LoomTree
): VersionChange => ({
  view: revisionView(entry, namesAround(before, after, entry.delta.operations)),
  when: plainMoment(entry.appliedAt),
  at: entry.appliedAt,
  onTheRecord: versionOnTheRecord(entry.revision),
  operations: entry.delta.operations,
})

/**
 * Folds a page's record into one tree per version, keeping the newest window of
 * them.
 *
 * Pure, and separate from the read for the reason every other view model in this
 * lane is: the interesting cases are a gap in the record, a change that will not
 * apply, and more versions than may be drawn, and none of those is worth
 * building a store to reach.
 *
 * `seed` is revision 0 by construction — it is what `seeds.ts` hands over, and
 * `seeds.test.ts` pins it — so the first entry must be revision 1 and every
 * entry after it one more than the last.
 */
export const foldVersions = (
  seed: LoomTree,
  entries: readonly StoredRevision[],
  most: number = MOST_VERSIONS_DRAWN
): Extract<Progression, { kind: "replayed" }> => {
  const drawn: Version[] = [{ version: seed.revision, tree: seed, change: undefined }]
  let standing = seed
  let stopped: { readonly after: number; readonly detail: string } | undefined

  for (const entry of entries) {
    if (entry.revision !== standing.revision + 1) {
      stopped = {
        after: standing.revision,
        detail: `expected ${versionOnTheRecord(standing.revision + 1)} next, found ${entry.revision}`,
      }
      break
    }

    const applied = applyDelta(standing, entry.delta)

    if (!applied.ok) {
      stopped = {
        after: standing.revision,
        detail: `${versionOnTheRecord(entry.revision)} would not apply: ${applied.error.code}`,
      }
      break
    }

    drawn.push({
      version: applied.value.revision,
      tree: applied.value,
      change: changeOf(entry, standing, applied.value),
    })
    standing = applied.value

    /**
     * Dropped from the oldest end as the window fills rather than after the
     * fold, because the fold is what holds the trees: a page with nine hundred
     * versions would otherwise be nine hundred trees in memory to send
     * twenty-four.
     */
    if (drawn.length > most) drawn.shift()
  }

  /**
   * The oldest version in a window that has slid carries no change of its own.
   * What produced it is a true fact and it is also the answer to *what came
   * before this*, which the window does not contain — so the screen would be
   * offering a reader a step they cannot take. Version 0 is the same shape for
   * the honest reason: nothing produced it.
   */
  const versions = drawn.map((version, at) => (at === 0 ? { ...version, change: undefined } : version))

  /**
   * The last entry the record holds, which is what the page claims to be at —
   * not `standing`, which is as far as this fold got. They differ by exactly the
   * versions after a stop, and that gap is the thing the screen has to be able
   * to say out loud.
   */
  const newest = entries[entries.length - 1]?.revision ?? seed.revision

  return { kind: "replayed", versions, newest, stopped }
}

/**
 * Every version of one page, read and folded.
 *
 * The record is read forward from its oldest end — `direction: "newer"` with no
 * cursor, which the contract names as *"the read a fold wants"* — and followed
 * to the end, which is the same walk `auditSnapshot` makes and `/portal/checkup`
 * already performs on a request path. A progression cannot start in the middle:
 * the only tree anything can be rebuilt from is the one the page began as.
 */
export const versionsOf = async (
  reader: TreeReader,
  treeId: TreeId,
  seed: LoomTree | undefined
): Promise<Progression> => {
  if (seed === undefined) return { kind: "unknown-start" }

  const entries: StoredRevision[] = []
  let cursor: string | undefined

  for (;;) {
    const page = await reader.revisions(treeId, cursor === undefined ? {} : { cursor })

    if (!page.ok) return { kind: "unreadable", detail: describeStoreError(page.error) }

    entries.push(...page.value.revisions)

    if (page.value.newer === null) break
    cursor = page.value.newer
  }

  return foldVersions(seed, entries)
}
