import { describe, expect, it } from "vitest"

import { DEFAULT_BASE, queueRequest } from "./args.js"
import { linesOf } from "./git.js"
import { planQueue, type Candidate, type MergeAttempt, type MergeTree } from "./plan.js"
import { describePlan } from "./report.js"

/**
 * Every assertion here runs against a double, on a machine with none of these
 * branches on it.
 *
 * That is the point of the seam. The thing worth testing is the strategy — what
 * order it takes, when it gives up, what it says about the ones it could not
 * place — and none of that is a fact about git. The double is a few lines
 * because the tree only has to answer three questions.
 */

/**
 * A tree whose conflicts are declared as pairs: `["a", "b"]` means those two
 * branches cannot both be in, and whichever arrives second reports `files`.
 */
const fakeTree = (
  spec: Readonly<{
    conflicts?: readonly (readonly [string, string])[]
    withBase?: Readonly<Record<string, readonly string[]>>
    contains?: readonly string[]
    changed?: Readonly<Record<string, readonly string[]>>
  }>
): MergeTree & { readonly taken: readonly string[]; readonly attempts: readonly string[] } => {
  const taken: string[] = []
  const attempts: string[] = []
  const conflicts = spec.conflicts ?? []
  const withBase = spec.withBase ?? {}
  const contains = new Set(spec.contains ?? [])

  const collision = (branch: string): readonly string[] | undefined => {
    const base = withBase[branch]
    if (base) return base

    const pair = conflicts.find(
      ([left, right]) =>
        (left === branch && taken.includes(right)) || (right === branch && taken.includes(left))
    )

    return pair ? [`${pair[0]}~${pair[1]}.ts`] : undefined
  }

  return {
    taken,
    attempts,
    attempt: (branch: string): Promise<MergeAttempt> => {
      attempts.push(branch)
      if (contains.has(branch)) return Promise.resolve({ outcome: "already-in" })

      const files = collision(branch)

      return Promise.resolve(files ? { outcome: "conflict", files } : { outcome: "clean" })
    },
    take: (branch: string): Promise<void> => {
      taken.push(branch)
      return Promise.resolve()
    },
    changedFiles: (branch: string): Promise<readonly string[]> =>
      Promise.resolve(spec.changed?.[branch] ?? []),
  }
}

const queue = (...branches: readonly string[]): readonly Candidate[] =>
  branches.map((branch, position) => ({ branch, position }))

describe("planQueue", () => {
  it("takes every branch when nothing collides, in queue position order", async () => {
    const tree = fakeTree({})

    const plan = await planQueue("main", queue("c", "a", "b"), tree)

    expect(plan.landed.map((entry) => entry.branch)).toEqual(["c", "a", "b"])
    expect(plan.landed.map((entry) => entry.order)).toEqual([1, 2, 3])
    expect(plan.blocked).toEqual([])
    expect(tree.taken).toEqual(["c", "a", "b"])
  })

  it("ignores the order the candidates arrive in and uses their positions", async () => {
    const plan = await planQueue(
      "main",
      [
        { branch: "late", position: 9 },
        { branch: "early", position: 1 },
      ],
      fakeTree({})
    )

    expect(plan.landed.map((entry) => entry.branch)).toEqual(["early", "late"])
  })

  /**
   * The behaviour the whole tool exists for: one of a colliding pair still
   * lands, and the queue keeps moving past it rather than stopping at the first
   * refusal.
   */
  it("lands the earlier of two colliding branches and carries on past the other", async () => {
    const tree = fakeTree({ conflicts: [["a", "b"]] })

    const plan = await planQueue("main", queue("a", "b", "c"), tree)

    expect(plan.landed.map((entry) => entry.branch)).toEqual(["a", "c"])
    expect(plan.blocked.map((entry) => entry.branch)).toEqual(["b"])
    expect(tree.taken).toEqual(["a", "c"])
  })

  it("attributes a block to the landed branch that changed the same file", async () => {
    const tree = fakeTree({
      conflicts: [["a", "b"]],
      changed: { a: ["src/theme/contrast.ts", "FINDINGS.md"], c: ["docs/routines.md"] },
    })

    const plan = await planQueue("main", queue("a", "b", "c"), tree)
    const blocked = plan.blocked[0]

    expect(blocked?.files).toEqual(["a~b.ts"])
    expect(blocked?.collidesWith).toEqual([])

    const sharing = await planQueue("main", queue("a", "b"), fakeTree({
      conflicts: [["a", "b"]],
      changed: { a: ["a~b.ts", "FINDINGS.md"] },
    }))

    expect(sharing.blocked[0]?.collidesWith).toEqual(["a"])
  })

  /**
   * A branch that conflicts with `main` itself is a different problem from one
   * that conflicts with something ahead of it, and the report has to be able to
   * say which. Nothing that landed touched the file, so nothing is named.
   */
  it("names no collider when the conflict is with the base itself", async () => {
    const tree = fakeTree({
      withBase: { stale: ["pnpm-lock.yaml"] },
      changed: { fresh: ["src/index.ts"] },
    })

    const plan = await planQueue("main", queue("fresh", "stale"), tree)

    expect(plan.landed.map((entry) => entry.branch)).toEqual(["fresh"])
    expect(plan.blocked).toEqual([
      { branch: "stale", files: ["pnpm-lock.yaml"], collidesWith: [] },
    ])
  })

  /**
   * A branch already contained is landed without being merged. It counts, so a
   * report over a stale list does not read as thirty branches of which four are
   * broken, and `take` is not called because there is nothing to take.
   */
  it("counts an already-contained branch as landed without merging it", async () => {
    const tree = fakeTree({ contains: ["done"] })

    const plan = await planQueue("main", queue("done", "new"), tree)

    expect(plan.landed.map((entry) => entry.branch)).toEqual(["done", "new"])
    expect(tree.taken).toEqual(["new"])
  })

  /**
   * The expensive property, asserted because it is the one a cheaper
   * implementation would quietly drop: `b` conflicts only while `a` is out of
   * the tree, so a single pass would report it blocked. The rescan finds it.
   */
  it("re-tries a branch that was blocked earlier in the same run", async () => {
    const taken: string[] = []
    const tree: MergeTree = {
      attempt: (branch: string): Promise<MergeAttempt> =>
        Promise.resolve(
          branch === "b" && !taken.includes("a")
            ? { outcome: "conflict", files: ["needs-a.ts"] }
            : { outcome: "clean" }
        ),
      take: (branch: string): Promise<void> => {
        taken.push(branch)
        return Promise.resolve()
      },
      changedFiles: (): Promise<readonly string[]> => Promise.resolve([]),
    }

    const plan = await planQueue("main", queue("b", "a"), tree)

    expect(plan.landed.map((entry) => entry.branch)).toEqual(["a", "b"])
    expect(plan.blocked).toEqual([])
  })

  it("measures a blocked branch against the final tree, not the tree it last failed against", async () => {
    const tree = fakeTree({ conflicts: [["a", "b"]], changed: { a: ["a~b.ts"] } })

    await planQueue("main", queue("a", "b", "c"), tree)

    expect(tree.attempts.at(-1)).toBe("b")
  })

  it("reports every branch as blocked when none can be taken", async () => {
    const tree = fakeTree({ withBase: { a: ["one.ts"], b: ["two.ts"] } })

    const plan = await planQueue("main", queue("a", "b"), tree)

    expect(plan.landed).toEqual([])
    expect(plan.blocked.map((entry) => entry.branch)).toEqual(["a", "b"])
    expect(tree.taken).toEqual([])
  })

  /**
   * The defect this ordering exists for, reduced to four branches.
   *
   * `ledger` is the shared append-only file every lane writes to. While the
   * tree has no `.gitattributes`, any two branches that touched it conflict;
   * once `attrs` lands, the union driver is in effect and they do not. In queue
   * position `attrs` is offered third, by which time `one` has landed and
   * `attrs` itself conflicts on the ledger — so nothing else goes in either.
   */
  const ledgerTree = (): MergeTree & { readonly taken: readonly string[] } => {
    const taken: string[] = []
    const writesLedger = new Set(["one", "two", "attrs"])

    return {
      taken,
      attempt: (branch: string): Promise<MergeAttempt> => {
        const unionInEffect = taken.includes("attrs")
        const clashes =
          writesLedger.has(branch) && !unionInEffect && taken.some((other) => writesLedger.has(other))

        return Promise.resolve(clashes ? { outcome: "conflict", files: ["FINDINGS.md"] } : { outcome: "clean" })
      },
      take: (branch: string): Promise<void> => {
        taken.push(branch)
        return Promise.resolve()
      },
      changedFiles: (branch: string): Promise<readonly string[]> =>
        Promise.resolve(
          branch === "attrs" ? [".gitattributes", "FINDINGS.md"] : writesLedger.has(branch) ? ["FINDINGS.md"] : ["src/x.ts"]
        ),
    }
  }

  it("offers a branch that changes .gitattributes before branches that do not", async () => {
    const tree = ledgerTree()

    const plan = await planQueue("main", queue("one", "two", "attrs", "other"), tree)

    expect(plan.landed[0]?.branch).toBe("attrs")
    expect(plan.governing).toEqual(["attrs"])
  })

  /**
   * The measurement that matters: the same four branches, the same oracle, and
   * the count goes from one to four purely because the branch that decides how
   * merging works was allowed to decide it first.
   */
  it("lands the whole queue that queue position would have blocked", async () => {
    const plan = await planQueue("main", queue("one", "two", "attrs", "other"), ledgerTree())

    expect(plan.landed.map((entry) => entry.branch)).toEqual(["attrs", "one", "two", "other"])
    expect(plan.blocked).toEqual([])
  })

  it("keeps queue position among branches that all change .gitattributes", async () => {
    const tree = fakeTree({
      changed: { late: [".gitattributes"], early: [".gitattributes"], plain: ["src/x.ts"] },
    })

    const plan = await planQueue(
      "main",
      [
        { branch: "plain", position: 0 },
        { branch: "late", position: 9 },
        { branch: "early", position: 1 },
      ],
      tree
    )

    expect(plan.landed.map((entry) => entry.branch)).toEqual(["early", "late", "plain"])
    expect(plan.governing).toEqual(["early", "late"])
  })

  /**
   * git reads the `.gitattributes` in every directory it descends into, so one
   * added deep in the tree governs merging there just as the root one does.
   */
  it("counts a .gitattributes at any depth", async () => {
    const tree = fakeTree({ changed: { deep: ["apps/loom/.gitattributes"], first: ["src/x.ts"] } })

    const plan = await planQueue("main", queue("first", "deep"), tree)

    expect(plan.landed.map((entry) => entry.branch)).toEqual(["deep", "first"])
  })

  /**
   * Matched as a whole path segment. A file whose name merely ends in those
   * characters configures nothing, and promoting it would reorder the queue for
   * no reason.
   */
  it("does not promote a file that only looks like .gitattributes", async () => {
    const tree = fakeTree({ changed: { sneaky: ["docs/notes.gitattributes"], first: ["src/x.ts"] } })

    const plan = await planQueue("main", queue("first", "sneaky"), tree)

    expect(plan.landed.map((entry) => entry.branch)).toEqual(["first", "sneaky"])
    expect(plan.governing).toEqual([])
  })

  it("plans an empty queue without asking the tree anything", async () => {
    const tree = fakeTree({})

    const plan = await planQueue("main", [], tree)

    expect(plan).toEqual({ base: "main", landed: [], blocked: [], governing: [] })
    expect(tree.attempts).toEqual([])
  })
})

describe("describePlan", () => {
  it("prints the sequence and the counts", () => {
    const lines = describePlan({
      base: "origin/main",
      landed: [
        { branch: "one", order: 1 },
        { branch: "two", order: 2 },
      ],
      blocked: [],
      governing: [],
    })

    expect(lines[0]).toBe("2 of 2 branches merge into origin/main, in this order:")
    expect(lines).toContain("  1. one")
    expect(lines).toContain("  2. two")
  })

  it("says which branch got there first, and which files", () => {
    const lines = describePlan({
      base: "origin/main",
      landed: [{ branch: "one", order: 1 }],
      blocked: [{ branch: "two", files: ["src/a.ts", "src/b.ts"], collidesWith: ["one"] }],
      governing: [],
    })

    expect(lines).toContain("1 of 2 branches merge into origin/main, in this order:")
    expect(lines).toContain("  two — after one: src/a.ts, src/b.ts")
  })

  it("distinguishes a conflict with the base from a conflict with a landed branch", () => {
    const lines = describePlan({
      base: "origin/main",
      landed: [],
      blocked: [{ branch: "stale", files: ["pnpm-lock.yaml"], collidesWith: [] }],
      governing: [],
    })

    expect(lines).toContain("  (none)")
    expect(lines).toContain("  stale — conflicts with the base itself: pnpm-lock.yaml")
  })

  it("shortens a file list rather than printing a hundred paths", () => {
    const files = ["a.ts", "b.ts", "c.ts", "d.ts", "e.ts", "f.ts"]

    const lines = describePlan({
      base: "main",
      landed: [],
      blocked: [{ branch: "wide", files, collidesWith: [] }],
      governing: [],
    })

    expect(lines).toContain("  wide — conflicts with the base itself: a.ts, b.ts, c.ts, d.ts (+2 more)")
  })

  /**
   * Without this line the first branch appears out of queue order for no
   * visible reason, which reads as a bug in the tool rather than as the reason
   * the count is as high as it is.
   */
  it("says which branch was offered first and why", () => {
    const lines = describePlan({
      base: "origin/main",
      landed: [
        { branch: "attrs", order: 1 },
        { branch: "one", order: 2 },
      ],
      blocked: [],
      governing: ["attrs"],
    })

    expect(lines).toContain(
      "offered first — changes .gitattributes, so it decides how the rest merge: attrs"
    )
  })

  it("says nothing about ordering when no branch changes .gitattributes", () => {
    const lines = describePlan({
      base: "origin/main",
      landed: [{ branch: "one", order: 1 }],
      blocked: [],
      governing: [],
    })

    expect(lines.some((line) => line.includes("offered first"))).toBe(false)
  })

  it("says so when a conflict reported no files at all", () => {
    const lines = describePlan({
      base: "main",
      landed: [],
      blocked: [{ branch: "odd", files: [], collidesWith: [] }],
      governing: [],
    })

    expect(lines).toContain("  odd — conflicts with the base itself: no files reported")
  })
})

describe("queueRequest", () => {
  it("takes the branches named after the base", () => {
    expect(queueRequest(["main", "one", "two"], [])).toEqual({
      kind: "branches",
      base: "main",
      branches: ["one", "two"],
    })
  })

  it("falls back to origin/main when no base is named", () => {
    expect(queueRequest(["-"], ["one"])).toEqual({
      kind: "branches",
      base: DEFAULT_BASE,
      branches: ["one"],
    })
  })

  it("reads stdin only when asked to, and puts it after the named branches", () => {
    expect(queueRequest(["main", "first", "-"], ["piped"])).toEqual({
      kind: "branches",
      base: "main",
      branches: ["first", "piped"],
    })

    expect(queueRequest(["main", "first"], ["piped"])).toEqual({
      kind: "branches",
      base: "main",
      branches: ["first"],
    })
  })

  it("keeps one of a branch named twice, so a piped list may repeat an argument", () => {
    expect(queueRequest(["main", "one", "-"], ["one", "two"])).toEqual({
      kind: "branches",
      base: "main",
      branches: ["one", "two"],
    })
  })

  it("asks for something to measure rather than defaulting to every branch", () => {
    expect(queueRequest([], [])).toEqual({ kind: "nothing-to-measure" })
    expect(queueRequest(["main"], ["ignored"])).toEqual({ kind: "nothing-to-measure" })
  })

  it("reads --all as the repository's own answer", () => {
    expect(queueRequest(["main", "--all"], [])).toEqual({ kind: "all", base: "main" })
  })
})

describe("linesOf", () => {
  it("drops the blank line every porcelain listing ends with", () => {
    expect(linesOf("src/a.ts\nsrc/b.ts\n")).toEqual(["src/a.ts", "src/b.ts"])
  })

  it("answers nothing for the empty output of a clean index", () => {
    expect(linesOf("")).toEqual([])
    expect(linesOf("\n \n")).toEqual([])
  })
})
