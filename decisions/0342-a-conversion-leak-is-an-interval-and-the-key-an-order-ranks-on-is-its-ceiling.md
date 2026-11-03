# 0342 — A conversion leak is an interval, and the key an order ranks on is its ceiling

**Status:** Accepted

**Date:** 3 November 2026

**Section:** §4c (reader signals)

## Context

[0333](0333-a-deployments-conversions-are-a-third-order-ranked-on-the-loss-between-the-two-ends.md)
ranks a deployment's pages by the readers each loses between the two ends of its
sharpest question — `reached − converted`, on the scale that page's own door
counts in. [0336](0336-a-fault-reaches-a-conversion-and-a-fall-differently-so-the-fix-list-asks-each-order-its-own-question.md)
then asked, fault by fault, which faults in a deployment's collection reach that
key, and found one that reaches it and does not reach the order of falls:
`counts-inflated`, a rollup window short relative to how long readers stay.

The argument it found is the reason this record exists. A fall is a difference of
two independent distinct counts, so a straddle inflates both ends and dividing by
the straddle puts the difference back on the door's exact scale. **A conversion is
a conjunction inside one rollup window**, so a page view that met the first end in
one window and the second in the next reports `reached 1, converted 0` — the
conversion is *lost* rather than double-counted (0147), and no division puts back
a count that was never made. So a short window **manufactures the very loss this
order ranks**, and the order's answer for such a page is withdrawn entirely: the
fix-list drops it, names it in `contested`, and the deployment is told its
measurement is the thing to repair.

That is the safe call and it throws away a real ranking. The finding of 2 November
said so in as many words, and named the shape of what was missing: *`counts-inflated`
reaches a conversion key by an amount `PairReach.rateAtMost` already bounds for the
rate; a bound on the key — this page's leak is between n and m — would be a reading
rather than a fault answer, and it belongs beside the funnel.*

Two facts already in the subsystem are what make it free. `PairReach.rate` is a
**floor** on the true conversion rate, for the reason above. `PairReach.rateAtMost`
is the **ceiling**, with both of the straddle's worst cases applied (0147). The true
rate is between them, so the true loss is too.

## Decision

**A pair's leak is published as an interval, and the key an order of conversions
ranks on is that interval's ceiling.**

`PairLeak` is published from `funnel.ts` and carried on every `PairReach` that has
a loss the door can scale:

- `atLeast` — the readers who reached the first end, on the door's scale, at the
  most the true rate could be. The figure a straddle cannot have manufactured.
- `atMost` — the same readers at the stored rate, which is `reached − converted`
  on the door's scale: **the key 0333 named, unchanged in meaning.**

`LeakingPage` carries both as `readers` (the ceiling, which the order still ranks
on) and `readersAtLeast` (the floor), on the same terms: both or neither.

**Both ends are one expression over two rates.** The reach is put on the door's
scale once, by `atDoorScale`, and then taken at each bound. Spelling the ceiling
as the loss instead — `atDoorScale(reached − converted)`, the same number — is the
shape that looks more direct and is wrong: at a drift of nought,
`reached × (1 − converted ÷ reached)` and `reached − converted` differ in the last
place for three readers and one conversion, and a floor four hundred
quadrillionths above its own ceiling is a floor that is not one. The two ends must
**meet exactly** where there was no straddle to lose a conversion in, and one
expression is what guarantees it. This moves the published key in its last place
for some rows; nothing orders on a sixteenth decimal, and the ties 0333 already
breaks by tree and revision are what hold the order steady.

**`DeploymentConversion.worstSecure` says whether the head of the order was
forced.** The order is on a ceiling, so two pages whose intervals overlap could be
either way round and the order has to pick one. `worstSecure` is `true` where the
head's floor is at or above the next page's ceiling — nothing can overtake it —
`false` where it is not, and `null` where no page is ranked. One comparison answers
the whole order, because the rows are sorted by their ceilings and nothing below
the second has a higher one.

**The order still ranks on the ceiling, and `counts-inflated` still withdraws the
page.** Neither 0333 nor 0336 is superseded. The floor is a figure beside the key,
not a second key.

## Consequences

- **A deployment under suspicion keeps one sound number.** A page whose conversion
  figures are withdrawn by `counts-inflated` still publishes `readersAtLeast`, and
  the sentence a surface can print is *this page is losing at least this many
  readers, however short your rollup window is.* That sentence was unavailable
  before and needs no new counter, column, payload field or browser byte.
- **A surface can say that two pages are too close to call.** `worstSecure: false`
  is a truer answer than either page's position in the order.
- **Nothing reaches a reader's browser.** `broadcast.ts` is byte-identical and the
  bundle measures 6,513 bytes minified, 2,982 gzipped. No kind, no payload field,
  no column, no store method and no migration.
- **`funnel.ts` stops keeping its own copy of the door's per-page rule.** It held a
  local `Measured` type, a `NOTHING_MEASURED` constant and a `silenceOf` that
  ordered the same three states in the same way as `doorOf` — three spellings of
  what `door.ts` was created to hold once (0265). It now calls `doorOf`, which is
  also what gives the leak a `PageDoor` to scale against.
- **Two other ranking keys still spell the door's scale by hand and must not be
  changed to this rule without a guard.** `deployment.ts` and
  `deployment-change.ts` both write `x ÷ (1 + inflation)`, which is `atDoorScale`
  mathematically. Neither refuses a door with no appearances, which `atDoorScale`
  is documented as requiring, so swapping them would turn a sound nought into a
  `NaN`. Filed rather than taken.
- **The interval is a published shape a fourth order would have to answer for.**
  A bounded key is the first figure in this subsystem that a ranked order can be
  made of in two ways, and the record's answer is that 0333's key stands. A future
  order ranking on a floor is a new record, not a flag.

## Alternatives considered

**Rank on the floor, and keep `counts-inflated` out of it.** The attractive one: a
floor cannot be manufactured by a short window, so the fault would stop withdrawing
pages and the order would survive a badly configured deployment. Refused. It is a
different key for the same question, and 0333 names the key; a page that loses four
hundred readers with a wide interval would sort below one that loses six with a
narrow one, which answers *what am I certain of* rather than *what should I fix
first*. The floor is published so a surface can ask the first question; the order
goes on answering the second.

**A `bounded` or `exact` flag on the row instead of a second figure.** Cheaper, and
it says only that the number is uncertain. The whole value is in *how* uncertain: a
page whose interval is `[59, 60]` and one whose interval is `[0, 60]` would carry
the same flag and are not the same page. The flag is also already derivable —
`readersAtLeast === readers` — so publishing it would be two statements that can
come to disagree.

**A third order, ranked on the floor, beside the two.** Refused for the reason the
fourth rung over a window was refused on 2 November: nothing draws either of the two
orders yet, and a third would be a surface's choice wearing the framework's name.
`worstSecure` is the one comparison a screen genuinely cannot make for itself
without re-deriving the sort, and it is one boolean.

**Bounding the loss from the counts rather than from the rate** —
`max(0, lost − 2 × drift)`, the worst case of both counts applied at once. It is a
valid floor and a looser one, it needs its own argument about what a drift can do to
a conjunction, and it would be a second spelling of the worst case `rateCeilingOf`
already encodes with its own recorded reasoning. The rate's interval is the one this
subsystem has already decided on; the leak is read off it.
