import { describe, expect, it } from "vitest"

import {
  err,
  fixedPolicy,
  ok,
  sequentialIdFactory,
  type IntentId,
  type LoomTree,
} from "@jam-overture/loom"
import { memoryTreeStore } from "@jam-overture/loom/store"
import {
  buildProposal,
  collectingEventSink,
  fixedClock,
  scriptedInterpreter,
  scriptedModelClient,
} from "@jam-overture/loom/testing"
import { memoryHoldStore, type WritePath } from "@jam-overture/loom/write"

import { pageFixture } from "@/app/_lib/pages/fixtures"

import { reportOf } from "../outcome"
import { portalPolicy } from "../policy"
import { elementIdsOf, NOTHING_DECLARED, readersOn } from "./fixtures"
import { governedCopyOf, intentFor, PROPOSER, proposeFor, type ProposeFor } from "./propose"

const AT = new Date(Date.UTC(2026, 10, 1))
const PUBLISHED = pageFixture("home", "Welcome", 3)
const [, HEADING] = elementIdsOf(PUBLISHED)

if (HEADING === undefined) throw new Error("the fixture has a heading")

const CHANGE = JSON.stringify({
  outcome: "change",
  request: `Make ${HEADING} shorter.`,
  evidence: "Only half the readers reach it.",
})

/** A heading change of the given stake: `level` is low, `remove` is not. */
const pathFor = (confidence = 0.9): WritePath => {
  const ids = sequentialIdFactory("propose")

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
                  operations: [{ op: "configure", nodeId: HEADING, set: { level: 2 }, unset: [] }],
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

const given = (path: WritePath, overrides: Partial<ProposeFor> = {}): ProposeFor => ({
  path,
  client: scriptedModelClient(CHANGE),
  sources: readersOn(PUBLISHED, 100, 50),
  declarations: NOTHING_DECLARED,
  ids: sequentialIdFactory("intent"),
  published: PUBLISHED,
  name: "Home",
  at: AT,
  ...overrides,
})

describe("the governed copy of a page", () => {
  it("starts as the published tree, exactly, the first time anything is proposed", async () => {
    const trees = memoryTreeStore()

    expect(await governedCopyOf(trees, PUBLISHED)).toEqual(ok(PUBLISHED))
    expect(await trees.head(PUBLISHED.treeId)).toEqual(ok(PUBLISHED))
  })

  it("is the copy already held, not the page as published again", async () => {
    const trees = memoryTreeStore()
    const later = { ...pageFixture("home", "Welcome back", 4), treeId: PUBLISHED.treeId }

    await governedCopyOf(trees, PUBLISHED)

    expect(await governedCopyOf(trees, later)).toEqual(ok(PUBLISHED))
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

    expect(await governedCopyOf(racing, PUBLISHED)).toEqual(ok(PUBLISHED))
  })
})

describe("the intent a proposal becomes", () => {
  it("is the AI's, from what readers did, against the version the site serves", () => {
    expect(
      intentFor({
        ids: { intentId: () => "i_1" as IntentId },
        page: PUBLISHED,
        request: "Make the heading shorter",
        at: AT,
      })
    ).toEqual({
      intentId: "i_1",
      treeId: PUBLISHED.treeId,
      baseRevision: 3,
      origin: "system-signal",
      actor: PROPOSER,
      utterance: "Make the heading shorter",
      observedAt: "2026-11-01T00:00:00.000Z",
    })
  })
})

describe("proposeFor", () => {
  it("changes the project's copy and leaves the published page as the site sent it", async () => {
    const path = pathFor()
    const run = await proposeFor(given(path))

    expect(run.ok && run.value.kind).toBe("proposed")
    if (!run.ok || run.value.kind !== "proposed") return

    expect(run.value.request).toBe(
      `Make ${HEADING} shorter. (Why: Only half the readers reach it.)`
    )
    expect(reportOf(run.value.outcome).tone).toBe("applied")
    expect(await path.store.head(PUBLISHED.treeId)).toMatchObject({
      ok: true,
      value: { revision: 4 },
    })
    expect(PUBLISHED.revision).toBe(3)
  })

  it("holds a change the Gate will not make alone, and then leaves the page alone", async () => {
    const path = pathFor(0.5)
    const first = await proposeFor(given(path))

    expect(first.ok && first.value.kind === "proposed" && reportOf(first.value.outcome).tone).toBe(
      "awaiting"
    )
    expect(await proposeFor(given(path))).toEqual(
      ok({ kind: "passed", passed: { kind: "waiting" } })
    )
  })

  it("proposes nothing more while the copy has a change the site does not serve", async () => {
    const path = pathFor()

    await proposeFor(given(path))

    expect(await proposeFor(given(path))).toEqual(
      ok({ kind: "passed", passed: { kind: "unshipped", copy: 4 } })
    )
  })

  it("proposes nothing when the site has published past the copy", async () => {
    const path = pathFor()
    await governedCopyOf(path.store, pageFixture("home", "Welcome", 2))

    expect(await proposeFor(given(path))).toEqual(
      ok({ kind: "passed", passed: { kind: "behind", copy: 2 } })
    )
  })

  it("asks no model when too few have read the page", async () => {
    const client = scriptedModelClient(CHANGE)
    const run = await proposeFor(given(pathFor(), { client, sources: readersOn(PUBLISHED, 10) }))

    expect(run).toEqual(
      ok({ kind: "passed", passed: { kind: "silent", silence: { kind: "too-few", opened: 10 } } })
    )
    expect(client.requests).toHaveLength(0)
  })

  it("changes nothing when the model finds nothing worth changing", async () => {
    const path = pathFor()
    const client = scriptedModelClient(JSON.stringify({ outcome: "nothing", reason: "All read." }))

    expect(await proposeFor(given(path, { client }))).toEqual(
      ok({ kind: "passed", passed: { kind: "nothing", reason: "All read." } })
    )
    expect(await path.store.head(PUBLISHED.treeId)).toMatchObject({
      ok: true,
      value: { revision: 3 },
    })
  })

  it("says the model failed rather than that nothing was worth changing", async () => {
    const client = scriptedModelClient(err({ code: "misconfigured", detail: "invalid x-api-key" }))

    expect(await proposeFor(given(pathFor(), { client }))).toEqual(
      err({ code: "model", detail: "invalid x-api-key" })
    )
  })
})
