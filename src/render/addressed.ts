import { LOOM_TREE_ATTRIBUTE } from "./editable.js"

/**
 * The names a render writes onto a published page, and how to find the page.
 *
 * `addressed: true` stamps a node's identity onto the markup of a live page:
 * node id and type on each decorated element, tree id and revision on the root
 * (0136). Those four names are the whole of the contract between a render and
 * anything that reads a published page afterwards — a broadcaster gathering
 * reader signals, a portal authoring an intent from the DOM, a script bringing
 * a named node into view.
 *
 * **This module exists so that reading them costs a browser nothing.** The
 * names were published only through `@jam-overture/loom/react`, which carries
 * the render seam and every primitive's registration, so a browser bundle that
 * imported one string from there carried all of it. That is the mistake the
 * broadcaster's own entry point was split out to stop and the one `disclosed.ts`
 * was pulled out of `behaviour.ts` to avoid (0136), and it is invisible in a
 * diff: one import line, every test green.
 *
 * So the choice a host faced was a heavy import or a hand-written
 * `"[data-loom-tree]"`, and the hosts that ship a browser bundle wrote the
 * literal. Measured in this repository on 5 November: the spelling written out
 * by hand in four files, the constant imported from the heavy door in two more,
 * one of which is a client component that reaches it for a single string.
 *
 * Nothing here loads a package, which `addressed.weight.test.ts` holds it to by
 * walking what it imports rather than by trusting this paragraph.
 *
 * **Reading, not writing.** `editableAttributes` builds the attributes and
 * stays on the render seam, where the tree types it needs already are. A host
 * does not write these names; the renderer does.
 */

/**
 * By node type rather than `instanceof Element`, which is false for an element
 * from another realm — an iframe's document has an `Element` of its own, and a
 * page inspecting a frame it rendered is a host this door is for. A node type
 * is a number the DOM agrees on across realms, so the test does not have to
 * know which one it is in.
 */
const isElement = (node: ParentNode): node is Element => node.nodeType === 1

/**
 * The root of an addressed page within `scope`, or `undefined` if there is none.
 *
 * The root is the one element carrying the tree it belongs to, so this is the
 * element a reader-signal broadcast asks for. A host passes `document` on a
 * page it serves whole, or the container it rendered a tree into when the page
 * holds other things as well.
 *
 * **The scope counts as its own answer.** `querySelector` searches descendants
 * only, so a host holding the root element and asking this for the root would
 * be told there is none — the one answer that is never useful. Including the
 * scope makes the function idempotent instead: feeding it its own result
 * returns that result.
 *
 * **The first in document order when a scope holds more than one tree**, which
 * is `querySelector`'s own rule rather than a new one. A host rendering two
 * trees knows where it put them and should ask within each; a host that does
 * not know would not be helped by a different choice here.
 *
 * `undefined` rather than `null` because *there is no addressed page here* is
 * the absence of an answer rather than an answer, and because a caller reaching
 * through an optional ref otherwise has two empty values to test for on the way
 * out where one will do.
 *
 * The saving is on the way **out** and not on the way in: `scope` is
 * `ParentNode`, so a caller guards its ref and then asks —
 * `container === null ? undefined : addressedRootIn(container)`, which is what
 * `reader-signals-live.tsx` writes. An earlier version of this note showed
 * `addressedRootIn(frame.current)`, which does not typecheck. The narrow
 * parameter is the honest type for a function whose contract is *somewhere to
 * look*.
 */
export const addressedRootIn = (scope: ParentNode): Element | undefined => {
  if (isElement(scope) && scope.hasAttribute(LOOM_TREE_ATTRIBUTE)) return scope

  return scope.querySelector(`[${LOOM_TREE_ATTRIBUTE}]`) ?? undefined
}

export {
  LOOM_AUDIENCE_ATTRIBUTE,
  LOOM_NODE_ATTRIBUTE,
  LOOM_REVISION_ATTRIBUTE,
  LOOM_TREE_ATTRIBUTE,
  LOOM_TYPE_ATTRIBUTE,
} from "./editable.js"
