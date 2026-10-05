# 0226. A primitive declares where its control rests, and the control publishes nothing until the reader moves it

**Status:** Accepted
**Date:** 2026-10-04
**Section:** §4b

## Context

[0096](0096-a-behaviour-publishes-a-value-on-the-element-the-primitive-placed-it-in.md)
settled where an `adjust` control writes its number: one namespaced custom
property, `--loom-adjust`, on the element the primitive placed it in. It also
settled, in a paragraph it called *the fallback is the still version*, that the
property is **absent until the control has mounted** — so the second argument to
`var()` is what a page with no scripting renders, and it should be the position
the primitive's own props declared.

Both halves were written before anything placed the behaviour. A month later
`loom.before-after` placed it, and the primitives lane photographed the result:
a band authored as `position: 35` rendered at 35 in the server's markup and sat
at **50** the instant hydration landed. On every page a reader actually visits,
the prop did nothing.

The mechanism is three lines and neither record anticipated it. `ADJUST_RESTING`
is 50, fixed. The control writes `--loom-adjust: 50` on its parent **in its
mount effect**. And the fallback a primitive supplies can only be read when the
property is absent — so a control that publishes its own resting value on mount
overwrites the very thing 0096 built it to defend. 0096's own reasoning says why
nothing caught it:

> **The range is the runtime's and the resting point is the control's.** `build`
> receives a node's text and its content, not its props, so there is nothing here
> that could read a declared position, and nothing that needs to: the primitive
> supplies its position as the fallback, which covers the case that matters. Once
> a reader has a slider in front of them, where it started is theirs to change.

The first sentence is true. The last one is the error, and it is a specific kind:
it treats *where a control starts* as a thing the reader has already been given,
when the reader has been given a page. **Appearing is not an instruction.** A
control that has just mounted has learned nothing about what anybody wants, and
the one number it published was the one number nobody wrote down.

The existing suite asserted the defect in two places — `behaviour-adjust.test.ts`
on `String(ADJUST_RESTING)`, and `presentation.test.ts` on `"50"` for a band
declaring 42 — because both were written against the same paragraph.

## Decision

**Two sentences, and the second is what closes the defect.**

**A primitive declares where its control rests, as a custom property on the
element it places the control in**: `--loom-adjust-resting`, exported as
`ADJUST_RESTING_PROPERTY`. The control reads the computed value once, at mount,
clamped into the runtime's range and rounded to something a step-1 input can
hold. A primitive that declares nothing gets `ADJUST_RESTING`, unchanged.

**An `adjust` control publishes `--loom-adjust` only once the reader has moved
it**, and removes it on unmount as before. Until then the primitive's `var()`
fallback is what the page reads — with scripting off, and with scripting on and
nobody having touched it.

Four things hold this to the narrowest reading:

**The number does not come through the seam, and that is the point.** `build`
still receives a node's text and its content and not its props. Handing it props
was the obvious fix and it is the one thing this must not do: props are
AI-authored, so a control reading them is a control a model configures, which is
0086's whole shape. The number arrives **through the DOM** instead — the route
[0176](0176-a-control-may-be-answerable-to-another-control-and-they-agree-through-the-dom.md)
already established for `present` and `dismiss`, off the one element the
primitive chose by deciding where to place the control.

**Nothing new is exposed.** A primitive taking `adjust` already renders its
declared position into the page, as the `var()` fallback the still version is
built on. This is the same number written where the control can read it. The
control does not start somewhere a reader could not already see; it starts where
the page already is.

**The narrower publishing contract takes nothing from a primitive that followed
the old one.** 0096 required a fallback and called it *not optional and not
decoration*. A primitive that wrote one is correct under both readings. A
primitive that did not was already broken on an unscripted page.

**Read once.** Where the slider goes after mounting is the reader's. A primitive
that re-declared its resting position mid-life would otherwise drag the control
out from under somebody's hand.

## Consequences

**A declared position is visible on a scripted page for the first time.**
`loom.before-after`'s `position` prop was reachable only by serving the page with
scripting off. It now survives hydration, which is what the schema said it did.

**Two numbers a primitive must keep equal.** The `var()` fallback and
`ADJUST_RESTING_PROPERTY` are both the declared position, written twice, and a
primitive that lets them disagree has a page that moves when a reader first
touches the control. Written from one local in `loom.before-after` so they cannot
drift; not checkable from here, because the fallback is inside a string a
stylesheet consumes and the runtime never parses it.

**`--loom-adjust-resting` is now a reserved name** in the variable space
`theme/apply.ts` emits into, on the same terms as `--loom-adjust`. It is also a
*prefix* of nothing and shares a prefix with `--loom-adjust-display`, which is
the trap `presentation.test.ts` already documents: a search for
`var(--loom-adjust` matches three properties, not one.

**It inherits, like any custom property.** A primitive may declare it on an
ancestor of the element the control sits in and it will still be read. That is
the same reach `--loom-adjust` has in the other direction, and it means a
primitive placing two adjust controls under one declaration starts both at the
same place — which is the sensible reading of a single declaration and needs no
guard.

**An unreadable declaration falls back rather than refusing.** A stylesheet
saying `--loom-adjust-resting: thirty` gets `ADJUST_RESTING` and a working
comparison. A control that refused to render would be a missing comparison, and
the still version is right there in the fallback.

**One cost in the control's shape.** Reading the parent needs the input mounted,
which needs the capability check to have passed, so the read cannot share an
effect with the check. The input is now a separate component — `AdjustSlider` —
which also means the `useLayoutEffect` that adopts the position before the first
paint lives in a component that never renders on the server, and so has no
warning to emit there.

**The two tests that asserted the midpoint now assert the position.** Neither was
weakened: `presentation.test.ts` still proves the property lands on the root the
clip inherits from, now after a drag, and gained the end-to-end assertion that 42
travels from a node's props to the slider's own value.

## Alternatives considered

**Let a primitive declare a resting value per *type*, through the behaviour
declaration.** The finding's own first suggestion and the cheapest thing that
looks like a fix. Rejected because it does not fix the defect, it shrinks it:
`loom.before-after`'s default would be declarable and its `position` **prop**
would still be overridden back on every page. The defect is that a tree's
declared position is discarded, and a per-type number is not a tree's.

**Hand `build` the node's props.** The direct route, and `ARCHITECTURAL` for the
reason 0086 exists: a behaviour is deliberately the one thing on a Loom page that
nothing in the tree configures, so that a human approving a registered component
has approved what it does. Props are weighed by the Gate as small reversible
changes. "This control now starts somewhere else" is within that; "a control
reads model-authored configuration" is a different seam, and it would be opened
for every behaviour to fix one.

**Publish on mount, but publish the declared position.** Keeps 0096's sentence
about mounting and still gets the number right, and it was close. Rejected
because it makes the property mean two different things — *where the primitive
said to start* and *where the reader put it* — with nothing able to tell them
apart. The fallback then becomes unreachable on any scripted page, so a primitive
could stop writing one and nobody would notice until a page was served without
scripting. Publishing nothing keeps the fallback load-bearing in both worlds, and
a property that exists only when a reader has acted is a property whose presence
means something.

**Read the position from the fallback already on the page.** The tidiest shape
available, needing nothing of the primitive: the number is in the `var()` call
the clip reads. Rejected because it is not readable. A `var()` fallback is an
argument inside a declaration on a *different* element, consumed by whatever
property reads it; there is no API that hands it back, and reaching it would mean
the runtime parsing the primitive's own stylesheet to find a string it has no
business knowing the shape of.

**A `defaultValue` on the input, left uncontrolled.** Would remove the adoption
effect entirely. Rejected because the number still has to be known at render
time, and the control has no parent to read it from until it has rendered — the
same ordering, with the reader's position no longer in state where the publishing
effect can see it.
