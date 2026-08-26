import type { ReactNode } from "react"

/**
 * The same children again, as a copy nothing can resolve to a node.
 *
 * Some arrangements need content said twice — a seamless loop, a mirrored
 * region, a fading echo — and the second copy is not content, it is the shape
 * of the first one. This is how a primitive asks for one without putting a
 * node's identity on two elements.
 */

/**
 * The copy, rendered on demand.
 *
 * A seamless loop is the arrangement that forced this: a track translating by
 * exactly one run's width has to have a second copy of the run waiting after
 * the seam, or the band pauses empty once a cycle.
 *
 * Children arrive at a primitive already rendered, carrying whatever the render
 * seam put on them. In edit mode that includes `data-loom-node`, so placing the
 * same `children` twice puts one node id on two elements — the failure
 * [0051](../../decisions/0051-a-slot-is-a-region-the-primitive-places.md)
 * rejected, where a portal resolves an id to a copy and highlights a node that
 * is not the one the reviewer clicked. `loom.marquee` met it on 25 August and
 * [0091](../../decisions/0091-motion-stops-in-edit-mode-and-that-is-where-a-decorative-duplicate-belongs.md)
 * answered it by not duplicating in edit mode at all, which is right about
 * motion and says nothing about the next primitive that wants an echo standing
 * still.
 *
 * So the renderer offers the copy instead of leaving each primitive to
 * rediscover the hazard. `loom.decorative()` renders this node's children a
 * second time with identity switched off: the same nodes, in the same order,
 * with the same props, and not one `data-loom-node` among them.
 *
 * Three things it deliberately does not do.
 *
 * **It does not mark the copy.** The renderer wraps nothing — `editable.ts`
 * gives the reason, and it holds here — so there is no element for a marker to
 * sit on that the primitive did not create itself. What makes the copy honest
 * is the *absence* of identity, which is the property 0091 already named: a
 * decorative duplicate exists only where identity attributes do not. Announcing
 * it to a reader is still the primitive's job, with `aria-hidden` and `inert`
 * on whatever it wrapped the copy in.
 *
 * **It does not make the copy inert.** A copy placed without them is duplicated
 * content a screen reader reads twice and a keyboard tabs through twice. The
 * seam cannot prevent that, because the element it would set them on belongs to
 * the primitive; what it can do is guarantee that nothing in the copy resolves,
 * which is the half a primitive could not do for itself.
 *
 * **It does not reach slot regions.** A named region may hold content the host
 * projected into the render, which is not this tree's and cannot be rendered
 * again — so the guarantee here is about the tree: no node *of this tree*
 * carries its identity twice.
 *
 * One consequence worth stating rather than discovering. `loom.editable` is the
 * statement *this element can be edited*, and nothing in a decorative copy can
 * be: it is not a node, and there is no id to author an intent against. So
 * descendants inside the copy do not receive it, and a descendant that branches
 * on it — the one branch 0091 licenses, holding still — takes its unedited
 * branch there while the original beside it holds.
 */
export type DecorativeChildren = () => ReactNode
