# 0094. A heading's place in the outline and its size are two questions

**Status:** Accepted
**Date:** 2026-08-27
**Section:** §4b

## Context

`loom.heading` has welded the two together since the day it was written. Its
description says so plainly — *"Its level sets both the document outline and the
size"* — and the reasoning was good: a model that wants a smaller headline picks
a lower level, so the outline stays honest instead of a page looking structured
while its heading levels say otherwise. A `size` prop looked exactly like the
kind of thing that lets an AI make a page that lies about its own shape.

That reasoning holds for the case it was written about, which is a page whose
headings are all the page's own. It fails as soon as a heading is inside
something.

`Loom marketing` hit it on 25 August and filed the measurement. The front door's
*Where to go from here* band is four `loom.card`s inside a `loom.section` whose
heading is level 2. A card title is therefore level 3, which on the ramp is step
6 — **32px, in a card about 290px wide**. All four titles wrapped to two lines,
and the navigation band came out louder than the argument band above it. The
lane listed the three ways out available to it and rejected all three:

- **Use level 5** to get the right size. It puts an `h5` directly under an `h2`.
  A marketing site that breaks its own document outline to make a card look
  right is not a trade to make silently.
- **Drop the heading for `loom.prose`.** Four destinations lose their place in
  the outline entirely, which is worse.
- **Three cards instead of four.** The titles fit and the fourth card sits alone
  on a second row — the exact failure the band had removed a fifth card to avoid
  three days earlier.

The band shipped at 32px and the finding was filed. It is the right way round:
the lane took the ugly page rather than the dishonest outline.

**The library was already disagreeing with itself about this**, which is the
fact that settles it. `loom.feature` renders its title as a hard-coded `<h3>` at
step 4 — 20px. So the same level came out at 32px through `loom.heading` and at
20px through `loom.feature`, and only the wrong one of the two was reachable
from a tree. The seam existed; it was just private, and a primitive had helped
itself to it.

## Decision

**A heading's level names its place in the document outline. A separate `scale`
names the level whose size it borrows. It defaults to the heading's own level,
so a tree that does not set it renders exactly as it did before.**

`scale` is expressed as **a level, not a ramp step**, and that is the part worth
arguing rather than the existence of the prop.

The obvious shape is `scale: 1–8`, naming the step on the type ramp directly.
The ramp is the library's own vocabulary, `size(step)` is how every other
primitive asks for a size, and it would let a heading reach all eight steps
rather than six. It also **runs backwards**: `level: 1` is the *largest* heading
and step 1 is the *smallest* text on the ramp, so the two numbers sitting beside
each other in one prop bag point in opposite directions. A model that reads
`level: 1, scale: 1` as *the biggest heading, at the biggest size* is not being
careless; it is being consistent, and the schema is what is inconsistent.

Saying *size this as though it were level 5* borrows a vocabulary the model
already has, points the same way as the prop above it, and cannot name a size
the ramp of levels does not hold.

It is a prop rather than structure under
[0052](0052-a-repeated-item-is-a-node-and-a-fixed-field-is-a-prop.md) and under
`docs/primitive-granularity.md`'s sharper question: changing it adds no node,
removes none and reorders none. It is `align` and `balance`'s kind of thing.

## Consequences

- **A card title can be level 3 and 20px.** The band that prompted this can keep
  its outline and its proportions at the same time.
- **The outline is still unforgeable in the direction that matters.** `scale`
  moves the *size*; it cannot move the `h1`…`h6` the heading emits, so a
  screen reader, a table of contents and a search crawler all still read what
  `level` says. What a page can now do is look flatter than its outline —
  which is a typographic choice — rather than *be* flatter than it looks, which
  was the failure the old rule was protecting against and is still impossible.
- **A page can make a bad-looking hierarchy.** A level-2 heading scaled to 6 and
  a level-3 heading scaled to 2 is reachable and reads as nonsense. This is the
  cost, it is recoverable in one `configure`, and it is the ordinary cost of any
  prop that means something.
- **`loom.feature`'s private seam is now the public one**, so the next primitive
  that wants a smaller title has somewhere to get it other than a hard-coded
  `<h3>`.
- **A model has one more number to get right.** It is bounded to 1–6 and
  defaults to the level, so the failure mode is a heading at its old size.

## Alternatives considered

**Leave it welded and fix the band instead.** This is what happened for two
days, and the three ways of doing it are listed above. Each trades something
real — the outline, four destinations, or a fifth card — for a size. The general
version of the objection is that a card is not a document section, and a rule
tuned for document sections should not be the only rule a card gets.

**A `size` prop naming the ramp step.** Rejected for the inversion above. Worth
recording because it is the shape anyone will reach for first, and the reason
against it is not visible until the two props are read side by side.

**Named sizes — `display`, `title`, `subhead`, `label`.** A second vocabulary
for the same six values, and one a model has to be told the ordering of. It
also drifts: nothing keeps `subhead` in step with the ramp it is drawn from,
which is exactly how a library ends up with two hierarchies that disagree.

**A `density` prop on the container instead** — a card telling its headings to
be small. It puts the size decision on the thing that does not know what is
inside it, and it is `loom.mosaic`'s rejected `span` prop wearing different
words: the parent styling a child it does not render. It would also need every
container in the library to grow the prop.

**Fluid sizes in the font pack, so step 6 is smaller on a narrow card.** A real
improvement and a different one: it makes headings respond to *width*, and this
record is about a heading responding to *what it is inside*. A card 290px wide
on a 1400px screen gets no help from a viewport-relative size, which is the same
limit `loom.heading`'s existing `min(…, 11vw)` cap carries and says so. The two
compose; neither replaces the other.
