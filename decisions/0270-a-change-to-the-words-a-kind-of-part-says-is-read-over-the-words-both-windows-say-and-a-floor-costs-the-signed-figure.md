# 0270 — A change to the words a kind of part says is read over the words both windows say, and a floor costs the signed figure

**Status:** Accepted

**Date:** 12 October 2026

**Section:** §4c (reader signals)

## Context

[0266](0266-a-change-to-a-kind-of-part-is-read-over-the-places-both-windows-bore.md)
compares a kind of part across two windows and is explicit about the one thing
it refuses: **words**. A paired placement there is paired by node, so the page's
revision may have moved underneath it — the two sides' words are then two
different sentences, and a share of one against a share of the other is not a
before and an after. It filed the shape of the missing unit and shipped without
it.

That unit is the sentence an author who edited copy inside a primitive actually
has. *You rewrote the testimonial band and readers now reach two thirds of the
words it kept* is a claim about words across forty pages, and nothing in this
subsystem could make it:

- A census publishes a kind's words and the words readers reached
  ([0257](0257-a-kind-of-part-is-read-across-the-places-it-stands-and-the-unit-is-the-placement.md)),
  of one window. Two censuses subtracted is the error 0266 exists to refuse,
  with the words moving under the subtraction as well as the places.
- [0239](0239-a-change-is-read-against-the-words-both-revisions-say-and-a-floor-costs-the-page-total-and-not-the-passage.md)
  solved exactly this for **one page**: a change is read against the words both
  revisions say, with what the change wrote counted beside them rather than
  inside them. It is per page and stops there.

So the work was 0239's method taken per placement and added across the
placements of one kind. What had to be settled was the denominator, the
whole-library figure, and what a floor costs.

## Decision

**`libraryCopyChangeOf(was, now)` in `src/signals/library-copy-change.ts`**, the
eighteenth thing derived from the server-side join rather than collected.
Nothing is added to a payload, a browser, a column, a store or the vocabulary of
kinds; the broadcaster is untouched and measured byte-identical.

### Every figure is taken over the carried words

The unit is the words both windows say **word for word** in the places both
windows bear, which is 0239's carried text at the scale of a library. A
placement both windows bear whose text changed is in `rewritten` and in no
share; a placement only one window bears is in `gained` or `lost` and in no
share.

This is a stronger hold than 0266's. A count of places is held still by pairing
the places; a count of carried words is held still by the text being *the same
text*, so the denominator is not merely the same size in both terms — it is the
same sentences, and the subtraction is over them.

### The rewriting is published beside the share, which is about what is left

A band whose words are nine tenths rewritten has a carried share about the tenth
it kept. `rewritten` and `rewrittenWords` are therefore on every row: a surface
that drew the share without them would report a sentence about a tenth of a
component as a sentence about the component.

### The whole library gets a total, which no other reading of a library has

Every reading of a library so far refuses a figure added across kinds (0257,
0256, 0265, 0266), because a figure over every kind at once counts a page once
per element node and so measures how finely the pages were written.

**Words do not do that.** A part's own words partition its page exactly once
(0212, 0235), so the rows here add, and `LibraryCopyChange.words` is the type
rows added up rather than a second computation that could disagree with them.

It follows the **type** rows and not the role rows, because the two disagree
about a node whose type changed and a type is the thing an author replaces. A
recast node is a place one kind left and another took (0266), so its words are in
`wordsGained` and `wordsLost` both — the page did not gain or lose them and the
two kinds did — while the role rows hold it still wherever the two types play the
same part. The role rows can therefore carry words the type rows report as
having changed hands, and `recast` is the size of that.

**No verdict and no silence at that scale.** Every reason this reading has to
withhold something is a reason about one kind of part, and inventing a second
subject for a figure that is a sum of rows would put *there is none of this in
your library* over a number about all of it
([0240](0240-a-silence-is-a-condition-and-a-subject-and-the-two-names-for-one-state-were-not-synonyms.md)).
The whole-library row is numbers; the verdicts are on the kinds.

### A floor costs the signed figure and nothing else

A type that declares no `copy` leaves a passage short of words nothing can see
([0122](0122-a-primitive-says-which-of-its-props-a-reader-reads.md)), and
0239 drew the line where it has to be drawn: a single passage's movement
survives a floor and a **signed sum** over passages does not.

The sum here is `tookUp − fellAway`. A floored passage that gained reading beside
an exact one that lost it can carry the wrong sign — a hundred true words counted
as ten, against fifty counted as fifty, is an improvement published as a
regression. So:

- `words.change` is **withheld** where any carried word of the row is a floor,
  with `floored` as the reason, and the row's `movement` is `unknown`.
- **Everything else stands.** The two shares are each short in numerator and
  denominator together and say so, exactly as a copy reading publishes its own
  share under the same floor and withholds only its mean. Both masses stay, so a
  surface can say what the subtraction would have been made of.
- **The places answer is never withheld for a floor**, anywhere. A placement
  that took up its reading is exact whatever its words are, and that reading is
  0266's — which is where a row silenced here points.

That makes `floored` the only member of any silence vocabulary in this subsystem
whose reading withholds a single figure while every other figure on the row
stands. It is what a reading whose denominator is a count of words rather than of
readers can afford.

### What is confounded is published rather than corrected

A passage counts as read where at least one reader reached the part saying it
(0212, 0235), so a quiet window leaves more words unread with nobody behaving
differently. That is 0266's confound at another unit, handled the same way:
`viewsWas` and `viewsNow` travel on the reading as floors
([0147](0147-a-rollup-is-added-to-what-is-stored-and-a-distinct-view-count-is-therefore-approximate.md)),
nothing is scaled by them, and no threshold decides what counts as comparable
traffic — a threshold there would be a threshold on a deployment's own schedule.

### The thirteenth silence vocabulary brings no new condition

`library-copy-change`, five members, subject `kind`: `unplaced` from the census,
`unpaired` from the places comparison, and `wordless` and `floored` from a change
to one page's words. It is the first set assembled out of three, and the last
pair is the instructive half — `words-a-floor` arrived with a reading of one
page's words and is reported here at a different subject, which is `one-reason`
and never `one-state`, exactly as the door's states are reported at two subjects
(0256). 0240 is not superseded and not edited; the module carries the corrected
counts.

### The lead is the mass of words and not the worse share

`mostAbandoned` is the type whose carried words lost the most reading, by mass. A
label that lost its one word is a perfect rate and a smaller problem than a band
of four hundred that lost half of them — the ranking rule a page's falls already
use ([0221](0221-where-reading-stops-is-a-fall-between-two-siblings-and-a-ratio-of-two-counts-off-one-row-set.md))
and a library's kinds already use (0257).

No root exclusion is needed here, and the reason is worth keeping: 0265 had to
keep a page's root out of its lead because `engaged` at a root is the page-wide
*did anybody do anything*
([0242](0242-what-readers-did-is-a-share-off-one-row-and-a-leaf-has-no-inside.md)).
A part's words are its own and never its subtree's, so a root's row here is a row
about the words the root itself says.

## Consequences

- An author who changed copy inside a primitive can be told what happened to the
  words that survived the change, across every page the primitive stands on, from
  counters already stored. Nothing about a reader is collected to answer it and
  no payload grows.
- **A deployment-wide word figure exists for the first time in a reading of a
  library**, and the portal may draw it. Every other library figure stays
  per-kind for 0257's reason.
- A floored row has no verdict. On a library built from the starter primitives
  that is nought rows (0223); on one built from a deployment's own types it may
  be most of them, which is 0212's thinness and not a fault here — and the places
  comparison answers for every one of them.
- Role rows are a census of one row until `src/primitives/` declares a role. The
  join is at read time (0212), so the day one is declared every counter already
  stored reinterprets. Filed again.
- `pnpm verify` is green; the broadcaster's bundle is byte-identical to
  `origin/main` (6,477 bytes minified, 2,935 gzipped, `cmp` clean).

## Alternatives considered

**A word-weighted mean of each side's reach — *the typical reader reached this
many of its words*.** Refused here for 0239's own reason one level up: it adds
signed per-page terms whose weights are each page's own views, so a movement in
it is a movement in readers *or* in which pages they were on. 0239 withholds that
figure for one page under a floor; at the scale of a library the weights move
even without one. It is the reader-weighted question and is filed, as 0256 was
filed rather than shipped inside 0257's type.

**Publishing the signed figure under a floor with a caveat.** Rejected. Every
other floor in this subsystem distorts a figure's magnitude; this one can invert
its sign, and a verdict that may be backwards is worse than no verdict. The prose
that would have carried the caveat is the thing a surface skips, which is 0256's
argument for a separate type and the same argument for a withheld field.

**Counting the words of a recast node as carried under its type.** Rejected: it
would report a change to a component as a change in its readers. The node is a
place one type left and another took, which is 0266's rule, and the role rows are
where a reader's view of it survives.

**A whole-library figure counted per node rather than as the rows added up.**
Rejected. It would include a recast node's words, so neither key's rows would add
to the published total, and a surface drawing a total above its rows would show
three numbers that do not reconcile.

**Comparing the words of a placement paired by node without holding the text
still.** This is the thing 0266 refused and the reason this record exists. A
republished page's placement is the same node saying different sentences, and the
two shares are not a before and an after of anything.
