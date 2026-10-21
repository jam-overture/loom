# 0303 — What two forms' readers *do* is the same pair at a different counter, and the page has one honest figure

**Status:** Accepted

**Date:** 21 October 2026

**Section:** §4c (reader signals)

## Context

[0302](0302-two-forms-of-one-page-are-compared-at-each-forms-own-share-and-neither-side-is-earlier.md)
built `formComparisonOf`: two forms of one page (0263), told apart by the column
0284 put on the rows, held against each other on each part's **reach**. It also
named, in its own closing paragraph and in a finding filed the same morning, the
two questions the same join answers with no new input — *the words a part says,
form by form* and *what readers did inside a part, form by form* — and did not
build either, for a stated reason:

> Three readings of one shape in one unit is how a rule comes to be spelled
> three times and agreed with by two of them.

The finding also set the order: **one reading, then a second that proves the
guards are importable rather than copyable**, with `audiences.ts` as the place
anything the two share is published from. This record is that second reading and
that proof. The words comparison stays filed.

Two facts about the subsystem made this the right one to take second rather than
the words one. The action counters — `engaged` against `reached` (0242),
`within` inside a kind (0265) — are the only ones with a **structural
withholding rule** of their own, so a second reading over them tests whether the
pair's rules and the counter's rules can be kept apart. And they are the only
ones whose page-level figure is a single row rather than a sum, which turned out
to reach a clause of 0302.

## Decision

### The five refusals are facts about the pair, and they move to `audiences.ts`

`FormPairRefusal` — `different-pages`, `unsplit`, `unattributed`,
`one-population`, `different-revisions` — and `formPairOf`, which settles the
order of the two sides and applies the five in order, are published from
`audiences.ts`. `forms.ts` imports both; `FormComparisonSilence` is now
`FormPairRefusal | "nothing-measured"` and its five members' reasons are read
where they are decided.

Every clause 0302 argued for is about the **pair** and not about the counter: one
page, one revision, two provable populations, and no fact about which of the two
comes first. A second comparison of two forms restates none of them, so a second
copy of them would be a second thing to disagree with the first — which is what
`readingKeyOf` and `formKeyOf` exist to stop one level up, said at the
comparison. `formComparisonOf` is byte-for-byte the same function from its
caller's side, which is asserted by its own suite passing unchanged.

### The figure is `within ÷ reached`, and it is withheld where that reading already withholds it

`formActionComparisonOf(one, other)` derives `pageActionOf` on each side and
compares `PartAction.share`. Both terms are distinct page-view counts off **one
row**, so the straddle over-count (0147) is very nearly common to numerator and
denominator and divides out before two populations meet — the same cancellation
0221 gives a fall and 0302 gives a reach share.

The withholding is **one check where the reach comparison needs two**.
`PartAction.share` is already absent on a leaf, on a part with no row and on a
part nobody reached, which are exactly the three states its standing calls
`unknown`; a withheld share and an unknown standing are the same fact said twice
and never disagree. So this reading relies on that guarantee rather than
re-deriving 0282's rule over a second pair of fields.

### A sender that does not walk withholds every gap, where in a before-and-after it only names the state

`PageAction.unwalked` is a window holding uses that credits no reader with acting
inside anything — a sender whose delegated signals carry no `within` (0167), a
server synthesising batches, a fixture replayed. Every share on that side is a
**nought that is a filing artefact**.

`actionChangeOf` names that state and leaves its ratios computed.
`formActionComparisonOf` withholds every gap on every shared part while either
side is unwalked, and the parts fall into `unknown`. The two sides here are two
**populations**, so the spurious nought reads as *this audience does nothing on
your page* rather than as a window to distrust — the most confident wrong
sentence this reading could print, and the same argument 0282 makes about an
unknown standing reaching a state it was not written for.

`unwalked` is checked **before** `nothing-measured`. A single window reaches both
guards — no page views, with presses filed against its parts — so the order is a
decision and not reading order, and the fixture that reaches both is written
(the rule this lane wrote down on 20 October). A sender in that state is a sender
that is not one, and *this window does not report where actions happened* is the
sharper of the two things to say about it.

### The page as a whole has one honest figure here, where 0302 refuses one

0302 clause 5 refuses a page-level verdict for two reasons: a mean over parts
charges one reader once per part they got through (0147, 0167), and two forms do
not have the same parts, so two such means have two denominators that are not the
same page.

**Neither reason reaches the root.** Every action anywhere on a page is strictly
inside the root (0242), so the root's own row is the distinct page views in which
a reader did anything at all — one row, one division, no addition. `whole` is
that row held against itself across the two forms, and *three in ten skiers do
something on this page and one in ten riders do* is the only page-level claim
either form comparison makes.

It is kept out of `sharpest`, because the page contains every part it would
outrank — `pageActionOf` treats `mostIgnored` the same way and for the same
reason. It stays **inside** `counted`, because that is a census of the shared
parts and a census that leaves one out does not account for the page.

### `insideDisagreed`, because a withheld share needs a cause the counters cannot give

A share is withheld on a part with no element parts under it for a structural
reason. Two forms of a page need not give a node the same inside, so a band the
deltas filled for one audience and left bare for the other lands in `unknown`
with nothing saying why. `insideDisagreed` names those nodes, beside `disagreed`
for the nodes the two forms give different types. Both are facts about the deltas
rather than about either readership, and both are reported rather than dropped.

### The nineteenth silence set brings no condition

`FormActionSilence` reports seven states and every one of them was already in
0240's table: five from the pairing rule, `no-action-credited` from the action
comparison, and the door's `no-view-reported`. It is the first set since the
fourth to declare nothing of its own, which is the shape worth having — the
alternative was seven more names for seven states a surface can already print one
sentence for. `no-action-credited` arriving a second time is the evidence that
the condition the action comparison declared was about the **sender** rather than
about that comparison.

## Consequences

- Two comparisons of two forms now share one pairing rule, so a correction to it
  lands in both. A third — the words comparison, still filed — costs its figure
  and its own silences and nothing else.
- A deployment serving two audiences can ask *do these readers behave alike
  here*, part by part, with one page-level sentence over it and no reader
  counted twice anywhere in the arithmetic.
- **Nothing was added to a payload, a browser, a column, a store or the
  vocabulary of kinds.** `broadcast.ts` was not touched and is byte-identical.
  This is the thirty-fourth thing taken out of the server-side join rather than
  collected.
- `actionChangeOf` is now the only reading in the subsystem that computes a
  ratio across an unwalked side. It is filed rather than changed here: the
  argument for withholding there is about two windows of one readership and is a
  different argument, and taking it in this unit would have been two decisions in
  one record.
- Per-reader identity is no further away. Nothing in this reading knows or wants
  a reader id: both figures are distinct-view counts filed against a node, and an
  opt-in identified window would be read by this same function.

## Alternatives considered

- **Copy the five guards into the new module.** Rejected, and the finding that
  asked for this unit named it as the thing to avoid: the first copy to disagree
  with the original is a reading that refuses a pair the other compares, with
  nothing failing to compile. The copy is also cheaper to write than the import,
  which is why it needed a record rather than a judgement call.
- **Take the words comparison second instead.** Rejected. Both prove the guards
  are importable; only the action counters have a withholding rule of their own,
  so this one also proves the pair's rules and the counter's rules stay apart.
- **Publish a page-level mean of the per-part shares.** Rejected for 0302 clause
  5's two reasons, which this record does not weaken: `whole` is one row, not a
  mean, and no sum over parts is published anywhere in this reading.
- **Leave the gaps computed on an unwalked side and let the silence carry it.**
  Rejected: that is what `actionChangeOf` does, and a surface drawing the rows
  without reading the silence would print a difference between two populations
  that is a filing rule. A figure cut to fit a fault is a fault made undrawable;
  a figure withheld on account of one is a fault made visible.
- **A `hollow` standing rather than `insideDisagreed`.** Rejected as premature:
  the fact is a property of the pair rather than of either side, and
  `ActionStanding` is a reading's own three-valued answer that two more members
  would make four-valued for every existing caller.
