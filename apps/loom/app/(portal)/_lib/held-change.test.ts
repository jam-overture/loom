import { describe, expect, it } from "vitest"

import { nodeIdSchema, type TreeOperation } from "@jam-overture/loom"
import { memoryTreeStore } from "@jam-overture/loom/store"
import { heldProposalFixture } from "@jam-overture/loom/testing/contracts"
import type { HeldProposal } from "@jam-overture/loom/write"

import { pageFixture } from "@/app/_lib/pages/fixtures"

import { drawHeld, drawnOn } from "./held-change"
import { elementIdsOf } from "./proposing/fixtures"

const PAGE = pageFixture("home", "Welcome", 3)
const [, HEADING] = elementIdsOf(PAGE)

if (HEADING === undefined) throw new Error("the fixture has a heading")

/** A change waiting on the page's copy, proposed for revision `base` of it. */
const heldOn = (operation: TreeOperation, base = PAGE.revision): HeldProposal => {
  const held = heldProposalFixture({ treeId: PAGE.treeId })

  return {
    ...held,
    baseRevision: base,
    proposal: {
      ...held.proposal,
      delta: {
        ...held.proposal.delta,
        treeId: PAGE.treeId,
        baseRevision: base,
        operations: [operation],
      },
    },
  }
}

const REMOVE_HEADING: TreeOperation = { op: "remove", nodeId: HEADING }

const storeWithPage = async () => {
  const store = memoryTreeStore()
  const created = await store.create(PAGE)
  if (!created.ok) throw new Error("expected the page to be kept")

  return store
}

describe("drawnOn", () => {
  it("draws the page as it stands and the page accepting the change makes of it", () => {
    const comparison = drawnOn(PAGE, heldOn(REMOVE_HEADING))

    expect(comparison?.before.find((row) => row.nodeId === HEADING)?.mark).toBe("removed")
    expect(comparison?.after.some((row) => row.nodeId === HEADING)).toBe(false)
  })

  it("applies the change to the copy as it stands, whatever revision it was proposed for", () => {
    expect(drawnOn(PAGE, heldOn(REMOVE_HEADING, PAGE.revision - 1))).not.toBeNull()
  })

  it("draws nothing for a change that no longer applies to the page", () => {
    const gone = nodeIdSchema.parse("n_gone")

    expect(drawnOn(PAGE, heldOn({ op: "remove", nodeId: gone }))).toBeNull()
  })
})

describe("drawHeld", () => {
  it("reads the copy the change waits on and draws it", async () => {
    const drawn = await drawHeld(await storeWithPage(), heldOn(REMOVE_HEADING), "current")

    expect(drawn.kind).toBe("drawn")
  })

  it("draws a stale change on the newer copy it was carried onto", async () => {
    const drawn = await drawHeld(await storeWithPage(), heldOn(REMOVE_HEADING), "stale")

    expect(drawn.kind).toBe("drawn")
  })

  it("does not draw a change that conflicts with the site's newer version", async () => {
    expect(await drawHeld(memoryTreeStore(), heldOn(REMOVE_HEADING), "conflicts")).toEqual({
      kind: "conflicts",
    })
  })

  it("says the copy could not be read rather than drawing a guess", async () => {
    expect(await drawHeld(memoryTreeStore(), heldOn(REMOVE_HEADING), "current")).toEqual({
      kind: "unreadable",
    })
  })

  it("says a change whose parts are gone is not drawn", async () => {
    const gone = nodeIdSchema.parse("n_gone")

    expect(
      await drawHeld(await storeWithPage(), heldOn({ op: "remove", nodeId: gone }), "current")
    ).toEqual({ kind: "not-drawn" })
  })
})
