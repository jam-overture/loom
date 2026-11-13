import { ok, type ProposalId } from "@jam-overture/loom"

import {
  acceptedOldestFirst,
  SEGMENT_CHANGES_PER_PAGE,
  type SegmentChange,
  type SegmentChangeStore,
} from "./segment-changes"

/** One application's changes for segments in the process: the reference implementation. */
export const memorySegmentChangeStore = (): SegmentChangeStore => {
  const held = new Map<ProposalId, SegmentChange>()

  return {
    record: (change) => {
      if (!held.has(change.proposalId)) held.set(change.proposalId, change)

      return Promise.resolve(ok(undefined))
    },

    forPage: (pageId) =>
      Promise.resolve(
        ok(
          acceptedOldestFirst(
            [...held.values()].filter((change) => change.pageId === pageId)
          ).slice(0, SEGMENT_CHANGES_PER_PAGE)
        )
      ),

    drop: (pageId, proposalIds, at) => {
      for (const proposalId of proposalIds) {
        const change = held.get(proposalId)

        if (change !== undefined && change.pageId === pageId && change.droppedAt === undefined) {
          held.set(proposalId, { ...change, droppedAt: at })
        }
      }

      return Promise.resolve(ok(undefined))
    },
  }
}
