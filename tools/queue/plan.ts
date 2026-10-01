/**
 * What order the open branches can be merged in, measured rather than guessed.
 *
 * Seven lanes each keep one tree, nothing has merged since 1 September, and the
 * queue is now long enough that the question *"can these still be taken?"* has
 * no answer anybody holds. Predicting it from the diffs is the thing that does
 * not work: two branches touch `FINDINGS.md` and merge fine, two others touch
 * one function and do not, and the only way to know which is which is to run
 * the merges.
 *
 * So this module is a plan over an oracle that actually merges. It is pure in
 * the sense that matters — the same answers produce the same plan — and the
 * oracle is the only thing that touches a repository, which is what lets every
 * assertion below run against a double on a machine with no branches on it.
 *
 * ## What the plan is, and what it is not
 *
 * It is **an** order that lands as many branches as this strategy can, not the
 * best one. Greedy, in queue position: try each remaining branch against the
 * tree built so far, take the first that goes in cleanly, and start the scan
 * again because taking one changes every later answer.
 *
 * A different order could land more. A branch that conflicts here might have
 * gone in had something else waited, and searching for the arrangement that
 * maximises the count is a graph problem whose answer changes with the next
 * push. What this gives instead is a sequence somebody can run today, and — for
 * everything it could not place — the measured reason, which is the part that
 * turns into work.
 */

/** One branch waiting to land. */
export type Candidate = {
  readonly branch: string
  /**
   * Where it sits in the queue. Lower goes first, and the tie-break is what
   * makes two runs over the same branches produce the same plan.
   */
  readonly position: number
}

/** What happened when a branch was offered to the tree as it stands. */
export type MergeAttempt =
  | { readonly outcome: "clean" }
  /** The tree already contains it — nothing to take, and not a failure. */
  | { readonly outcome: "already-in" }
  | { readonly outcome: "conflict"; readonly files: readonly string[] }

/**
 * A tree that can be asked, and then told.
 *
 * `attempt` leaves the tree exactly as it found it, whatever the answer; `take`
 * is only ever called after a clean attempt on the same branch. Genuine
 * stateful identity — there is a real working tree behind it that accumulates
 * merges — so it is an object with behavior rather than a value.
 */
export type MergeTree = {
  readonly attempt: (branch: string) => Promise<MergeAttempt>
  readonly take: (branch: string) => Promise<void>
  /** The paths a branch changes against the base, for attributing a collision. */
  readonly changedFiles: (branch: string) => Promise<readonly string[]>
}

export type Landing = {
  readonly branch: string
  /** 1-based, so the report reads as the sequence of commands to run. */
  readonly order: number
}

export type Blocked = {
  readonly branch: string
  /** The paths git could not reconcile. */
  readonly files: readonly string[]
  /**
   * The branches already in the tree that changed one of those paths.
   *
   * Derived rather than reported by git, which names files and not causes. It
   * is the difference between *"this branch has a conflict"* and *"this branch
   * and that one edited the same file, and that one went first" —* the second
   * is a thing somebody can act on, and it is the whole reason the plan asks
   * for `changedFiles` at all.
   *
   * Empty means the collision is with the base itself: nothing that landed
   * touched those paths, so the branch has drifted from `main` on its own.
   */
  readonly collidesWith: readonly string[]
}

export type QueuePlan = {
  readonly base: string
  /** In the order they go in. */
  readonly landed: readonly Landing[]
  /** Everything the strategy could not place, each with its measured reason. */
  readonly blocked: readonly Blocked[]
  /**
   * The candidates that were offered before their queue position, because they
   * change how git merges everything after them.
   *
   * Reported rather than kept private: the order is otherwise queue position,
   * so a branch appearing out of turn looks arbitrary, and the reader deciding
   * whether to trust the plan is owed the reason.
   */
  readonly governing: readonly string[]
}

/**
 * The file whose contents decide how every later merge behaves.
 *
 * A `.gitattributes` line is not an ordinary change. `FINDINGS.md merge=union`
 * does not change a single byte of the tree a reader sees; it changes what git
 * *does* when the next branch touches that file, which is the oracle this whole
 * module is a plan over. Matched at any depth, because git reads the one in
 * each directory it descends into, not only the root.
 */
const MERGE_ATTRIBUTES = ".gitattributes"

const governsMerging = (files: readonly string[]): boolean =>
  files.some((path) => path === MERGE_ATTRIBUTES || path.endsWith(`/${MERGE_ATTRIBUTES}`))

/**
 * Queue position, except that a branch changing `.gitattributes` goes first.
 *
 * Measured on this repository on 11 September 2026, over the nine open trees:
 * in queue position the plan lands **one** of nine and reports the other eight
 * blocked on `FINDINGS.md`. One of those eight is the branch carrying the
 * `merge=union` line for that very file. Offered first it goes in clean, and
 * seven of the remaining eight then follow it in — the same nine branches, the
 * same oracle, a different answer, because the first merge decided how the rest
 * were allowed to happen.
 *
 * So this is not a tie-break or a heuristic about which branch is nicer. A
 * candidate that installs merge configuration is measuring a different
 * repository from the one that will exist once it lands, and a plan that tries
 * it in arrival order is reporting a number that was never true.
 *
 * Among themselves such branches keep queue position, and so does everything
 * else: two runs over the same branches still produce the same plan.
 */
const byMergePrecedence =
  (changed: ReadonlyMap<string, readonly string[]>) =>
  (left: Candidate, right: Candidate): number => {
    const leftGoverns = governsMerging(changed.get(left.branch) ?? [])
    const rightGoverns = governsMerging(changed.get(right.branch) ?? [])

    if (leftGoverns !== rightGoverns) return leftGoverns ? -1 : 1

    return left.position - right.position
  }

/**
 * The landed branches that touched any of these paths, in landing order.
 *
 * A path is compared whole. Two branches that both changed `FINDINGS.md`
 * collide there and nowhere else; a prefix match would also claim `src/theme/`
 * against `src/tree/`, which is not the same file and not the same problem.
 */
const touching = (
  files: readonly string[],
  changed: ReadonlyMap<string, readonly string[]>,
  landed: readonly Landing[]
): readonly string[] => {
  const conflicted = new Set(files)

  return landed
    .filter((landing) => (changed.get(landing.branch) ?? []).some((path) => conflicted.has(path)))
    .map((landing) => landing.branch)
}

/**
 * Merges what can be merged, in queue order, and measures why the rest cannot.
 *
 * The scan restarts after every take. That is the expensive choice — it is
 * quadratic in the number of branches — and it is the correct one: a branch
 * that conflicted against the tree three merges ago may go in cleanly now, and
 * a single pass would leave it out on evidence that has since expired.
 *
 * What each branch changes is read once, before any merge is attempted. The
 * diff is against the merge base, so it does not move as the tree accumulates,
 * and the order needs it before the first offer.
 */
export const planQueue = async (
  base: string,
  candidates: readonly Candidate[],
  tree: MergeTree
): Promise<QueuePlan> => {
  const changed = new Map<string, readonly string[]>()
  for (const candidate of candidates) {
    changed.set(candidate.branch, await tree.changedFiles(candidate.branch))
  }

  const remaining = [...candidates].sort(byMergePrecedence(changed))
  const governing = remaining
    .filter((candidate) => governsMerging(changed.get(candidate.branch) ?? []))
    .map((candidate) => candidate.branch)
  const landed: Landing[] = []

  for (;;) {
    let taken: Candidate | undefined

    for (const candidate of remaining) {
      const attempt = await tree.attempt(candidate.branch)
      if (attempt.outcome === "conflict") continue

      if (attempt.outcome === "clean") await tree.take(candidate.branch)
      landed.push({ branch: candidate.branch, order: landed.length + 1 })
      taken = candidate
      break
    }

    if (!taken) break
    remaining.splice(remaining.indexOf(taken), 1)
  }

  /**
   * The failing attempt is run once more per leftover branch rather than
   * remembered from the loop. The tree the loop last asked against is not the
   * final tree, and a conflict reported against a stale one names files whose
   * collision may no longer exist.
   */
  const blocked: Blocked[] = []
  for (const candidate of remaining) {
    const attempt = await tree.attempt(candidate.branch)
    const files = attempt.outcome === "conflict" ? attempt.files : []

    blocked.push({
      branch: candidate.branch,
      files,
      collidesWith: touching(files, changed, landed),
    })
  }

  return { base, landed, blocked, governing }
}
