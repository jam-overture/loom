import { everyMemberOf } from "../closed-set.js"
import type { TreeId } from "../ids.js"
import type { TreeError } from "../tree/errors.js"

/**
 * What persistence can refuse, and how to say it.
 *
 * Separated from the `TreeStore` contract because the taxonomy has a second
 * consumer: the runtime's event stream narrates a change that was accepted and
 * then failed to persist, and it should be able to say *why* without depending
 * on the store interface. This module imports nothing from the runtime, so that
 * direction stays acyclic.
 */

export type StoreError =
  /** No tree under this id — distinct from a tree with an empty history. */
  | { readonly code: "not-found"; readonly treeId: TreeId }
  | { readonly code: "already-exists"; readonly treeId: TreeId }
  /**
   * The delta names a base revision that is not the current head. This is the
   * whole of concurrency control: two writers racing at the same base means the
   * second one is refused rather than silently applied to a tree it never saw.
   */
  | {
      readonly code: "revision-conflict"
      readonly treeId: TreeId
      readonly expected: number
      readonly found: number
    }
  | { readonly code: "delta-rejected"; readonly treeId: TreeId; readonly error: TreeError }
  | { readonly code: "unavailable"; readonly detail: string }

export type StoreErrorCode = StoreError["code"]

/**
 * The five ways persistence can refuse, as a list the runtime can hand you.
 *
 * The sixth instance of a shape this project has now settled on
 * (`EPISODE_RESOLUTION_KINDS`, `UNJUDGED_REASONS`, `PALETTE_SLOTS`,
 * `STAKE_ORDER`, `WRITE_OUTCOME_KINDS`), so it is a line of code rather than a
 * decision. Filed by `Loom docs` on 2 September, who wanted to enumerate what a
 * store can say without reading the union out of a type they cannot iterate.
 *
 * In the order a writer meets them rather than alphabetically: the two about
 * whether a tree is there, then the two about whether a delta may land, then the
 * one that is about the storage itself.
 */
export const STORE_ERROR_CODES: readonly StoreErrorCode[] = everyMemberOf<StoreErrorCode>()([
  "not-found",
  "already-exists",
  "revision-conflict",
  "delta-rejected",
  "unavailable",
])

export const describeStoreError = (error: StoreError): string => {
  switch (error.code) {
    case "not-found":
      return `no tree stored under ${error.treeId}`
    case "already-exists":
      return `${error.treeId} already exists; a tree is created once`
    case "revision-conflict":
      return `${error.treeId} moved on: the delta applies to revision ${error.expected}, but head is ${error.found}`
    case "delta-rejected":
      return `the delta did not apply to ${error.treeId}: ${error.error.code}`
    case "unavailable":
      return `storage is unavailable: ${error.detail}`
  }
}
