import { z } from "zod"

import { proposalIdSchema, treeIdSchema, type ProposalId, type TreeId } from "../ids.js"
import { err, ok, type Result } from "../result.js"
import { dispositionSchema, type Disposition } from "../runtime/disposition.js"
import { editIntentSchema, type EditIntent } from "../runtime/intent.js"
import { proposedChangeSchema, type ProposedChange } from "../runtime/proposal.js"

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

/**
 * The same shape, as something a stored row can be checked against.
 *
 * It exists for the reason `dispositionSchema`'s comment gives: a hold outlives
 * the process that created it, and a judgment restored from storage is validated
 * at that boundary like anything else that crossed a wire or a year. Held here
 * rather than in a backend so that every implementation reads a hold back the
 * same way — a second store that parsed loosely would disagree with the first
 * about what is storable, and the contract suite would not catch it because both
 * would still round-trip their own writes.
 */
export const heldProposalSchema = z.object({
  proposalId: proposalIdSchema,
  treeId: treeIdSchema,
  baseRevision: z.number().int().nonnegative(),
  intent: editIntentSchema,
  proposal: proposedChangeSchema,
  disposition: dispositionSchema,
  heldAt: z.string().datetime(),
})

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
 * Reads a hold back out of storage, or says why it could not.
 *
 * The assertion is about the shape of optionality and never about validity — the
 * schema above establishes that. Zod infers an optional field as `T | undefined`,
 * which `exactOptionalPropertyTypes` distinguishes from an absent key, while JSON
 * has no `undefined` at all: a stored hold either carries `actor` or omits it,
 * and never holds it as an explicit nothing. So the parsed value already has the
 * shape the type asks for, and this is the one place that has to say so.
 */
export const parseHeldProposal = (row: unknown): Result<HeldProposal, HoldError> => {
  const parsed = heldProposalSchema.safeParse(row)

  return parsed.success
    ? ok(parsed.data as HeldProposal)
    : err<HoldError>({
        code: "unavailable",
        detail: `a stored hold did not parse: ${parsed.error.issues[0]?.path.join(".") ?? "unknown"}`,
      })
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
