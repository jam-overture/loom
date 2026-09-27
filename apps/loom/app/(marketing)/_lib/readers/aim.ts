import type { ElementNode, LoomNode, LoomTree, NodeId, PrimitiveType } from "@jam-overture/loom"
import { isInteractiveWith } from "@jam-overture/loom"
import { interactiveTypesFor } from "@jam-overture/loom/sdk"

import { siteRegistry } from "../registry"

/**
 * Where a reader's press or open actually lands on this page, and everything
 * addressed above it.
 *
 * **A reader never aims at a band.** They press a button, follow a link, open a
 * question — and every one of those is an addressed node of its own, several
 * levels down inside the band it happens to sit in. A browser broadcasting
 * signals files the press against the *control*, because the control is what the
 * event came off; the band arrives as ancestry on the same signal, which is what
 * `within` is for
 * ([0167](../../../../../decisions/0167-a-delegated-signal-names-the-regions-it-happened-inside.md)).
 *
 * That is the whole reason this module exists. The readers page is built from a
 * fixture, and a fixture that filed a press against the band would be producing
 * a shape **no browser will ever send** — so every number computed from it would
 * be arithmetic over input the real thing cannot produce. The page's own claim
 * is *the visits are made up and the working is not*, and the working is only
 * honestly exercised if the visits are the right shape.
 *
 * ## What counts as a control is asked, not listed
 *
 * A primitive declares whether it renders a target the reader aims at, and the
 * declaration is conditional where the truth is: `loom.card` is a link when the
 * tree gave it an `href` and a plain surface when it did not. So the question
 * *what would a reader have pressed in this band* is answered by
 * `interactiveTypesFor` over the registry this site registered, node by node,
 * against the props each node actually has — never by a list of type strings
 * written down here. A list would be right for this deployment and wrong for
 * every other, which is the failure `PrimitiveRole` was written to end.
 *
 * ## The ancestry is the element chain, and that is not an approximation
 *
 * Every element node is rendered carrying `data-loom-node`, and the broadcaster
 * walks *elements* from the target up to the root, keeping each addressed one.
 * Slots carry no address and text is not an element, so the chain this module
 * builds — element ancestors, nearest first, up to and including the page root —
 * is the same list the browser would report, rather than a stand-in for it.
 */

/** A node, as the two fields a signal names one by. */
export type Aim = {
  readonly nodeId: NodeId
  readonly type: PrimitiveType
}

/**
 * A target and the regions it sits inside, which is the pair a delegated signal
 * carries.
 *
 * `within` is **nearest first and includes the page root**, and it is never
 * omitted here: a fixture that left it off would be saying *nobody walked*,
 * which reports every band as zero rather than as the region the press happened
 * in. Absent and empty are different claims and this module only ever makes the
 * second kind.
 */
export type Aimed = {
  readonly at: Aim
  readonly within: readonly Aim[]
}

const addressOf = (node: ElementNode): Aim => ({ nodeId: node.id, type: node.type })

/** The element children of a node, skipping slots without stopping at them. */
const elementsIn = (node: LoomNode): readonly ElementNode[] =>
  node.kind === "text"
    ? []
    : node.children.flatMap((child) =>
        child.kind === "element" ? [child] : child.kind === "slot" ? elementsIn(child) : []
      )

/** An element of the page, and the addressed elements above it, nearest first. */
type Standing = {
  readonly node: ElementNode
  readonly within: readonly Aim[]
}

/**
 * Every element **strictly inside** `node`, each with the chain above it.
 *
 * Depth first and in document order, so *the first one that matches* is the one
 * nearest the top of the band — which is the one a reader meets first and the
 * only defensible choice when a band holds several.
 *
 * Strictly inside, because a band is never the thing aimed at: including it
 * would let a band with no control of its own answer *itself*, which is exactly
 * the shape this module exists to stop producing.
 */
const inside = (node: ElementNode, above: readonly Aim[]): readonly Standing[] => {
  const within = [addressOf(node), ...above]

  return elementsIn(node).flatMap((child) => [
    { node: child, within },
    ...inside(child, within),
  ])
}

/** What a node of this type is, when the tree gave it these props. */
const interactiveTypes = interactiveTypesFor(siteRegistry)

const isTarget = (node: ElementNode): boolean => {
  const when = interactiveTypes[node.type]

  return when !== undefined && isInteractiveWith(when, node.props)
}

/**
 * The types that disclose without declaring it, which is a list of exactly one
 * and should be a list of none.
 *
 * A primitive that renders a **disclose control** says so — the registry refuses
 * the declaration otherwise — so *which of my primitives can a reader open* is
 * answerable of `loom.nav` and of anything else built that way. It is not
 * answerable of `loom.faq`, which is a native `details` and declares neither the
 * behaviour nor `interactive`. So a host asking its registry that question is
 * told about its menu and misses the only thing on the page anybody actually
 * opens, which is the questions.
 *
 * Filed for `Loom primitives`. Until it is answerable this is one string, and it
 * is bounded below rather than trusted: `discloseTargetIn` throws when a band
 * named as opened holds nothing that opens, so the day the questions band stops
 * being built this way is a failed build rather than a silent zero.
 */
export const UNDECLARED_DISCLOSING_TYPES: readonly string[] = ["loom.faq"]

/**
 * A control a reader opens rather than presses.
 *
 * The broadcaster keeps these out of `activated` — a disclose control reports as
 * `disclosed` and nothing else — so a press target that was one would be minting
 * the wrong kind against the right node. Most of the answer is the registry's;
 * the rest is the list above.
 */
const isDisclosure = (node: ElementNode): boolean =>
  UNDECLARED_DISCLOSING_TYPES.includes(node.type) ||
  siteRegistry.behavioursFor(node.type).includes("disclose")

const bandIn = (page: LoomTree, bandId: string): ElementNode => {
  const found = page.root.children.find(
    (child): child is ElementNode => child.kind === "element" && child.id === bandId
  )

  if (found === undefined) {
    throw new Error(`loom: the front door has no band with the id "${bandId}"`)
  }

  return found
}

/**
 * The first thing inside a band that a reader could have aimed at, with the
 * regions it sits inside.
 *
 * It **throws when there is none**, and that is the same guard the fixture puts
 * on a band name: a visit that presses something in a band holding nothing
 * pressable is a fixture describing a page that does not exist, and the two
 * silent alternatives are both worse than a failed build. Filing the press
 * against the band instead is the shape this module exists to stop; dropping the
 * press quietly loses a reader's action out of every number on the page.
 */
const aimedIn = (
  page: LoomTree,
  bandId: string,
  bandName: string,
  matches: (node: ElementNode) => boolean,
  what: string
): Aimed => {
  const band = bandIn(page, bandId)
  const found = inside(band, [addressOf(page.root)]).find((candidate) => matches(candidate.node))

  if (found === undefined) {
    throw new Error(
      `loom: a scripted reader ${what} in “${bandName}”, and that band of the front door holds nothing they could have aimed at`
    )
  }

  return { at: addressOf(found.node), within: found.within }
}

/** What a reader who pressed something in this band pressed. */
export const pressTargetIn = (page: LoomTree, bandId: string, bandName: string): Aimed =>
  aimedIn(page, bandId, bandName, (node) => isTarget(node) && !isDisclosure(node), "pressed something")

/** What a reader who opened something in this band opened. */
export const discloseTargetIn = (page: LoomTree, bandId: string, bandName: string): Aimed =>
  aimedIn(page, bandId, bandName, isDisclosure, "opened something")
