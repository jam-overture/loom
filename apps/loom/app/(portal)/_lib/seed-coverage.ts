import { compareTrees, outlineTree, type LoomTree } from "@loom/runtime"

/**
 * How much of a page's original shape a checkup was actually able to check.
 *
 * A checkup folds the log from a seed and compares the result with the snapshot
 * (0016, 0028). That comparison is between two **end states**, never between two
 * histories — and the difference is not academic. `Loom lessons` filed the
 * counterexample on 25 August, executed rather than argued:
 *
 * 1. Create a tree; append a delta removing the footer.
 * 2. Audit it against a seed that is *wrong* — one text node differs from the
 *    real revision 0. Outcome `diverged`, naming that node. Correct.
 * 3. Append a second delta removing the header, which is where that node lived.
 * 4. Audit again, against the same wrong seed. Outcome **`agrees`**.
 *
 * Nothing was fixed between steps 2 and 4. The seed is exactly as wrong as it
 * was; the revision that exposed it deleted the evidence.
 *
 * So an `agrees` verdict is only as strong as the part of the seed that survived
 * to the snapshot. A node the seed contained and the served tree does not was
 * removed along the way, and the fold compared it against nothing — if the seed
 * was wrong about that node, the audit could not have noticed and never will.
 *
 * That is a number, and this computes it. It is the honest qualifier on a green
 * verdict, and the portal is the only place it can be said: the seed exists
 * nowhere in the log, so no amount of reading the record recovers it.
 *
 * **Only meaningful under `agrees`.** A diverged verdict already names what
 * disagrees, and an unreplayable one compared nothing at all — a coverage figure
 * beside either would be a precision reading on an answer that does not exist.
 */

export type SeedCoverage = {
  /**
   * Nodes in the seed, the root among them. A root cannot be removed, so it is
   * counted and always checked; excluding it would mean two totals that differ
   * by one for no reason a reader could see.
   */
  readonly started: number
  /** Of those, the ones still in the served tree — the part the fold compared. */
  readonly checked: number
  /** Of those, the ones removed on the way — the part it could not compare. */
  readonly dropped: number
}

/**
 * A node id is the join key, which is what makes this countable at all: ids are
 * minted once (0003), so a `missing` difference between the seed and the served
 * tree is that exact node gone rather than a structural guess.
 *
 * `compareTrees(base, compared)` reports `missing` for a node the base has and
 * the compared one does not — so with the seed as the base, `missing` is
 * precisely "the page started with this and no longer has it".
 */
export const coverageOf = (seed: LoomTree, served: LoomTree): SeedCoverage => {
  const started = outlineTree(seed.root).length
  const dropped = compareTrees(seed, served).filter(
    (difference) => difference.code === "missing"
  ).length

  return { started, checked: started - dropped, dropped }
}

/**
 * What the coverage means, for somebody who has read nothing.
 *
 * Two readings rather than one sentence with a branch in it, because they say
 * opposite things. Nothing dropped is a *stronger* result than the verdict alone
 * and is worth saying plainly; something dropped is a limit on the verdict and
 * has to name what it cannot vouch for without frightening anybody — nothing is
 * wrong, it is simply not evidence.
 */
export const readCoverage = (coverage: SeedCoverage): string => {
  const parts = (count: number): string => `${count} ${count === 1 ? "part" : "parts"}`

  if (coverage.dropped === 0) {
    return coverage.started === 1
      ? "The one part this page started with is still on it, and it was checked."
      : `All ${coverage.started} parts this page started with are still on it, and every one was checked.`
  }

  return (
    `${parts(coverage.dropped)} of the ${coverage.started} this page started with ` +
    `${coverage.dropped === 1 ? "has" : "have"} been removed since. ` +
    `${coverage.dropped === 1 ? "That one is the part" : "Those are the parts"} this check ` +
    `cannot vouch for: removing something takes away the only thing there was to compare it against.`
  )
}
