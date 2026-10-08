# 0244 — A pace moved because the words moved or the readers did, and a counterfactual says which

**Status:** Accepted
**Date:** 2026-10-08
**Section:** §4c (reader signals)

## Context

`readingPaceOf` sets the time each reader had against the time a part's words
take, and calls a part `skimmed` where the time was short even after every doubt
has been resolved in the page's favour
([0230](0230-a-part-was-read-when-readers-had-time-for-its-words-and-only-the-skim-is-a-safe-claim.md)).
It reads **one window of one revision**.

The sentence a change is judged by is the next one. Three comparisons of two
windows exist —
[0224](0224-a-before-and-after-reading-compares-two-shares-and-a-pair-the-change-dissolved-is-an-answer.md)
for where reading stops,
[0239](0239-a-change-is-read-against-the-words-both-revisions-say-and-a-floor-costs-the-page-total-and-not-the-passage.md)
for how many of the page's words get reached, and
[0231](0231-a-funnel-is-three-shares-of-the-arrivals-and-the-straddle-is-the-one-error-here-that-leans-down.md)
against the readers who arrived — and **none of them asks whether readers had
time**, which is the question a rewrite is usually aimed at. *The band readers
used to skim is read now* was unanswerable, and the kind of change that produces
it is the commonest thing anybody does to a band nobody reads: cut it.

A comparison of two windows' pace was named in advance. The lane filed the
silence vocabularies as a wart on 7 October and wrote that *a third comparison —
two windows' pace readings is the obvious next one — will make it a third time*;
[0240](0240-a-silence-is-a-condition-and-a-subject-and-the-two-names-for-one-state-were-not-synonyms.md)
answered the filing with a mapping instead of a renaming, which is what made the
set below cheap to add.

**The obstacle is that a pace has two sides and a change can move either one.**
A pace is `spentMs ÷ needMs`. A part that stops being skimmed has moved because
readers stayed longer, which is a fact about the readers, or because the page
asks for less, which is a fact about the change — and those are opposite
findings. A single before-and-after pace reports them identically, and the one
that reads best is the one that means least: a band halved in length is `paced`
with no reader having given it a second more attention.

Asking *which moved more* needs a threshold on what counts as a move, which is a
dial the framework would be inventing and 0230 has already refused once for the
figures either side of it.

## Decision

`paceChangeOf(was, now, options)` in [`src/signals/pace-change.ts`](../src/signals/pace-change.ts)
compares two `PageReading`s. It is the eleventh thing taken out of the
server-side join of
[0212](0212-what-a-reader-signal-means-is-joined-to-the-tree-when-it-is-read.md)
rather than collected: nothing is added to a payload, a browser, a column, a
store or the vocabulary of kinds, and the broadcaster is not touched.

**1. The unit is the part, matched by node, and the two factors are published
beside the verdict.** `timeRatio` is `now.spentMs ÷ was.spentMs` — the readers'
side. `needRatio` is `now.needMs ÷ was.needMs` — the page's side, exact and
reader-free. Their quotient is `paceRatio`, which is the identity the module is
built on. A pace is comparable across two windows where the counts it is made of
are not: `spentMs` is `dwellMs × (1 + inflation) ÷ reached` off **one side's own
row**, so the straddle over-count
([0147](0147-a-rollup-is-added-to-what-is-stored-and-a-distinct-view-count-is-therefore-approximate.md))
is in both of its terms and has very nearly divided out before the two sides
meet. That is 0221's cancellation and 0224's rule, applied to a part's pace.

**2. The attribution is a counterfactual, so it needs no threshold.**
`ifWordsHeld` is the later window's time against the **earlier** revision's
words — the pace this part would have had if the change had left its text alone,
which isolates the readers. `ifTimeHeld` is the earlier window's time against the
later revision's words, which isolates the change. Each is run through
`paceStandingOf`, now published from `pace.ts` so that the verdict rule has one
spelling, and `PaceCause` answers by **sufficiency**: `words` where the change
alone would have produced today's verdict and the readers alone would not, `time`
for the mirror, `either` where each alone would, `together` where only the two
did, and `unknown` where a floor leaves a counterfactual with no verdict. No
number anywhere decides what *enough* is.

**3. A floor is taken from both sides in a counterfactual.** Its two terms come
from two revisions, so words nobody counted on either one are words missing from
the ratio
([0122](0122-a-primitive-says-which-of-its-props-a-reader-reads.md)). The
conservative reading leaves the counterfactual `unknown` rather than claiming the
weaker verdicts — which is 0230's asymmetry one level out: `skimmed` survives a
floor on a side, and an attribution does not.

**4. `PaceMovement` has five members and not nine, and is named for a movement.**
`eased`, `rushed`, `still-skimmed`, `held`, `unknown`. 0230 makes `skimmed` the
claim that survives every bias and `paced`/`lingered` the weaker ones, so a part
moving between those two has not moved in a way worth a name. `still-skimmed` is
kept apart from `held` because both are *the verdict did not move* and they are
opposite findings about a page. Nothing here is called an improvement: a verdict
is about the mean reader of its own window, so a quiet window and a busy one
judge the same part on different evidence.

**5. There is no page-wide total of words, time or readers, and the root carries
the page's figure.** A part is judged against its subtree's words (0230), so the
figures nest and a sum would charge one reader once per level they scrolled past.
`whole` is the root compared against itself across the two revisions and `need`
is the subtraction of its two `needMs` — a row rather than an addition, as 0230
reports the root apart and
[0242](0242-what-readers-did-is-a-share-off-one-row-and-a-leaf-has-no-inside.md)
publishes the root's `engaged` apart. The root is kept out of every ranking,
because its subtree is every part it would outrank.

**6. One costing rate, two straddle inflations.** `PaceChangeOptions` takes
`wordsPerMinute` once and `inflation` as `{ was, now }`. A costing rate is a fact
about the page's text and its language (0230), so it is the same fact on both
sides and a comparison whose sides were costed differently would be a comparison
of the rates. A straddle inflation is a fact about **one window** — `drift ÷
opened` off that window's page-view row
([0219](0219-a-page-view-is-counted-once-at-the-door-and-the-over-count-in-the-node-counters-is-a-measurement.md))
— and two windows can honestly differ. **This is why the function takes two
`PageReading`s rather than two `PagePace`s**: a caller holding two finished pace
readings cannot be stopped from having costed them differently, and nothing
downstream could tell.

**7. A census of what the change added and removed, with the window that saw
it.** Unlike 0239's word census this one is not exact — a part nobody could have
read before still has to be read now for anything to be said about it — and it is
published because *the change added a band and readers are skimming it* is the
row worth looking at. A part that says nothing in its subtree on both sides and
hides nothing on either is left out altogether: it can never have a pace, so a
row for it would only ever read `unknown`.

**8. A fourth silence set, mapped onto conditions that already existed.**
`PaceChangeSilence` is `different-trees`, `wordless`, `nothing-measured` and
`dissolved`, spelled as the other comparisons spell them (0240), and
`meaningOfPaceChangeSilence` maps the four onto `two-pages`, `says-nothing`,
`no-view-reported` and `nothing-carried`. **No tenth condition was needed.**
`dissolved` here is *no part of the page is in both revisions*, which is the same
state `nothing-carried` reports of words: a page that carries no part carries no
word either, so it is that condition and not a neighbouring one. The word side of
the division still answers under `nothing-measured`, as it does under 0239: what
the change did to the time the page asks for has no reader in it.

**9. A position is not involved.** Nothing here reads a depth, an index or a
parent, so a band dragged to the top of the page is compared like any other —
0239's rule for a passage, for its reason: a pair of siblings is a position by
construction (0224) and a part's pace is not.

## Consequences

**The sentence a rewrite is judged by can be said, and the flattering half of it
can be separated from the real half.** *The pricing band readers skimmed is read
now, and it is because the change cut it in half rather than because anybody
slowed down* is one row. Nothing else in this subsystem can say the second
clause, and a product whose whole argument is that a change can be inspected and
attributed should be able to.

**It is the second reading that tells a model something to act on rather than
telling a person something true** — 0221 and 0242 being the others, so the third.
*The band is shorter and readers still have no time for it* is a sentence a
proposal can be written from, and `cause: "words"` on a `rushed` part is the
clearest thing this subsystem has ever been able to say against a change.

**`paceStandingOf` is published from `pace.ts`.** The verdict rule had one caller
and now has two, and a second spelling of it is the fault this subsystem has been
bitten by twice already — two counter keys that agreed until they did not, and
two word counts that agreed until one learned about slots. It is a server-side
reading and is not in the broadcaster's import graph, so rule 4's weight is
unaffected and `browser-weight.test.ts` is unchanged.

**0240's mapping has taken its first new set, and the number in its consequences
was wrong when it was written.** It says *nine conditions over fifteen members*;
the five sets held **eighteen** members on the day it landed (2 + 4 + 6 + 3 + 3),
and with this one they hold twenty-two. The record is **not edited** — its
decision is unaffected and the count is prose in its consequences — and
`silences.ts` now carries the right figure. A test holds the more useful half:
every condition this set reports was already reported by one of the five, which
is the first evidence that the nine are states of the world rather than a list of
the names five modules happened to use.

**What this leaves for the portal**, which is `Loom portal`'s and filed: the one
sentence a reader screen can lead with after a rewrite, and the figure on it that
must never be drawn as readers having slowed down.

**Nothing about per-reader identity is any cheaper or dearer.** Every figure here
is a ratio of two counts off rows that are already stored, and an identified
reader would change none of them.

## Alternatives considered

**A single before-and-after pace figure, with no attribution.** The subtraction
anybody would write first, and it reports *the page got shorter* and *readers
slowed down* in the same number — flattering a change that cut a band to nothing
exactly as much as one that made readers stay. Refused for 0239's reason at one
remove: the figure that looks like the answer is the one that answers two
questions at once.

**Attribution by magnitude — whichever factor moved more.** Needs a threshold on
what *more* means, and that threshold would decide the finding on every part
whose two factors are close. 0230 published its thresholds as the framework's
statement of how much margin a **claim** needs and refused a dial for anything
else; a threshold that picks between two causes is a dial.

**Restricting the comparison to parts whose words did not change**, as 0239
restricts itself to the words both revisions say. It would make every figure here
clean and would leave out **precisely the parts a change touched**, which are the
ones anybody is asking about. 0239 can afford the restriction because it has a
second, exact half to report about the rewritten text; a pace has no such half,
so the comparison is of every part and the confound is published as the second
factor instead.

**Taking two `PagePace`s.** Fewer derivations and a caller already holding both.
Refused for the rate: two paces costed at different rates compare the rates, the
error is invisible in the result, and nothing could check it after the fact.

**A sixth silence vocabulary with its own names for the four states.** What the
first five did, which is what 0240 was written about. The names are borrowed from
the comparisons that already have them, and the mapping is extended rather than
the set being invented.

**Reporting `lingered → paced` and `paced → lingered` as movements.** Nine states
instead of five. Refused: 0230 calls `lingered` a question rather than an answer —
dwell counts a part that was merely up while something else was read — so a
movement between the two weak verdicts would be the module's loudest row about
its least reliable one.

**A page-wide total of the time readers were given back.** The figure a reader
screen would most like to print. Refused on 0230's arithmetic: the words nest, so
the time nests, and a page total charges one reader once per level. The root's own
row is the honest version of the same sentence and is published as `whole`.
