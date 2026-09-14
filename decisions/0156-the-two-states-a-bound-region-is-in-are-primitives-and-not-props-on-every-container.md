# 0156. The two states a bound region is in are primitives, and not props on every container

**Status:** Accepted
**Date:** 2026-09-14
**Section:** §4b

> **Why this number.** `0155` is this run's other record; the gap below both is
> explained there, and 0097 permits it.
>
> **Why `Accepted`.** It decides where two things that did not exist live and
> what governs them. It refines no `Accepted` record and changes no schema. It
> is [0110](0110-an-entrance-the-reader-drives-is-a-wrapper-not-a-prop-on-every-band.md),
> [0130](0130-atmosphere-is-a-wrapper-and-the-paints-are-one-vocabulary.md) and
> [0145](0145-a-light-that-marks-one-of-several-is-a-wrapper-and-it-is-carried-by-distance.md)'s
> argument reaching a fourth case, and 0145's consequences ask for exactly this
> kind of reuse.

## Context

For ninety-two primitives, every word on a Loom page was authored into the tree,
and so every primitive could assume **its content had arrived**. That stopped
being true on 11 September.

[0058](0058-a-binding-is-a-question-the-tree-asks-answered-before-the-walk.md)
gave the tree a way to ask a question of a registered source, and settled one
thing about the answer that this record depends on entirely:

> There is deliberately no way to express "empty" as a failure: a source with
> nothing to report answers `ready` with an empty list. Collapsing those two is
> the mistake the portal spent its 15 August run undoing — a reader who takes
> "we could not reach your services" for "you have no services" concludes their
> data is gone.

So **a legitimately empty region is now an ordinary outcome**, and a region
whose answer has not come back is a second one. The library had a rendering for
neither. A bound grid with nothing in it rendered as a heading over a gap, and a
bound grid still waiting rendered as the same gap — which is the collapse 0058
refuses, reappearing one layer up, in the pixels rather than in the reason code.

The 13 September gap inventory named both as Tier A and predicted the cost of
leaving them: *"every surface will otherwise invent its own 'no results yet'"*.
Two surfaces would have. The portal and the demo would each have written one
within a week of each other, in slightly different words, with slightly
different spacing, and neither reviewable as a library decision.

## Decision

**`loom.empty-state` and `loom.waiting-state` are primitives a tree places, not
props on the containers that might need them.**

- **`loom.empty-state`** takes the region the missing content would have
  occupied: a glyph, a title, a sentence, and the one action that would fill the
  space. Its three regions are slots on
  [0051](0051-a-slot-is-a-region-the-primitive-places.md)'s test — the primitive
  places the glyph above the title and the action below the sentence whatever
  the tree's child order is — and the sentence is `text` children, because it is
  prose and 0059 sends prose to children.
- **`loom.waiting-state`** holds the *shape* of what has not arrived: a closed
  enum of four — a paragraph, a card, a media box, a person — and a count of
  text bars. It is a leaf, and a leaf for a reason none of the other
  twenty-two share: it holds no copy at all. Its only string is declared
  ([0060](0060-a-primitive-owns-a-string-and-a-deployment-may-replace-it.md)),
  because a model has nothing to say here that the shape does not already say.
- **`lines` is a prop and `repeat` is not**, which is the near-miss worth
  writing down. `docs/primitive-granularity.md` asks *does changing this prop
  change the set of nodes?* — and a bar is not a node: nobody moves the second
  bar of a skeleton, nobody re-words it, and no `move` could address one. But
  three waiting *cards* are three nodes in a `loom.grid`, because there the
  repeated thing is the shape of a node, and a `repeat: 3` would be `insert` in
  a prop bag by the same test that lets `lines` through.

**What neither primitive does is decide whether it is shown.** A tree cannot say
*this node when the list is empty, that one otherwise*; nothing in the library
reads `loom.data`; and both of these render exactly what they were given, every
time. That is a real limit on their usefulness and it is filed rather than
worked around, because the shape of a fix — a node whose presence depends on an
answer — is a question about the render seam and the tree, which this lane may
not decide.

## Consequences

- **Every surface has one empty state and one waiting state to reach for**,
  which is the whole of what the gap inventory asked for. They are reviewable
  once rather than per surface.
- **0058's separation survives into the rendering.** *Nothing to report* and
  *not back yet* draw differently, so the distinction the data seam protects at
  the type level is one a reader can also see.
- **Tier A is finished.** Of the five primitives and one enum widening the gap
  inventory named, the figure and the trend shipped on `primitives-29`, and the
  paging control, the empty state, the waiting state and `checkbox` ship here.
  The tenth field type, a radio group, is filed: its choices are `loom.option`
  by every test that matters, and a choice inside a `<select>` must be an
  `<option>` while a choice in a radio group must be an `<input>` — and nothing
  in this library lets a container tell a child which element to be.
- **The library still cannot show a *failed* region.** 0058 types six ways an
  answer does not arrive; `loom.callout` can say so in words and nothing draws
  it as a region's state. Deliberately not built here — a failure is a message
  with a remedy in it, which is a callout's content model and not a third state
  of this shape.

## Alternatives considered

**An `empty` string prop on every container that holds repeated children.**
Sixteen grids and lists, each with a prop, to serve one sentence. Rejected for
0110's and 0130's reason, and with one this case adds: an empty state is not a
string. It is a title, a sentence and an action, and a prop that held all three
would be a struct in a prop bag — 0052's first half exactly.

**`loom.callout` with the padding turned up.** The closest registered thing, and
rejected on the membership test 0130 sets. A callout is an aside *within*
content and hugs its text; an empty state *is* the content, takes the whole
region, and offers the action that would fill it. A model choosing between them
gets two different answers, which is the test for whether they are two things.

**A spinner instead of a skeleton.** Rejected because a spinner says only that
the page is busy, while a skeleton says what is coming and how much of it — so
the layout does not jump when it lands. Reserving the geometry is the entire
reason the device exists, and it is why the shapes are a closed enum rather than
a subtree a model has to build to resemble another subtree.

**A generic `loom.state` with a `kind: "empty" | "waiting" | "error"` prop.**
Tempting, and it is 0052's shades-of-one mistake in its most persuasive dress.
The three share no content model: one holds prose and an action, one holds no
content at all, and the third holds a remedy. A prop that switched between them
would change the set of children the node may have, which is the one thing a
prop may never do.
