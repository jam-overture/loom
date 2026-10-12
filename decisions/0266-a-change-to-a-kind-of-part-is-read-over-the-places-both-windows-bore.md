# 0266 — A change to a kind of part is read over the places both windows bore, and that is the one denominator here with no reader in it

**Status:** Accepted

**Date:** 12 October 2026

**Section:** §4c (reader signals)

> **Renumbered on 2026-10-12 by `Loom merge`**, from 0263, when the branch that
> carried it (#586) was merged. `main` had meanwhile accepted a different 0263 —
> *a page is a base tree and the deltas an audience earns* (#602) — and two
> records sharing a number is fatal
> ([0097](0097-a-hole-in-the-numbering-is-reported-and-a-clash-is-fatal.md)).
> Nothing in it changed but the number, and the citations that mean it were
> updated with it.

## Context

Three readings answer about a deployment's **library**:
[0257](0257-a-kind-of-part-is-read-across-the-places-it-stands-and-the-unit-is-the-placement.md)
counts the places a kind of part stands and how many were reached,
[0256](0256-a-kinds-share-of-the-readers-who-met-it-is-a-weighted-mean-of-sound-shares-at-the-doors-scale.md)
the share of the readers who met it that read it, and
[0265](0265-what-readers-do-inside-a-kind-of-part-is-a-share-of-the-readers-who-met-it-and-the-door-is-only-a-weight.md)
the share of those readers that acted inside it. All three are of **one window**.

Six comparisons answer about two windows —
[0224](0224-a-before-and-after-reading-compares-two-shares-and-a-pair-the-change-dissolved-is-an-answer.md),
[0239](0239-a-change-is-read-against-the-words-both-revisions-say-and-a-floor-costs-the-page-total-and-not-the-passage.md),
[0244](0244-a-pace-moved-because-the-words-moved-or-the-readers-did-and-a-counterfactual-says-which.md),
[0247](0247-a-readership-comparison-is-built-from-two-floored-maps-and-the-mix-is-the-only-figure-with-no-window.md),
[0251](0251-a-change-to-what-readers-did-is-a-ratio-of-two-shares-and-an-inside-a-change-gave-a-part-is-not-a-reader.md)
and the pair a change dissolved — and every one of them is asked of **one page**.

So the question an author who changed a *component* has could not be asked at
all. *I rewrote the testimonial band last week; is it read now?* is a question
about a kind of part across forty pages, and the only thing available was two
censuses on two screens with a person subtracting one share from the other.

**That subtraction is wrong, and not by a little.** The two censuses are taken
over different sets of places: a page published in between adds a placement, a
page whose rows expired takes one away, and a share of places moves with both
while no reader does anything differently. A kind standing in one place in the
earlier window and in three in the later one reports a read share of 1 and then
of ⅓, and nothing whatever happened to its readers.

## Decision

`libraryChangeOf(was, now)` in `src/signals/library-change.ts` compares two
windows' readings per kind of part, and every figure in it is taken over **the
placements that stand in both windows**: the same node of the same page, of the
same kind on both sides. A placement only one side bears is counted in `gained`
or `lost` and is in no share. That is 0239's rule at another unit — a change is
read against the words both revisions say, and a change to a library is read
against the places both windows bore.

**What holding the places still buys is a denominator with no reader in it.**
Every one of the six comparisons above compares *shares*, because a count of
readers is inflated by its own window's straddle
([0147](0147-a-rollup-is-added-to-what-is-stored-and-a-distinct-view-count-is-therefore-approximate.md))
and nothing divides out between two windows. Here the denominator is a count of
**places**: no reader in it, no rollup window in it, and — once the places are
paired — *the same number on both sides*. So this reading publishes what no
other comparison in the subsystem can:

- the movement as counts of places that changed hands, `tookUp` and `fellAway`,
  rather than only as a ratio of two shares;
- a verdict that is the **sign of a subtraction of two whole numbers**, with no
  threshold anywhere in it. `KindMovement` is `taken-up` where more places are
  read than were, `abandoned` where fewer are, `held` where as many are, and
  `still-unread` where none was read in either window.

`readShareWas` and `readShareNow` are published over that one denominator
(`comparable`, the paired places with a verdict on **both** sides), so the two
are a before and an after of the same set of places and not two figures about
two libraries.

### What is confounded, and is published rather than corrected

A placement stands as `read` when **at least one** reader reached it (0212,
[0235](0235-how-much-of-a-page-gets-read-is-a-share-of-words-that-partition-it-and-the-typical-reader-is-a-ceiling.md)),
so a quiet window skips more places than a busy one with nobody behaving
differently. *At least one* is what makes a census of places answerable without
counting a reader, so this is not an error to correct — but a comparison is the
first reading in which it can be mistaken for a finding.

So the two windows' page views travel on the reading, as `viewsWas` and
`viewsNow`, and they are floors rather than counts (`PageReading.views`, 0147).
Nothing is withheld for it and nothing is scaled by it: a floor on a window's
views is not a correction, and a reading that pretended it was one would be
worse than the caveat. A comparison of two windows of very different size is a
comparison whose transitions carry the difference in traffic, and those two
numbers are what say so.

### The two keys answer differently about one change, which is why both are kept

A node whose **type** changed is not a placement that moved; it is a place one
kind left and another took. The type rows say exactly that — `lost` by the old
type, `gained` by the new, counted in `recast` — because a type is the thing an
author replaces.

The role rows hold it still, and they are right to: a role is what a part plays
for a reader ([0114](0114-a-primitive-declares-what-part-it-plays-and-the-registry-is-asked.md)), so a
testimonial swapped for a card that plays the same part is, to a reader, the
same place still standing. The two answers are not a disagreement to resolve;
they are the two questions a deployment has.

### The page that cannot be paired

A census keeps two revisions of one tree apart on purpose — two live versions of
a page are two pages
([0250](0250-a-deployment-is-ordered-by-readers-lost-at-the-doors-scale-and-a-page-the-door-cannot-scale-is-out-of-the-order.md),
0257). A comparison pairs by **page**, so a tree held at two revisions in one
window has no single counterpart in the other. Picking one would be a number
nobody could account for, so the tree is excluded and named in `ambiguous`. A
paired page whose revision moved is compared and the fact is published as
`republished`, because whether readers reached a place is a fact about the place
either way — but *your readers behave differently* and *you changed your pages*
are two sentences and a surface needs to know which it is holding.

### A twelfth silence vocabulary that brings nothing

`library-change`, three members, **no new condition and no new subject** —
`unread` and `unplaced` are the census's own, and `unpaired` is
`nothing-carried`, the state a comparison of two windows' words reports of words
and a comparison of two paces reports of parts, said here of a place.

It is the first **comparison** whose subject is a `kind` rather than the pair,
which is where
[0240](0240-a-silence-is-a-condition-and-a-subject-and-the-two-names-for-one-state-were-not-synonyms.md)'s
claim was most exposed: its rows are keyed by the vocabulary, so every reason is
about one kind of part across both windows. The claim holds, for the reason 0250
already narrowed it with — the subject is a property of the reading and never
its scope. A `comparison` subject here would have printed *one of the two
windows was quiet* over a row about a primitive type. 0240 is not superseded and
not edited; the module carries the corrected counts (twelve conditions,
forty-seven members, twelve sets) and the paragraph.

## Consequences

- An author who changes a primitive has a sentence the morning after:
  *the band you rewrote was read in three of its nine places and is read in
  seven now*, with the two places it lost named by the rows either side of it.
- A model has a second address to act on. 0250 names the page and 0221 the band;
  this names the **kind**, which is the thing a proposal can change once for
  every page it stands on.
- Nothing is added to a payload, a browser, a column, a store or the vocabulary
  of kinds. It is the seventeenth reading derived from what the server already
  knows, and the broadcaster is byte-identical.
- A surface must read `viewsWas` and `viewsNow` before it prints a movement as a
  finding, and `republished` before it prints one as a fact about readers. Both
  are on every reading and neither is optional.
- The reader-weighted comparison is **not** answered here and is filed: *of the
  readers who met it, the share that read it has gone from four in ten to seven*
  needs the door on both sides and is a weighted mean whose weights move when
  traffic does.

## Alternatives considered

**Subtracting two censuses, which is what a screen would do by itself.**
Rejected: the two are over different sets of places, and the error is in the
direction nobody checks — publishing a page makes every kind on it look read
less often. This is the whole reason the module exists rather than the portal
doing it.

**Pairing placements by node and ignoring the kind.** Rejected: a node recast
from a testimonial into a card is not a testimonial that lost its readers. The
type rows pair on the type and the role rows on the role, which is what lets one
change be two true sentences.

**Comparing words, or `wordsReached ÷ words`, across the two windows.**
Rejected for now, and filed. A paired placement is paired by node and the
revision may have moved underneath it, so the two sides' words are two different
sentences. 0239 solved exactly that for one page by reading a change against the
words both revisions say; the library-scale version of it is a second unit, not
a caveat on this one.

**Comparing occurrences — presses, opens, completions.** Rejected: they are
counts of things that happened, so a press count that doubled in a window that
doubled is three sentences about traffic wearing one about reading (0224). The
share of readers who *acted* answers it, and that is the reader-weighted
question above.

**Withholding a comparison where the two windows' views differ by more than some
factor.** Rejected: the factor would be a threshold nobody could defend, and the
two floors are already the honest form of the same information. Every threshold
in this subsystem is a published constant about reading
([0218](0218-what-a-counter-means-is-published-and-the-browser-pays-for-the-number-and-not-its-name.md));
a threshold about how much traffic counts as comparable is a threshold about a
deployment's own schedule.

**A reading-wide movement over every kind at once.** Rejected for 0257's reason:
a figure over every kind counts a page once per element node, so it measures how
finely the pages were written as much as how they are read. The published keys
of the reading are pinned by a test, so a total added later has to argue with it
first.

**Picking one revision where a window holds a page twice.** Rejected: there is
no safe choice, and the number nobody could account for is worse than the row
that is missing. Named in `ambiguous` instead, which is 0250's refusal in another
costume.
