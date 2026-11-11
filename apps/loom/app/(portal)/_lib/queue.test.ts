import { describe, expect, it } from "vitest"

import { heldProposalFixture } from "@jam-overture/loom/testing/contracts"

import { nodeIdSchema, treeIdSchema } from "@jam-overture/loom"

import { goalIdSchema } from "./goals/goal"

import { queueRowOf } from "./queue"
import { STAKES } from "./vocabulary"

/** The fixture's change is held at `medium`, which an approver may accept and nothing lower may. */
const held = heldProposalFixture({
  actor: "jonathan",
  heldAt: "2026-11-01T09:30:00.000Z",
})

const NONE = new Map()

describe("a waiting change, as the For review tab shows it", () => {
  it("says what was asked, by whom, when, why it stopped and what is at stake", () => {
    const row = queueRowOf(held, {
      names: new Map([[held.treeId, "Welcome"]]),
      role: "owner",
      copies: [],
      goals: NONE,
    })

    expect(row).toMatchObject({
      proposalId: held.proposalId,
      page: "Welcome",
      asked: held.intent.utterance,
      askedBy: "jonathan",
      since: "1 November 2026 at 09:30 UTC",
      stakes: STAKES.medium,
      waitsOn: null,
    })
    expect(row.why.length).toBeGreaterThan(0)
  })

  it("names the page by its id when it published no name", () => {
    expect(
      queueRowOf(held, {
        names: new Map(),
        role: "owner",
        copies: [],
        goals: NONE,
      }).page
    ).toBe(held.treeId)
  })

  it("is answerable by a role whose ceiling covers its stake, and says who can otherwise", () => {
    expect(
      queueRowOf(held, {
        names: new Map(),
        role: "approver",
        copies: [],
        goals: NONE,
      }).waitsOn
    ).toBeNull()
    expect(
      queueRowOf(held, {
        names: new Map(),
        role: "viewer",
        copies: [],
        goals: NONE,
      }).waitsOn
    ).toBe("approver")
  })

  it("reads as made for the page the site serves while the page has had one copy", () => {
    const row = queueRowOf(held, {
      names: new Map(),
      role: "owner",
      copies: [],
      goals: NONE,
    })

    expect(row).toMatchObject({ standing: "current", standingSentence: null })
  })

  it("names its page and says it no longer fits when it waits on an older copy", () => {
    const later = treeIdSchema.parse("t_later")
    const copies = [
      {
        pageId: held.treeId,
        copyId: later,
        startedAt: Date.parse(held.heldAt),
      },
    ]
    const row = queueRowOf(held, {
      names: new Map([[held.treeId, "Welcome"]]),
      role: "owner",
      copies,
      goals: NONE,
    })

    expect(row).toMatchObject({
      pageId: held.treeId,
      page: "Welcome",
      standing: "conflicts",
    })
    expect(row.standingSentence).toMatch(/can only be turned down/u)
  })

  it("leads with the goal it was raised for", () => {
    const goals = new Map([
      [
        held.intent.intentId,
        {
          intentId: held.intent.intentId,
          goalId: goalIdSchema.parse(`g_${"b".repeat(32)}`),
          name: "Starts a trial",
          kind: "activated" as const,
          nodeId: nodeIdSchema.parse("n_start"),
          at: 1,
        },
      ],
    ])

    expect(queueRowOf(held, { names: NONE, role: "owner", copies: [], goals })).toMatchObject({
      goalId: `g_${"b".repeat(32)}`,
      goal: "Starts a trial",
    })
  })

  it("names no goal for a change raised before proposals named one", () => {
    expect(queueRowOf(held, { names: NONE, role: "owner", copies: [], goals: NONE })).toMatchObject(
      { goalId: null, goal: null }
    )
  })
})
