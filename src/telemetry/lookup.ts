import type { ProposalId } from "../ids.js"

import { MAX_ASSESSMENT_LOOKUP } from "./journal.js"

/**
 * The arithmetic both journals do before they go looking, kept in one place so
 * they cannot disagree about it.
 *
 * Deliberately not exported from the package. What a host needs to know is the
 * cap and that a lookup says which ids it did not reach — both of which are on
 * the contract. How the split is computed is not a published name, and a module
 * nothing re-exports is the only way to say so (0045 is about fields; this is
 * the same instinct about surface).
 */

export type LookupSplit = {
  /** Distinct, in the order the caller named them, capped. */
  readonly asked: readonly ProposalId[]
  readonly unasked: readonly ProposalId[]
}

/**
 * Distinct first, then capped.
 *
 * The other order would let a caller spend its whole allowance on one id
 * repeated four hundred times and be told the rest were unasked — true, and
 * useless. Insertion order is kept because a caller that chunks `unasked` is
 * walking its own list, and a lookup that reordered it would make the second
 * call's result harder to line up than the first's.
 */
export const splitLookup = (proposalIds: readonly ProposalId[]): LookupSplit => {
  const distinct = [...new Set(proposalIds)]

  return {
    asked: distinct.slice(0, MAX_ASSESSMENT_LOOKUP),
    unasked: distinct.slice(MAX_ASSESSMENT_LOOKUP),
  }
}
