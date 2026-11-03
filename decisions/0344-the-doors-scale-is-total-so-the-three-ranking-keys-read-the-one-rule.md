# 0344 — The door's scale is total, so the three ranking keys read the one rule

**Status:** Accepted

**Date:** 3 November 2026

**Section:** §4c (reader signals)

## Context

Every reader-weighted figure this subsystem publishes has to put a count on the
scale the page's door counts in, because a distinct view count is generous by
every page view that straddled a rollup window and **the straddle rate is each
page's own**
([0219](0219-a-page-view-is-counted-once-at-the-door-and-the-over-count-in-the-node-counters-is-a-measurement.md),
[0250](0250-a-deployment-is-ordered-by-readers-lost-at-the-doors-scale-and-a-page-the-door-cannot-scale-is-out-of-the-order.md)).
`door.ts` exists so that the rule is written once
([0265](0265-what-readers-do-inside-a-kind-of-part-is-a-share-of-the-readers-who-met-it-and-the-door-is-only-a-weight.md)),
and `atDoorScale(count, of, scaledBy?)` is the per-placement half of it:
`count × counted ÷ appearances`.

It did not reach everybody. A finding of 3 November, filed while §71 was taking
the published rule into the order of conversions, grepped for the **arithmetic**
rather than for the name and found the same rule written a second time in two
ranking keys as `count ÷ (1 + inflation)` — the order of falls
([0250](0250-a-deployment-is-ordered-by-readers-lost-at-the-doors-scale-and-a-page-the-door-cannot-scale-is-out-of-the-order.md))
and the order of movements
([0291](0291-a-deployments-change-is-two-orders-at-the-doors-scale-because-a-page-has-no-net-movement.md)).
(The finding named 0318 for the second of those; the record it meant is 0291,
and 0318 is the pairing rule that order reads its windows with.)
The two spellings are one rule: `1 + inflation` is `appearances ÷ opened`, so
`count ÷ (1 + inflation)` is `count × opened ÷ appearances`, and `counted` is
`min(appearances, opened)`, which is `opened` wherever there is a straddle to
divide out.

The finding also said why the obvious tidy was unsafe, and **that half of it was
wrong**, which is worth recording because the reason it was wrong is a property
of those two readings rather than of the arithmetic. It argued that
`atDoorScale` divides by `appearances` and is documented as *only ever called
for a door with no silence, where appearances is positive*; that neither of
those two keys refuses a door whose appearances are nought; and that the swap
would therefore turn a sound nought into a `NaN` in a ranking key. **Neither key
can reach that state.** Both ladders refuse it two rungs earlier and for their
own reasons: a page that lost nobody has no steepest fall and leaves the order
as `unbroken` or `unmoved`, and a page that lost anybody lost more than ever
appeared and leaves it as `inconsistent`. The `NaN` was never reachable, and
there is now a test in each file saying so.

What the swap does cost is **the last place**, and in both directions until the
spelling is chosen deliberately. Three roundings against two, so the two routes
do not agree.

## Decision

**`atDoorScale` is total, with two short-circuits, and all three ranking keys
read it.** The precondition comes off its doc comment.

```ts
export const atDoorScale = (count: number, of: PageDoor, scaledBy: PageDoor = of): number =>
  of.appearances === 0 || scaledBy.counted === of.appearances
    ? count
    : (count * scaledBy.counted) / of.appearances
```

**A door that folded nothing has nothing to divide out.** With no appearances
there is no scale to put the count on and no straddle in it to remove, so the
count is its own figure. No caller reaches this today; it is the clause that
lets the precondition be dropped, so that a key adopting the rule needs no guard
beside it — which is what `door.ts` was created to prevent.

**A scale that is the identity is taken exactly.** Where the weight equals the
appearances it divides — every page with no drift, which is most of them —
`count × n ÷ n` is the count mathematically and **not** in floats: `0.1 × 3 ÷ 3`
is `0.10000000000000002`. This is the clause that was load-bearing. An order of
movements ranks on a share movement times a count, which is not a whole number,
and its own doc comment says the magnitude is taken of the comparison's
published figure *because deriving it twice is how two screens come to disagree
about which band a change hurt*. Ten readers reaching a band and four the next,
against twenty-four and six, is a movement of 3.6000000000000005; without this
clause the swap would have published 3.6 beside it, which is two numbers for one
fact on a page the door had nothing to correct.

**Otherwise the multiplication comes before the division**, which 0229 has been
bitten by twice and which is the spelling the five existing callers already had.
It is also the better of the two: over the 22,100 integer triples in `opened ≤ 40`,
`appearances ≤ 40` where the scale is not the identity, it is **never** further
from the exact value than the division-first spelling and is strictly closer in
**4,963** of them. That is asserted in `door.test.ts` against whole-number
arithmetic rather than claimed, because two doubles that differ in their last
place cannot say which of them is nearer.

## Consequences

**The order of falls and the order of movements move in their sixteenth decimal
on pages with drift**, always toward the exact figure. Nothing orders on a
sixteenth decimal, and the ties both orders already break by share, tree and
revision are what hold them steady. No published figure moves on a page without
drift, by the second clause. The whole suite was green across the change with no
test weakened: nothing anywhere asserted a figure that moved.

**A fold that ran twice leaves both keys exactly where they were**, and not
merely nearly. A doubled fold doubles the counters and the appearances and
leaves the openings alone (0219), so the key is one quotient scaled by two above
and below. Thirty openings, forty appearances and sixteen readers lost come to
twelve; folded twice they come to twelve through this rule and to
11.999999999999998 through the other, which is a deployment told its worst page
improved by two quadrillionths of a reader because a rollup ran.

**`atDoorScale` is now tested where it lives**, which it was not: it had five
callers and no test of its own, and every property above was a property of
whichever reading happened to exercise it.

**The three keys are one rule, so a change to the scale reaches all of them.**
That is the point, and it is also the risk: the rule is now load-bearing for
three published orders, and the test that says which spelling is nearer the
exact value is what a future change to it has to keep passing.

## Alternatives considered

**Guard at each call site**, `appearances === 0 ? 0 : atDoorScale(…)`. Rejected:
three lines, and it puts a second rule beside the first, which is the state
`door.ts` exists to end. It also encodes an answer — nought — that is wrong:
a count the door cannot scale is not a count of nobody.

**Leave both keys as they are.** Rejected, and this was the live option, because
nothing is broken today. Two spellings of one rule that agree on paper and not
in the last place are exactly the defect this subsystem has been bitten by three
times (0229 twice, and §71's floor that came out above its own ceiling), and the
cost of waiting is that the next reading to want the scale copies whichever
spelling is nearest to hand.

**Make `atDoorScale` return nought where a door folded nothing.** Rejected: it
reads as a figure rather than as the absence of a correction, and a reading that
wants nought there can say so. No caller is in that state anyway.

**Take the identity exactly by rounding instead** — publishing the key to some
number of places. Rejected outright: it would make the two orders' keys
incomparable with the figures beside them, and the problem is not that the
figures have too many digits but that two routes to one of them disagree.

**Have `PageDoor` carry `inflation` so the division-first spelling could be
written against the published type.** Rejected, and it is the trap this unit
walked into: a test helper reached for `of.inflation`, got `undefined`, and
`count ÷ (1 + undefined)` is a `NaN`. `PageDoor` deliberately carries the weight
and not the fraction it stands for, because the fraction is what 0229 was bitten
by; the helper now takes the rate off the door's own two counts, as the thing
being compared against.
