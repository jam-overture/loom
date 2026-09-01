import type { NodeId } from "../ids.js"
import type { JsonValue } from "../json.js"

/**
 * A band the page's own links can point at.
 *
 * A Loom page could hold a link to any document on the web except itself. The
 * address half has always worked — a URL carrying a fragment parses and passes
 * every check the library makes — and the target half did not exist, because no
 * primitive renders an `id` and nothing in the runtime gave it one. A page whose
 * answer sits twelve hundred pixels below the claim had no way to say *here it
 * is*.
 *
 * This is the target half. A node the tree gives an anchor receives an `id` to
 * spread, the same way it receives the attributes that make it editable and the
 * variables that make the root themed — on its own root element, never on a
 * wrapper the renderer emitted, for the reason `editable.ts` gives.
 *
 * Three things happen here that could not happen in a prop schema, and they are
 * the reason this is a reserved key read by the runtime rather than a prop each
 * band primitive declares for itself. An anchor is checked against a grammar
 * narrow enough that what the tree wrote is what a browser matches. It is held
 * against every other anchor in the same render, because two elements sharing an
 * `id` is a document that is wrong rather than a node that is wrong, and a
 * schema sees one node at a time. And it is withheld from a decorative copy,
 * because a copy carries no identity and an anchor is identity (0093).
 */

/**
 * What a primitive spreads to become a fragment target.
 *
 * One attribute, and shaped as a bundle rather than a bare string so that the
 * spread at the call site reads the same as the one beside it — `{...loom.anchor}`
 * next to `{...loom.editable}` — and so that adding to it later is not a change
 * to every primitive that placed it.
 */
export type AnchorAttributes = {
  readonly id: string
}

/**
 * What the renderer learned about a node's declared anchor.
 *
 * Three states rather than the two the framing seam has, because the two ways an
 * anchor fails are different faults with different fixes: a slug nobody can use
 * is the tree's own mistake, and a slug already taken is a collision between two
 * nodes that are each fine alone. A caller that flattened them would report the
 * second as the first and send whoever reads it looking at the wrong node.
 *
 * A primitive is never handed any of this. It receives the attributes or it does
 * not, because unlike a refused frame — which a primitive renders differently,
 * and visibly — there is nothing for a primitive to do about an anchor it did
 * not get. What is left is a diagnostic, which is where a fault with no
 * behaviour belongs.
 */
export type AnchorReading =
  | { readonly status: "anchored"; readonly attributes: AnchorAttributes }
  | { readonly status: "unusable"; readonly detail: string }
  | { readonly status: "claimed"; readonly anchor: string; readonly holder: NodeId }

/**
 * The longest anchor a tree may name.
 *
 * A bound rather than a judgement about slugs: this is markup a model writes
 * into the document, and every other place a proposal writes a string has one.
 * Nothing legible reaches it — the longest anchor in this repository's own
 * writing is a third of it.
 */
export const ANCHOR_MAX_LENGTH = 64

/**
 * Lowercase words of letters and digits, joined by single hyphens.
 *
 * Deliberately narrower than what an `id` attribute permits, which since HTML5
 * is very nearly anything. The grammar is not about what the document accepts;
 * it is about what survives the round trip from the tree, through a URL a person
 * copies out of an address bar, and back to the element. Three things it
 * excludes, each of which parses as an `id` and then fails to be found:
 *
 * **Capitals.** Fragment matching is case-sensitive, so a tree that anchors
 * `Pricing` and links to `#pricing` scrolls nowhere, silently, and the two
 * strings look identical in a diff read quickly.
 *
 * **Spaces and everything else that must be encoded.** `#see it happen` reaches
 * the browser as `#see%20it%20happen` and matches an element whose id contains a
 * space, so it half works — until something in the chain normalises one spelling
 * and not the other.
 *
 * **Leading, trailing and doubled hyphens.** Not wrong, exactly, and the only
 * way they occur is a slug generated from a heading with punctuation in it, where
 * they are the visible residue of a bug somewhere upstream.
 */
const ANCHOR_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

/**
 * Who holds each anchor in one render.
 *
 * Lives for exactly one walk. Two renders of the same tree must not be able to
 * disagree about which node holds a slug because one of them ran first, which is
 * the same reason the text seam keeps its merge cache in a closure rather than
 * at module scope.
 */
export type AnchorLedger = {
  /**
   * Records this node as the holder, or answers with the node that got there
   * first. First claim in document order wins: the walk reaches a node before
   * its descendants and reads siblings in tree order, so the winner is a fact
   * about the tree rather than about the order the renderer happened to visit.
   */
  readonly claim: (anchor: string, nodeId: NodeId) => NodeId | undefined
}

export const createAnchorLedger = (): AnchorLedger => {
  const held = new Map<string, NodeId>()

  return {
    claim: (anchor: string, nodeId: NodeId): NodeId | undefined => {
      const holder = held.get(anchor)
      if (holder !== undefined) return holder

      held.set(anchor, nodeId)

      return undefined
    },
  }
}

/**
 * The whole check, as a function of a declared value and what is already taken.
 *
 * Total, like every other reading of something a model wrote: a number where a
 * slug goes, a slug with a space in it, or a slug another node already holds all
 * come back as a reading rather than as a thrown error. A page is not lost
 * because a proposal named a bad anchor; it renders with one band that cannot be
 * linked to, and says so.
 *
 * Claiming happens here rather than in the caller so that the check and the
 * record of it cannot come apart — there is no order of operations in which a
 * node is told it is anchored and the ledger does not know.
 */
export const resolveAnchor = (
  declared: JsonValue | undefined,
  nodeId: NodeId,
  ledger: AnchorLedger
): AnchorReading => {
  if (typeof declared !== "string") {
    return {
      status: "unusable",
      detail: declared === undefined ? "no value was given" : `got ${typeof declared}`,
    }
  }

  if (declared.length === 0) return { status: "unusable", detail: "it is empty" }

  if (declared.length > ANCHOR_MAX_LENGTH) {
    return {
      status: "unusable",
      detail: `it is ${declared.length} characters and the most an anchor may be is ${ANCHOR_MAX_LENGTH}`,
    }
  }

  if (!ANCHOR_PATTERN.test(declared)) {
    return {
      status: "unusable",
      detail: `"${declared}" is not lowercase letters, digits and single hyphens`,
    }
  }

  const holder = ledger.claim(declared, nodeId)

  if (holder !== undefined) return { status: "claimed", anchor: declared, holder }

  return { status: "anchored", attributes: { id: declared } }
}
