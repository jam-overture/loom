import type { NodeId } from "../../src/ids.js"
import type { PrimitiveType } from "../../src/primitive-type.js"
import type { ElementNode } from "../../src/tree/node.js"
import { outlineTree, type OutlineEntry } from "../../src/tree/outline.js"
import type { LoomTree } from "../../src/tree/tree.js"

/**
 * A page as a simulated reader meets it: bands, top to bottom.
 *
 * **A band is an element directly under the page's root.** A reader scrolls a
 * page band by band, and whether they read on past one is the one decision the
 * personas in `world.ts` take about reach. Everything inside a band is seen
 * when the band is.
 *
 * The features below are what the personas' rules read. They are computed from
 * the tree alone, which is what makes a change's true effect exact (`effect.ts`):
 * a proposal moves a part or rewrites a heading, the features move, and the
 * probabilities move with them.
 */

/** The part a project's goal counts, and the signal it counts. The portal's `Goal`, narrowed. */
export type SimGoal = {
  readonly kind: "activated" | "completed" | "disclosed"
  readonly nodeId: NodeId
}

export type PageElement = {
  readonly node: ElementNode
  /** The addressed elements this one sits inside, nearest first, as a delegated signal carries them. */
  readonly within: readonly { readonly nodeId: NodeId; readonly type: PrimitiveType }[]
}

export type Band = {
  readonly elements: readonly PageElement[]
}

/** What the personas' rules can see. */
export type PageFeatures = {
  readonly bandCount: number
  /** The band the goal's part is in, from 0. Absent when the page does not have the part. */
  readonly goalBand: number | undefined
  /** Words a reader passes before reaching the goal's part, in reading order. */
  readonly wordsBeforeGoal: number
  /** Other controls a reader passes before reaching the goal's part. */
  readonly controlsBeforeGoal: number
  readonly codeBeforeGoal: boolean
  readonly priceBeforeGoal: boolean
  /** Whether the goal's part is itself a way to sign in. */
  readonly goalIsSignIn: boolean
  /** The words of every heading in the first two bands, lower-cased. */
  readonly topHeadings: string
}

const CONTROL_TYPES: ReadonlySet<string> = new Set([
  "loom.button",
  "loom.action",
  "loom.link",
  "loom.inline-link",
])

const CODE_TYPES: ReadonlySet<string> = new Set(["loom.code", "loom.code-span"])

const HEADING_TYPE = "loom.heading"

const PRICE = /[$€£]\s?\d/u

const SIGN_IN = /\b(sign|log) ?in\b/iu

/** How many top bands a reader skimming the headings looks at. */
const TOP_BANDS = 2

export const isControl = (element: ElementNode): boolean => CONTROL_TYPES.has(element.type)

const wordCount = (text: string): number => text.split(/\s+/u).filter((word) => word !== "").length

/** The words directly inside an element, not inside its element children. */
const ownTextOf = (node: ElementNode): string =>
  node.children.flatMap((child) => (child.kind === "text" ? [child.value] : [])).join(" ")

type Ancestry = PageElement["within"]

/**
 * Every node's addressed ancestry, nearest first, in one pass. The outline is
 * pre-order, so a node's parent is always answered before the node is; no
 * recursion, because a page's depth is data (0372).
 */
const ancestriesOf = (outline: readonly OutlineEntry[]): ReadonlyMap<NodeId, Ancestry> => {
  const byId = new Map(outline.map((entry) => [entry.node.id, entry] as const))

  return outline.reduce((known, entry) => {
    const parent = entry.parentId === null ? undefined : byId.get(entry.parentId)
    const above = entry.parentId === null ? [] : (known.get(entry.parentId) ?? [])
    const within: Ancestry =
      parent?.node.kind === "element"
        ? [{ nodeId: parent.node.id, type: parent.node.type }, ...above]
        : above

    return known.set(entry.node.id, within)
  }, new Map<NodeId, Ancestry>())
}

/**
 * The page's bands, each with its elements in reading order. The root itself
 * is in no band, and a band with no element in it (a bare text or an empty slot
 * directly under the root) is not one a reader can be said to see.
 */
export const bandsOf = (tree: LoomTree): readonly Band[] => {
  const outline = outlineTree(tree.root)
  const ancestries = ancestriesOf(outline)
  const starts = outline.flatMap((entry, at) => (entry.depth === 1 ? [at] : []))

  return starts
    .map((start, index) => ({
      elements: outline
        .slice(start, starts[index + 1] ?? outline.length)
        .flatMap((entry) =>
          entry.node.kind === "element"
            ? [{ node: entry.node, within: ancestries.get(entry.node.id) ?? [] }]
            : []
        ),
    }))
    .filter((band) => band.elements.length > 0)
}

const isHeading = (element: PageElement): boolean => element.node.type === HEADING_TYPE

/** Every element of the page in reading order, with the band it is in. */
const inReadingOrder = (
  bands: readonly Band[]
): readonly { readonly element: PageElement; readonly band: number }[] =>
  bands.flatMap((band, index) => band.elements.map((element) => ({ element, band: index })))

/**
 * The features of a page for a goal. Pure: the bands and the goal are all it
 * reads. *Before the goal* is everything that comes before its part in reading
 * order, in its own band and the bands above; on a page without the part it is
 * the whole page.
 */
export const featuresOf = (bands: readonly Band[], goal: SimGoal): PageFeatures => {
  const ordered = inReadingOrder(bands)
  const at = ordered.findIndex(({ element }) => element.node.id === goal.nodeId)
  const target = at === -1 ? undefined : ordered[at]
  const before = ordered
    .slice(0, target === undefined ? ordered.length : at)
    .map(({ element }) => element)

  return {
    bandCount: bands.length,
    goalBand: target?.band,
    wordsBeforeGoal: before.reduce((sum, element) => sum + wordCount(ownTextOf(element.node)), 0),
    controlsBeforeGoal: before.filter((element) => isControl(element.node)).length,
    codeBeforeGoal: before.some((element) => CODE_TYPES.has(element.node.type)),
    priceBeforeGoal: before.some((element) => PRICE.test(ownTextOf(element.node))),
    goalIsSignIn: target !== undefined && SIGN_IN.test(ownTextOf(target.element.node)),
    topHeadings: bands
      .slice(0, TOP_BANDS)
      .flatMap((band) => band.elements.filter(isHeading).map((element) => ownTextOf(element.node)))
      .join(" ")
      .toLowerCase(),
  }
}
