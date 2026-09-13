import { z } from "zod"

import { proposalIdSchema, treeIdSchema, type ProposalId, type TreeId } from "../ids.js"
import { clampLimit } from "../paging.js"
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
/**
 * Named rather than inlined because a cursor carries one back: a page of holds
 * resumes from an instant and an id, and the instant it resumes from has to be
 * held to the same shape on the way in as it was on the way out.
 */
const heldAtSchema = z.string().datetime()

export const heldProposalSchema = z.object({
  proposalId: proposalIdSchema,
  treeId: treeIdSchema,
  baseRevision: z.number().int().nonnegative(),
  intent: editIntentSchema,
  proposal: proposedChangeSchema,
  disposition: dispositionSchema,
  heldAt: heldAtSchema,
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
 * Where a page of holds resumes: an instant and an id, never an instant alone.
 *
 * `heldAt` is not unique and is not close to unique — two proposals judged in
 * the same request share one, and every fixture in the contract suite shares
 * one by default. A cursor naming only the instant would repeat a hold or skip
 * one depending on which side of the comparison it fell, which is the failure a
 * cursor exists to prevent. `proposalId` is the store's primary key, so
 * `(heldAt, proposalId)` is total and stable — the property 0020 requires of
 * anything a cursor is taken from.
 */
export type HoldPosition = {
  readonly heldAt: string
  readonly proposalId: ProposalId
}

const compareStrings = (left: string, right: string): number => {
  if (left < right) return -1

  return left > right ? 1 : 0
}

/**
 * The order both listings are in: oldest first, then by id.
 *
 * Written once and shared for the reason `pageEnds` and `anchorBound` are — it
 * is the part most likely to drift between two backends and least likely to be
 * noticed when it does. `postgresHoldStore` is the one caller that cannot use
 * it, because ordering has to happen in the statement for an index to be usable;
 * its `ORDER BY` names this function, and the contract suite is what holds the
 * two to the same answer.
 */
export const compareHolds = (left: HoldPosition, right: HoldPosition): number =>
  compareStrings(left.heldAt, right.heldAt) || compareStrings(left.proposalId, right.proposalId)

const CURSOR_SEPARATOR = " "

export const holdCursor = (position: HoldPosition): string =>
  `${position.heldAt}${CURSOR_SEPARATOR}${position.proposalId}`

/**
 * Reads a cursor back into the position it names, or says it cannot.
 *
 * Unreadable means the same thing here as everywhere else in Loom (see
 * `cursorPosition`): start at the beginning, rather than one implementation
 * refusing what another silently accepts. Both halves are checked, because a
 * cursor that survived a URL is a value from outside — and a position built
 * from an instant that is not one would compare against nonsense and page from
 * somewhere no caller asked for. The separator is a space, which neither an
 * RFC 3339 instant nor an id can contain.
 */
export const holdCursorPosition = (cursor: string | undefined): HoldPosition | undefined => {
  if (cursor === undefined) return undefined

  const separator = cursor.indexOf(CURSOR_SEPARATOR)
  if (separator === -1) return undefined

  const heldAt = heldAtSchema.safeParse(cursor.slice(0, separator))
  const proposalId = proposalIdSchema.safeParse(cursor.slice(separator + 1))

  return heldAt.success && proposalId.success
    ? { heldAt: heldAt.data, proposalId: proposalId.data }
    : undefined
}

/**
 * Smaller than a tree listing's page, because a held proposal is the heaviest
 * row this store keeps: a whole delta, the intent that asked for it, and the
 * judgment that held it back. A reviewer reads them one at a time, so a page is
 * sized for a screen rather than for a fold.
 */
export const DEFAULT_HOLD_LIMIT = 25
export const MAX_HOLD_LIMIT = 100

export const clampHoldLimit = (limit: number | undefined): number =>
  clampLimit(limit, { fallback: DEFAULT_HOLD_LIMIT, max: MAX_HOLD_LIMIT })

export type HoldListRequest = {
  /**
   * Opaque to the caller: the previous page's `cursor`, passed back unread. A
   * cursor naming a hold that has since been answered is not an error — the
   * page resumes from the next position after it, which is what makes a queue
   * safe to page through while people are emptying it.
   */
  readonly cursor?: string
  /** Clamped by the implementation — see `clampHoldLimit`. */
  readonly limit?: number
}

export type HoldPage = {
  readonly held: readonly HeldProposal[]
  /** `null` when this was the last page. */
  readonly cursor: string | null
}

/**
 * `release` is a take, not a read: it removes and returns in one step, which is
 * what makes answering a proposal exactly once a property of the store rather
 * than a rule every caller has to remember. Confirming and discarding both go
 * through it, so two confirmations racing cannot both apply the same delta.
 *
 * Two listings, and the difference between them is the question being asked.
 * `forTree` answers *what is waiting on this page*, which a screen showing one
 * tree already knows the scope of; it is unpaged because the holds against a
 * single tree are bounded by how many changes one document can have in flight.
 * `waiting` answers *does anything need me at all*, which is the portal's front
 * door and cannot be assembled from the first: doing it that way is one query
 * per tree, over a listing that is itself bounded, so the answer is O(pages)
 * reads and still cannot be complete. Neither widens what a handle can see —
 * both are the holds this handle could already reach one tree at a time, which
 * is why 0020 permits the second.
 */
export interface HoldStore {
  readonly hold: (held: HeldProposal) => Promise<Result<HeldProposal, HoldError>>
  readonly get: (proposalId: ProposalId) => Promise<Result<HeldProposal, HoldError>>
  readonly forTree: (treeId: TreeId) => Promise<Result<readonly HeldProposal[], HoldError>>
  readonly waiting: (request?: HoldListRequest) => Promise<Result<HoldPage, HoldError>>
  readonly release: (proposalId: ProposalId) => Promise<Result<HeldProposal, HoldError>>
}

/**
 * The reference implementation. Both listings are in `compareHolds` order, so a
 * queue reads oldest-first: a change that has been waiting longest is the one
 * most likely to be about to go stale.
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
            .sort(compareHolds)
        )
      ),

    waiting: (request) => {
      const limit = clampHoldLimit(request?.limit)
      const from = holdCursorPosition(request?.cursor)

      const remaining = Array.from(held.values())
        .sort(compareHolds)
        .filter((proposal) => from === undefined || compareHolds(proposal, from) > 0)

      const page = remaining.slice(0, limit)
      const last = page.at(-1)

      return Promise.resolve(
        ok<HoldPage>({
          held: page,
          cursor: last !== undefined && remaining.length > page.length ? holdCursor(last) : null,
        })
      )
    },

    release: (proposalId) => {
      const found = held.get(proposalId)
      if (!found) return Promise.resolve(err<HoldError>({ code: "not-held", proposalId }))

      held.delete(proposalId)

      return Promise.resolve(ok(found))
    },
  }
}
