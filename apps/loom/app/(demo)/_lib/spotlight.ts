import { childrenOf, findNode, type LoomNode, type LoomTree, type NodeId } from "@loom/runtime"
import { LOOM_NODE_ATTRIBUTE } from "@loom/runtime/react"

import type { ChangeRecord } from "./record"
import type { TouchedNode, TouchKind } from "./touched"

/**
 * Where to look on the page, and what to call what happened there.
 *
 * This is the answer to the last thing the demo could not do. A visitor pressed
 * *Remove the stats*, four hundred pixels of page they could not see changed,
 * and the only account of it was a sentence in the rail and a node id behind a
 * disclosure. Three of the five presets act below the fold; two of them are the
 * ones the Gate holds, which is the most interesting thing this surface has to
 * show. The record said what moved. The page said nothing.
 *
 * So the change gets marked *where it happened*, in the same colour the card in
 * the rail is wearing — green for a change that landed, amber for one waiting on
 * an answer. The colour is the whole link between the two halves of the screen:
 * a visitor who reads "Waiting on you" on an amber badge and sees one amber ring
 * on the page has been told which band the question is about without a word of
 * explanation.
 *
 * **It is drawn as a stylesheet rather than by a script**, for the reason the
 * runtime gives for never wrapping a node: the mark must not change what the
 * page is. A rule keyed on `data-loom-node` — the attribute edit mode already
 * puts on every primitive's own root — decorates without restructuring, works
 * before React hydrates, and disappears completely when there is nothing to say.
 * The one thing that genuinely needs a script is scrolling to it.
 */

/** Green for a change that landed, amber for one waiting on an answer. */
export type SpotTone = "applied" | "awaiting"

/**
 * The mark's two colours, and they are `globals.css`'s outcome tints rather than
 * two colours picked here — `spotlight.test.ts` holds them against that file, so
 * a run that retunes the badge on the card cannot leave the ring on the page
 * wearing last month's green.
 *
 * Literals rather than `var(--outcome-applied-text)`, and this is the same rule
 * the stage itself follows: these rules are served *inside* the stage, where the
 * tree carries its own theme (0050) and a visitor can re-theme it with one click.
 * A mark that read a chrome variable would be a mark the demo's own first preset
 * could repaint.
 */
export const SPOT_COLOURS: Readonly<Record<SpotTone, { readonly edge: string; readonly fill: string; readonly ink: string }>> = {
  applied: { edge: "#1f985e", fill: "#72e3ad", ink: "#0a0a0a" },
  awaiting: { edge: "#a97b16", fill: "#f0c674", ink: "#0a0a0a" },
}

/**
 * Whether the chip belongs on the marked band or beside it.
 *
 * `inside` is a mark *on a thing* — the band the chip names is the band the
 * change is about, so the chip sits in its corner. `above` and `below` are marks
 * on a *place*: the node the change is about is not in this tree at all, the
 * band carrying the mark is only its neighbour, and what the chip is pointing at
 * is the seam between them.
 *
 * The distinction is not decoration. A chip drawn in the corner of a band that
 * did not change lands on that band's own words — on the specimen page it lands
 * squarely on the second line of the testimonial — and says "something was
 * removed here" over a sentence that is plainly still there.
 */
export type SpotPlacement = "inside" | "above" | "below"

export type Spotlight = {
  /** A node that is in the tree on the stage, so the DOM has somewhere to draw. */
  readonly nodeId: NodeId
  readonly tone: SpotTone
  readonly label: string
  readonly placement: SpotPlacement
}

/**
 * How many marks one change may draw.
 *
 * A delta of nine configures would otherwise ring nine bands at once, which says
 * "everything changed" — the one thing a mark exists to disprove. Past this the
 * change is broad enough that the page itself is the evidence.
 */
export const MAX_SPOTS = 3

/**
 * What to call it, in the fewest words that survive being read at a glance.
 *
 * `placed` is the difference between pointing at the thing and pointing at where
 * the thing is not. A removed node has left the tree and an added one has not
 * arrived yet, so both are marked on a neighbour — and a chip reading "Removed"
 * on a band that is still there would be a lie the size of the whole surface.
 */
const labelFor = (kind: TouchKind, tone: SpotTone, placed: "node" | "near"): string => {
  if (tone === "awaiting") {
    switch (kind) {
      case "added":
        return placed === "near" ? "Something new would go here" : "This would be added"
      case "removed":
        return placed === "near" ? "Something here would go" : "This would be removed"
      case "moved":
        return "This would move"
      case "changed":
        return "This would change"
    }
  }

  switch (kind) {
    case "added":
      return placed === "near" ? "Something was added here" : "New — just added"
    case "removed":
      return placed === "near" ? "Something was removed here" : "This was removed"
    case "moved":
      return "Moved here"
    case "changed":
      return "Just changed"
  }
}

/** Only an element carries `data-loom-node`; a slot and a text node render as nothing of their own. */
const elementInTree = (tree: LoomTree, nodeId: NodeId | undefined): LoomNode | undefined => {
  if (nodeId === undefined) return undefined
  const found = findNode(tree.root, nodeId)

  return found?.kind === "element" ? found : undefined
}

/**
 * The band beside the gap, and **which side of it the chip goes**.
 *
 * A node that is not in this tree has one thing left: a position among its
 * parent's children. That position has a band on either side of it, and the two
 * of them name the same seam from opposite sides — so the answer is a band to
 * carry the mark plus the side of it the missing node's space is on. A chip put
 * on the wrong side is pointing at a stretch of page where nothing happened, by
 * the height of a whole band.
 *
 * Where there is a band on both sides there is a seam *between* them, which is
 * space the page has already set aside and the chip can be drawn in. Where there
 * is only one — the position is the top of the parent, or its end — there is no
 * such space: above the first band is the edge of the stage, which cannot be
 * scrolled to and which a clipping primitive would cut off anyway. There the
 * chip goes back in the corner, which is imprecise and legible rather than exact
 * and invisible.
 *
 * The walk is over every child rather than over the elements alone, because
 * `index` counts a parent's children and a slot or a text node is one of them.
 * Only an element can carry the mark, so the search steps outward from the
 * position to the first element on each side.
 */
const neighbourOf = (
  tree: LoomTree,
  touched: TouchedNode
): { readonly node: LoomNode; readonly placement: SpotPlacement } | undefined => {
  const parent = elementInTree(tree, touched.parentId)
  if (parent === undefined) return undefined

  const children = childrenOf(parent)
  const at = Math.max(touched.index ?? children.length, 0)

  const under = children.slice(at).find((child) => child.kind === "element")
  const over = children
    .slice(0, at)
    .reverse()
    .find((child) => child.kind === "element")

  if (under) return { node: under, placement: over ? "above" : "inside" }

  /*
   * Nothing stands at the position any more, so the band before it is the
   * nearest thing to the gap and the gap is under it. A parent whose children
   * have all gone has neither, and marking the parent would ring a container
   * rather than a place.
   */
  return over ? { node: over, placement: "below" } : undefined
}

const spotFor = (tree: LoomTree, touched: TouchedNode, tone: SpotTone): Spotlight | undefined => {
  /*
   * The root is never marked. A change to the page node is a change to
   * everything on the page — the re-theme is exactly this — and a ring around
   * the whole stage points at nothing. What answers "did anything happen?" for
   * that change is the page itself turning over.
   */
  const own = touched.nodeId === tree.root.id ? undefined : elementInTree(tree, touched.nodeId)

  if (own) {
    return { nodeId: own.id, tone, label: labelFor(touched.kind, tone, "node"), placement: "inside" }
  }

  const near = neighbourOf(tree, touched)
  if (near === undefined || near.node.id === tree.root.id) return undefined

  return {
    nodeId: near.node.id,
    tone,
    label: labelFor(touched.kind, tone, "near"),
    placement: near.placement,
  }
}

/**
 * Which nodes on this tree to mark for this change.
 *
 * Read against the tree the visitor is looking at, which is what makes one
 * function serve both halves: for a change that applied, the tree is the result
 * and the marks land on what moved; for one still waiting, the tree is what it
 * would move and the marks land on what it is asking about.
 */
export const spotlightsFor = (
  tree: LoomTree,
  touched: readonly TouchedNode[],
  tone: SpotTone
): readonly Spotlight[] => {
  const spots = touched.flatMap((one) => spotFor(tree, one, tone) ?? [])
  const seen = new Set<string>()

  return spots
    .filter((spot) => (seen.has(spot.nodeId) ? false : (seen.add(spot.nodeId), true)))
    .slice(0, MAX_SPOTS)
}

/**
 * Which of a visitor's changes the page is currently about — and only one, ever.
 *
 * Two marks in two colours on one page is a quiz rather than an explanation, so
 * the ordering has to be a rule rather than "the newest".
 *
 * **A change waiting on an answer wins**, because it is the only thing on the
 * screen that is asking the visitor for something. Failing that, the change that
 * produced *the revision now on the stage* — which is a stricter test than "the
 * most recent record", and deliberately: answering a hold moves that record back
 * to where it was asked, so a rail read newest-first would mark the wrong one at
 * exactly the moment a visitor is watching.
 *
 * Everything else — refused, discarded, never interpreted — marks nothing,
 * because nothing on the page moved.
 */
export const spotlitChange = (
  records: readonly ChangeRecord[],
  tree: LoomTree
): { readonly record: ChangeRecord; readonly tone: SpotTone } | undefined => {
  const waiting = records.find((record) => record.outcome === "awaiting-you")
  if (waiting) return { record: waiting, tone: "awaiting" }

  const onTheStage = records.find(
    (record) => record.outcome === "applied" && record.revision?.produced === tree.revision
  )

  return onTheStage ? { record: onTheStage, tone: "applied" } : undefined
}

const cssString = (value: string): string => `"${value.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`

/**
 * Where the chip is drawn, given what it is pointing at.
 *
 * **A mark on a band sits wholly inside its top-right corner**, and both halves
 * of that are corrections rather than preferences. *Inside*, because a primitive
 * may clip its own overflow — `loom.hero` does, for its backdrop — so anything
 * drawn outside the box is cut in half on exactly the band a visitor was just
 * carried to. *Right*, because a band's first words are at its left: on the stat
 * grid a left chip lands on the first figure, and a mark that covers what it is
 * pointing at has undone itself.
 *
 * **A mark on a gap sits in the gap**, outside the neighbour's box, which is the
 * same rule read against a different target: the thing being pointed at is the
 * empty space where a band was or would be, and the corner of the band beside it
 * is the one place in reach that is *not* empty. On the specimen page the
 * inside-corner version landed on the second line of the testimonial and said
 * "Something was removed here" over a sentence still plainly there.
 *
 * The gap is free by construction — a band left it, or a band is about to fill
 * it — so nothing is covered, and `margin` keeps the chip clear of the ring
 * rather than `inset` alone, so the two never touch at any zoom.
 */
const chipPosition = (placement: SpotPlacement): string => {
  switch (placement) {
    case "inside":
      return "inset: 6px 6px auto auto;\n  margin: 0;"
    case "above":
      return "inset: auto 6px 100% auto;\n  margin: 0 0 5px 0;"
    case "below":
      return "inset: 100% 6px auto auto;\n  margin: 5px 0 0 0;"
  }
}

/**
 * A band carrying a chip in the gap *below* it overlaps the band that follows,
 * which paints later and would cover the chip if it has a ground of its own.
 * Raising the marked band one step fixes the order without moving anything: it
 * is already `position: relative` for the chip's sake, and a page whose bands do
 * not overlap cannot tell the difference.
 *
 * Only where it is needed. A chip in the gap *above* overlaps the band before
 * it, which has already painted.
 */
const stackingFor = (placement: SpotPlacement): string =>
  placement === "below" ? "\n  z-index: 1;" : ""

/**
 * The mark, as rules.
 *
 * `outline` rather than `border`, because an outline takes no space and a border
 * would move the page it is describing.
 *
 * It names its own font, because it is Loom speaking inside a page wearing
 * somebody else's typeface.
 */
export const spotlightCss = (spots: readonly Spotlight[]): string =>
  spots
    .map((spot) => {
      const colour = SPOT_COLOURS[spot.tone]
      const selector = `[${LOOM_NODE_ATTRIBUTE}=${cssString(spot.nodeId)}]`

      return `
${selector} {
  position: relative;
  outline: 2px solid ${colour.edge};
  outline-offset: -1px;
  border-radius: 4px;
  scroll-margin: 4rem;${stackingFor(spot.placement)}
}
${selector}::after {
  content: ${cssString(spot.label)};
  position: absolute;
  ${chipPosition(spot.placement)}
  transform: none;
  z-index: 5;
  padding: 4px 8px;
  border-radius: 4px;
  background: ${colour.fill};
  color: ${colour.ink};
  font-family: var(--font-geist-sans), ui-sans-serif, system-ui, sans-serif;
  font-size: 11px;
  font-weight: 500;
  font-style: normal;
  line-height: 1.2;
  letter-spacing: 0;
  text-transform: none;
  white-space: nowrap;
  pointer-events: none;
}`.trim()
    })
    .join("\n")
