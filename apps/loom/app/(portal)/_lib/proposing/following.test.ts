import { describe, expect, it } from "vitest"

import {
  applyDelta,
  fixedPolicy,
  ok,
  proposalIdSchema,
  sequentialIdFactory,
  treeIdSchema,
  type LoomTree,
  type TreeId,
  type TreeOperation,
} from "@jam-overture/loom"
import { memoryTreeStore, type StoredRevision } from "@jam-overture/loom/store"
import {
  buildProposal,
  collectingEventSink,
  fixedClock,
  scriptedInterpreter,
} from "@jam-overture/loom/testing"
import { commitIntent, memoryHoldStore, type WritePath } from "@jam-overture/loom/write"

import { pageFixture } from "@/app/_lib/pages/fixtures"

import { portalPolicy } from "../policy"
import { memoryPageCopyStore } from "./copies-memory"
import { elementIdsOf } from "./fixtures"
import {
  carriedOnto,
  followPublished,
  governedCopyOf,
  holdStandingOf,
  replayOnto,
  samePage,
  standsOn,
  waitingOnPage,
  type Following,
} from "./following"
import { intentFor } from "./propose"

const PUBLISHED = pageFixture("home", "Welcome", 3)
const [, HEADING] = elementIdsOf(PUBLISHED)

if (HEADING === undefined) throw new Error("the fixture has a heading")

const NEWER = { ...pageFixture("home", "Welcome back", 5), treeId: PUBLISHED.treeId }
/** The same page with its heading gone, which a change to the heading cannot apply to. */
const WITHOUT_HEADING: LoomTree = {
  ...PUBLISHED,
  revision: 6,
  root: { ...PUBLISHED.root, children: [] },
}

const AT = Date.UTC(2026, 10, 1)
const LATER = Date.UTC(2026, 10, 2)
const LATER_ISO = new Date(LATER).toISOString()

const LEVEL: TreeOperation = { op: "configure", nodeId: HEADING, set: { level: 2 }, unset: [] }

/** A write path whose interpreter proposes `operation`, held unless `confidence` is high. */
const pathFor = (operation: TreeOperation, confidence: number): WritePath => {
  const ids = sequentialIdFactory("follow")

  return {
    store: memoryTreeStore(),
    holds: memoryHoldStore(),
    runtime: {
      interpreter: {
        interpret: (intent, tree) =>
          scriptedInterpreter(
            ok(
              buildProposal(ids, {
                intentId: intent.intentId,
                confidence,
                delta: {
                  deltaId: ids.deltaId(),
                  treeId: intent.treeId,
                  baseRevision: intent.baseRevision,
                  operations: [operation],
                },
              })
            )
          ).interpret(intent, tree),
      },
      policySource: fixedPolicy(portalPolicy),
      events: collectingEventSink(),
      clock: fixedClock(),
      idFactory: ids,
    },
  }
}

/** A version with `LEVEL` applied, as the change makes it. */
const withLevel = (tree: LoomTree): LoomTree => {
  const applied = applyDelta(tree, {
    deltaId: sequentialIdFactory("level").deltaId(),
    treeId: tree.treeId,
    baseRevision: tree.revision,
    operations: [LEVEL],
  })
  if (!applied.ok) throw new Error("expected the change to apply")

  return applied.value
}

/** Everything accepted on a tree, oldest first. */
const recordOf = async (path: WritePath, treeId: TreeId): Promise<readonly StoredRevision[]> => {
  const read = await path.store.revisions(treeId)
  if (!read.ok) throw new Error("expected the record")

  return read.value.revisions
}

const followingOf = (path: WritePath, overrides: Partial<Following> = {}): Following => ({
  trees: path.store,
  holds: path.holds,
  copies: memoryPageCopyStore(),
  ids: sequentialIdFactory("copy"),
  now: () => LATER,
  follows: true,
  ...overrides,
})

/** Propose one change against the page's first copy, at `AT`. */
const proposed = async (path: WritePath) => {
  const copy = await governedCopyOf(path.store, PUBLISHED, PUBLISHED.treeId)
  if (!copy.ok) throw new Error("expected a copy")

  return commitIntent(
    path,
    intentFor({
      ids: sequentialIdFactory("ask"),
      page: copy.value,
      request: "Make the heading smaller.",
      at: new Date(AT),
    })
  )
}

describe("the governed copy of a page", () => {
  it("starts as the published tree, exactly, the first time anything is proposed", async () => {
    const trees = memoryTreeStore()

    expect(await governedCopyOf(trees, PUBLISHED, PUBLISHED.treeId)).toEqual(ok(PUBLISHED))
  })

  it("starts under another id when it starts again, with the page's parts and revision", async () => {
    const copyId = treeIdSchema.parse("t_again")
    const made = await governedCopyOf(memoryTreeStore(), NEWER, copyId)

    expect(made).toEqual(ok({ ...NEWER, treeId: copyId }))
  })

  it("is the copy already held, not the page as published again", async () => {
    const trees = memoryTreeStore()

    await governedCopyOf(trees, PUBLISHED, PUBLISHED.treeId)

    expect(await governedCopyOf(trees, NEWER, PUBLISHED.treeId)).toEqual(ok(PUBLISHED))
  })

  it("reads what another run made when two start at once", async () => {
    const trees = memoryTreeStore()
    const racing = {
      head: trees.head,
      create: async (tree: LoomTree) => {
        await trees.create(tree)

        return trees.create(tree)
      },
    }

    expect(await governedCopyOf(racing, PUBLISHED, PUBLISHED.treeId)).toEqual(ok(PUBLISHED))
  })
})

describe("samePage", () => {
  it("is the parts, not the id or the revision", () => {
    expect(samePage(PUBLISHED, { ...PUBLISHED, revision: 9 })).toBe(true)
    expect(samePage(PUBLISHED, NEWER)).toBe(false)
  })
})

describe("carriedOnto", () => {
  it("re-addresses a waiting change to another copy, keeping what was asked and when", async () => {
    const path = pathFor(LEVEL, 0.5)
    const outcome = await proposed(path)
    if (outcome.kind !== "held") throw new Error("expected a hold")
    const onto = { ...NEWER, treeId: treeIdSchema.parse("t_again") }

    const carried = carriedOnto(outcome.held, onto, sequentialIdFactory("carry"))
    if (!carried.ok) throw new Error("expected it to fit")

    expect(carried.value).toMatchObject({
      treeId: onto.treeId,
      baseRevision: 5,
      intent: {
        intentId: outcome.held.intent.intentId,
        treeId: onto.treeId,
        baseRevision: 5,
        observedAt: outcome.held.intent.observedAt,
      },
      proposal: { delta: { treeId: onto.treeId, baseRevision: 5, operations: [LEVEL] } },
      disposition: outcome.held.disposition,
      heldAt: outcome.held.heldAt,
    })
    expect(carried.value.proposalId).not.toBe(outcome.held.proposalId)
    expect(carried.value.proposal.proposalId).toBe(carried.value.proposalId)
  })

  it("refuses a change whose operations no longer apply", async () => {
    const path = pathFor(LEVEL, 0.5)
    const outcome = await proposed(path)
    if (outcome.kind !== "held") throw new Error("expected a hold")

    expect(carriedOnto(outcome.held, WITHOUT_HEADING, sequentialIdFactory("carry")).ok).toBe(false)
  })
})

describe("followPublished", () => {
  it("leaves a copy that is the page the site serves", async () => {
    const path = pathFor(LEVEL, 0.5)
    const following = followingOf(path)

    expect(await followPublished(following, PUBLISHED)).toEqual(
      ok({ kind: "serving", copy: PUBLISHED })
    )
    expect(await following.copies.list()).toEqual(ok([]))
  })

  it("starts again from a newer version and carries a waiting change that still fits", async () => {
    const path = pathFor(LEVEL, 0.5)
    const following = followingOf(path)

    await proposed(path)

    const followed = await followPublished(following, NEWER)

    expect(followed).toMatchObject({ ok: true, value: { kind: "followed", carried: 1 } })

    const copies = await following.copies.list()
    if (!copies.ok || !followed.ok) throw new Error("expected copies")

    const waiting = await waitingOnPage(path.holds, copies.value, PUBLISHED.treeId)
    if (!waiting.ok) throw new Error("expected holds")

    expect(waiting.value.map((held) => holdStandingOf(held, copies.value))).toEqual(["stale"])
    expect(waiting.value[0]?.treeId).toBe(followed.value.copy.treeId)
  })

  it("leaves a change that no longer fits on the old copy, as conflicting", async () => {
    const path = pathFor(LEVEL, 0.5)
    const following = followingOf(path)

    await proposed(path)

    expect(await followPublished(following, WITHOUT_HEADING)).toMatchObject({
      ok: true,
      value: { kind: "followed", carried: 0, conflicting: 1 },
    })

    const copies = await following.copies.list()
    if (!copies.ok) throw new Error("expected copies")
    const waiting = await waitingOnPage(path.holds, copies.value, PUBLISHED.treeId)
    if (!waiting.ok) throw new Error("expected holds")

    expect(waiting.value.map((held) => [held.treeId, holdStandingOf(held, copies.value)])).toEqual([
      [PUBLISHED.treeId, "conflicts"],
    ])
  })

  it("keeps the copy live when the site sends the version it stands on again", async () => {
    const path = pathFor(LEVEL, 0.9)
    const following = followingOf(path)
    const applied = await proposed(path)
    if (applied.kind !== "committed") throw new Error("expected the change to apply")

    expect(await followPublished(following, PUBLISHED)).toEqual(
      ok({ kind: "serving", copy: applied.tree })
    )
    expect(await following.copies.list()).toEqual(ok([]))
  })

  it("keeps the copy when the site publishes the page an accepted change reached", async () => {
    const path = pathFor(LEVEL, 0.9)
    const following = followingOf(path)
    const applied = await proposed(path)
    if (applied.kind !== "committed") throw new Error("expected the change to apply")

    expect(await followPublished(following, { ...applied.tree, revision: 8 })).toEqual(
      ok({ kind: "serving", copy: applied.tree })
    )
    expect(await following.copies.list()).toEqual(ok([]))
  })

  it("starts again from a newer version and applies the accepted change to it again", async () => {
    const path = pathFor(LEVEL, 0.9)
    const following = followingOf(path)
    const applied = await proposed(path)
    if (applied.kind !== "committed") throw new Error("expected the change to apply")
    const [accepted] = await recordOf(path, PUBLISHED.treeId)
    if (accepted === undefined) throw new Error("expected the accepted change on the record")

    const followed = await followPublished(following, NEWER)
    if (!followed.ok || followed.value.kind !== "followed") throw new Error("expected a new copy")

    expect(followed.value).toMatchObject({ replayed: [accepted.proposalId], dropped: [] })
    expect(samePage(followed.value.copy, withLevel(NEWER))).toBe(true)
    expect(await path.store.head(followed.value.copy.treeId)).toEqual(ok(followed.value.copy))
    expect(await recordOf(path, followed.value.copy.treeId)).toMatchObject([
      { proposalId: accepted.proposalId, provenance: accepted.provenance, appliedAt: LATER_ISO },
    ])
    expect(await followPublished(following, NEWER)).toEqual(
      ok({ kind: "serving", copy: followed.value.copy })
    )
  })

  it("drops an accepted change that no longer fits, and the old copy's record keeps it", async () => {
    const path = pathFor(LEVEL, 0.9)
    const following = followingOf(path)
    await proposed(path)
    const [accepted] = await recordOf(path, PUBLISHED.treeId)
    if (accepted === undefined) throw new Error("expected the accepted change on the record")

    const followed = await followPublished(following, WITHOUT_HEADING)
    if (!followed.ok || followed.value.kind !== "followed") throw new Error("expected a new copy")

    expect(followed.value).toMatchObject({ replayed: [], dropped: [accepted.proposalId] })
    expect(samePage(followed.value.copy, WITHOUT_HEADING)).toBe(true)
    expect(await recordOf(path, PUBLISHED.treeId)).toEqual([accepted])
  })

  it("never starts again where the site serves the copy itself", async () => {
    const path = pathFor(LEVEL, 0.5)
    const following = followingOf(path, { follows: false })

    await proposed(path)

    expect(await followPublished(following, NEWER)).toEqual(ok({ kind: "apart", copy: PUBLISHED }))
    expect(await following.copies.list()).toEqual(ok([]))
  })
})

describe("replayOnto", () => {
  const acceptedLevel = async (): Promise<StoredRevision> => {
    const path = pathFor(LEVEL, 0.9)
    await proposed(path)
    const [accepted] = await recordOf(path, PUBLISHED.treeId)
    if (accepted === undefined) throw new Error("expected the accepted change on the record")

    return accepted
  }

  /** An undo of `undone`, entered straight after it; its operation is only there to apply. */
  const undoOf = (undone: StoredRevision): StoredRevision => ({
    ...undone,
    proposalId: proposalIdSchema.parse("p_undo"),
    revision: undone.revision + 1,
    delta: { ...undone.delta, baseRevision: undone.revision },
    provenance: { ...undone.provenance, undoes: undone.revision },
    answeredBy: "owner:ana",
  })

  it("keeps each change's proposal, provenance and who allowed it, re-addressed", async () => {
    const accepted = await acceptedLevel()
    const undo = undoOf(accepted)
    const replay = replayOnto(NEWER, [accepted, undo], sequentialIdFactory("again"), LATER_ISO)

    expect(replay.dropped).toEqual([])
    expect(replay.tree.revision).toBe(NEWER.revision + 2)
    expect(replay.entries).toMatchObject([
      {
        proposalId: accepted.proposalId,
        delta: { treeId: NEWER.treeId, baseRevision: NEWER.revision, operations: [LEVEL] },
        provenance: accepted.provenance,
        appliedAt: LATER_ISO,
      },
      {
        proposalId: undo.proposalId,
        delta: { baseRevision: NEWER.revision + 1 },
        provenance: { undoes: NEWER.revision + 1 },
        answeredBy: "owner:ana",
      },
    ])
    expect(replay.entries[0]).not.toHaveProperty("answeredBy")
  })

  it("drops an undo whose change was dropped, since it would undo nothing that is there", async () => {
    const accepted = await acceptedLevel()
    const undo = undoOf(accepted)
    const replay = replayOnto(WITHOUT_HEADING, [accepted, undo], sequentialIdFactory("again"), "")

    expect(replay).toEqual({
      tree: WITHOUT_HEADING,
      entries: [],
      dropped: [accepted.proposalId, undo.proposalId],
    })
  })
})

describe("standsOn", () => {
  it("is whether the copy's accepted changes, applied to a version, give the copy", async () => {
    const path = pathFor(LEVEL, 0.9)
    const applied = await proposed(path)
    if (applied.kind !== "committed") throw new Error("expected the change to apply")
    const accepted = await recordOf(path, PUBLISHED.treeId)
    const ids = sequentialIdFactory("check")

    expect(standsOn(applied.tree, accepted, PUBLISHED, ids)).toBe(true)
    expect(standsOn(applied.tree, accepted, NEWER, ids)).toBe(false)
    expect(standsOn(applied.tree, accepted, WITHOUT_HEADING, ids)).toBe(false)
  })
})

describe("holdStandingOf", () => {
  it("is current for a change proposed after its copy started", async () => {
    const path = pathFor(LEVEL, 0.5)
    const outcome = await proposed(path)
    if (outcome.kind !== "held") throw new Error("expected a hold")
    const copies = [{ pageId: PUBLISHED.treeId, copyId: PUBLISHED.treeId, startedAt: AT - 1 }]

    expect(holdStandingOf(outcome.held, [])).toBe("current")
    expect(holdStandingOf(outcome.held, copies)).toBe("current")
  })
})
