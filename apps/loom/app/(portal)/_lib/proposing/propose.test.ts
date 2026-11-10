import { describe, expect, it } from "vitest"

import {
  err,
  fixedPolicy,
  intentIdSchema,
  ok,
  proposalIdSchema,
  sequentialIdFactory,
  treeIdSchema,
  type IntentId,
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
import { memoryProposalGoalStore } from "../goals/proposal-goals-memory"
import type { ProposalGoalStore } from "../goals/serving"
import { elementIdsOf, goalOn, NOTHING_DECLARED, readersOn } from "./fixtures"
import { memoryPageCopyStore } from "./copies-memory"
import { holdStandingOf } from "./following"
import { memoryMadeFromStore } from "./made-from-memory"
import { intentFor, PROPOSER, proposeFor, type ProposeFor } from "./propose"
import { memoryTurnedDownStore } from "./turned-down-memory"

const AT = new Date(Date.UTC(2026, 10, 1))
const LATER = new Date(Date.UTC(2026, 10, 2))
const PUBLISHED = pageFixture("home", "Welcome", 3)
const [, HEADING] = elementIdsOf(PUBLISHED)

if (HEADING === undefined) throw new Error("the fixture has a heading")

const GOAL = goalOn(HEADING)

const NOTHING = JSON.stringify({ outcome: "nothing", reason: "All read." })

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

  it("goes on proposing for a page once a change to it was accepted, against the live copy", async () => {
    const path = pathFor()

    await proposeFor(given(path))

    const second = await proposeFor(given(path, { at: LATER }))

    expect(second.ok && second.value.kind).toBe("proposed")
    expect(await path.store.head(PUBLISHED.treeId)).toMatchObject({
      ok: true,
      value: { revision: 5 },
    })
  })

  it("follows a newer published version, carrying a waiting change that still fits it", async () => {
    const path = pathFor(0.5)
    const copies = memoryPageCopyStore()
    const newer = {
      ...pageFixture("home", "Welcome back", 5),
      treeId: PUBLISHED.treeId,
    }

    await proposeFor(given(path, { copies }))

    expect(await proposeFor(given(path, { copies, published: newer, at: LATER }))).toEqual(
      ok({ kind: "passed", passed: { kind: "waiting" } })
    )

    const listed = await copies.list()
    if (!listed.ok) throw new Error("expected copies")
    const [copy] = listed.value

    expect(copy).toMatchObject({
      pageId: PUBLISHED.treeId,
      startedAt: LATER.getTime(),
    })
    if (copy === undefined) return

    const carried = await path.holds.forTree(copy.copyId)
    if (!carried.ok) throw new Error("expected holds")

    expect(carried.value.held.map((held) => holdStandingOf(held, listed.value))).toEqual(["stale"])
    expect(await path.holds.forTree(PUBLISHED.treeId)).toEqual(ok({ held: [], unreadable: [] }))
  })

  it("leaves the copy where it is when this deployment's own site serves it", async () => {
    const path = pathFor()
    const newer = {
      ...pageFixture("home", "Welcome back", 5),
      treeId: PUBLISHED.treeId,
    }

    await proposeFor(given(path, { client: scriptedModelClient(NOTHING) }))

    expect(await proposeFor(given(path, { follows: false, published: newer }))).toEqual(
      ok({ kind: "passed", passed: { kind: "apart" } })
    )
  })

  it("shows the model what was turned down on the page before", async () => {
    const turnedDown = memoryTurnedDownStore()
    const client = scriptedModelClient(NOTHING)

    await turnedDown.record({
      proposalId: proposalIdSchema.parse("p_before"),
      pageId: PUBLISHED.treeId,
      request: "Remove the heading.",
      reason: "We need it.",
      by: "jonathan",
      at: AT.getTime(),
      intentId: intentIdSchema.parse("i_before"),
    })
    await proposeFor(given(pathFor(), { client, turnedDown }))

    expect(client.requests[0]?.userMessage).toMatch(
      /"Remove the heading\."\. Their reason: We need it\.$/u
    )
  })

  it("asks no model when too few have read the page", async () => {
    const client = scriptedModelClient(CHANGE)
    const run = await proposeFor(given(pathFor(), { client, sources: readersOn(PUBLISHED, 10) }))

    expect(run).toEqual(
      ok({
        kind: "passed",
        passed: { kind: "silent", silence: { kind: "too-few", opened: 10 } },
      })
    )
    expect(client.requests).toHaveLength(0)
  })

  it("changes nothing when the model finds nothing worth changing", async () => {
    const path = pathFor()
    const client = scriptedModelClient(NOTHING)

    expect(await proposeFor(given(path, { client }))).toEqual(
      ok({ kind: "passed", passed: { kind: "nothing", reason: "All read." } })
    )
    expect(await path.store.head(PUBLISHED.treeId)).toMatchObject({
      ok: true,
      value: { revision: 3 },
    })
  })

  it("records the goal a change serves, by its intent, and names it", async () => {
    const path = pathFor(0.5)
    const proposalGoals = memoryProposalGoalStore()
    const run = await proposeFor(given(path, { proposalGoals }))

    expect(run.ok && run.value.kind === "proposed" && run.value.goal).toEqual(GOAL)

    const waiting = await path.holds.waiting()
    if (!waiting.ok) throw new Error("expected holds")
    const intentIds = waiting.value.held.map((held) => held.intent.intentId)

    expect(intentIds).toHaveLength(1)
    expect(await proposalGoals.forIntents(intentIds)).toEqual(
      ok(
        new Map(
          intentIds.map((intentId) => [
            intentId,
            {
              intentId,
              goalId: GOAL.goalId,
              name: GOAL.name,
              kind: GOAL.kind,
              nodeId: HEADING,
              at: AT.getTime(),
            },
          ])
        )
      )
    )
  })

  it("keeps what a change the Gate made outright was made from, and nothing for one it held", async () => {
    const made = memoryMadeFromStore()
    const run = await proposeFor(given(pathFor(), { made }))

    if (!run.ok || run.value.kind !== "proposed" || run.value.outcome.kind !== "committed") {
      throw new Error("expected a change made outright")
    }

    const { proposal, disposition } = run.value.outcome

    expect(await made.forProposals([proposal.proposalId])).toEqual(
      ok(
        new Map([
          [
            proposal.proposalId,
            {
              proposalId: proposal.proposalId,
              intentId: proposal.intentId,
              stakes: disposition.stakes,
              at: AT.getTime(),
            },
          ],
        ])
      )
    )

    const heldMade = memoryMadeFromStore()
    const held = await proposeFor(given(pathFor(0.5), { made: heldMade }))

    if (!held.ok || held.value.kind !== "proposed" || held.value.outcome.kind !== "held") {
      throw new Error("expected a held change")
    }

    expect(await heldMade.forProposals([held.value.outcome.held.proposalId])).toEqual(ok(new Map()))
  })

  it("asks no model for a page no goal is on", async () => {
    const client = scriptedModelClient(CHANGE)
    const elsewhere = goalOn(HEADING, {
      pages: [treeIdSchema.parse("t_pricing")],
    })

    expect(await proposeFor(given(pathFor(), { client, goals: [] }))).toEqual(
      ok({ kind: "passed", passed: { kind: "no-goal" } })
    )
    expect(await proposeFor(given(pathFor(), { client, goals: [elsewhere] }))).toEqual(
      ok({ kind: "passed", passed: { kind: "no-goal" } })
    )
    expect(client.requests).toHaveLength(0)
  })

  it("proposes nothing when which goal it serves cannot be recorded", async () => {
    const path = pathFor()
    const proposalGoals: Pick<ProposalGoalStore, "record"> = {
      record: () =>
        Promise.resolve(err({ code: "unavailable", detail: "no table loom_proposal_goals" })),
    }

    expect(await proposeFor(given(path, { proposalGoals }))).toEqual(
      err({ code: "store", detail: "no table loom_proposal_goals" })
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
