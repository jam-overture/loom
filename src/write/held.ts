import type { ProposalId, TreeId } from "../ids.js"
import { err, ok, type Result } from "../result.js"
import type { Disposition } from "../runtime/disposition.js"
import type { EditIntent } from "../runtime/intent.js"
import type { ProposedChange } from "../runtime/proposal.js"

/**
 * Custody of the changes the Gate held back.
 *
 * A proposal the Gate marked `requires-confirmation` has to survive the request
 * that produced it, because the human who answers it arrives later. It cannot
 * live in the tree's log: 0016 makes the log the truth and a revision the count
 * of its entries, so an entry that advanced nothing would break the invariant
 * the snapshot is checked against. And it cannot live in the browser, because
 * 0017 already settled that a client never posts an authored change — a
 * confirmation that carried the proposal with it would be exactly that.
 *
 * So it lives here: server-side, keyed by the proposal's own id, and a
 * confirmation names the id rather than the change.
 */

export type HeldProposal = {
  readonly proposalId: ProposalId
  readonly treeId: TreeId
  /**
   * The revision the proposal was judged against. Held separately from the
   * delta so a reader can tell a hold is stale without parsing the delta, and
   * because it is the intent's promise, not the delta's.
   */
  readonly baseRevision: number
  /** Kept whole so a confirmation can be re-judged, and so §6 can pair ask with answer. */
  readonly intent: EditIntent
  readonly proposal: ProposedChange
  /** What the Gate said when it held it, so a reviewer sees the reason rather than a verdict. */
  readonly disposition: Disposition
  readonly heldAt: string
}

export type HoldError =
  /** Nothing under this id: never held, already answered, or expired. */
  | { readonly code: "not-held"; readonly proposalId: ProposalId }
  | { readonly code: "already-held"; readonly proposalId: ProposalId }
  | { readonly code: "unavailable"; readonly detail: string }

export const describeHoldError = (error: HoldError): string => {
  switch (error.code) {
    case "not-held":
      return `no proposal is held under ${error.proposalId}; it may already have been answered`
    case "already-held":
      return `${error.proposalId} is already held`
    case "unavailable":
      return `the holding store is unavailable: ${error.detail}`
  }
}

/**
 * `release` is a take, not a read: it removes and returns in one step, which is
 * what makes answering a proposal exactly once a property of the store rather
 * than a rule every caller has to remember. Confirming and discarding both go
 * through it, so two confirmations racing cannot both apply the same delta.
 *
 * `forTree` is scoped by tree because that is the only listing a review queue
 * needs; like `TreeStore` (0020), a handle is the scope of what it can see.
 */
export interface HoldStore {
  readonly hold: (held: HeldProposal) => Promise<Result<HeldProposal, HoldError>>
  readonly get: (proposalId: ProposalId) => Promise<Result<HeldProposal, HoldError>>
  readonly forTree: (treeId: TreeId) => Promise<Result<readonly HeldProposal[], HoldError>>
  readonly release: (proposalId: ProposalId) => Promise<Result<HeldProposal, HoldError>>
}

/**
 * The reference implementation. Ordered by `heldAt` ascending, so a queue reads
 * oldest-first: a change that has been waiting longest is the one most likely to
 * be about to go stale.
 */
export const memoryHoldStore = (): HoldStore => {
  const held = new Map<string, HeldProposal>()

  return {
    hold: (proposal) =>
      Promise.resolve(
        held.has(proposal.proposalId)
          ? err<HoldError>({ code: "already-held", proposalId: proposal.proposalId })
          : (() => {
              held.set(proposal.proposalId, proposal)

              return ok(proposal)
            })()
      ),

    get: (proposalId) => {
      const found = held.get(proposalId)

      return Promise.resolve(found ? ok(found) : err<HoldError>({ code: "not-held", proposalId }))
    },

    forTree: (treeId) =>
      Promise.resolve(
        ok(
          Array.from(held.values())
            .filter((proposal) => proposal.treeId === treeId)
            .sort((left, right) => left.heldAt.localeCompare(right.heldAt))
        )
      ),

    release: (proposalId) => {
      const found = held.get(proposalId)
      if (!found) return Promise.resolve(err<HoldError>({ code: "not-held", proposalId }))

      held.delete(proposalId)

      return Promise.resolve(ok(found))
    },
  }
}
