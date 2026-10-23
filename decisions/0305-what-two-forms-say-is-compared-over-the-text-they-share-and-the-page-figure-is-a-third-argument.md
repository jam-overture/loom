# 0305 — What two forms say is compared over the text they share, and the page figure is a third argument

**Status:** Accepted

**Date:** 22 October 2026

**Section:** §4c (reader signals)

## Context

[0302](0302-two-forms-of-one-page-are-compared-at-each-forms-own-share-and-neither-side-is-earlier.md)
built the first comparison of two forms of one page (0263) — each part's
**reach**, told apart by the column 0284 put on the rows — and named two more
questions the same join answers with no new input, building neither. The second,
*what readers did inside a part, form by form*, is
[0303](0303-what-two-forms-readers-do-is-the-same-pair-at-a-different-counter-and-the-page-has-one-honest-figure.md),
which also moved the pairing rule into `audiences.ts` so that a third reading
costs its figure and nothing else.

This is the third and last of them: **what each form says, and how much of the
text the two forms share each one's readers reach.** The finding that filed it
said it costs its figure over `PartReading.copy` and its own silences, and that
nothing about it is a decision. Two things about it turned out to be.

The first is the unit of comparison. Both earlier readings compare every shared
part, because a part is the same part in both forms whatever the deltas did to
it. **Words are not**: a form is a base tree plus the deltas an audience earns,
so the two forms' text differs by construction, and a band the deltas reworded
is two different pieces of text with two different word counts. A
word-weighted figure over it would be comparing two populations and two
passages at once.

The second is the page. 0302 refuses a page-level figure and 0303 publishes
one, each for reasons about its own counter, and the finding that filed this
reading said in advance that a third would inherit neither: *words partition a
page and readers do not, so that one's page figure is a different argument
again.*

## Decision

`formCopyComparisonOf(one, other)` in
[`src/signals/form-copy.ts`](../src/signals/form-copy.ts) derives
`copyReadingOf` on each side and compares them. The pairing rule, the order of
the two sides and the five refusals are imported from `audiences.ts` with no
clause changed, exactly as 0303 published them for this purpose.

### The comparable unit is the passage both forms say the same way

A node both forms have, saying the same words in the same order, is
`copyChangeOf`'s *carried* text with the tree held still and the readership
varied instead of the other way round: identical text on both sides means the
only thing that can differ is the reading of it.

Everything else is **reported rather than compared**, which is the half of this
reading that answers without a counter at all:

- `reworded` is every shared node the two forms word differently, with both word
  counts, both sides' standings and reaches, and `wordier` — the form that says
  more. No gap, because a word-weighted figure needs one word count and there
  are two. *The pro form says four hundred words in this band and the free form
  says ninety* is the sentence this reading was asked for, and it is exact.
- `onlyIn` is every passage exactly one form has, with that form named and its
  own window's reading of it, and `says.onlyByStanding` is those words by what
  that form's readers did about them.
- `says` is the census: `shared`, `only` per form, `reworded` per form. Each
  form's three add to the words that form says, which its suite asserts. There
  is deliberately **no `added` and no `removed`**: neither form is earlier, and
  one audience's extra band is not a band anybody wrote last.

### The figure is word-weighted, and its direction is not read off it

`ComparedFormPassage.gap` is `words × |one.reach − other.reach|`, each side's
reach being `readers ÷ views` off that side's own rows, so each form's straddle
over-count (0147) has very nearly divided out before the two populations meet
(0221, 0224). The weighting is `copyChangeOf`'s: a long passage a tenth of
readers reach is worth more than a three-word label all of them do. It is
unsigned, with the form named in `favours`, because a sign is read against an
order and the order here is the alphabet of two audience names.

**`favours` is read off the two reaches and not off the gap**, which is this
reading's one departure from its two siblings, and it is about floors rather
than about readers. A type that declares no `copy` leaves a passage short of
words nothing can see (0122), so `words` is a floor and the gap is a floor with
it: the same understatement is on both sides, so it scales the gap toward nought
and can report nought where the hidden words differ. The two reaches are exact
whatever a library has declared. So *which* form's readers get more of a passage
survives a floor and *how much more* does not, and a surface drawing a
half-declared page reads `favours`.

The gap is withheld — and the pair counted `unknown` — where either side held no
views or either side's standing is `unknown` (0282), which is the reach
comparison's two-check rule rather than the action comparison's one: a passage's
standing and its reach are two fields, where `PartAction.share` is absent in
exactly the states its standing calls unknown.

### The page figure is sound because words partition the page, which is a third argument

`typical` is each side's `Σ(readers × words) ÷ views` over the shared passages
**both** windows can speak for. A passage's words are its own and never its
subtree's (0235), so the sum counts each word exactly once and no reader more
than the words they reached — which is neither of the two arguments its siblings
make, and all three now stand side by side:

| reading | the page as a whole |
| --- | --- |
| reach (0302) | **refused** — a mean over parts counts one reader once per part, and two forms have two sets of parts |
| what readers did (0303) | **one row** — every action is strictly inside the root, so the root's own row is one division |
| what the forms say | **a sum over words** — words partition the page exactly once, so no reader is counted twice |

Both sides are over one set of passages, so the two means are of the same words.
Under a floor the means are withheld and the rows are not: a hidden word
understates each side by that side's own readers, which is a different amount
per side, so the difference between the two means can read the wrong way round
while no row's can.

**The page's gap is not the sum of the rows' gaps**, and the suite pins it: a
row's gap is unsigned, so two passages favouring opposite forms add there and
cancel here. The fixture has one of each and the two figures are twelve and
four. A screen that summed the rows and called it the page would be reporting
*how far apart the two forms are read, passage by passage* and labelling it
*how much of the shared page each form's reader gets to*.

### The twentieth silence set brings no condition

`FormCopySilence` reports eleven states and every one of them was already in
0240's table: the five pairing refusals, and six a reading of words has been in
since the fourth set — `wordless`, `nothing-measured`, `inconsistent`,
`unshared` (0240's `nothing-carried`, said of two forms rather than two
revisions), `unspoken` and `floored`. It is the second set in a row to declare
nothing of its own, which is a stronger version of what 0303 said about the
first: a reading brings a figure, and only a reading that can be in a state
nothing before it could reaches for a condition.

`unshared` is checked before `unspoken`, which it implies, because two forms
that share a tree and no sentence are two pages the deltas made and that is the
stronger thing to say. `wordless` is checked before the view floor and
`unspoken` before `floored`, for the reasons 0235 and 0282 give: the state with
a remedy that produces a figure is not the one reported when a state without one
is also true. Each of those orderings is reachable by a single pair and each has
a fixture of its own.

## Consequences

- The three readings 0302 named are built, over one pairing rule published once.
  A fourth comparison of two forms, if one is ever wanted, costs a figure.
- A deployment serving two audiences can ask *what does each of these readers
  actually get told, and how much of the common text do they reach* — and the
  census half of the answer survives a window nobody read, a sender that files
  nothing and a library that has declared no `copy` at all.
- `passageSideOf` is published from `copy-change.ts` rather than kept private,
  for the reason `passageOf` itself is published (0235): two comparisons now
  project a window's reading of a passage, and one projection with two spellings
  is two things to disagree about.
- **Nothing was added to a payload, a browser, a column, a store or the
  vocabulary of kinds.** `broadcast.ts` was not touched and is byte-identical.
  This is the thirty-sixth thing taken out of the server-side join rather than
  collected.
- Per-reader identity is no nearer and no further. Every figure here is a
  distinct-view count filed against a node and a word count read off a tree;
  an opt-in identified window would be read by this same function unchanged.

## Alternatives considered

- **Compare every shared part, as the two siblings do, and let the reworded ones
  carry two word counts into one gap.** Rejected: the figure would mix what the
  deltas said with what the readers did, and the direction of the mixture
  depends on which form was given the longer text. The deliberate cost is that a
  deployment whose deltas reword everything gets a census and no reader figure,
  which is what `unshared` says in as many words.
- **Publish the sum of the rows' gaps as the page figure.** Rejected, and it is
  the shape of mistake this record exists to prevent: it is a real quantity —
  the total distance between the two readings — and it is not the one a page
  headline is read as. Publishing the two means and their difference says the
  second, and the sum stays derivable by anybody who wants the first.
- **Read `favours` off the gap, as `forms.ts` and `form-action.ts` read theirs
  off their figures.** Rejected on the floored page: a passage hiding all of its
  words has a gap of nought and two exact reaches, and reporting it as two forms
  reading alike would be a declaration a library has not made, published as a
  finding about readers.
- **Withhold the gap on a floored passage altogether.** Rejected for 0235's
  reason, in the direction that favours publishing: the same words are on both
  sides, so a floor scales the gap toward nought and cannot move it to the wrong
  form. *At least this far apart* is a safe claim, and the page figures are the
  ones a floor can turn around.
- **A `PassageFall` closed set for the four ways a shared passage can fall.**
  Rejected as premature: the four are the keys of `counted` and `wordsCounted`
  and no caller has yet needed to name one, where `PassageMovement` exists
  because a before-and-after reports a movement per passage.
- **Leave `wordier` to the surface, since it is one subtraction.** Rejected for
  the reason 0287 published `spoken` beside the share it is the denominator of:
  a figure a screen derives is a figure two screens can derive differently, and
  this one is the sentence the reading was asked for.
