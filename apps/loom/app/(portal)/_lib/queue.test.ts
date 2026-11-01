import { describe, expect, it } from "vitest"

import { heldProposalFixture } from "@jam-overture/loom/testing/contracts"

import { queueRowOf } from "./queue"
import { STAKES } from "./vocabulary"

/** The fixture's change is held at `medium`, which an approver may accept and nothing lower may. */
const held = heldProposalFixture({ actor: "jonathan", heldAt: "2026-11-01T09:30:00.000Z" })

describe("a waiting change, as the Waiting tab shows it", () => {
  it("says what was asked, by whom, when, why it stopped and what is at stake", () => {
    const row = queueRowOf(held, new Map([[held.treeId, "Welcome"]]), "owner")

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
    expect(queueRowOf(held, new Map(), "owner").page).toBe(held.treeId)
  })

  it("is answerable by a role whose ceiling covers its stake, and says who can otherwise", () => {
    expect(queueRowOf(held, new Map(), "approver").waitsOn).toBeNull()
    expect(queueRowOf(held, new Map(), "viewer").waitsOn).toBe("approver")
  })
})
