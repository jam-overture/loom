# 0103. A control carries a class, and its display is a custom property

**Status:** Accepted
**Date:** 2026-09-01
**Section:** §4b

## Context

[0086](0086-a-behaviour-is-a-control-the-runtime-builds-and-a-primitive-places.md)
handed a primitive a `ReactNode` rather than a component, and rejected a
component on the ground that there were no props anybody could get right or
wrong. Placing it is the whole of the primitive's part.

`Loom primitives` placed the second control on `loom.nav` and found the half of
that bargain nobody had priced. A control arrives already built, which means it
also arrives **unnameable**. There is no class on it, so a primitive styling the
element it was handed either writes an element selector that guesses what a
control renders — `button`, which stopped being true the moment `adjust` rendered
an `input` — or wraps the control in a box of its own that exists only so there
is something to select.

The wrap is what shipped, and it is not free: an element on every page, plus an
`:empty` rule, because the box is empty until the control's effect proves
scripting runs and an empty flex item still consumes a gap.

**A class alone would not have fixed it.** Every control sets its own
presentation as an inline `style`, and each control file says why: the render
seam may not depend on `src/primitives/`, so the values are `var()` with
fallbacks rather than the token helpers, and a control that only looks right
under a mounted theme renders invisible in a preview pane that mounts none. An
inline declaration beats every selector a stylesheet can write short of
`!important`. So `.loom-control-disclose { display: none }` silently does
nothing — and the primitive that most needs it is exactly the one that hit this,
whose menu button belongs on a phone and not on a laptop.

That is a rule about the **button**, and
[0092](0092-a-disclosure-control-owns-its-button-and-the-primitive-owns-the-region.md)
gave the primitive only a rule about the **region**.

## Decision

**Every control carries a class, and the one property a primitive has to be able
to take back is read through a custom property rather than written flat.**

- Each control renders `class="loom-control loom-control-<behaviour>"`. The
  shared class reaches every control at once; the specific one reaches a single
  behaviour. A plain class rather than a data attribute, because it is written
  for a stylesheet and a stylesheet author writes `.loom-control-copy`.
- Each control writes `display` as
  `var(--loom-<behaviour>-display, var(--loom-control-display, <resting>))`. The
  specific name wins over the group name; the group name wins over the value the
  control set for itself; a deployment that sets neither gets what it had before
  this record.
- `adjust` sets `display` too, though its style did not carry one, so that the
  property hides three controls of three rather than two.
- The names live in `src/render/control.ts` and are exported. A separate module
  from `behaviour.ts` because the controls import them and `behaviour.ts` imports
  the controls, which is a cycle.

**Only `display`.** Not a general escape hatch over the inline style, and not a
`className` prop the primitive passes in. What a control looks like is the
runtime's, and 0086's reason for handing over a node with nothing to configure is
untouched: a primitive still places what it is given.

## Consequences

`loom.nav` can drop its wrapper and its `:empty` rule and hide the button
directly, which is the finding this closes. Every future primitive that places a
control — a code panel wanting its copy button only on hover, or only above a
width — gets the same handle without inventing a box.

**Hiding a control does not clear what it publishes**, and this is the sharp edge
the record exists to write down. A disclosure whose button is displayed `none`
still carries `data-loom-disclosed`, so the sibling rule keyed on it still
matches and the region stays hidden. A primitive that hides the control at a
width has to stop hiding the region at that width too, in the same query. The
runtime cannot do this for it: it does not know which region is which, which is
the whole of 0092.

The class is now a published name. Renaming it breaks a stylesheet rather than a
build, so it is asserted on the rendered element in every control's suite as the
literal string a CSS author types — the same treatment `data-loom-disclosed` has.

A primitive that sets `--loom-control-display` on a subtree holding two controls
hides both. That is what the per-behaviour name is for, and a primitive with two
controls should reach for it rather than the group.

## Alternatives considered

**A `className` prop the primitive passes to the control.** The shape the finding
recommended, and the one this is a variant of. Rejected as stated because the
primitive receives a node, not a component: a prop it could pass would mean
handing over something to configure, which is exactly what 0086 declined. The
runtime stamping a *known* class gives the same handle with none of that — and
on its own it would still have lost to the inline style, which is the half the
recommendation did not cover.

**Move the controls' styles into a stylesheet.** The cleanest answer and the
wrong shape, for the reason the finding gave: the library stylesheet lives in
`src/primitives/`, which the render seam must not depend on. A stylesheet the
runtime shipped for itself is a second way for a page to get CSS and a second
thing that can fail to load; it is a larger decision than this one and nothing
yet needs it.

**Write it down and keep wrapping.** Honest, costs nothing, fixes nothing. It
leaves an element and a rule on every page that places a control, and leaves the
next lane to discover the same thing.

**`!important` on the primitive's rule.** Works today, and teaches every
primitive author that beating the runtime is normal. The first property that
needed it would not be the last.
