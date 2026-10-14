# 0276 — A kind's share of the readers who met it is compared at each window's own weights, and a counterfactual says which side moved

**Status:** Accepted

**Date:** 14 October 2026

**Section:** §4c (reader signals)

## Context

[0257](0257-a-kind-of-part-is-read-across-the-places-it-stands-and-the-unit-is-the-placement.md)
reads a kind of part over the places it stands, and
[0256](0256-a-kinds-share-of-the-readers-who-met-it-is-a-weighted-mean-of-sound-shares-at-the-doors-scale.md)
reads it over the readers who met it: a weighted mean of each page's own sound
share, every term put on the scale its door counts in. Both answer about **one
window**.

[0266](0266-a-change-to-a-kind-of-part-is-read-over-the-places-both-windows-bore.md)
compares two windows of the first, over the places both windows bore. It is
explicit about what it is not: *of the readers who met your testimonial band,
the share that read it has gone from four in ten to seven* needs the door on
both sides, and was filed rather than shipped inside 0266's type for the reason
0256 was filed rather than shipped inside 0257's — one type carrying a
reader-free figure and a reader-weighted one, with nothing but prose to tell a
surface them apart, is a type a surface reads past.

The filed entry also named the thing that makes it hard, and it is the whole of
this record. **A weighted mean over the same places still moves when the pages'
traffic moves.** A kind read well on a page that got busier is a kind whose
weighted share rose with nobody reading anything differently — the
counterfactual problem
[0251](0251-a-change-to-what-readers-did-is-a-ratio-of-two-shares-and-an-inside-a-change-gave-a-part-is-not-a-reader.md)
wrote down for one page's occurrences, one level across.

Two further facts bound the design. The straddle over-count
([0147](0147-a-rollup-is-added-to-what-is-stored-and-a-distinct-view-count-is-therefore-approximate.md))
divides out inside a page's own share and nowhere else, because the straddle
rate is each page's own (0250, 0256) — so it does not divide out between two
windows either. And the pairing a comparison of a library needs already exists:
0266 pairs pages by tree and placements by node, excluding a tree held at two
revisions in one window because it has no single counterpart in the other.

## Decision

**A reader-weighted comparison is its own reading**, `libraryReachChangeOf(was,
now)` in `src/signals/library-reach-change.ts`, taking each window as its
readings and the page-view rows that scale them. Nothing is added to a payload,
a browser, a column, a store or the vocabulary of kinds: it is the twentieth
figure derived from what the subsystem already holds.

**The places are held still by 0266's rule and each side is scaled by 0256's.**
Every figure is taken over the placements that stand in both windows, of the
same kind on both sides, with a verdict on both sides. Each side's per-place
share is `reached ÷ appearances` off that side's own row, weighted by
`min(appearances, opened)` — the page views that side's rollups folded, at its
door's scale. A placement only one side bears is counted as gained or lost and
is in no share.

**The movement is attributed by sufficiency, not by magnitude**, which is
0244's method for the two sides of a pace. Two counterfactuals are published:
`ifTrafficHeld`, the later window's per-place shares at the earlier window's
weights, and `ifReadingHeld`, the earlier window's shares at the later window's
weights. Each is asked whether it carries the movement's own direction, and
`ReaderShareCause` says `readers`, `pages`, `either` or `together`. No threshold
decides anything, which is why there is no dial here for *how much counts as a
move*.

**No additive split of the movement is published, and the reason is
arithmetic.** The shift is exactly `(ifTrafficHeld − shareWas) + (shareNow −
ifTrafficHeld)` and exactly `(ifReadingHeld − shareWas) + (shareNow −
ifReadingHeld)`; the two decompositions differ by the interaction term
`Σ (bₚ − aₚ)(sₚⁿᵒʷ − sₚʷᵃˢ)` — weight moving toward the places whose reading
moved. Publishing either pair would put a number on *how much of this was
traffic* that an equally valid ordering contradicts. `weightMoved` is published
instead: half the sum of the absolute movements in each place's share of its
side's weight, which is
[0247](0247-a-readership-comparison-is-built-from-two-floored-maps-and-the-mix-is-the-only-figure-with-no-window.md)'s
figure for a readership, over places rather than regions. It is **published and
never judged**.

**No ceiling is published on either side.** 0256 publishes `atMost` beside a
share, taken of the exact openings. Two ceilings do not bound a difference, and
a surface handed two would print their subtraction as a movement nobody
measured. The evidence behind the two estimates travels instead as each side's
`drift`, `pending` and `unreconciled`, and `exact` is true only where all six
are nought.

**A kind standing on one page the door cannot scale, on either side, has no
share at all** — 0256's refusal, not a share over the pages that could be
scaled. The pages that caused it are published once for the reading, each with
the **side** it is unscalable on and the reason in the page's own vocabulary.
The side is a fact about the page and deliberately not a fourteenth silence
condition: one page can be scalable in one window and not in the other, and
which window it is is the whole of the remedy.

**The verdict is the sign of a difference of two shares**, which is the opposite
of 0266's rule and for the opposite reason: there the denominator is one count
of places on both sides, so a subtraction of two whole numbers is the answer;
here the two denominators are two windows' traffic and the shares are the only
comparable pair. Two shares that are the same number are `held` — the state a
window compared against itself is in — and a difference smaller than the last
bit of a float is reported as a movement rather than as `held`. No threshold is
invented to prevent that: `shift` is published, and the comparison with no
division in it is 0266's.

**The scale a door counts in is now written once.** `doorOf` was two
hand-written copies of one rule (0256, 0265) and a third reading needed it, so
it lives in `src/signals/door.ts` and the three readings import it — the remedy
the counter tables' upsert keys got in `counters.ts`, for the same reason. The
pairing of two windows is published from the module whose record owns it
(`pairedWindowOf`, `partsByNodeIn` in `library-change.ts`) rather than copied.

## Consequences

A deployment can ask *of the readers who met this kind of part, has the share
that reads it moved* and be told, with the one answer that could otherwise be a
traffic report in disguise separated out by name. The `pages` cause is the
attribution a single weighted figure hides, and it is reachable with no reader
having read differently — two pages swapping their traffic moves the figure by
half its range.

Three readings of one library now stand side by side and answer differently on
purpose: the places comparison (0266) says *in how many of the places this kind
stands has it gained or lost its reading*, the words comparison
([0270](0270-a-change-to-the-words-a-kind-of-part-says-is-read-over-the-words-both-windows-say-and-a-floor-costs-the-signed-figure.md))
says what became of the words it kept, and this one says what became of its
readers. A surface drawing two of them is drawing two questions, and the
silence mapping (0240) is what tells one state from two across them.

The fourteenth silence vocabulary brings no new condition and no new subject,
which is 0240's claim holding again: a comparison is withheld for every reason
one side's figure is withheld and for no reason a window can be in alone.

Nothing in `src/primitives/` declares a role (0114), so the role rows here are
the `null` row — the eighth consumer of that declaration, and in this one the
role rows are the only place a recast component's readers are compared at all.
The join is at read time (0212), so the day a type declares a role every counter
already stored reinterprets.

The word-weighted version of the same question — *the typical reader reached two
hundred of its words and reaches three hundred now* — is **not** this, is filed,
and needs 0239's per-placement intersection first. Its weights move for exactly
the reason these do, so it inherits this record's method rather than needing a
new argument.

## Alternatives considered

**A field on 0266's type.** Rejected for 0256's reason, which is now twice
tested: a reader-free share of places and a reader-weighted share of readers on
one row differ by an order of magnitude and are told apart by prose, and prose
is what a surface skips.

**Attributing by magnitude** — *which factor moved more*. Rejected: it needs a
threshold on what counts as a move, which is a dial the framework would be
inventing, and it is answerable only after choosing one of two decompositions
that disagree.

**Publishing one decomposition as the attribution.** Rejected as above: the
split is order-dependent, and a figure a surface would quote as *this much was
traffic* must not depend on which factor the framework happened to move first.

**Weighting by appearances rather than by the door's scale.** Rejected and
tested against: a rollup window shorter than the visits it measures inflates one
page's appearances, so weighting by them would weigh the pages readers linger on
most heavily and a shortened window in one of the two windows would invent a
movement. 0250's correction, which this is the second comparison to need.

**A share over the pages the door could scale.** Rejected, 0256's refusal
unchanged: *of the places we could price* is not a sentence a surface prints.

**A fourteenth silence condition for a side.** Rejected: a side is not a state
of the world. The door's three states are the same three whichever window they
are true of, and the window is published on the page the reason is about.

**A threshold on `weightMoved`, past which the comparison is refused.**
Rejected. 0247 has one for a readership because its figure *is* the mix, so a
mix that moved too far leaves nothing to compare. Here the mix is a weight on
somebody else's figure, and the counterfactuals already say whether it carried
the movement — a refusal would withhold a sound comparison because its weights
moved in a way that did not matter.
