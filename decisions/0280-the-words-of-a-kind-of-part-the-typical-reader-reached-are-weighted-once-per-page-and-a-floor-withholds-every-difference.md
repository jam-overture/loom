# 0280 — The words of a kind of part the typical reader reached are weighted once per page, and a floor withholds every difference

**Status:** Accepted

**Date:** 14 October 2026

**Section:** §4c (reader signals)

## Context

Three readings already compare a kind of part across two windows, and each
answers something the others cannot.

[0266](0266-a-change-to-a-kind-of-part-is-read-over-the-places-both-windows-bore.md)
compares the **places** it stands — the one denominator in this subsystem with
no reader in it, which is why its verdict is the sign of a subtraction of two
whole numbers.
[0270](0270-a-change-to-the-words-a-kind-of-part-says-is-read-over-the-words-both-windows-say-and-a-floor-costs-the-signed-figure.md)
compares the **words** it kept, by standing: a word counts as read where at
least one reader reached the part saying it.
[0279](0279-a-kinds-share-of-the-readers-who-met-it-is-compared-at-each-windows-own-weights-and-a-counterfactual-says-which-side-moved.md)
compares the **readers** who met it against the readers who read it.

None of the three can say *the typical reader reached two hundred of its words
and reaches three hundred now*, and that is the sentence an author who rewrote a
component asks. A share of words says how much of a kind is read **somewhere**;
this says how much of it **one reader** gets to, which is the figure that moves
when readers read further into something nobody newly discovered.

This unit was filed by this lane on 12 October, the day 0270 landed, and was
filed rather than shipped inside 0270's type for the reason 0256 was filed
rather than shipped inside 0257's. The entry named two things it left open: the
weights move, and a floor behaves differently at this scale than at one page's.
Both are settled here.

## Decision

`libraryWordReachChangeOf(was, now)` in
[`src/signals/library-word-reach-change.ts`](../src/signals/library-word-reach-change.ts)
publishes, per kind of part and for the library as a whole, the carried words
the typical reader who met it reached in each window. It takes two
`LibraryWindow`s — each window's readings and the whole window of page-view rows
behind it — because the figure needs the door on both sides.

Nothing is added to a payload, a browser, a column, a store or the vocabulary of
kinds. It is the twenty-first figure this subsystem has taken out of what it
already knows.

### The unit is the page, and that is the structural difference

A share of the readers who met a kind is a weighted mean of **per-place** shares
(0256, 0279), so its weight is added once per place the kind stands. A count of
words is not a share. A part's own words partition its page exactly once
([0212](0212-what-a-reader-signal-means-is-joined-to-the-tree-when-it-is-read.md),
[0235](0235-how-much-of-a-page-gets-read-is-a-share-of-words-that-partition-it-and-the-typical-reader-is-a-ceiling.md)),
so the words of two placements of one kind on one page **add**, and what a
reader reached is their sum rather than either one.

So the term is a page's whole carried word mass for that kind, and the weight is
added **once per page**:

- the mass, `Σ readers × words` over the carried passages both windows can speak
  for, put on the door's scale as `mass × counted ÷ appearances` — the scaling a
  share of readers uses, in the published order (0256);
- the weight, `counted` — `min(appearances, opened)`, the page views a rollup
  folded.

The figure is their quotient: reader-words over page views, which is words per
reader at the door's scale.

Adding the door once per placement would weight a page by how many times the
kind happens to stand on it, which is a fact about how the page was written and
not about how it is read.

### Two things follow from the unit being the page

**A figure for the whole library is publishable here and is not publishable in
0279.** Words partition and places do not, so adding every kind's carried words
reads no sentence twice, where adding every kind's places counts a page once per
element node (0257). So `LibraryWordReachChange.words` is the whole library's
own figure, taken down either key with the same answer. A recast place is in
neither kind's words and in none of the whole's: it is a place one kind left and
another took.

**There is still no movement and no silence for the whole.** Every reason this
reading publishes is about one kind of part, and a reason about the library
would be a second subject on one vocabulary
([0240](0240-a-silence-is-a-condition-and-a-subject-and-the-two-names-for-one-state-were-not-synonyms.md)).

### The weights move, and the answer is the one already written

0279's method, unchanged and at a different unit. `ifTrafficHeld` is the later
window's per-page rates at the earlier window's weights and isolates the
readers; `ifReadingHeld` is the earlier window's rates at the later window's
weights and isolates the mix of pages. Each is asked only whether it carries the
movement's own direction, so the cause is `readers`, `pages`, `either` or
`together` and **no threshold decides anything**
([0244](0244-a-pace-moved-because-the-words-moved-or-the-readers-did-and-a-counterfactual-says-which.md)).

The sufficiency verdict is 0279's published type rather than a second copy of
it, and so are the door-on-both-sides window and the weight-movement figure:
three rules one module owns and a second module imports, which is the remedy the
door's own scale got when a third reading needed it.

### A floor withholds every difference and leaves both levels standing

0239 found what a floor costs at one page and withheld exactly one figure for
it: a **single** passage's gain survives, because one factor scales it and a
scaling toward zero cannot change a sign, and the page's total does not, because
it adds signed terms that floors scale by **different** factors.

Every figure here is a sum over passages, so the rule is stated once rather than
enumerated:

- **A level survives a floor and is published as one.** Each side's terms are
  non-negative, so a floor can only scale it down: `typicalWas` and
  `typicalNow` are floors on what the typical reader really reached, and
  `floored` says how many passages are in doubt.
- **A difference does not, and is withheld.** `shift`, `wordsMoved`, both
  counterfactuals and `cause` all answer by subtraction, so all five go. The
  counterfactuals are levels on their face and are withheld with the rest,
  because the only thing anybody does with one is subtract a level from it.
- **The weights survive whole**, because there is no word in them.
  `weightMoved` is published under a floor like any other.

### The floor is triggered on passages and never on words

A part that declares no `copy` at all says nought visible words and hides all of
them ([0122](0122-a-primitive-says-which-of-its-props-a-reader-reads.md)), which is
the commonest floor there is. A trigger counted in words stays nought for
exactly the case it exists for.

**0270 had this fault and it is fixed here**, in the same change: a kind whose
floored placements all declared nothing published a signed figure and a verdict
nobody could stand behind. 0270 is not superseded — the rule it states is the
rule, and what moved is the number the rule is read off.

### What is refused

**A word nothing can be said about, counted as nought.** A carried passage
`unknown` on either side is in no term. A press delegated to a band that no view
ever named is a reader who plainly had it in front of them and a counter that is
missing, and reading that as nought reader-words understates the figure in the
direction nobody checks. Those words are published as `unspoken` instead, and
every figure is taken over the passages both windows can speak for — one set, so
the same set on both sides.

This is where the library figure and 0239's page figure differ, and they differ
on purpose: a page's own comparison counts an `unknown` passage as nought
reader-words on each side. Over one page whose door folded every view exactly
once and every carried passage of which is spoken for on both sides, the two are
the same number to the last bit, which the suite asserts with `toBe` — the
divergence is the `unknown` passages and nothing else. (No stronger identity is
claimed: a page the door had to scale puts a multiplication and a division
between them, and three floats in two orders agree to fifteen places and not to
sixteen.)

**A figure over the pages that could be scaled.** A kind standing on one page
the door cannot scale, in either window, has no figure — *of the pages we could
price* is not a sentence a surface prints (0256). The pages that caused it are
published once with the side they are on and their own vocabulary's reason.

**A rewritten passage in any mass.** A word-weighted figure needs one word count
and a reworded passage has two, so it is counted in `rewritten` and is in no
term (0239).

**An additive split of the movement**, for 0279's reason: there are two of them,
they differ by the interaction term, and a number a surface would quote as *this
much was traffic* must not depend on which factor the framework moved first.

### The fifteenth silence vocabulary

`KindWordReachChangeSilence` has eight members assembled out of four sets, and
brings no condition that was not already published: the census's `unplaced`, the
places comparison's `unpaired`, the door's three said of a kind, 0270's
`wordless` and `floored`, and `unread`.

`floored` is the member worth reading twice. It is the same condition 0239 and
0270 report, at the same subject as 0270's, and it withholds **five** figures
here where it withholds one there. One state of the world, two costs — which is
why what a silence withholds was never published in `silences.ts` and belongs to
the reading that reports it.

## Consequences

- A deployment can ask *how far into this kind of part does a reader actually
  get, and is that further than it was* — and can be told whether the answer is
  its readers or its traffic.
- The portal has a third share and a second mass per kind of part. `cause` is
  the field that must be drawn beside the figure rather than behind it: a
  `pages` verdict is not a sentence about the library at all.
- The whole-library figure is the first reading-wide number any library
  comparison publishes. It is safe only because words partition; nothing about
  it generalises to a reading whose unit is the place.
- Three rules are now imported from the module whose record owns them rather
  than copied: the door-on-both-sides window, the sufficiency verdict and the
  weight-movement figure. A fourth reading of a library needs none of them
  written again.
- The word-weighted figure was the last of the three units filed on 12 October.
  Nothing in this lane's queue now depends on a figure that does not exist.
- Nothing here touches per-reader identity and nothing in it makes adding that
  gate later more expensive. Every term is a count of page views and of words,
  never of people.

## Alternatives considered

**A field on 0270's type.** Rejected for the reason 0256 was not a field on
0257's: one type carrying a figure that needs no door and one that needs four
numbers per page per side, with nothing but prose to tell a surface them apart,
is a type a surface reads past. The withholding rules differ as well — 0270
withholds one figure under a floor and this withholds five.

**Weighting once per placement**, for symmetry with 0279. Rejected: it weights a
page by how finely it was written. A kind standing three times on a page would
count that page's readers three times against a mass counted once, and the
figure would fall by two thirds with nobody reading anything differently.

**Publishing an additive split of the movement.** Rejected as 0279 rejected it,
and the same test is in the suite: the two decompositions are both exact and
they disagree.

**Withholding the levels under a floor as well.** Rejected because a floor on a
sum of non-negative terms is a floor and not a fault: *at least this many words*
is an answer, and withholding it would lose the only thing that survives.

**Publishing a ceiling beside each level.** Rejected for 0279's reason: two
ceilings do not bound a difference, and a surface handed both would print their
subtraction as a movement nobody measured. Each side's `drift`, `pending` and
`unreconciled` travel instead, and `exact` is true only where all of them and
the floor are nought.

**Counting an `unknown` passage as nought reader-words**, which is what one
page's own comparison does. Rejected at this scale: at one page the figure is
withheld wholesale for a window with no views, so the case is rarer there; at a
library a single pressed-but-never-viewed band on one busy page would drag the
whole figure down and look like readers reading less.

**Fixing 0270's floor trigger as a separate change.** Rejected because this
reading had to decide the same question to exist, and two modules disagreeing
about when a floor bites is the kind of drift the counter tables' upsert keys
were moved into one module to prevent.
