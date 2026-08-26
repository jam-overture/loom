# 0093. A decorative copy is the same children without identity

**Status:** Accepted
**Date:** 2026-08-25
**Section:** §4b

## Context

Some arrangements have to say the same content twice. A seamless loop is the one
that forced the question: a track translating by exactly one run's width needs a
second copy of the run waiting after the seam, or the band pauses empty once a
cycle. A mirrored region and a fading echo want the same thing for the same
reason — the second copy is not content, it is the shape of the first one.

Children reach a primitive already rendered. In edit mode they carry
`data-loom-node`, so a primitive that places the same `children` twice puts one
node id on two elements. That is the failure
[0051](0051-a-slot-is-a-region-the-primitive-places.md) rejected when it
considered leaving slot content in `children` as well: a portal resolves an id
to whichever copy the DOM hands it first, and highlights a node that is not the
one the reviewer clicked. With a marquee it is worse than arbitrary — which copy
is under the cursor is a function of an animation's phase.

`loom.logo-cloud` met this on 19 August and declined to scroll at all.
`loom.marquee` met it on 25 August and
[0091](0091-motion-stops-in-edit-mode-and-that-is-where-a-decorative-duplicate-belongs.md)
answered it: the band holds still while the page is being edited, because you
cannot click a logo that is sliding past. That argument is about motion and it
stands on its own. What it cannot do is help the next primitive that wants an
echo which is not moving — a mirrored panel, a repeated rule, a masthead that
reads twice — and `Loom primitives` filed exactly that on 25 August: the render
seam has no way to make a copy, so every primitive that wants one rediscovers
0091 and works around it separately.

## Decision

**The render seam offers the copy. `loom.decorative()` renders this node's
children a second time with identity switched off** — the same nodes, in the
same order, with the same props, and not one `data-loom-node` among them.

It is on every render context, always present, and rendered only when called, so
a primitive that will never want a copy pays one closure for it. Calling it
twice within one render returns the same elements.

The rule it makes true is 0091's own property, promoted from something a
primitive arranged by avoiding the situation into something the seam guarantees:

> **A decorative duplicate exists only where identity attributes do not.**

Three limits, so this is not read as wider than it is.

**It does not mark the copy, and it does not make it inert.** The renderer wraps
nothing — `editable.ts` gives the reason, and it holds here — so there is no
element for a marker to sit on that the primitive did not create itself.
Announcing the copy as decoration, with `aria-hidden` and `inert` on whatever
wrapped it, stays the primitive's job. What the seam supplies is the half a
primitive could not do for itself: nothing in the copy resolves.

**It does not reach slot regions.** A named region may hold content the host
projected into the render, which is not this tree's and cannot be rendered
again. So the guarantee is stated about the tree: no node *of this tree* carries
its identity twice. A primitive wanting a decorative copy of a region is a new
question, and it should be asked by a primitive that actually wants one.

**Nothing inside the copy is editable.** `loom.editable` is the statement *this
element can be edited*, and nothing in a decorative copy can be — it is not a
node, and there is no id to author an intent against. So descendants inside the
copy do not receive it, and a descendant that branches on it takes its unedited
branch there while the original beside it holds. That is a consequence rather
than a preference, and it is written down because a nested marquee is the first
place anyone would notice it.

**This does not reopen 0091.** `loom.marquee` still holds still while the page is
being edited. The identity collision was never that decision's motive — 0091 says
so explicitly, and says why the ordering matters: a rule justified only by an
implementation problem gets argued away the moment the implementation changes.
The implementation has now changed, and the rule is unaffected. What is different
is that a primitive wanting an echo for some reason other than motion no longer
has to make 0091's argument to get one.

## Consequences

- `LoomRenderContext` gains a required member. It is built in exactly one place,
  so nothing outside `render.ts` had to change; a primitive that ignores it is
  unaffected.
- A decorative render walks nodes the primary render has already walked, so its
  diagnostics are dropped rather than reported twice. `renderLoomTree`'s output
  stays a function of the tree rather than of which primitives happened to ask
  for a copy — which also means the copy cannot report anything new, and there
  is nothing it could report that the caller has not already been told.
- The cost of the copy is a second walk of one subtree, paid by the primitives
  that ask. Nothing is rendered for the ones that do not.
- `loom.marquee` and `loom.logo-cloud` are unchanged by this and could now be
  revisited by their own lane, under 0091 rather than around it.

## Alternatives considered

**A wrapper element the renderer knows about.** Rejected for the reason
`editable.ts` gives for the same choice: a wrapper changes what `>`,
`:first-child` and `:nth-child` select, and a marquee run is exactly a layout
that depends on those. A seam that breaks the arrangement it exists to enable is
not a seam.

**Strip the attributes from the already-rendered children.** A deep
`cloneElement` walk over an opaque `ReactNode`, guessing which props are
identity. It reaches into other primitives' output, cannot see through a
component boundary, and would silently do nothing for the case it most needs to
handle. Rendering again from the tree is exact.

**Render the copy eagerly, beside `children`.** Every element would render its
children twice, and each of those copies would render its own children twice —
exponential in depth, paid by every page for a feature almost no primitive uses.
A thunk costs one closure.

**Leave it to primitives, as 0091 does.** This is what the finding is a report
of. It works exactly once: the second primitive to want an echo either repeats
0091's reasoning or gets the duplicate ids wrong, and neither is visible in a
snapshot.

**Mark the copy with a `data-loom-decorative` attribute.** There is no element
to put it on without wrapping, and the honest marking is the absence of
identity: a portal selecting `[data-loom-node]` never sees a copy, which is the
question a portal actually asks.
