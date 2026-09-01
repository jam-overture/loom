# 0096. A behaviour publishes a value on the element the primitive placed it in

**Status:** Accepted
**Date:** 2026-09-01
**Section:** §4b

## Context

[0086](0086-a-behaviour-is-a-control-the-runtime-builds-and-a-primitive-places.md)
settled that an interaction a primitive's JSON props cannot express is a control
the runtime builds and the primitive places. Two members followed, and between
them they set a pattern nobody stated: each control reaches the layout it affects
by the *smallest* means that reaches it.

`copy` reaches nothing. What it acts on — the node's own text — is in the tree,
so the control is handed a string and the page never has to be consulted.

`disclose` reaches sideways. What it acts on is a region of the render, which is
not in the tree and is the primitive's to lay out, so
[0092](0092-a-disclosure-control-owns-its-button-and-the-primitive-owns-the-region.md)
had the control stamp `data-loom-disclosed` on its own button and left the
meaning to the primitive's stylesheet: an ordinary sibling or `:has()` selector,
in whatever media query the primitive wants. The control owns one element and no
more, does not wrap the region, and is not told where it is.

`loom.before-after` asks for a third thing, and it was filed as a finding rather
than built because the lane that wanted it could see that it did not fit. Its
divider is placed where `position` says and left there; dragging it is a pointer
handler, which is a function, which props are not. That much is 0086. What is new
is what the handler produces: **a number**, which the primitive uses in a
`clip-path` — and neither existing shape can carry one.

It cannot come from the tree, because nobody typed it; the reader chose it after
the page rendered. And it cannot be an attribute. There is no portable way to
read an attribute's value into a length: `attr()` outside `content` is not
something a library may rely on today, and the quantised alternative — one CSS
rule per step — is a hundred rules to say what one `calc()` says.

Both pure-CSS routes were tried in the primitives lane first and are worse than
the gap. `resize: horizontal` gives a real drag whose grab area is a
sixteen-pixel corner nobody finds and whose grabber is a browser artefact no
palette can reach. An `<input type="range">` cannot drive a clip *in CSS alone*,
because CSS has no way to read an input's value — which is true, and is exactly
what a behaviour is for: the value is read in a component, and written where a
stylesheet can reach it.

That leaves a custom property, and a custom property brings the problem this
record exists to settle. `var()` resolves by **inheritance**, which runs
downwards. `data-loom-disclosed` is read *sideways*. So the trick that let a
disclosure own exactly one element does not transfer: a property this control set
on its own element would be readable by nothing at all — least of all the sibling
region it exists to drive — and nothing about the page would look wrong until
somebody dragged it.

## Decision

**An `adjust` control writes one namespaced custom property, `--loom-adjust`, to
its parent element — the element the primitive placed it in — and the primitive
reads it from anywhere in that subtree.**

The value is a plain number between 0 and 100 with no unit, so one value serves a
clip, a width and a background position alike and the stylesheet supplies the
unit it needs:

```css
.after { clip-path: inset(0 calc(100% - var(--loom-adjust, 50) * 1%) 0 0) }
```

Three things hold it to the narrowest reading:

**The parent is chosen, not discovered.** The control does not search for the
region, does not take a ref to it, and is not told where it is. It writes to the
one element it is already inside, which the primitive picked by deciding where to
place the control. The contract a primitive follows is a single sentence: *place
the control inside the element whose subtree should read the value.*

**The fallback is the still version, and it is not decoration.** The property is
absent until the control has mounted and proved scripting runs, and absent again
the moment it unmounts. So the second argument to `var()` is what a page served
with scripting off renders, and it is the position the primitive's own props
declared. The still comparison remains the thing that ships — which is what most
pages using this actually are — rather than a blank waiting on a control that may
never arrive.

**The range is the runtime's and the resting point is the control's.** `build`
receives a node's text and its content, not its props, so there is nothing here
that could read a declared position, and nothing that needs to: the primitive
supplies its position as the fallback, which covers the case that matters. Once a
reader has a slider in front of them, where it started is theirs to change.

The control is an `<input type="range">`. Dragging, the arrow keys, Home and End,
the announced role and the announced value are a browser's to get right, and a
`role="slider"` div reimplements every one of them worse.

## Consequences

**The runtime now writes to an element it did not create.** This is the first
time, it is the cost of the decision rather than a detail of it, and it is why
this is a record. Three things bound it: exactly one property, namespaced with
the prefix every other variable this package emits already carries; written only
on the element the control is placed in; and removed on unmount, so a stale value
cannot outlive the control that set it and suppress the primitive's own fallback
forever.

**A primitive taking `adjust` must declare `interactive`.** It renders a target,
so the registry's existing check applies unchanged — otherwise the Gate would
allow a slider inside an anchor, where a browser silently drops one of the two.

**`--loom-adjust` is now a reserved name in the variable space** that
`theme/apply.ts` emits into. A host or a primitive setting it means something
else on an element with an adjust control inside it will find it overwritten.
That is the ordinary cost of a shared namespace and the reason the name is
generic rather than tied to one primitive: a second use — a zoom, a split panel,
a before-and-after on something that is not an image — should reach for this and
not add a fourth member.

**A primitive placing two adjust controls in one element gets one value.** The
second overwrites the first, silently. Nothing checks it, because nothing can:
the seam hands a primitive a node per declared *name*, so two would have to be
the same behaviour placed twice, which a primitive would have to go out of its
way to do. Recorded rather than guarded.

**The vocabulary has a second axis now**, and `behaviour.ts` says so: what a
control *reads* (the tree, or nothing) and what it *hands back* (nothing, a
boolean, a number). The next member should be placed on both.

`loom.before-after` is unblocked and the finding that asked for this is closed.
Wiring it is the primitives lane's, and it is three lines: declare the behaviour
and the `adjust` text key, place `loom.behaviours.adjust`, and read
`var(--loom-adjust, …)` in the clip it already writes.

## Alternatives considered

**A wrapper component the primitive puts around the region.** The obvious fix for
inheritance: if the control wraps what reads the value, the property goes on its
own element and the runtime touches nothing it did not create. Rejected because it
undoes 0086's shape for every behaviour, not just this one. `PrimitiveBehaviours`
hands over a `ReactNode` precisely so that placing it is the whole of a
primitive's part — "a component here would be a component with no props anybody
could get right or wrong". A wrapper is a component with children, which is a
prop, and one a primitive can get wrong in ways nothing checks. It would also
force a box into the primitive's layout that it did not ask for, which is the
objection 0092 raised when it declined to wrap a disclosed region.

**Writing the property to `document.documentElement`.** Reaches everything, needs
no parent, and is what a page with one comparison on it would never notice.
Rejected because a page with two is the ordinary case — a docs page comparing
three renderings — and they would drive each other. A global for something
inherently local is a bug that only appears at the second use.

**An attribute in quantised steps**, `data-loom-adjust="35"` in fives, with the
primitive writing a rule per step. Keeps the disclosure's shape exactly and needs
nothing new. Rejected because twenty rules per primitive is a stylesheet nobody
will write correctly twice, the motion is visibly stepped at any usable rule
count, and it makes every future primitive that wants a number pay the same tax.

**A callback the primitive passes down.** How React would normally do it, and it
is what the finding half-expected when it said this would be the first behaviour
to hand something back. Rejected because it makes the primitive a client
component: a function prop crosses the boundary, so the primitive is no longer a
pure projection, and the closed set 0086 protects — the things a Loom page may
*do* — stops being checkable, because any primitive holding a callback can do
anything with it.

**Leaving the divider still and closing the finding as declined.** Genuinely
defensible: the still version ships, most pages using this are that, and a
handle nobody can drag is the defect `loom.code` refused when it declined to fake
a copy button. Rejected because the seam did not need widening to allow it — one
member, one property, and the still version stays exactly as it is when the
control does not mount.
