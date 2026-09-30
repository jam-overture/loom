import { sequentialIdFactory, type LoomNode } from "@jam-overture/loom"
import {
  COMPOSITION_PARTS,
  CATALOGUE_TYPES,
  compositionById,
  compositionsForPart,
  PAGE_SEQUENCE,
  STARTER_COMPOSITIONS,
  STARTER_PRIMITIVES,
  type Composition,
  type CompositionPart,
} from "@jam-overture/loom/primitives"

/**
 * What the starter library's bands are, counted rather than written down.
 *
 * **The plain version.** A *band* is a whole section of a page — an opening
 * headline, a pricing table, a list of questions — that the library can build
 * for you in one go. The page that teaches them has to say how many there are,
 * which parts of a page they cover, and how big one is. Every one of those is a
 * number, and a number typed into prose is wrong the week after somebody adds
 * a band.
 *
 * So nothing on that page is typed. This module asks the library, and
 * `compositions.test.ts` asks it a second way — against
 * `STARTER_COMPOSITIONS` itself, not against this file's own answer, because a
 * check whose expected value comes from the thing it checks moves when the
 * defect moves and stays green. That failure was measured on this site on
 * 28 September and is the reason this note is here.
 *
 * It is `@jam-overture/loom/primitives` rather than
 * `@jam-overture/loom-primitives` for the reason `_lib/packages.ts` gives: this
 * is the site's own code, reaching the door the workspace has. A page teaches
 * the door a reader can install.
 */

/** Every band on offer. Forty-four today, and the page never says the number. */
export const bandCount: number = STARTER_COMPOSITIONS.length

/** The regions of a page a band can be a design of. */
export const partCount: number = COMPOSITION_PARTS.length

/** One design of each part, in order — the canonical page. */
export const pageBandCount: number = PAGE_SEQUENCE.length

/**
 * How many nodes a subtree has, counting the root and every slot.
 *
 * A slot counts. It is a node in the tree with an id, it is addressable, and a
 * proposal can move something into it — so leaving it out would undercount the
 * thing the page is actually claiming, which is *how many nodes you would
 * otherwise have written by hand*.
 */
export const nodesIn = (node: LoomNode): number =>
  node.kind === "text" ? 1 : 1 + node.children.reduce((count, child) => count + nodesIn(child), 0)

/**
 * One row of the parts table: a region of a page, and what the library offers
 * for it.
 *
 * `designs` is every design of the part in catalogue order, canonical first —
 * `compositionsForPart` decides that, not this file.
 */
export type BandPart = {
  readonly part: CompositionPart
  /** Where it comes in a page, 1-based, from `COMPOSITION_PARTS` order. */
  readonly position: number
  /** What the canonical design calls itself. */
  readonly label: string
  /** The canonical design's own sentence about what lands on the page. */
  readonly promise: string
  /** How many nodes the canonical design builds. */
  readonly nodes: number
  readonly designs: readonly Composition[]
}

/**
 * The parts in page order, each with its designs.
 *
 * A part with no canonical design cannot happen — `PAGE_SEQUENCE` would be
 * short and the library's own test would be red — so this throws rather than
 * dropping a row. A table with a silently missing row is the shape this site
 * has now filed twice.
 */
export const bandParts: readonly BandPart[] = COMPOSITION_PARTS.map((part, index) => {
  const canonical = compositionById(part)

  if (canonical === undefined) {
    throw new Error(`loom: the page part "${part}" has no canonical design, so the parts table cannot be built`)
  }

  return {
    part,
    position: index + 1,
    label: canonical.label,
    promise: canonical.promise,
    /*
     * Built to be counted and thrown away. A band mints its ids as it goes,
     * so the only way to know how big one is is to build one; a deterministic
     * factory means the number is the same on every instance that asks.
     */
    nodes: nodesIn(canonical.build(sequentialIdFactory(`count${index}`))),
    designs: compositionsForPart(part),
  }
})

/**
 * How many nodes the canonical design of one part builds.
 *
 * A lookup rather than a second measurement: the table above already built every
 * canonical design once, and a page asking for one number should not make the
 * library build a band again. An unnamed part throws, because a sentence whose
 * subject does not exist is not a sentence worth rendering.
 */
export const bandNodesIn = (part: string): number => {
  const row = bandParts.find((candidate) => candidate.part === part)

  if (row === undefined) throw new Error(`loom: "${part}" is not a part of a page in the starter library`)

  return row.nodes
}

/** The parts the library draws more than one way. */
export const partsWithSeveralDesigns: readonly BandPart[] = bandParts.filter(
  (row) => row.designs.length > 1
)

/** The biggest band, which is the one worth naming when saying what one saves. */
export const largestBandPart: BandPart = bandParts.reduce((widest, row) =>
  row.nodes > widest.nodes ? row : widest
)

/**
 * The registry a host needs in order to build every band, against the whole
 * library.
 *
 * Both numbers are the library's own: `CATALOGUE_TYPES` is the union of the
 * bands' declared `uses`, and `STARTER_PRIMITIVES` is everything registered.
 * The page says the pair because the gap is the honest part — a band cannot
 * reach a primitive no band uses.
 */
export const catalogueTypeCount: number = CATALOGUE_TYPES.length

export const registeredTypeCount: number = STARTER_PRIMITIVES.length
