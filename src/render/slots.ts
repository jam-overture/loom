import type { PrimitiveType, SlotName } from "../primitive-type.js"

/**
 * What a primitive says it places, and what a tree filled that it will not.
 *
 * A slot child is a named region of authored content, and the name is how the
 * primitive receiving it decides where it goes
 * ([0051](../../decisions/0051-a-slot-is-a-region-the-primitive-places.md)).
 * 0051 states the cost of that in one line — *a primitive that does not place a
 * region renders nothing for it* — and left it at the cost: the content and
 * everything under it is dropped, the page looks finished, and no diagnostic
 * says it happened.
 *
 * This module is the half that makes it visible. It holds the seam the walk
 * asks, and the comparison it makes; what the walk *calls* the mismatch is the
 * diagnostic vocabulary's business, the same split `reads.ts` makes for the
 * binding nobody reads.
 */

/**
 * Which regions a primitive says it places, asked per type.
 *
 * Structural, and detected the way `BindingReader` and `FrameResolver` are: a
 * registry built by the SDK satisfies it, and a host resolving from a plain map
 * has registered nothing that could declare a region in the first place — so
 * there is nothing here to wire and nothing that can go missing.
 *
 * `undefined` means *this resolver cannot say*, which is the answer for a type
 * no registry holds. It is not a primitive's own answer, and that is the one
 * asymmetry with `reads`: `slots` is the declaration where leaving it out and
 * declaring it empty are the same claim, said so in `definition.ts` since §4
 * and relied on by the catalogue (0013) and by the conformance probe, which
 * reads the declared list as the complete one. So a primitive that has said
 * nothing has said it places none, and the region a tree fills on it is
 * reported.
 */
export interface SlotPlacer {
  readonly slotsPlacedBy: (type: PrimitiveType) => readonly SlotName[] | undefined
}

export const isSlotPlacer = (value: object): value is SlotPlacer =>
  typeof (value as Partial<SlotPlacer>).slotsPlacedBy === "function"

/**
 * The regions this node filled that its primitive places nowhere.
 *
 * Deduplicated, because two slot children may share a name and both be placed
 * (0051) — which means both are dropped together, by one mistake, and a list
 * that said it twice would make the count a function of how many times the tree
 * spelled it.
 *
 * Name-sorted, because the caller reports one diagnostic per name and a
 * diagnostic list whose order depends on child order is one a test can only
 * assert loosely.
 */
export const unplacedSlots = (
  filled: Iterable<string>,
  placed: readonly SlotName[] | undefined
): readonly string[] => {
  if (placed === undefined) return []

  const places = new Set<string>(placed)
  const unplaced = new Set<string>()

  for (const name of filled) if (!places.has(name)) unplaced.add(name)

  return [...unplaced].sort()
}
