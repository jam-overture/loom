import { applyDelta, type LoomTree } from "@jam-overture/loom"
import type { TreeStore } from "@jam-overture/loom/store"
import type { HeldProposal } from "@jam-overture/loom/write"

import { compareTrees, type Comparison } from "./compare"
import type { HoldStanding } from "./proposing/following"

/**
 * The before and after *For review*'s drawer draws for one waiting change
 * (`docs/portal-wireframes.md`, *2 · For review*): the page as its copy stands
 * now, and the page that accepting the change would make of it.
 *
 * Accepting runs the Gate again against the copy as it then stands (0340), with
 * the change's operations kept and only re-addressed, as a carried change's are
 * (`carriedOnto`). So *after* is those operations applied to the copy's head,
 * whatever revision the change was first proposed for, and a change that no
 * longer applies to it is not drawn rather than drawn against a page it was not
 * proposed for.
 */
export type HeldDrawn =
  | { readonly kind: "drawn"; readonly comparison: Comparison }
  /** On an older copy that the site's newer version could not carry it onto (0340). */
  | { readonly kind: "conflicts" }
  /** Its operations no longer apply to the copy as it stands. */
  | { readonly kind: "not-drawn" }
  /** The copy could not be read. Nothing is wrong with the change. */
  | { readonly kind: "unreadable" }

/** The page before the change and after it, or `null` where it no longer applies. Pure. */
export const drawnOn = (page: LoomTree, held: HeldProposal): Comparison | null => {
  const after = applyDelta(page, {
    ...held.proposal.delta,
    treeId: page.treeId,
    baseRevision: page.revision,
  })

  return after.ok ? compareTrees(page, after.value) : null
}

export const drawHeld = async (
  trees: Pick<TreeStore, "head">,
  held: HeldProposal,
  standing: HoldStanding
): Promise<HeldDrawn> => {
  if (standing === "conflicts") return { kind: "conflicts" }

  const head = await trees.head(held.treeId)

  if (!head.ok) return { kind: "unreadable" }

  const comparison = drawnOn(head.value, held)

  return comparison === null ? { kind: "not-drawn" } : { kind: "drawn", comparison }
}
