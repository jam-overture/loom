# 0110. An entrance the reader drives is a wrapper primitive, not a prop on every band

**Status:** Accepted
**Date:** 2026-09-06
**Section:** §4b

## Context

[0055](0055-motion-is-a-static-stylesheet-the-primitive-emits.md) settled *where*
motion lives — a static stylesheet the primitive emits, with the tree naming a
variant and never a duration — and the library has had entrance motion since:
`.loom-rise` fades and lifts an element into place.

It fires **on load**. Every band on the page animates at once, which means the
four below the fold have finished arriving before anybody scrolled to them. A
reader meets one animated band and then four static ones, and the page they
actually read is the static one. Every product page that reads as a product does
the other thing: a band arrives as you reach it.

CSS can now do this without script — `animation-timeline: view()` drives an
animation from an element's own progress through the scrollport — so the
question is not whether Loom can have it. It is **what holds it**, and there
were three candidates.

## Decision

**A band that arrives on scroll is wrapped in a primitive whose whole job is the
entrance. `loom.reveal` takes a variant and children, renders one element, and
draws nothing of its own.**

Three things are part of the decision rather than consequences of it:

- **It says one word, not a number.** `motion: "rise" | "fade"`, and no
  duration, delay, easing or distance. That is 0055 unchanged: "the cards now
  arrive over four seconds" is not the small reversible edit a Gate is built to
  weigh, and a millisecond in a proposal is a value nobody reviews.
- **Every rule that starts at `opacity: 0` sits inside
  `@supports (animation-timeline: view())`.** A browser that cannot run the
  animation never receives the starting state, so the failure mode of a
  scroll-driven entrance is a page with no entrance rather than a page with no
  content. The same property covers a band already on screen at load — its
  timeline is past the range and `animation-fill-mode: both` holds it at the end
  state — and a page too short to scroll at all.
- **It holds still and visible in edit mode**, which is
  [0091](0091-motion-stops-in-edit-mode-and-that-is-where-a-decorative-duplicate-belongs.md)
  plus one reason that record did not have: a portal preview is not a page
  anybody scrolls, so a band waiting for a scroll is a band that is never there.

## Consequences

- **The library gains its first primitive that renders no content.** Every other
  registered type draws something or arranges something; this one exists to put
  a behaviour around whatever is inside it. That is a category, and the next
  member of it — a primitive that pins, or parallaxes, or holds — should be
  argued against this record rather than invented beside it.
- **A node in the tree that draws nothing** is the cost, along with one more
  element between a band and its parent. A `display: contents` root would remove
  the second and cannot be animated, and would take the node's own box away from
  the portal, which is worse than the element it saves.
- **The cascade inside a band is not reachable this way**, and saying so is part
  of accepting this. Six tiles arriving one after another needs the *arranger* to
  stagger its own children; a reveal's children are whatever it wraps, which is
  usually one grid. What works today is a reveal per cell — each cell then
  arrives on its own timeline, so a grid comes in by row. Filed for the run that
  wants the diagonal.
- **A page can now say the same thing two ways** — `.loom-rise` on load,
  `loom.reveal` on scroll — and the library does not stop anyone using both on
  one band. That is a real cost of a wrapper over a prop, since a prop could have
  been made exclusive, and it is accepted: the alternative was a prop on seventy
  schemas.

## Alternatives considered

- **A `reveal` prop on every band that could want one.** The obvious answer, and
  it costs a prop on seventy schemas to say one thing — the grammar budget
  [0014](0014-the-reply-schema-must-fit-a-grammar-budget.md) keeps naming. It is
  also permanently incomplete: the band nobody thought to give it to cannot have
  it, and no primitive a *host* registers can have it at all. A wrapper works on
  types this library has never heard of.
- **A prop on `loom.page`, revealing every band.** One prop, and it takes the
  choice away: the hero must not fade in from below when it is the first thing on
  the screen, and a page where every band arrives identically reads as a
  template. The decision of which bands arrive is exactly the sort of thing the
  tree should hold as structure.
- **A behaviour the runtime builds and the primitive places**
  ([0086](0086-a-behaviour-is-a-control-the-runtime-builds-and-a-primitive-places.md)).
  Right for a disclosure, wrong here: a behaviour is a *control* — something with
  state a reader operates. An entrance has no state, needs no script, and is one
  stylesheet rule. Reaching for the client seam for something CSS does alone
  would put a script on the page for a fade.
- **Nothing — keep `.loom-rise` and accept a static page.** Defensible until you
  measure it: the entrance the library already ships is invisible to a reader for
  every band below the first screen, which is most of the page.
