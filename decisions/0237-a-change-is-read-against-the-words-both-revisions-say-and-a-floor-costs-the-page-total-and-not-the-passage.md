# 0237 — A change is read against the words both revisions say, and a floor costs the page total and not the passage

**Status:** Accepted
**Date:** 2026-10-07
**Section:** §4c (reader signals)

## Context

[0235](0235-how-much-of-a-page-gets-read-is-a-share-of-words-that-partition-it-and-the-typical-reader-is-a-ceiling.md)
made *how much of what a page says gets read* a measurement: a share of the
page's words at least one reader reached, the words the average reader got to as
a ceiling, and the passages nobody saw. It answers **one window of one
revision**, which is the shape every reading in this subsystem has had.

The sentence a change is judged by is the next one. Loom exists so a page can
change from how it is used, so *the words nobody read last week are read now* —
or the worse one, *the three hundred words this change wrote are words nobody
has reached* — is the question the whole plan is pointed at.
[0224](0224-a-before-and-after-reading-compares-two-shares-and-a-pair-the-change-dissolved-is-an-answer.md)
asks it of where reading stops. Nothing asked it of text.

The inputs were in hand. Two `PageReading`s are two trees joined to two windows
of counters, and 0235's reading is derived from one of them with nothing added
to a payload, a browser, a column, a store or the vocabulary. The reason this is
a record rather than a subtraction is that **the subtraction anybody would write
first is wrong, and wrong in the direction that flatters a change.**

`now.wordsByStanding.read − was.wordsByStanding.read` answers two questions at
once. A change that adds four hundred words readers all reach raises it by four
hundred while making the page **less** read as a share of itself: the page got
longer and the reading got worse, and one number says *better*. The same
confusion runs through every other page-level figure a copy reading publishes.
`share` has an exact denominator and a numerator that grows with how many
readers there were, because `read` means *at least one* (0212) — so a busy week
against a quiet one shows a change that never happened. `typical` is per-view and
therefore traffic-proof, and it divides by the page's own words, so a change that
cut four hundred words lowers it without anybody having read less.

## Decision

**The unit of comparison is the words both revisions say, word for word** — the
*carried* words. Identical text on both sides means the only thing that can
differ is the reading of it. Every reader figure in
[`copy-change.ts`](../src/signals/copy-change.ts) is of those words alone, and
`copyChangeOf(was, now)` takes two `PageReading`s and returns the two
`CopyReading`s it derived, as `readingChangeOf` returns its two progresses.

**What the change wrote is a census, beside them and never mixed into them.**
`WordsWritten` carries the carried total, the words added, the words removed —
each split by the standing of the part saying them — and the two word counts of
every passage the change reworded. It is **exact**: no reader is in it, so none
of the error every count here carries is either, and a window with no page views
at all reports it in full. *The change took two hundred words away and readers
had never got to a hundred and eighty of them* is the sentence that says a change
was right, and it is one row.

**Two reader figures, and the record is which of them is comparable.**

- **A standing is not.** `PassageMovement` — `held`, `gained`, `lost`, `unread`,
  `unknown` — moves with how many readers there were as well as with how far they
  got, because `read` is *at least one*. It is reported because *these words were
  never seen and now they are* is the sentence a person wants, it is named for
  the movement rather than for a verdict, and it is never divided by anything.
- **A share of a side's own views is.** `PassageSide.reach` is `readers ÷ views`
  off one side's own rows, so each side's straddle over-count (0147) has very
  nearly divided out before the sides meet — 0221's cancellation and 0224's rule,
  applied to a passage instead of a pair. `ComparedPassage.gain` is
  `words × (now.reach − was.reach)`, so it reads *this passage put forty more
  words in front of the average reader*, and the gains add across passages
  because a part's own words partition the page exactly once (0235). Their sum is
  `CopyChange.typical.change`.

**A passage the change moved is compared like any other.** Nothing here divides
by a depth, an index or a parent. This is the one place the reading is more
forgiving than 0224's, where a sibling that moved dissolves the pair it was half
of — a pair is a position by construction and a passage is not.

**A floor costs the page total and not the passage, and that is a narrowing of
0235 rather than an exception to it.** A type that declares no `copy` (0122)
leaves a passage short of words nothing can see, and 0235 withheld a mean of them
outright.

- **A single passage's `gain` survives a floor.** The same words are on both
  sides, so an understated count scales the gain toward zero and **cannot flip
  its sign**. *At least this many words moved* is a safe claim, which is more than
  0235 could say of one window.
- **`typical` does not.** It adds signed terms that floors scale by **different**
  factors, so a floored passage that gained and an exact one that lost can sum to
  a regression where the truth is an improvement. So it is withheld under a
  floor, exactly as 0235 withholds `typical`, and the per-passage gains are left
  standing.
- **`passagesByMovement` is published beside `wordsByMovement`** because a count
  of passages survives a floor outright: a part that declares no `copy` is one
  part whatever it is hiding. A surface that has to be right about direction
  under a floor reads that row.

**Six silences, ordered so that the state of the deployment is reported before
the state of the question.** `different-trees` and `nothing-measured` are spelled
as `ChangeSilence` spells them, because a surface drawing both comparisons of one
change should not meet two names for one state; `wordless` and `inconsistent`
keep 0235's. `dissolved` — the change left no word of the page as it was — comes
after all four, because it is a property of the change rather than of the
deployment, and 0231 settled that ordering for `ReachSilence`. `floored` is last,
as in 0235.

**The census answers under four of the six.** `nothing-measured`, `wordless`,
`inconsistent` and `dissolved` all leave the word counts standing, because what a
change did to the words is a fact about the two trees. Only `different-trees`
answers nothing at all, for 0224's reason: two pages are two pages, and the
plausible-false-number failure is a screen reporting that a change deleted every
word of a page it was never about.

**`reach` is not clamped and a passage whose standing is `unknown` is not
listed.** A `reach` above 1 is the visible evidence of the `inconsistent` input,
and a figure cut to fit its own ceiling is a fault made undrawable rather than
visible. `stillUnseen` is `unread` only — an `unknown` passage is in
`wordsByMovement` where it can be seen and not acted on, because putting it under
*nobody read this* would turn *nothing can be said* into a claim (0212).

**`passageOf` is published from `copy.ts`.** The comparison needs a passage for
every part and not only for the parts a copy reading kept: a part that said
nothing before and says something now is a word the change **wrote**, not a part
the change **added**, and a filtered list cannot tell the two apart. Two
spellings of that projection is what the counter keys were before they were
published once.

## Consequences

**The portal gets the sentence a change is judged by, and it is one field.**
*Three hundred words nobody reached are read now, the two hundred this change
removed were words nobody had got to, and these four passages still nobody
sees.* `stillUnseen` is the list a person can act on without reading anything
else, and `mostGained` is the headline.

**A change's effect and a change's size are now two different figures and a
screen must not add them.** `words.change` is the page getting longer or shorter;
`typical.change` is readers getting further through what stayed. A card that
subtracted read-word counts would have mixed them, which is the defect this
record exists to refuse.

**`readings.was.typical` and `readings.now.typical` are not comparable and are
still returned.** They are each true of their own window and a consumer will
reach for them, so the field documentation says what the pair of them cannot
answer. The comparable figure is one field along.

**0235 is narrowed and not superseded.** Its refusal of a floored mean stands for
one window and stands for this module's page total. What is new is that the
*per-passage* figure survives a floor in sign, because the floor is on the same
words on both sides — a property a single window does not have, since there is no
other side for the error to cancel against.

**0147 and 0212 are unchanged.** Everything here divides a count by a count off
one side's own rows, which is the arithmetic both records already licensed.

**Nothing was collected.** No payload, no browser byte, no column, no store, no
kind. The broadcaster was not touched, so its weight is unchanged, and
`browser-weight.test.ts` passes untouched.

**Per-reader identity is neither cheaper nor dearer for this.** Every figure is a
mean or a count over a window of counters already collapsed from view keys, so
rule 2 has thrown the keys away long before. A denominator that was a real
headcount rather than a view floor would make `typical` an estimate rather than a
ceiling without changing a signature.

## Alternatives considered

**Subtract the two copy readings' `wordsByStanding.read`.** The defect in the
Context: it says a change that lengthened a page improved its reading. Rejected,
and it is the reason this is a record.

**Compare the two `share` figures.** It is the figure a screen will want, and its
numerator grows with traffic because `read` is *at least one* reader. A quiet week
against a busy one would show a change nobody made. Rejected as a headline;
each side's own `share` is on its own reading, where it is true.

**Compare the two whole-page `typical` figures.** Traffic-proof, and it divides by
each side's own word total — so a change that cut four hundred words lowers it
with nobody having read less. Rejected for the same reason the carried words
exist.

**Drop the passages the change reworded.** It would be quietest about the
passages a change was actually aimed at, which is 0224's argument about a
dissolved pair at the level of text. They are reported with both word counts, no
`gain`, and the rewording named as the confound: a passage that got shorter is
easier to finish, so a movement there is not attributable the way a carried
passage's is.

**A `PassageFate` closed set, as 0224 and 0236 have.** Rejected. A fate enum
exists in those records because the reasons a pair cannot be compared genuinely
overlap and have to be ordered. Added, removed and reworded are structurally
exclusive and carry **different payloads** — one word count, one word count, two
— so three typed lists say exactly what a union of three shapes would have fudged.
A test asserts no node appears in two of them.

**Report `moved` on a compared passage.** It is already on `ReadingChange.parts`
from 0224 and it is in none of this module's figures, so carrying it would be a
second spelling of a census that exists. The module documentation says instead
why position does not matter here.

**Withhold the per-passage `gain` under a floor too**, mirroring 0235 exactly.
Rejected after working out the arithmetic: the floor is on the same words on both
sides, so the sign is safe and withholding it would throw away the only figure
that survives the commonest state a real deployment is in.

**Clamp `reach` to 1.** Rejected on 0235's reasoning, which this reuses: the
alarm is the number.
