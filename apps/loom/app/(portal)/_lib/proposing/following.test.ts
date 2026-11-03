import { describe, expect, it } from "vitest"

import {
  fixedPolicy,
  ok,
  sequentialIdFactory,
  treeIdSchema,
  type LoomTree,
  type TreeOperation,
} from "@jam-overture/loom"
import { memoryTreeStore } from "@jam-overture/loom/store"
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
  samePage,
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

  it("keeps a copy an accepted change moved until the site serves what it reached", async () => {
    const path = pathFor(LEVEL, 0.9)
    const following = followingOf(path)
    const applied = await proposed(path)
    if (applied.kind !== "committed") throw new Error("expected the change to apply")

    expect(await followPublished(following, NEWER)).toEqual(
      ok({ kind: "unshipped", copy: applied.tree })
    )

    const shipped = { ...applied.tree, revision: 8 }

    expect(await followPublished(following, shipped)).toMatchObject({
      ok: true,
      value: { kind: "followed", copy: { revision: 8 } },
    })
    expect(await followPublished(following, shipped)).toMatchObject({
      ok: true,
      value: { kind: "serving" },
    })
  })

  it("never starts again where the site serves the copy itself", async () => {
    const path = pathFor(LEVEL, 0.5)
    const following = followingOf(path, { follows: false })

    await proposed(path)

    expect(await followPublished(following, NEWER)).toEqual(ok({ kind: "apart", copy: PUBLISHED }))
    expect(await following.copies.list()).toEqual(ok([]))
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
