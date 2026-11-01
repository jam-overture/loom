# 0330 — The page to fix first is not the page to fix when its own fault made the fall

**Status:** Accepted

**Date:** 1 November 2026

**Section:** §4c (reader signals)

## Context

Two readings in this subsystem answer *what should this deployment do next*,
and they have never met.

[0250](0250-a-deployment-is-ordered-by-readers-lost-at-the-doors-scale-and-a-page-the-door-cannot-scale-is-out-of-the-order.md)
orders a deployment's pages by the readers each loses at its sharpest fall,
scaled to the door, and publishes the head of that order as **the page to fix
first**. [0271](0271-a-fault-in-a-deployments-collection-is-named-by-what-it-costs-and-a-pages-readers-are-counted-once.md)
names the faults in the deployment's own collection, ranks the faulted pages by
the readers each costs, and publishes the worst as **the page to look at
first**. Both are over the same window, both are over the same pages, both are
headcounts at the door's scale, and a surface drawing them holds two lists and
has to find the overlap by eye.

**The overlap is not a tidiness problem. It is a wrong instruction, and it goes
one way.** Of the seven faults 0271 names, `rows-mishandled` is a tree and a
window that do not belong together — and a reading taken from a mismatched tree
leaves most of the page reporting `skipped`
([0212](0212-what-a-reader-signal-means-is-joined-to-the-tree-when-it-is-read.md)).
Those are not quiet parts; they are a cliff. So the fault **manufactures the
steepest fall in the deployment** and puts the page at the head of 0250's order,
where the sentence over it is *this page loses more readers than any other*. The
page is fine. The figure that sent an operator to rewrite it was the fault, and
nothing anywhere said so.

A stalled fold does a gentler version of the same thing: the fall comes off
counters the fold has not caught up to and the scale comes off a door that has,
so the loss is of one window and its denominator is of another.

**And the obvious fix is wrong too.** *Take any faulted page out of the order*
is one line, and it would send an operator to repair a sender while four hundred
readers a day stop at a band, because two of the seven faults do not reach the
figure the order is ranked on at all:

- **`counts-inflated` is already divided out of it.** The ranking key is
  `lost ÷ (1 + inflation)` and the inflation comes off the door row, where an
  opening is counted once and exactly
  ([0219](0219-a-page-view-is-counted-once-at-the-door-and-the-over-count-in-the-node-counters-is-a-measurement.md)).
  The fault says the page's **absolute counts** are not worth printing. The
  ranking key is not one of them.
- **`actions-uncredited` is about another counter.** A fall is between two
  siblings on `reached`; an uncredited sender spends its `engaged`
  ([0242](0242-what-readers-did-is-a-share-off-one-row-and-a-leaf-has-no-inside.md)).
  Every band on the page reads *untouched* and not one fall moves.

So the question is not *is this page faulted* but *does this page's fault reach
the figure this page's place was computed from*, and that is a statement about a
fault rather than about a page.

## Decision

**Two orders and the overlap between them, joined on the readings a deployment
already has.**

`deploymentAgendaOf(order, health)` in
[`src/signals/agenda.ts`](../src/signals/agenda.ts) takes a `DeploymentReading`
and a `CollectionHealth`, joins them on `readingKeyOf`, and publishes a
`DeploymentAgenda`: every page as an `AgendaRow` carrying both readings' own
rows whole, plus the two orders and the slice where they meet.

**Nothing is collected for it.** No payload field, no header, no column, no
store method, no migration, no browser change and no byte on any wire. It is a
join of two published readings and adds no figure either of them does not
already publish.

### A fault says whether it reaches the loss, and it says it beside the fault

`spoilsTheLoss(fault)` is published from
[`health.ts`](../src/signals/health.ts), next to `remedyOf`. The two are the two
halves of a fault a person acts on: `remedyOf` says whose hand it falls to, and
this says whether the fall they were about to act on is evidence of anything.

| Fault | Reaches the loss | Why |
| --- | --- | --- |
| `door-unscaled` | yes | there is no scale to put a loss on |
| `openings-unmarked` | yes | the denominator the loss is scaled by is nought |
| `counts-inflated` | **no** | the ranking key already divides the inflation out |
| `collection-stalled` | yes | the loss is of one window and the scale of another |
| `actions-uncredited` | **no** | a fall is made of `reached`, which it does not touch |
| `rows-mishandled` | yes | a mismatched tree manufactures the fall |
| `audiences-mixed` | yes | the reading is of neither population |

**It is beside the fault vocabulary rather than beside the order**, because it
is a statement about a fault — and a fault vocabulary written in two places is
the defect this subsystem has been bitten by twice in a week (0265, 0327).

Three of the five `yes` answers **cannot be seen today**: the order already
refuses those pages as `unscaled`, `unopened` and `unsplit`, so they can never
co-occur with a rank. They are answered anyway, because the predicate is about
what the fault does to the figure and not about what today's standings happen to
let through — so the day a standing changes, the two readings do not silently
come apart.

### Four kinds of work, and `both` is the member that earns the distinction

`AgendaWork` is `page`, `collection`, `both` and `none`. A page that is ranked
and carries only a fault the key survives is **`both`**: rewrite it, and fix the
fault, in that order. Without that member the reading would be the over-caution
above — a verdict that pulls a real fall off the screen because the page's
presses are not credited, which is a verdict worth ignoring.

### A contested page leaves the order and is findable where it went

A page the order ranked and a fault spoiled is `collection` work: its place was
computed from counters the fault produced, so *rewrite this* is not a safe
instruction. It is published in `DeploymentAgenda.collection` **and** named in
`DeploymentAgenda.contested`, carrying the whole `RankedPage` the order gave it
— the rank, the fall, the readers and the share.

Never dropped quietly. A page taken out of an order has to be findable in the
place it was taken to, with the figure it was taken for, which is the rule
[0301](0301-a-refused-reading-is-not-a-page-nobody-read-and-the-census-travels-with-the-progress.md)
and [0326](0326-a-quiet-window-and-a-refusing-door-are-two-states-and-a-refusal-names-no-page.md)
keep about every refusal this subsystem makes.

`contested` is a **slice** of `collection` and not a fourth list, so nothing in
it is counted twice.

### What to do first, which is the one judgement over the two orders

`first` is the first contested page, then the head of the page order, then the
worst fault, then `null`.

A contested page comes before a ranked one because **while one exists the order
itself is not evidence**: the same mishandled rows that put that page at the top
could be anywhere in the window the caller handed in. Once nothing is contested,
the head of the order is 0250's own answer and it is now safe to act on.

### It publishes no reader count at all

The two orders are ranked in **two different units**. 0250's key is *readers
lost at one fall*, a part of a page's readership. 0271's is *the page's whole
readership*, because a fault spoils every rate on the page rather than some
share of them. Both are headcounts at the door's scale and they are **not the
same quantity**, so a sum or a maximum over them would be a figure in neither —
the refusal
[0327](0327-the-figures-a-window-holds-about-itself-are-a-second-rung-and-a-region-row-set-is-deduplicated-once.md)
makes about a withheld bucket, a kind with no pace and a silent reading.

So every figure this publishes is a count of **pages**, and every reader figure
reachable from a row is the source reading's own, on the source reading's own
row. Nothing is re-spelled, which is also why the rows are carried whole rather
than flattened.

### A page is counted once, however many lists name it

The one permanent mistake a join of two orders can make (0158), and there are
two ways in. A caller that concatenated two reads holds one page twice on one
side: deduplicated on `readingKeyOf`, first appearance kept, and counted in
`duplicated`.

**The deduplication is in two places and that is deliberate.** The join is a map
and cannot hold a key twice, but the published orders **walk the caller's own
lists** — so a page named twice by the order would stand in `page` twice while
every count above it stayed right. That was found by the test for it and not by
reading the code.

### Two windows handed in as one

Both inputs are over *the pages their caller read*. A caller holding an order of
one window and a health reading of another gets a join of the intersection, and
nothing about it looks wrong. A row only one side names is in no list and is
counted in `unpaired`, as two counts rather than one — which side is short says
which read is the stale one. It is nought for every caller that read one window.

Published rather than refused, which is this subsystem's standing answer to a
caller's error that it can see but cannot repair.

## Consequences

- A deployment can ask *what should I do next* once and get an answer that
  cannot send it to rewrite a page whose fall its own collection fault made.
- `spoilsTheLoss` is published, so a surface drawing 0250's order alone can also
  mark a row rather than silently trusting it.
- The fault vocabulary now has two published statements per member. A sixth or
  eighth fault has to answer both, and the exhaustive table in
  `health.test.ts` fails until it does.
- **No silence vocabulary is added**, and 0240's twenty-one sets stand. This
  reading withholds no figure of its own, because it publishes no figure of its
  own: every absence on a row is a standing the source reading already named,
  and `work: "none"` is an answer rather than a silence.
- `first` is the only judgement over the two orders, and it is one line. A
  deployment that disagrees with the precedence reads the three lists.
- Nothing reaches a reader's browser. `broadcast.ts` is byte-identical.
- It makes **per-reader identity no more expensive to add later**, because it
  holds no reader and joins no reader: the unit is a page, in both readings and
  in this one.

## Alternatives considered

- **One merged ranking over both readings.** Rejected, and it is the shape most
  people would write first: it needs a comparable key, and the two keys are
  readers-lost-at-a-fall and a-page's-whole-readership. A merge would have to
  pick one, scale one into the other, or sum them, and all three publish a
  number that is true of nothing.
- **Any fault takes a page out of the order.** Rejected: one line, and it sends
  an operator to repair a sender while a real fall goes unfixed. `counts-inflated`
  and `actions-uncredited` demonstrably do not reach the key, and the `both`
  member exists to say so.
- **A verdict per page instead of two orders.** Rejected: a verdict is what
  `work` is, and it is on the row. What an operator opens a screen for is an
  *order*, and there are honestly two of them, in two units.
- **Putting `spoilsTheLoss` in `deployment.ts`, beside the order it is about.**
  Rejected: the thing it is about is a fault, and the fault vocabulary lives in
  one file for the reason the door's scaling rule now does (0265) and the region
  dedup now does (0327) — a rule written twice is this subsystem's commonest
  defect.
- **Deriving both readings here from a window and a context.** Rejected for the
  reason every derived reading in this subsystem takes readings: each of the two
  is separately useful and separately drawn, and deriving either a second time
  is how two screens come to disagree about one deployment. A caller reads the
  parts, the progress, the order and the health, and then this.
- **Refusing a join whose two sides name different pages.** Rejected: the
  subsystem's standing answer to a caller error it can see and cannot repair is
  a published count, not a refusal — a refusal would take a correct join away
  from a caller that deliberately read a narrower order.
- **Adding the agenda to `windowFiguresOf`.** Rejected: that rung is *the
  figures a window holds about itself* and takes three readings nothing else
  composes (0327). This takes two readings a caller already has and already
  draws, and both of its inputs are one call with one argument — so there is
  nothing here a caller can get wrong to be protected from.
- **A reader count on the agenda — contested readers, say.** Rejected for the
  unit reason above. A surface wanting *the measurement of eleven hundred of
  your readers is wrong* reads `CollectionHealth.readersAffected`, which is
  already that sentence and is already counted once per page.
