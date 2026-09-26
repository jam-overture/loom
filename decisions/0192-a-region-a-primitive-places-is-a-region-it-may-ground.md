# 0192. A region a primitive places is a region it may ground

**Status:** Accepted
**Date:** 2026-09-26
**Section:** §4b

## Context

[0051](0051-a-slot-is-a-region-the-primitive-places.md) settled what a slot *is*:
a region the primitive places, handed to it by name, at a position no
reordering of `children` can reach. It says nothing about whether the primitive
may **draw** anything there. In practice three primitives had already answered
yes, each on its own and without saying so:

- `loom.card` lays its `media` region outside the padding and clips it to the
  card's corners — *"the whole visual difference between a card with a picture
  in it and a card that looks like a product"*;
- `loom.frame` gives its `surface` region the surface ground, clips it to the
  chrome's inner radius, and lays the marks over it;
- `loom.hero` sizes and insets its `media` region against the text column.

Nobody had written down that this is a thing a primitive may do, so the fourth
case came up as an open question rather than as a settled one — and it came up
as a defect.

`loom.orbit` places its `mark` region dead centre, outside the turning layer,
and drew nothing there. The first photograph of that band inside an assembled
page (25 September, filed the same day) was **nine marks of identical weight**:
eight tool wordmarks on a dashed circle and the product's own name, the same
size and the same grey, in the middle of it. Every schema was satisfied. The
arrangement was correct. Nothing in the picture said which one of the nine the
other eight were going round, which is the only claim the primitive makes over
a `loom.logo-cloud` — its own doc comment says so: *"this says **these things
move around that thing**, which is a claim about a product rather than a list of
customers, and it is the only one of the three that has a centre."*

The band could not fix it. A tree can put anything in the `mark` region, and
the thing a band would reach for — a tinted tile, a heavier border — is not
something a `loom.logo` has a word for, so fixing it in the band would mean
either growing a prop per decoration on every primitive that might ever be a
centre, or leaving every future tree to rediscover that the middle needs
something under it.

## Decision

**A region a primitive places is a region it may ground: the primitive may
give it a surface, an inset, a clip, a radius or a tint, as part of placing it.
What it may not do is decide what is in it.**

The line is between the region and the content:

- **The primitive owns the region.** Where it sits, how big it is, what is
  under it, what clips it. These are facts about the *arrangement*, which is
  what the primitive is for, and they must hold for whatever the tree puts
  there — a `loom.logo`, a `loom.avatar`, an `loom.icon`, a heading.
- **The tree owns the content.** The primitive never requires a particular
  type, never reaches inside what it was handed, and never renders a
  placeholder when the region is empty. A region with nothing in it draws
  nothing at all, which is [0187](0187-a-frame-with-no-picture-in-it-is-not-the-pictures-shape.md)'s
  rule and the reason a ground is not a hole.

Applied here: `loom.orbit` draws a hub — the palette's `accent-subtle` on a
pill with an accent border — behind whatever is in its `mark` region, and
nothing when the region is empty.

The same reading is what lets `loom.feature` grow a `media` region at all. The
tile decides that what it was handed goes after the words and turns beside them
past 44rem of its own width; it does not decide that the thing is a picture, a
panel, a chart or a frame.

## Consequences

- **The three primitives that were already doing this are now doing something
  named.** Nothing about `loom.card`, `loom.frame` or `loom.hero` changes; what
  changes is that the next primitive with a region does not have to re-derive
  whether it is allowed to paint it.
- **A ground is not a placeholder, and the difference is checkable.** Both
  halves are asserted: the hub is painted when something is placed and absent
  when nothing is. A primitive that reserved the tint for an empty region would
  be drawing 0187's frame-with-no-picture, one level down.
- **It bounds itself.** The rule licenses paint on the region and nothing about
  its contents, so it cannot be read as permission for a primitive to style the
  nodes it is handed — which would break the property that makes a slot
  reviewable: the subtree in it is an ordinary subtree, rendered by its own
  primitives, and `move`able out to anywhere else on the page with the same
  result.
- **It does not reach `children`.** A container arranges its children and does
  not ground them individually; there is no per-child region to paint, and a
  container that painted one would be the `span`-prop coupling `loom.mosaic`
  rejects.

## Alternatives considered

**Leave it to the band.** The tree puts a grounded thing in the centre — a
`loom.card` holding a `loom.logo`, say — and the primitive stays out of it.
Rejected on two counts. It makes the *arrangement's* legibility depend on every
future tree getting a decoration right, which is the same bet "the first child
is the media" makes and loses; and the centre of an orbit is not an arbitrary
position a card happens to be at, it is the one position the primitive reserves
and sizes the ring around.

**A `hub` prop on `loom.orbit`, selecting among grounds.** A closed set of
renderings is a legitimate prop (0052), and this one would be a prop nobody
would ever set to anything but the default: there is no band for which an
ungrounded centre is right, because an ungrounded centre is the defect. A prop
whose off position is always wrong is a prop that exists to be forgotten.

**Say nothing and just draw it.** What the previous three cases did, and the
reason this took a photograph and a filing to find. The cost of the unwritten
version is not the paint; it is that the fourth primitive with a region reads
0051, finds no permission, and leaves its region bare — which is exactly what
`loom.orbit` did for five weeks.

**Widen 0051 instead of adding a record.** 0051 is Accepted and its subject is
how a slot reaches a primitive at all. This is a rule about what may then be
done with it, it did not exist when 0051 was written, and amending an accepted
record to carry a decision it did not make would lose which day each was taken.
