import {
  deltaIdSchema,
  intentIdSchema,
  proposalIdSchema,
  type LoomTree,
  type TreeOperation,
} from "@jam-overture/loom"
import { audienceIdSchema } from "@jam-overture/loom/store"
import type { HeldProposal } from "@jam-overture/loom/write"

import { pageFixture } from "@/app/_lib/pages/fixtures"

import { elementIdsOf } from "../proposing/fixtures"
import type { SegmentChange } from "./segment-changes"

/** A published page with a heading, the operations a change for a segment makes on it, and changes made of them. */

export const PAGE: LoomTree = pageFixture("home", "Welcome", 3)

const [, HEADING] = elementIdsOf(PAGE)

if (HEADING === undefined) throw new Error("the fixture has a heading")

export const PHONE = audienceIdSchema.parse("aud_phone")
export const SEARCH = audienceIdSchema.parse("aud_search")

export const LEVEL: TreeOperation = {
  op: "configure",
  nodeId: HEADING,
  set: { level: 2 },
  unset: [],
}
export const TONE: TreeOperation = {
  op: "configure",
  nodeId: HEADING,
  set: { tone: "quiet" },
  unset: [],
}
export const REMOVE_HEADING: TreeOperation = { op: "remove", nodeId: HEADING }
/** A change to the page's outermost part, which every version of it has. */
export const GAP: TreeOperation = {
  op: "configure",
  nodeId: PAGE.root.id,
  set: { gap: "loose" },
  unset: [],
}

/** The page without its heading, which a change to the heading cannot apply to. */
export const WITHOUT_HEADING: LoomTree = {
  ...PAGE,
  revision: 4,
  root: { ...PAGE.root, children: [] },
}

export const segmentChange = (
  n: number,
  overrides: Partial<SegmentChange> = {}
): SegmentChange => ({
  proposalId: proposalIdSchema.parse(`p_${n}`),
  pageId: PAGE.treeId,
  audienceId: PHONE,
  operations: [LEVEL],
  acceptedBy: "ada@example.com",
  acceptedAt: n * 10,
  ...overrides,
})

/** A change waiting on the page, as the queue holds it. */
export const heldOn = (
  page: LoomTree,
  operations: readonly TreeOperation[],
  n = 9
): HeldProposal => {
  const proposalId = proposalIdSchema.parse(`p_${n}`)
  const intentId = intentIdSchema.parse(`i_${n}`)

  return {
    proposalId,
    treeId: page.treeId,
    baseRevision: page.revision,
    intent: {
      intentId,
      treeId: page.treeId,
      baseRevision: page.revision,
      origin: "system-signal",
      utterance: "Make the heading smaller",
      observedAt: "2026-11-13T09:00:00.000Z",
    },
    proposal: {
      proposalId,
      intentId,
      delta: {
        deltaId: deltaIdSchema.parse(`d_${n}`),
        treeId: page.treeId,
        baseRevision: page.revision,
        operations,
      },
      rationale: "Readers skim past it.",
      provenance: {
        origin: "system-signal",
        interpreter: "test",
        authoredBy: "model",
        confidence: 0.6,
        interpretedAt: "2026-11-13T09:00:00.000Z",
      },
    },
    disposition: {
      kind: "requires-confirmation",
      reason: { code: "confidence-below-minimum", detail: "0.6 is under the apply floor" },
      stakes: "medium",
      reversible: true,
      confidence: 0.6,
      policyId: "default",
    },
    heldAt: "2026-11-13T09:00:00.000Z",
  }
}
