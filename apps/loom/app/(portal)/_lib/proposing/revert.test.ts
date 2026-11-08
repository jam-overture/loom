import { describe, expect, it } from "vitest"

import { err, fixedPolicy, ok, proposalIdSchema, sequentialIdFactory } from "@jam-overture/loom"
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

import { recordsOfPage } from "../accepted-reading"
import { acceptedChangesOf } from "../going-live"
import { portalPolicy } from "../policy"
import { memoryProposalGoalStore } from "../goals/proposal-goals-memory"
import type { ProposalGoalStore } from "../goals/serving"
import { elementIdsOf, goalOn, NOTHING_DECLARED, readersOn } from "./fixtures"
import { memoryPageCopyStore } from "./copies-memory"
import { samePage } from "./following"
import type { MadeFromStore } from "./made-from"
import { memoryMadeFromStore } from "./made-from-memory"
import { proposeFor, type ProposeFor } from "./propose"
import { mayRevert, proposeReverting, type RevertFor } from "./revert"
import { memoryTurnedDownStore } from "./turned-down-memory"

const AT = new Date(Date.UTC(2026, 10, 1))
const LATER = new Date(Date.UTC(2026, 10, 2))
const PUBLISHED = pageFixture("home", "Welcome", 3)
const [, HEADING] = elementIdsOf(PUBLISHED)

if (HEADING === undefined) throw new Error("the fixture has a heading")

const GOAL = goalOn(HEADING)

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
                  operations: [
                    {
                      op: "configure",
                      nodeId: HEADING,
                      set: { level: 2 },
                      unset: [],
                    },
                  ],
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
  copies: memoryPageCopyStore(),
  turnedDown: memoryTurnedDownStore(),
  goals: [GOAL],
  proposalGoals: memoryProposalGoalStore(),
  made: memoryMadeFromStore(),
  follows: true,
  client: scriptedModelClient(CHANGE),
  sources: readersOn(PUBLISHED, 100, 50),
  declarations: NOTHING_DECLARED,
  ids: sequentialIdFactory("intent"),
  published: PUBLISHED,
  name: "Home",
  at: AT,
  ...overrides,
})

const ACTOR = "ana@example.com"

type Setup = {
  readonly path: WritePath
  readonly base: ProposeFor
  readonly proposalGoals: ProposalGoalStore
  readonly made: MadeFromStore
}

/** A page with one change Loom made on it, in stores the revert reads from. */
const setUp = async (): Promise<Setup> => {
  const path = pathFor()
  const proposalGoals = memoryProposalGoalStore()
  const made = memoryMadeFromStore()
  const base = given(path, { proposalGoals, made })
  const run = await proposeFor(base)

  if (!run.ok || run.value.kind !== "proposed") throw new Error("expected a change")

  return { path, base, proposalGoals, made }
}

const revertFor = (
  setup: Setup,
  proposalId: string,
  overrides: Partial<RevertFor> = {}
): RevertFor => ({
  path: setup.path,
  copies: setup.base.copies,
  proposalGoals: setup.proposalGoals,
  made: setup.made,
  ids: sequentialIdFactory("revert"),
  published: PUBLISHED,
  proposalId: proposalIdSchema.parse(proposalId),
  actor: ACTOR,
  at: LATER,
  ...overrides,
})

const changesOn = async (setup: Setup) => {
  const copies = await setup.base.copies.list()
  if (!copies.ok) throw new Error("expected copies")
  const records = await recordsOfPage(setup.path.store, copies.value, PUBLISHED.treeId)
  if (!records.ok) throw new Error("expected records")

  return acceptedChangesOf(PUBLISHED.treeId, records.value)
}

const firstChange = async (setup: Setup) => {
  const [change] = await changesOn(setup)
  if (change === undefined) throw new Error("expected a change")

  return change
}

describe("proposeReverting", () => {
  it("puts the page back as the site published it, raised by the person, serving the change's goal", async () => {
    const setup = await setUp()
    const change = await firstChange(setup)
    const reverting = await proposeReverting(revertFor(setup, change.proposalId))

    expect(reverting.ok && reverting.value.kind).toBe("raised")
    if (!reverting.ok || reverting.value.kind !== "raised") return

    const { outcome, goal } = reverting.value

    expect(outcome.kind).toBe("committed")
    expect(goal?.goalId).toBe(GOAL.goalId)

    const head = await setup.path.store.head(PUBLISHED.treeId)
    if (!head.ok) throw new Error("expected the copy")

    expect(head.value.revision).toBe(5)
    expect(samePage(head.value, PUBLISHED)).toBe(true)

    if (outcome.kind !== "committed") return

    const { intentId, proposalId } = outcome.proposal
    const served = await setup.proposalGoals.forIntents([intentId])
    const made = await setup.made.forProposals([proposalId])

    expect(served.ok && served.value.get(intentId)?.goalId).toBe(GOAL.goalId)
    expect(made.ok && made.value.get(proposalId)?.intentId).toBe(intentId)
  })

  it("leaves the change it reverted undone, and the revert naming it", async () => {
    const setup = await setUp()
    const change = await firstChange(setup)

    await proposeReverting(revertFor(setup, change.proposalId))

    const [revert, reverted] = await changesOn(setup)

    expect(reverted?.ending.kind).toBe("undone")
    expect(revert?.undoes).toBe(change.proposalId)
    expect(revert?.accepted.provenance.origin).toBe("user-instruction")
    expect(revert && mayRevert(revert)).toBe(false)
    expect(reverted && mayRevert(reverted)).toBe(false)
  })

  it("refuses to revert a change twice, or to revert a revert", async () => {
    const setup = await setUp()
    const change = await firstChange(setup)

    await proposeReverting(revertFor(setup, change.proposalId))

    const [revert] = await changesOn(setup)
    if (revert === undefined) throw new Error("expected the revert")

    expect(await proposeReverting(revertFor(setup, change.proposalId))).toEqual(
      ok({ kind: "not-reverted", why: { kind: "not-standing" } })
    )
    expect(await proposeReverting(revertFor(setup, revert.proposalId))).toEqual(
      ok({ kind: "not-reverted", why: { kind: "an-undo" } })
    )
  })

  it("refuses a change that is not on the page", async () => {
    const setup = await setUp()

    expect(await proposeReverting(revertFor(setup, "p_elsewhere"))).toEqual(
      ok({ kind: "not-reverted", why: { kind: "not-standing" } })
    )
  })

  it("waits for Loom to follow a newer version the site published, rather than guess", async () => {
    const setup = await setUp()
    const change = await firstChange(setup)
    const newer = { ...pageFixture("home", "Welcome back", 5), treeId: PUBLISHED.treeId }

    expect(
      await proposeReverting(revertFor(setup, change.proposalId, { published: newer }))
    ).toEqual(ok({ kind: "not-reverted", why: { kind: "site-moved" } }))
  })

  it("is held for review when it would write over a later change to the same part", async () => {
    const setup = await setUp()
    const again = await proposeFor({ ...setup.base, at: LATER })

    expect(again.ok && again.value.kind).toBe("proposed")

    const [, older] = await changesOn(setup)
    if (older === undefined) throw new Error("expected two changes")

    const reverting = await proposeReverting(revertFor(setup, older.proposalId))

    expect(reverting.ok && reverting.value.kind === "raised" && reverting.value.outcome.kind).toBe(
      "held"
    )

    const held = await setup.path.holds.forTree(PUBLISHED.treeId)
    const intentId = held.ok ? held.value.held[0]?.intent.intentId : undefined
    const served =
      intentId === undefined ? undefined : await setup.proposalGoals.forIntents([intentId])

    expect(intentId).toBeDefined()
    expect(served?.ok && intentId !== undefined && served.value.get(intentId)?.goalId).toBe(
      GOAL.goalId
    )
  })

  it("names no goal for a change whose goal was never recorded, and still reverts it", async () => {
    const setup = await setUp()
    const change = await firstChange(setup)
    const reverting = await proposeReverting(
      revertFor(setup, change.proposalId, { made: memoryMadeFromStore() })
    )

    expect(
      reverting.ok && reverting.value.kind === "raised" && reverting.value.goal
    ).toBeUndefined()
    expect(reverting.ok && reverting.value.kind === "raised" && reverting.value.outcome.kind).toBe(
      "committed"
    )
  })

  it("says the store did not answer, and changes nothing, when the copies cannot be read", async () => {
    const setup = await setUp()
    const change = await firstChange(setup)
    const reverting = await proposeReverting(
      revertFor(setup, change.proposalId, {
        copies: { list: async () => err({ code: "unavailable", detail: "down" }) },
      })
    )

    expect(reverting).toEqual(err({ code: "store", detail: "down" }))
    expect(await setup.path.store.head(PUBLISHED.treeId)).toMatchObject({ value: { revision: 4 } })
  })
})
