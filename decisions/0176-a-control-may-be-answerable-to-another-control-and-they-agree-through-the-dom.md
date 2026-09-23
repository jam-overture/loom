# 0176 — A control may be answerable to another control, and the two agree through the DOM rather than through the seam

**Status:** Accepted
**Date:** 2026-09-20
**Section:** §4h — the behaviour seam

## Context

The behaviour vocabulary has had three members since 25 August: `copy`,
`disclose`, `adjust`. `Loom primitives` has reported in five consecutive runs
that **Tier B is nine primitives behind one framework decision about it** —
tabs, tooltip, dialog, dropdown, toast, lightbox, a pricing toggle — and the
14 September finding *a container cannot tell its child which element to be*
named the general shape and called it "squarely the framework's".

Nine primitives is not one gap. Sorting them by what they actually need gives
three:

| what it needs | who wants it |
| --- | --- |
| a region that opens and can be closed by something other than the opener | dialog, dropdown, lightbox, tooltip |
| one of *n* children chosen, where the labels are in the children | tabs, segmented control, pricing toggle, radio group |
| a region that appears on an event nobody pressed | toast |

**This record settles the first.** The second is the container-shape question
and is not settled here; see *Alternatives considered* and the finding filed
alongside this change.

### Why `disclose` does not already do it

A dialog built on `disclose` today is a box a reader can open and cannot close.
Three things are missing, and the third is the one that is structural:

1. **The state is on the control's own button**, read sideways by
   `[data-loom-disclosed="false"] ~ .region`. An overlay's region is not its
   trigger's sibling — a dialog's panel, a dropdown's menu and a lightbox's
   frame are laid out *inside* the box the primitive owns, with the trigger as
   one element within it. The primitive can only make the sibling form work by
   wrapping the trigger in an element whose sole purpose is to be selected from,
   which is the cost `control.ts` already records against that shape.
2. **Nothing dismisses it.** Escape does not close it, and neither does a press
   on the page behind it. For an overlay that covers what a reader was looking
   at, that is not a refinement; it is the thing the primitive is judged on.
3. **Nothing but the trigger can close it, and an overlay needs a cross.** This
   is the structural half. A cross is a second control, a click handler is a
   function, and a primitive's props are JSON — so it is the runtime's to build
   for exactly the reason the first one is (0009). **Two controls of one
   primitive then have to agree about one boolean, and nothing in the seam let
   them.**

Nothing in the seam let them because of what a behaviour *is*. `build` runs on
the server and returns an independent node the primitive places where it likes:
the two have no common React ancestor to hold state, no provider between them,
and nothing shareable to be handed — a control's props cross the client
boundary, so anything passed between them has to be serialisable. The three
existing members never noticed, because each is complete on its own.

## Decision

**1. Two new members, `present` and `dismiss`.** `present` opens a region and
closes it again on Escape, on a press outside, or on a dismiss control within
it. `dismiss` is the cross inside the region and does nothing else.

**2. `present` publishes its state on the element the primitive placed it in**,
as `data-loom-presented`, so a **descendant** selector reaches a region laid out
anywhere inside that box:

```css
[data-loom-presented="false"] .my-panel { display: none }
```

This is 0096's mechanism and the other half of its reasoning. `adjust` writes a
custom property on the parent because inheritance runs downwards and a sibling
could not read it. This writes an attribute there because a descendant selector
reaches what a sibling selector cannot. `disclose` is unchanged and stays on its
own button: a menu really is beside its button, and moving it would break every
rule already written against it for no gain.

**3. A behaviour may declare that it `requires` another, and the registry
refuses the pair when it is incomplete.** `dismiss` requires `present`. It is a
fourth registration-time check beside the three the seam already makes, and it
belongs there rather than in the audit for the audit's own reason: a cross with
no presentation above it is a *dead* control, not a wrong one, and the seam
already prefers refusing a control with no accessible name to rendering one.

**4. The two agree through the DOM — a bubbling `loom:dismiss` event.** The
dismiss control dispatches from its own button; the presentation control listens
on the element it was placed in. Nothing is keyed, nothing is registered, and
nothing has to be cleaned up.

**5. "Outside" means outside the element the trigger was placed in**, which is
the same element the state is published on. The one case this does not cover is
a region drawn over the whole viewport: its scrim is inside that element too, so
a press on it is an inside press and will not dismiss. A primitive doing that
places a `dismiss` control, which is what it is for.

**6. The runtime opens and closes a boolean and nothing more.** Focus trapping,
`inert` on the rest of the page and a scroll lock are facts about the region and
the page around it, which is the half the primitive owns. A primitive presenting
a *modal* region arranges them itself.

## Consequences

**A page served without scripting shows the region.** Neither control renders
until an effect has proved scripting runs, so the attribute is on nothing and
the hiding rule matches nothing. That fixes the direction a primitive must write
its rule in: hide on `"false"`, never reveal on `"true"`. Written the other way,
a page without scripting has a panel nothing can open and nothing to say why.
Asserted end to end.

**The vocabulary grows a third axis.** It already had what a control *reads*
(the tree, for `copy`; nothing, for the other two) and what it hands *back*
(nothing, a boolean, a number). It now has **whether a control is answerable to
another one**, which is `requires`, and four of the five members answer to
nobody.

**A primitive can place the pair wrongly and nothing will say so.** If the cross
is not inside the element the trigger was placed in, the event does not arrive
and the button does nothing. That is the same class of mistake as a disclosure
whose region is not its button's sibling, and it has the same non-diagnosis: the
seam cannot see a primitive's layout. Recorded rather than solved.

**Nothing places either control yet.** `src/primitives/` is `Loom primitives`'
and the four primitives this unblocks are its to build — the same split
0131 made when `--loom-accent-strong-chroma` shipped with no paint reading it. A
finding is filed.

**Five of nine Tier B primitives are still blocked**, on the two gaps this does
not close.

## Alternatives considered

**A module-level store keyed by node id, which would have needed `build` to
receive the id.** Rejected, and it is the one worth stating because it is the
obvious answer. It makes two controls that are *not* in each other's subtree
agree anyway, which reads as a feature and is really a guarantee that the first
primitive to place them apart ships a dialog closed by a button elsewhere on the
page. It also adds mutable module state to a seam that has none, a subscription
to leak, and a parameter to `build` that four of five members ignore.

**A close control that walks the DOM upwards for `[data-loom-presented]` and
sets it to `"false"` directly.** Cheaper and wrong: the trigger's React state
would still read `true`, so the next press on it would close an already-closed
region and the reader would have to press twice.

**One member rather than two, with the trigger rendering its own cross.** The
cross has to be inside the region and the trigger has to be outside it, so one
node cannot be both. A behaviour returning two placeable nodes was the other
form of this, and it changes what every existing member's value is for a case
only one of them has.

**A `select` member, settling the one-of-*n* half instead.** It is the other
four primitives and it was not taken, because it is not a vocabulary question.
The labels of a tab strip's tabs are content a model writes, so they are child
nodes (0052); a container receives its children as one rendered `ReactNode` and
cannot read a prop off one (0008); so a control that renders *n* labelled
buttons cannot learn what to put on them. That needs a shape a container may ask
of its children, which is a change to what a node is and is
**`ARCHITECTURAL — needs review`**. Filed, not built.

**Wiring dismissal into `disclose` instead of adding members.** It would give
every existing disclosure an Escape key and an outside-press it did not ask for.
A collapsed navigation menu that closes when a reader clicks the page is
arguably an improvement and is certainly a behaviour change to something shipped
and styled; it is not this change's to make.
