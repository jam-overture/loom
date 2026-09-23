# 0183. A page for another kind of business is the same sequence with different nodes in it

**Status:** Accepted
**Date:** 2026-09-23
**Section:** §4b

> **Why this number.** `0181` is the highest on `main`. `0176` is claimed by
> #353 and `0182` by #369, both open at the time of writing. `0183` is the next
> number free on `main` and on every open branch.
>
> **Why `Accepted`.** It contradicts no `Accepted` record, touches no schema, no
> tree and no delta, and **it does not widen `COMPOSITION_PARTS`** — it is the
> argument for why four candidates that looked like they needed a wider tuple
> did not. It applies
> [0171](0171-a-page-part-is-earned-by-the-region-it-occupies.md) and
> [0162](0162-the-catalogue-is-a-phrasebook-and-the-page-is-one-path-through-it.md)
> rather than amending either, and both are cited unchanged.

## Context

On 21 September the primitives lane closed its inventory of unreachable
primitives and reported the remainder as three rows, each *one decision rather
than several*. The second row was twelve types:

> **not a landing page** — `book`, `event`, `listing`, `product`, `offering`,
> `recording` + their grids, `message`/`message-list` — waiting on **a second
> page sequence** (0171 names the trigger).

0171 does name that trigger, in its own consequences: *"at some point the honest
thing is more than one page sequence — a landing page, a product page, a pricing
page… the trigger is a second page type, not a twenty-second part."* So the row
looked well-founded, it was filed against a record, and it sat.

It was wrong, and the way it was wrong is worth recording because it is a
mistake the same shape as the one 0171 was written to prevent — reasoning about
a band from **what it says** instead of from **where it goes**.

A shop, a studio, a podcast and an assistant do not have different page
*sequences*. They have the same one. Every one of those sites opens with a
navigation and a hero, puts a proof band underneath, answers *what is this* in
the body, answers *what does it cost*, answers the objections, and closes with a
call to action and a footer. What differs is the copy in those bands and the
node types that carry it — and the copy is the cheapest thing in a composition
to replace.

The cost of the misfiling was two weeks of four primitives being unreachable
behind a decision nobody was ever going to be asked to make, and it was the
second time in three days that this row had been wrong in the same direction:
the same inventory had to correct itself about `loom.pin`, which it filed as
cheap work for a fortnight while it was none.

## Decision

**A page for a different kind of business is not a second page sequence. It is
the same sequence with different nodes in four or five of its bands, and each of
those is a design under 0162.**

The operational test is 0171's own swap, asked with the business held fixed
rather than varied:

> Put the candidate where the part's canonical design goes, **on a page for the
> business the candidate is written for**, and ask what that page loses. If it
> loses nothing it needed, the candidate is a design of that part.

The clause in bold is the whole of what this record adds. Asking *what does a
developer product's page lose if the pricing table becomes a service menu* gets
the answer **the pricing table**, which is circular and is how twelve primitives
ended up behind a maintainer. Asking *what does a studio's page lose* gets the
answer **nothing** — it still stands between the proof and the questions, and it
still says what the work costs.

Two consequences, and they are the whole of the rule:

1. **A new kind of business is evidence against a new part, not for one.** If a
   candidate can be placed on the canonical page of the business it is written
   for, it has found a region that already exists. A candidate that cannot be
   placed anywhere on *any* business's page has not identified a region, which
   is 0171's first consequence unchanged.
2. **A design answers to its part's own fragment.** This was convention and is
   now checked: `pricing` and `pricing-offerings` both answer to `#pricing`, so
   a page that swaps one design for another keeps its own navigation working. A
   design that introduced a fragment of its own would leave a nav link pointing
   at nothing — no error, no diagnostic, and a press that does nothing.

### The four admitted on 23 September, worked through the test

| candidate | part | the business it is for | what its page loses if the canonical design stands in |
| --- | --- | --- | --- |
| **`pricing-offerings`** | `pricing` | a studio selling engagements | nothing — a tier table can say *Diagnostic, £2,400* and does; what it cannot do is stop comparing three columns, which is a rendering and not a region |
| **`code-conversation`** | `code` | a product you talk to | nothing — the region answers *show me it working*, and an API panel answers it for an API |
| **`articles-episodes`** | `articles` | a podcast | nothing — the region is *what this site publishes*, and posts are what it publishes when the publishing is writing |
| **`features-catalogue`** | `features` | a shop | nothing — the region is the body, where a reader finds out what the thing is; for a shop that is the shelf |

**The second row is the one that makes the rule worth having**, because it is
the candidate that looks most like a new part by every test except this one. A
chat transcript and a code panel share not one node type, not one prop, and not
one reader — and they are the same band of the same page, which a reader proves
by never wanting both.

## Alternatives considered

**Open a second `PAGE_SEQUENCE` for a non-developer page.** The thing the
inventory assumed was needed, and it is a large change: `PAGE_SEQUENCE` is
derived from `COMPOSITION_PARTS` precisely so nothing keeps a second list in
step, and making it plural means every consumer choosing which. It buys nothing
here — all four candidates place cleanly in the existing order — and a sequence
added before anything needs it would be a second thing to keep honest for as
long as it stayed empty. **Not refused, deferred with its trigger named:** a
second sequence is earned by a page whose *regions come in a different order*,
which is a documentation page or a reference, not a shop.

**Admit `shop`, `menu`, `catalogue` and `transcript` as parts.** This is the
content test 0171 rejected, arriving by a new road. It fails the same way and
one way more: the canonical page would grow four bands that no single business
would ever use together, so the one document the catalogue claims assembles
cleanly would stop being a document anybody could read.

**Ship the four as fat primitives — `loom.shop-band`, `loom.service-menu`.**
Refused by the brief this library is written against and by
`docs/primitive-granularity.md`. It would put six products behind a prop bag and
make *move the subscription to the front of the shelf* unreachable, which is the
whole argument for the decomposition these bands are made of.

**Leave the twelve filed and wait for the maintainer.** What three runs did.
The cost is measurable: four primitives unreachable for a fortnight, and two
corrections to the same inventory row in three days. A question that nobody
needed answered is not a blocker, and the discipline this suggests is worth
stating — **before filing a row as waiting on somebody, check that each thing in
it actually needs what the row says it needs.** Four of these twelve needed a
band, and a band was always this lane's to write.

## Consequences

**`COMPOSITION_PARTS` does not move, and there is a test saying so.** Twenty-two
members before this run and twenty-two after, asserted beside the four new
bands, so a later run that decides one of them really does occupy a region of
its own has to make the argument where it can be read.

**Eight primitives come back into reach and the remaining four have a reason.**
`offering`, `product`, `recording`, `message` and their containers are now built
by a band. `book`, `event`, `listing` and their grids are not, and they are not
waiting on a decision either — they are waiting on a run, which is the honest
state and a different one from the row they were in.

**The image question shrinks and does not move.** Every image field on all
twelve is optional, and `loom.recording` draws its most important mark without
one. So *needs an image source* was never true of these; what remains true is
that a catalogue with photographs would be better, and that is still a question
for the maintainer. The four bands ship with no image source at all and stay
inside `compositions.test.ts`'s standing rule.

**Two defects were found by drawing what the rule permitted**, both of them
invisible in a test and obvious in a photograph. The one worth carrying: a
`loom.recording` with no artwork was reserving a picture's aspect ratio for a
picture that did not exist, which at phone width is a 350-pixel void with a play
button in the middle of it. A shelf of six read as six cards that failed to
load. **A ratio reserves the shape of a picture, so a frame with no picture in
it does not get one** — fixed in the primitive, pinned by a test, and the second
defect in that file found by rendering a record with no cover art.
