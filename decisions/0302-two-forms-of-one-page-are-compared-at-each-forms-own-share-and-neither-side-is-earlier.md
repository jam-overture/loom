# 0302 — Two forms of one page are compared at each form's own share, and neither side is earlier

**Status:** Accepted

**Date:** 21 October 2026

**Section:** §4c (reader signals)

> **The number skips one, for the reason 0300's did.** When this was written
> `main` carried 0300 and the number after it was held by an open pull request
> of this lane, #687, verified the evening before. Two records sharing a number
> is fatal
> ([0097](0097-a-hole-in-the-numbering-is-reported-and-a-clash-is-fatal.md)), so
> this takes the one after that rather than the one after `main`. #687 is not
> merged as this is written, so nothing here cites 0301 and nothing here depends
> on it.

## Context

[0263](0263-a-page-is-a-base-tree-and-the-deltas-an-audience-earns.md) made a
page one base tree plus the deltas an audience earns, composed in the customer's
own process per request, so two audiences read **one tree at one revision** and
see two forms of it.
[0284](0284-a-signal-names-the-audience-it-was-collected-under-and-the-predicate-stays-in-the-control-plane.md)
put the audience on all five reader tables.
[0290](0290-a-reading-is-of-one-audience-and-two-forms-of-a-page-are-two-readings-rather-than-one-handed-in-twice.md)
made a reading *of one audience*, and
[0294](0294-a-comparison-is-of-one-readership-and-a-pair-that-proves-two-audiences-is-refused.md)
made a comparison refuse a pair that proves two populations.

Four weeks of that work was about **keeping two forms apart**. Every one of
those records removed a place where two populations were being summed, picked
between by row order, or compared as though one of them had moved. None of them
built the reading a deployment that earned a second form actually wants, which
is the two forms held against each other **on purpose**.

`docs/signals.md` §36 named it in writing and deliberately did not build it:

> **What is now expressible and is deliberately not built:** the comparison of
> two audiences. Two readings of one tree at one revision, each of one
> population, is exactly what one would take — and it must not borrow
> `changeOf`, whose arithmetic is right and whose sentence is wrong. [...] It is
> a record of its own when it is built.

This is that record. The instruction in it is the thing to be careful about:
there are ten comparisons in `src/signals/` and every one of them varies the
tree and holds the readership still. Handing `readingChangeOf` two forms of one
revision produces every stop, every share and every `improvement`, with no
`null` and no silence anywhere on it, labelled as *what your change did* about a
change that did not happen. 0294 refuses that pair, which is why there was a
gap to fill rather than a bug to fix — and the reading that fills it is the
mirror image of the one that refuses it, not a relaxation of it.

## Decision

**A comparison of two forms is its own reading, `formComparisonOf` in
`src/signals/forms.ts`, with its own closed set of silences and six clauses.**

### 1. It holds the tree and the revision still and varies the readership

The inverse of every comparison already here. Two readings of one tree at one
revision, each of one audience, and a part's figure is held against the same
part's figure in the other form.

Two revisions is refused (`different-revisions`), and that refusal is the
reading's whole discipline rather than a convenience: two forms of a page share
a tree **and** a revision (0263), so a pair spanning two revisions varies the
tree as well as the readership and every figure on it would carry both causes
with nothing to separate them. That is precisely what
[0224](0224-a-before-and-after-reading-compares-two-shares-and-a-pair-the-change-dissolved-is-an-answer.md)
is built to avoid, and this reading would otherwise do it silently.

### 2. Neither side is earlier, so the order of the arguments does not reach the answer

`readingChangeOf` takes `was` and `now` and does not check which is older: a
caller holding them backwards gets every sign reversed, which is the bargain
0224 struck so that *this week against last week* comes out of one function.
**Here that bargain would be a defect rather than a trade**, because there is no
fact of the matter about which of two populations comes first.

So the two sides are put in the order of their audience ids before anything is
read off either of them, and `FormComparison.one` is the lower of the two names
rather than the first argument. The answer is therefore identical whichever way
round the question is asked, which is asserted and not merely documented. The
two refusals with no pair of names to sort by — a window naming none, and a
window naming two with neither asked for — are the only cases where the
arguments' own order survives, and both of them publish nothing to be reversed.

The same fact decides the shape of the per-part figure: **the difference is
unsigned and the direction is a name.** `ComparedForm.gap` is
`|one.reach − other.reach|` and `ComparedForm.favours` is the audience id of the
form whose readers reached it more. A sign is read against an order, and the
order here is the alphabet of two names the host chose.

### 3. The comparable figure is each form's share of its own arrivals

A `reached` count is not comparable: two forms are served to two sets of people,
so one form reporting more readers is very often one form *having* more readers.
A share is, by the argument
[0221](0221-where-reading-stops-is-a-fall-between-two-siblings-and-a-ratio-of-two-counts-off-one-row-set.md)
gives for a stop and 0224 for two revisions, applied to a part across two
populations: `readers ÷ views` off one side's own rows, so each side's straddle
over-count
([0147](0147-a-rollup-is-added-to-what-is-stored-and-a-distinct-view-count-is-therefore-approximate.md))
has very nearly divided out before the two sides meet.

Measured on fixtures: a form with a thousand views reaching a band five hundred
times and a form with a hundred views reaching it fifty times come back as a gap
of **nought**, where a comparison of counts would have reported the busier form
reading it five times better.

### 4. A difference between two forms has two causes, so the content half is stated rather than estimated

The deltas changed what is on the page **and** the people reading it are
different, both by construction.
[0247](0247-a-readership-comparison-is-built-from-two-floored-maps-and-the-mix-is-the-only-figure-with-no-window.md)
exists so a before-and-after can report when its readership moved; here that
confounder is permanently true and is not a fault to be detected. It is the
shape of the question.

So this reading says what the deltas did instead of guessing at it.
`FormComparison.onlyIn` is every part exactly one of the two forms has, each
entry naming the form it is in, and `FormComparison.disagreed` is every shared
node the two forms give different primitive types — reported and not dropped,
the way `LibraryReading.roleDisagreed` is. What is left after both is a part
both forms really have, where the only remaining difference is who was reading.
The honest sentence over it is *the skiers reach this band more often than the
riders do* and never *this band reads better*.

A part only one form has is therefore **never** compared, and the reason is the
failure it prevents: a band the other form does not contain would otherwise read
as a band that form's readers skipped, and the census would print *the deltas
gave this audience the whole page* as a difference between two populations.

### 5. Nothing is added up across parts, and the absence answers two questions rather than one

There is no page-level *which form reads better*. A reader who reached the
second band and the third is in both parts' figures, so a mean over parts counts
one reader as many times as they got through — the distinctness trap 0147 wrote
down for views and
[0167](0167-a-delegated-signal-names-the-regions-it-happened-inside.md)
for presses. **And the two forms do not have the same parts**, so a mean over
each side's own parts has two denominators that are not the same page. Either
one alone would be enough; both together make the figure unavailable rather than
merely approximate.

What is published instead is `FormComparison.counted` — how many shared parts
fell each way, alike, or beyond saying — which is a count over one shared set
and needs no mean, and `FormComparison.sharpest`, the one row somebody would
act on.

### 6. Three of its six silences are new conditions, and the set is the first about the readership

`forms` is the eighteenth silence vocabulary (0240) and the first to bring three
conditions of its own, where no set since the eighth brought more than one.
Each of the three is a state only a reading that holds the tree still and varies
the audience can be in:

- **`two-revisions`** — the third side of what a comparison has to hold still,
  beside `two-pages` and `two-audiences`. No earlier reading could report it,
  because every comparison until now varied the revision on purpose.
- **`one-population`** — the only condition in the table about **too few** of
  something. It is `two-audiences` turned over: that refuses a comparison for
  varying the readership where it had to be held still, and this refuses one for
  holding it still where it had to be varied. The caller holding that pair has a
  before-and-after and is sent to `readingChangeOf`.
- **`no-audience-named`** — a window from before the column existed (0284) is
  one population read whole, which is the right answer to every other question
  in this subsystem and no answer at all to this one, because here the audience
  **is** the question. Held apart from `two-forms-unsplit` because the two
  remedies are opposite: that one is a window to split, this one is a window
  from before there was anything to split by.

The other three are borrowed exactly: `different-pages` is the state every
comparison here reports, `unsplit` is the window fault 0300 brought, and
`nothing-measured` is the only member of this set that withholds half a reading
rather than all of it — the parts census is a fact about the two composed trees
and stays true of a window nobody read, which is how
`CopyChangeSilence.nothing-measured` is already spelled.

**This is the sharpest difference between this reading and a before-and-after,
and it is worth stating as a decision rather than leaving as a consequence.**
0294 *compares* a pair with an unlabelled side and merely reports that it is not
provably of one readership, because there the audience is a confounder and
refusing it would withhold every comparison spanning the day a deployment
upgraded. Here the same side is refused, because the audience is the subject.
The two treatments of one value are deliberate and are not drift.

## Consequences

- **A deployment serving two forms can ask which form reads which part, and the
  answer is attributable.** The question is answered from counters that have
  been in the store since 0284, over trees and a registry the server already
  holds. **Nothing was added to a payload, a browser, a column or the vocabulary
  of kinds** — it is the thirty-third thing taken out of the server-side join
  rather than collected. `broadcast.ts` is byte-identical.
- **A caller holding the wrong pair is sent to the right function.** The two
  readings divide the space rather than overlapping: `formComparisonOf` refuses
  what `readingChangeOf` answers and answers what it refuses, which is asserted
  in `forms.test.ts` over one pair of fixtures.
- **A new reading in this subsystem now has a worked precedent for symmetry.**
  Every comparison before it is asymmetric by design and says so; this one is
  symmetric by design and says so. A tenth comparison written tomorrow has to
  choose rather than inherit, which is the point.
- **The three new conditions grow the silence table to eighteen conditions.**
  `relateSilences` holds: two readings reporting `one-population` at the
  `comparison` subject are one state, and no reading of a page can report any of
  the three, so none of them can be drawn over the page in front of somebody.
- **Nothing here makes per-reader identity cheaper or dearer to add later.**
  Every figure is a share of one audience's own arrivals, and an `aud_` stays an
  opaque name for a predicate the host wrote and Loom never sees.
- **No screen reads it**, which is `Loom portal`'s and is filed.
- **What it does not answer, and is filed:** a form comparison of the *words* a
  part says, and of what readers *did* inside it. Both are the same join at a
  different counter and neither is a decision; `copyChangeOf` and
  `actionChangeOf` are the shapes to mirror, with every clause above carried
  over.

## Alternatives considered

- **Reuse `readingChangeOf` with a flag saying the pair is two forms.** Rejected,
  and it is what §36 warned against. Every figure on that reading is named for a
  change — `improvement`, `mostGained`, the stops' movements — and a flag does
  not make a sentence true. It would also have put the symmetry decision inside
  a function whose documented bargain is the opposite one.
- **A signed difference, with the first argument as the baseline.** Rejected by
  clause 2. It would make the answer depend on the caller's argument order,
  which means two screens built from one store disagreeing about the sign of
  every figure with nothing saying so.
- **Sort the two sides by arrivals, or by views, so the busier form is first.**
  Rejected: it is an order that moves. A rollup window that straddles
  differently, or a day of unusual traffic, would swap the two sides and reverse
  every published name, which is worse than the alphabet because it looks
  stable.
- **Compare a part only one form has against the other form's nought.**
  Rejected by clause 4: that publishes what the deltas did as a difference
  between two populations, and it is the one mistake in this reading that would
  produce the most confident wrong sentence.
- **Publish a page-level share for each form, as a mean over its parts.**
  Rejected by clause 5, twice over. It double-counts readers and its two
  denominators are not the same page.
- **Refuse a pair of two forms whose composed trees differ at all.** Rejected:
  that is the ordinary case after 0263 and refusing it would withhold the whole
  reading from exactly the deployments it is for. The difference is published as
  a census instead.
- **Compare a window naming no audience against one that names one, as 0294
  does.** Rejected by clause 6. There the audience is a confounder and the pair
  is unprovable; here it is the subject and the pair is unaskable.
- **Add `two-revisions`, `one-population` and `no-audience-named` as spellings
  of conditions already in the table.** Rejected. `two-revisions` is not
  `two-pages` — one page over two revisions is the question 0224 answers, and
  collapsing them would send a caller to look for a second page that does not
  exist. `one-population` is not `two-audiences` — they are opposite faults.
  And `no-audience-named` is not `two-forms-unsplit` — their remedies are
  opposite, and 0240's own argument for the table is that a deployment handed
  the wrong condition goes to the wrong remedy.
