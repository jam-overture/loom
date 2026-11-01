# 0333 — A deployment's conversions are a third order, ranked on the loss between the two ends

**Status:** Accepted

**Date:** 1 November 2026

**Section:** §4c (reader signals)

## Context

A deployment can ask which of its pages to fix and get an order back. It could
not ask which of its funnels to fix.

[0250](0250-a-deployment-is-ordered-by-readers-lost-at-the-doors-scale-and-a-page-the-door-cannot-scale-is-out-of-the-order.md)
ranks the pages by the readers each loses at its sharpest fall, and
[0330](0330-the-page-to-fix-first-is-not-the-page-to-fix-when-its-own-fault-made-the-fall.md)
joins that order to the faults in the deployment's own collection, so *what
should I do next* has one answer that cannot send an operator to rewrite a page
whose fall its own measurement manufactured. **Both of those are about reading.**
A fall is between two siblings on the reach counter, so a page whose pricing
band every reader reaches and nobody buys from has no fall in it anywhere — and
the agenda prints `work: "none"` over it. That was filed as the stated limit of
0330 on the day it landed: the deployment says what to do about reading and says
nothing about converting, which is the half of the product that pays.

Two facts had to be held together before it could be built, and they were filed
together for that reason.

**A conversion loss cannot be merged into either existing order.** 0330 refused
a figure over readers-lost-at-a-fall and a-page's-whole-readership because they
are two quantities, and conversions not made is a third. So the arm is a third
order with its own key, or it is a number true of nothing.

**The input it needs was the one reading the window rung could not be asked
for.** After
[0327](0327-the-figures-a-window-holds-about-itself-are-a-second-rung-and-a-region-row-set-is-deduplicated-once.md)
almost every reading of a window is one call with one argument off the assembly.
A funnel answer is not: it needs the window's funnel rows and its door rows,
which the assembly deliberately does not republish. It is not the hazard 0327's
three were — it filters its rows to the revision, scopes them to the form and
deduplicates its own questions, so the line is right when a caller writes it —
but it is written once per reading and once per side of every comparison, which
is how one screen comes to hold two answers to one question.

## Decision

**One rung and one order, landed together.** A run that added only the input
would leave the agenda silent about converting; a run that added only the order
would leave its input a composition every caller writes.

### The funnel answers of a window are published off the assembly

`windowFunnelsOf(window, assembly)` in
[`src/signals/window-funnels.ts`](../src/signals/window-funnels.ts) publishes
`pages` — one answer per reading the window holds, in the readings' own order —
and `pairs`, one before-and-after per form the window paired, which is what a
comparison of two windows' funnels takes
([0288](0288-a-change-to-a-funnel-is-two-shares-that-factor-and-a-difference-of-two-floors-is-a-bracket.md))
and could not be reached from a store before.

**A pair's side is the same object as the reading of that form**, looked up
rather than read a second time, so a surface drawing a page's funnel and the
comparison of its two revisions cannot show two answers of one revision. That is
the property 0327 keeps between a region map and a readership, one subject
across. A side the readings do not hold is **read** rather than dropped, so
nothing is silently absent and there is no count of droppings to publish.

The context is not taken. A funnel answer is scoped by the form its reading
names and holds no region bucket, so neither context field has anything to reach
here.

### The order ranks the loss between the two ends and never the loss before them

`deploymentConversionOf(funnels)` in
[`src/signals/conversion.ts`](../src/signals/conversion.ts) ranks each page by
`reached − converted` on its sharpest question, put on the door's scale exactly
as a fall is: `lost ÷ (1 + inflation)` off that page's own door row
([0219](0219-a-page-view-is-counted-once-at-the-door-and-the-over-count-in-the-node-counters-is-a-measurement.md)).

**Only the loss between the two ends is ranked, and that is the whole of what
keeps this order from being a second spelling of 0250's.** A funnel answer holds
two losses: readers who never reached the first end, and readers who reached it
and did not finish
([0229](0229-a-share-of-readers-is-estimated-against-the-appearances-and-bounded-against-the-openings.md)).
A reader who never reached the ask stopped **reading**, which is where the fall
between two siblings already puts them — so ranking that loss here would put one
page near the head of two orders for one event, and an operator would fix it
twice or distrust both lists.

**It takes one argument**, because a funnel answer already carries the door: it
is read against the exact number of readers the revision had. The order of falls
takes door rows beside its readings because a reading of where reading stops
holds no arrivals; this one has no row set to match up wrongly.

### Nine states keep a page out of the order, and two of them are new kinds of state

Three are the door's three at the page subject, one is a window holding two
forms and naming neither
([0300](0300-what-audience-a-reading-is-of-is-a-three-way-answer-and-a-window-of-two-forms-is-read-as-neither.md)),
one is a count that cannot be reconciled with the page views there were, one is
a question nobody has reached, and one is the page that leaks nobody.

**The other two are about the questions a deployment wrote rather than about any
measurement**, and no reading before this one could report either, because no
reading before this one was keyed by what was asked:

- **`unasked`** — nothing asks this version of the page for anything. **Not a
  silence**: no figure is withheld, because no question was written. The
  sentence is *there is nothing here to measure*, which is the opposite
  instruction to *this could not be measured*.
- **`stale`** — every question it is asked names a part this revision no longer
  has, so the counts against those ends cannot move again and the noughts they
  report are not reader facts
  ([0212](0212-what-a-reader-signal-means-is-joined-to-the-tree-when-it-is-read.md)).
  The remedy is to re-point the questions. Reported only where **every**
  question is stale: a revision with one sound question and three stale ones is
  ranked on the sound one, with the three counted on its row.

`unsplit` is checked first because it is the cause of the empty question list
underneath it — a funnel answer handed two forms with neither asked for reads no
question at all, which is indistinguishable from a page nothing asks anything of
and would have been published as one
([0301](0301-a-refused-reading-is-not-a-page-nobody-read-and-the-census-travels-with-the-progress.md)).

### A twenty-second silence vocabulary, bringing one condition

`meaningOfConversionSilence` is published beside the other twenty-one. Six of
its seven members map onto conditions already published; the one it brings is
**`questions-stale`**, which is the second condition in the set about what a
deployment asked rather than about the deployment, the window or the shape of
the page.

A stale question is not `nothing-of-the-kind` — that is about a vocabulary — and
not `no-view-reported`, which is a reader who was not there. It is a question
whose subject the page has stopped having.

### What it does not publish

**No deployment-wide conversion rate.** The artefact is an order, not a total: a
rate across pages needs a denominator across them, and two pages' funnel counts
are added across rollup windows and therefore generous
([0147](0147-a-rollup-is-added-to-what-is-stored-and-a-distinct-view-count-is-therefore-approximate.md)).
Every reader figure on a row is that page's own.

The two figures that are added are `arrivals`, addable because a page view began
on one revision of one tree and was counted once (0219), and the counts of
questions, addable because a question belongs to one revision of one page in one
form.

**No collection it is reaching for.** No payload field, no header, no column, no
store method, no migration and no browser change. `broadcast.ts` is
byte-identical and the bundle measures 6,513 bytes minified.

## Consequences

- A deployment can ask which of its funnels to fix and get an order whose head
  is a page, a question and a number of readers.
- `funnelChangeOf` is reachable from a store for the first time: the pairing
  existed and the answers it needs did not.
- The silence vocabulary has twenty-two sets and one more condition. A reading
  that can be in neither of the two question states still has to say so.
- **The agenda does not take this order yet, and that is deliberate.** Joining
  it is a third arm on a vocabulary whose four members say *page or
  measurement*, and the two questions a third arm has to answer — whether a
  conversion leak is page work or work of its own, and whether each of the seven
  faults reaches a conversion loss the way `spoilsTheLoss` answers for a fall —
  are a unit of analysis rather than a line. Filed, with the shape recommended.
- **Per-reader identity is no more expensive to add later.** The unit here is a
  page and a question. A funnel is correlated inside one page view by an opaque
  key that never reaches storage
  ([0146](0146-a-reader-signal-stays-anonymous-and-a-funnel-is-correlated-inside-one-page-view.md)),
  and this order holds no reader, joins no reader and counts no reader beyond the
  arrivals each page's own door row already published.

## Alternatives considered

- **Ranking the whole funnel loss, arrivals to conversion.** Rejected, and it is
  the shape most people would write first: it sums a reading loss and a
  conversion loss, so a page whose readers stop before the pricing band stands
  near the head of this order and of 0250's for one event, in a figure that is
  in neither order's unit.
- **A conversion arm inside the page order.** Rejected for the reason 0330
  refused a merged figure: the keys are readers-lost-at-a-fall and
  conversions-not-made, and merging would have to pick one, scale one into the
  other, or add them.
- **Ranking by the conversion rate rather than by the readers lost.** Rejected:
  two readers out of three who left an ask unanswered is a worse rate and a
  smaller problem than four hundred out of a thousand. The rate is the
  tie-break, which is how a page already ranks its own falls
  ([0221](0221-where-reading-stops-is-a-fall-between-two-siblings-and-a-ratio-of-two-counts-off-one-row-set.md)).
- **Ranking a page on its stale questions' counts.** Rejected: a question naming
  a part the page no longer has reports a count that cannot move, so a large
  stale count would take the head of a page's own order away from a sound
  question.
- **Taking the door rows beside the funnel answers, as the order of falls
  does.** Rejected: the answer already carries the door, and a second row set at
  this call site is a second chance to hand in rows the answers were not read
  against.
- **Putting the funnel answers on `WindowFigures`.** Rejected: that rung is *the
  figures a window holds about itself* (0327), and these are readings of a
  subject the assembly publishes. The same reason 0330 kept the agenda out of
  it.
- **Putting the funnel answers on the assembly itself.** Rejected: the assembly
  publishes the subjects a reading takes and deliberately publishes no figures,
  and a funnel answer is a figure — it holds rates, shares and a silence.
- **Dropping a pair whose side is not among the readings.** Rejected: a side
  absent from the readings is still a revision whose funnels can be answered,
  and dropping it would publish *this form has no before-and-after* about a form
  that has one.
- **Making `unasked` a silence.** Rejected: nothing is being withheld. A page
  nothing asks anything of has no funnel to measure, and a census that counted
  it as a withheld figure would report a deployment with no funnels as a
  deployment whose funnels could not be read.
