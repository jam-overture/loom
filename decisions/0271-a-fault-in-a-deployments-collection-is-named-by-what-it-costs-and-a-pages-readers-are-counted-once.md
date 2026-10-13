# 0271 — A fault in a deployment's collection is named by what it costs, with the hand it falls to, and a page's readers are counted once

**Status:** Accepted

**Date:** 13 October 2026

**Section:** §4c (reader signals)

## Context

Twenty-seven readings answer questions about readers, and every one of them
publishes, beside its answer, the reasons the answer may be absent —
[0240](0240-a-silence-is-a-condition-and-a-subject-and-the-two-names-for-one-state-were-not-synonyms.md)
maps twelve such vocabularies onto twelve conditions and four subjects so that a
surface drawing two readings on one card can tell one state from two.

Three of those reasons are not quiet windows. They are **faults in what a
deployment is collecting**, and each of them was written down where it was found:

- **Senders that never mark an opening.**
  [0229](0229-a-share-of-readers-is-estimated-against-the-appearances-and-bounded-against-the-openings.md)
  named it `unopened` and said exactly what it looks like — *every rate
  denominator-less while the counters look healthy, and nothing else here would
  say so*.
- **Senders that credit no action to any reader.**
  [0242](0242-what-readers-did-is-a-share-off-one-row-and-a-leaf-has-no-inside.md)
  named it `unwalked`: a page readers act on, every band reading *untouched*,
  every share a nought, and the counters again looking healthy.
- **A rollup window shorter than the visits it measures.**
  [0219](0219-a-page-view-is-counted-once-at-the-door-and-the-over-count-in-the-node-counters-is-a-measurement.md)
  turned the over-count from a bound into a measurement, and
  [0250](0250-a-deployment-is-ordered-by-readers-lost-at-the-doors-scale-and-a-page-the-door-cannot-scale-is-out-of-the-order.md)
  had to scale every page's loss by it before two pages could be ranked.

**All three are only ever discovered by asking a question about reading and
noticing that the answer is missing.** They are published per page, one card at a
time, on the screens a person opens to look at readers — so a deployment with
forty pages and one page served by an old broadcaster has no way to be told. The
fault is not in any one figure; it is in the collection, and nothing in this
subsystem was about the collection.

Two more faults have the same property and belong to the **caller** rather than
the deployment: counters filed under a tree that does not contain the nodes they
name, which leaves most parts reading `skipped` while the numbers stay plausible
([0212](0212-what-a-reader-signal-means-is-joined-to-the-tree-when-it-is-read.md)),
and two reads concatenated into one, which neither sums nor overwrites honestly
([0147](0147-a-rollup-is-added-to-what-is-stored-and-a-distinct-view-count-is-therefore-approximate.md)).
Both are reported today by the reading that notices them and by nothing that
would be looked at.

## Decision

`collectionHealthOf(readings, rows)` in [`src/signals/health.ts`](../src/signals/health.ts)
reads a deployment's page readings and its door rows and answers *what is wrong
with what you are collecting, whose it is, and how many of your readers it
costs.* Nothing is added to a payload, a browser, a column, a store or the
vocabulary of kinds, and the broadcaster is not touched.

**A fault is named by its consequence, and the remedy is published only where
the rows determine one.** Five faults: `door-unscaled`, `openings-unmarked`,
`counts-inflated`, `actions-uncredited`, `rows-mishandled`. `remedyOf` maps each
onto one of four hands — `senders`, `configuration`, `caller`, `undetermined` —
because the half of a fault a person acts on is whose it is, and two faults
falling to the same hand is one errand. `undetermined` is one fault out of five
and is deliberate: a missing door row is a sender older than the opening marker,
a row that has passed out of retention while its counters have not, or counters
that no sender wrote, and **the rows cannot tell the three apart**, so naming one
of them would be an invention a surface would print.

**What a fault costs is the page's arrivals, and a page is counted once however
many faults it has.** A sender that is not marking its openings spoils every rate
on that revision, so the readers a fault affects are the readers of the page it is
on — the exact `opened` from that revision's door row, counted once at the door
and addable for the reason no other counter here is (0219). `readersAffected`
adds those arrivals over the **faulted revisions**, each once; `faults` counts
revisions per fault and therefore does not add to the number of faulted pages,
which is said on the field. Counting a window and forgetting it are one operation
([0158](0158-counting-a-window-of-reader-signals-and-forgetting-it-are-one-operation.md)),
so the one double-count available to this reading is a page counted once per
fault, and it is the thing the reading guards.

**A page the door cannot price is published apart and never ranked.** The first
fault in the list is the one revision whose cost cannot be stated, because it is
the absence of the count that would state it. Ranking it by its view floor —
which is a floor and short of the page views there were (0212) — would place it
in the order at a height taken off another scale, which is the mixing 0250
refuses for an order of pages and
[0265](0265-what-readers-do-inside-a-kind-of-part-is-a-share-of-the-readers-who-met-it-and-the-door-is-only-a-weight.md)
refuses for a ranked library. So `faulted` holds the priced ones worst first and
`unpriced` holds the rest, by page.

**The threshold for an inflated count is published and not overridable, and it
is the only threshold here.** `COUNTS_INFLATED_ABOVE` is 0.5: `drift ÷ opened`
above a half means the appearances are more than one and a half times the
openings, so the typical page view is being folded into more than one and a half
windows — a rollup window shorter than the reading it measures. Every **ratio**
in this subsystem survives that, because both of its counts come off the same
rows and the inflation very nearly divides out (0221, 0229, 0242); every
**count** a card prints is half again what it should be. How much error makes a
figure unfit to print is the framework's statement about its own numbers, which
is
[0218](0218-what-a-counter-means-is-published-and-the-browser-pays-for-the-number-and-not-its-name.md)'s
rule at the one remove where it still holds, while the remedy — a longer window
— is the deployment's own configuration.

**Openings no rollup has folded are published as a figure and no fault is raised
from them.** `pending` is the other sign of 0219's subtraction and is what a
stalled collection looks like. It is also what a revision published two minutes
ago looks like, because the lag of the tallies behind the buffer is one window by
design (0158). Telling them apart needs to know when a rollup last folded *this*
revision, and the row carries one `updatedAt` written by both writers — so a busy
page whose rollup has stopped keeps a fresh timestamp. The rows cannot answer it,
so this reading does not: `pending` travels on every page and is added across the
deployment, and the state it produces is named `unfolded` rather than judged.

**Four standings, and the fourth is that refusal.** `sound`, `faulted`,
`unmeasured` — nothing was collected about this revision at all, checked before
the door is, so a page nobody read is never reported as a page the door could not
price (0250) — and `unfolded`, which names the state and claims nothing about
which of its two causes it is.

**No thirteenth silence vocabulary.** The faults *are* the reasons, each with a
hand it falls to, which is more than a silence carries; and the one state that
would need a silence — a page with no exact arrivals — is published as the first
fault because it has something to do about it. That is the shape 0242 chose when
its three standings carried every reason a figure was missing. The
correspondences run the other way instead and are documented: this reading's
`openings-unmarked` is the fault whose consequence a reach reading reports as
`unopened`, and `actions-uncredited` is the fault behind `unwalked`.

## Consequences

- A deployment can be told that its measurement is broken **without first asking
  a question about reading**, which is the one question about this subsystem that
  had no answer inside it.
- The portal gains a screen that is about the collection rather than the readers,
  and the one figure to lead it with: the share of a deployment's arrivals whose
  measurement is wrong in some way. Filed for `Loom portal`.
- `readersAffected` and `arrivals` are a share of **readers** rather than of
  pages, which is what says whether a fault is marginal: one fault on the page
  nine thousand people read is worse than four on the page three did (0221).
- A caller's own mistakes are reported beside a deployment's, under their own
  remedy. A surface showing `caller` to an operator would be showing them
  somebody else's bug, so the remedy vocabulary is what a screen must read before
  it draws a row.
- The threshold is a line this subsystem had not drawn before. A deployment whose
  window is shorter than its visits has every count on every card high, and until
  now that was a correction applied silently by two readings and published by
  neither as a fault.
- Nothing is collected and nothing is stored: readings and door rows in, a
  verdict out. Pure, linear in the readings times the rows.

## Alternatives considered

**A thirteenth silence vocabulary, mapping these states into 0240's table.**
Refused because a fault is not a silence: a silence says *this figure is absent*
and a fault says *go and do something*, and the thing that makes this reading
worth opening is the second half. Mapping them in would also have put `caller`
faults in a vocabulary every reader-facing card consults.

**A stalled-collection fault, from `updatedAt` and a handed-in instant.** Drafted
and dropped. The row's single timestamp is written by the door on every delivery
and by the rollup on every fold, so a busy page whose rollup has stopped looks
freshly updated and a quiet page that is perfectly healthy looks stale. A fault
that fires on the wrong one of those is worse than no fault, and the shape that
would answer it — a second timestamp for the fold — is filed rather than built,
because it is a column on live data.

**Ranking every faulted page, with the unpriced ones on their view floor.** This
is the figure a surface will ask for, and it is two scales in one column: a
floor short of the page views there were, ordered against exact arrivals. 0250
and 0265 both refused the same mixing, and a page in the order at the wrong
height is worse than a page beside it.

**One fault per page, the worst one.** Refused because a page with an old sender
and a short window has two things to do, and a reading that stopped at the first
would hide the second behind the fix for it.

**A fault for every silence any reading can publish.** Most of them are not
faults — a part nobody reached, a window with no views, a type that declares no
copy — and a screen that called them faults would report a deployment's quiet
Tuesday as a broken deployment. The five here are the states where something is
wrong rather than absent.
