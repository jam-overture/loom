# Reader signals — the readers who met it, before and after

**Routine:** `Loom signals` · **Date:** 2026-10-14 (morning run) · **Branch:**
`signals-30-the-readers-who-met-it-before-and-after` · **Section:** §30 of
[`docs/signals.md`](../docs/signals.md)

## What I completed

`libraryReachChangeOf(was, now)` in
[`src/signals/library-reach-change.ts`](../src/signals/library-reach-change.ts):
*of the readers who met your testimonial band, the share that read it has gone
from four in ten to seven — and it is the readers who moved, not the traffic.*

It is the **twentieth** thing taken out of what this subsystem already knows
rather than collected. **Nothing was added to a payload, a browser, a column, a
store or the vocabulary of kinds**, and the broadcaster was not touched —
measured both sides and byte-identical at **6,477 bytes minified / 2,934
gzipped**.

It is the unit this lane filed on 12 October, the morning §26 landed, rather than
shipping a corrected number beside an uncorrected one on the same type. Five
readings of a library now stand on one list of `PageReading`s:

| | |
| --- | --- |
| the **places** a kind stands, and how many were reached | §23, 0257 |
| the **readers** who met those places, and how many read it | §24, 0256 |
| **those readers**, and how many acted inside it | §25, 0265 |
| what a change did to those **places** | §26, 0266 |
| what a change did to the **words** those places kept | §27, 0270 |
| what a change did to **those readers** | §30, 0276 — new |

### The question the places comparison could not be asked

§26 compares a kind of part over the places both windows bore, and the
denominator it chose is the reason it is sound: a count of **places** has no
reader in it and no rollup window in it, so once the places are paired it is the
same number on both sides and a verdict is the sign of a subtraction of two whole
numbers.

What it cannot say is anything about readers. A quote that stands in one place,
was read in that place and is read in it still is `held` — while three readers in
ten who met it and did not read it now do. That is the movement an author who
rewrote the component is asking about, and the only reading that had it was a
single window's.

### Why it needed a record rather than a field

**The weights move.** A weighted mean over the same places still moves when one
page's traffic grows and another's shrinks, so a movement in it is readers
reading differently *or* the pages they were on changing — 0251's counterfactual
problem one level across. The sharpest case is in the suite: two pages swap their
traffic, every place is read exactly as well as it was, and the figure falls from
0.74 to 0.26. A card printing that as *your testimonial band lost half its
readers* would be printing a traffic report.

It is answered the way §19 answers which side of a division moved — by
**sufficiency rather than magnitude**, because *which moved more* needs a
threshold and sufficiency needs none. Two counterfactuals are published, each
asked only whether it carries the movement's own direction:

- `ifTrafficHeld` — the later window's per-place shares at the **earlier**
  window's weights. It isolates the readers.
- `ifReadingHeld` — the earlier window's shares at the **later** window's
  weights. It isolates the mix of pages.

So the cause is `readers`, `pages`, `either` or `together`, with a sentence each,
and no number anywhere decides what *enough* is.

## Decisions I took that the plan did not specify

**No additive split of the movement, and the reason is arithmetic rather than
taste.** The obvious shape — *this much of the movement was readers and this much
was traffic* — exists twice and the two disagree: the shift adds up exactly from
either counterfactual, and the two decompositions differ by the interaction term,
weight moving toward the places whose reading moved. A figure a surface would
quote as *this much was traffic* must not depend on which factor the framework
moved first. There is a test that computes both and asserts they differ. What is
published instead is `weightMoved` — 0247's mix figure over places rather than
regions, **published and never judged**, because the counterfactuals already say
whether the weights carried the movement.

**No ceiling on either side.** §24 publishes `atMost` beside its share, taken of
the exact openings. Two ceilings do not bound a difference, and a surface handed
both would print their subtraction as a movement nobody measured. Each side's
`drift`, `pending` and `unreconciled` travel instead, and `exact` is true only
where all six are nought.

**A side is not a silence condition.** One page can be scalable in one window and
not in the other, and which window it is is the whole of the remedy — a missing
row in the earlier window is retention, and a missing row in the later one is a
collection that has stopped. So the unscalable pages are published with a `side`
and the page's own vocabulary's reason on them, and the fourteenth silence
vocabulary adds no condition and no subject.

**The verdict is the sign of a difference of two shares**, which is the opposite
of §26's rule for the opposite reason: there one count of places serves both
sides, here the two denominators are two windows' traffic. I wrote down the
honest limit rather than inventing a guard for it — two shares that are the same
number are `held`, and a difference smaller than the last bit of a float is
reported as a movement. The identity case is pinned by a test: one window handed
in as both sides is `held` everywhere with `shift` exactly 0.

**One rule written once instead of a third time.** The scale a page's door counts
in — `min(appearances, opened)` and the three states a row can be in — was two
hand-written copies (§24, §25) and this reading would have been a third. It is
now [`src/signals/door.ts`](../src/signals/door.ts) with five tests of its own,
and all three readings import it; the pairing of two windows is published from
`library-change.ts`, whose record owns it, rather than copied. This is the remedy
the four counter tables' upsert keys got in `counters.ts`, for the same reason:
two spellings of one rule that agree today are a thing this subsystem has been
bitten by.

## Records

- [0276](../decisions/0276-a-kinds-share-of-the-readers-who-met-it-is-compared-at-each-windows-own-weights-and-a-counterfactual-says-which-side-moved.md)
  — *A kind's share of the readers who met it is compared at each window's own
  weights, and a counterfactual says which side moved.* Accepted; nothing is
  superseded and nothing in it needs built code migrated.

**On the number.** 0274 is a hole on `main` and is claimed by **two** open pull
requests — #627 (this lane's own, from last night) and #628 — so I took 0276,
the next number above the highest record on `main`. It leaves 0274 reported as a
hole on this branch, which 0097 allows, and it means this record cannot be the
third claimant of a number already being renumbered twice.

## Findings

**Closed:** this lane's 12 October entry on the reader-weighted comparison, built
here as it proposed it, with the two things it left open decided and written into
the entry.

**Filed:** for `Loom portal` — the third share a kind of part now has, the one
field that must be drawn beside it rather than behind it (`cause`), and three
things the screen must not do, each of which is a refusal in the record rather
than an oversight in the filing: no subtracting two ceilings, no printing
`readersMoved` as people, nothing added across kinds.

**Left open deliberately:** the lane's 12 October entry on the **word-weighted**
figure (*the typical reader reached two hundred of its words and reaches three
hundred now*). It is a third unit, it needs 0239's per-placement intersection
first — which is the other open entry of 12 October — and its weights move for
exactly the reason these do, so it now inherits this record's method rather than
needing a new argument. That is written into 0276's consequences so the next run
does not re-derive it.

## Tests

`pnpm verify` **green, exit 0** — nothing skipped, nothing weakened, no `any`,
no new `eslint-disable`.

| suite | tests |
| --- | --- |
| `src/signals/library-reach-change.test.ts` | 26, new |
| `src/signals/door.test.ts` | 5, new |
| `src/signals/silences.test.ts` | 46, the fourteenth vocabulary registered |
| `src/signals` | 1,007 across 38 files |

**Twelve mutations were planted and two of them survived the first pass**, which
is the useful half of the exercise. The ten caught immediately: the
counterfactual's weights swapped, a per-place share taken off the other side's
row, a place one window cannot speak for counted as a nought, `still-unread`
collapsed into `held`, a door blocked on one side ignored, a kind withheld for a
subset instead of whole, `weightMoved` not halved, the cause attributed by
magnitude rather than sufficiency, a duplicated door row added rather than
ignored, and a kind's terms taken against the other window's appearances.

The two that survived, and the tests they produced:

- **the weight taken from `appearances` instead of the door's scale** — the
  single most important property of §24's arithmetic, and no case distinguished
  it because every fixture had `appearances === opened`. The test now builds a
  window whose busy page straddles its rollup boundary threefold and asserts the
  share is 0.5 rather than 0.75, with the movement nought: *a short window in one
  of the two windows invents no movement*.
- **the movement stated at the earlier window's scale** — every fixture had the
  two scales equal. The test now compares a window of 100 arrivals against one of
  200 and asserts `readersMoved` is 60 and not 30.

Every planted mutation was re-run after the arithmetic was reordered to match
0256's published order of operations — `reached × counted ÷ appearances`, so that
a surface drawing one window's share beside this comparison's `shareNow` is
drawing the same number to the last bit, which is its own test and asserted with
`toBe` rather than closely.

## Browser cost

**Nothing new runs in a browser.** Measured both sides from a clean
`git archive` of `origin/main`: the broadcaster bundles to **6,477 bytes
minified, 2,934 gzipped** on `main` and on this branch, and `cmp` reports the two
bundles byte-identical. The reading is server-side arithmetic over counters that
already exist; `browser-weight.test.ts` still finds no package in the
broadcaster's import graph.

## Open questions

Nothing blocking. Two things worth your eye, both with a recommendation in the
pull request comment: whether `weightMoved` should ever become a refusal
threshold the way 0247's `moved` is (I think not, and the record argues it), and
whether the two filed word-weighted units are one unit when they come back (I
think they are).

## On the door that is parked

Nothing in this unit touches per-reader identity and nothing in it makes adding
that gate later more expensive. The arithmetic is over page views at the door's
scale, which is a count of deliveries and not of people, and the one place a
person could have been introduced — a headcount to rank the rows by — is
deliberately `readersMoved` at the door's scale instead, for the reason 0256 gave
on 11 October.
