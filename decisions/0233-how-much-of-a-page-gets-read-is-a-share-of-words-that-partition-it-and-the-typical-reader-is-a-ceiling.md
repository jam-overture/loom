# 0233 — How much of a page gets read is a share of words that partition it, and the typical reader's figure is a ceiling

**Status:** Accepted
**Date:** 2026-10-06
**Section:** §4c (reader signals)

## Context

Step 6 of [`docs/signals.md`](../docs/signals.md) names three questions the
server-side join was built to answer. Two of them have been answered and
measured: *which parts of a page are read and which are scrolled past*
([0212](0212-what-a-reader-signal-means-is-joined-to-the-tree-when-it-is-read.md),
[0230](0230-a-part-was-read-when-readers-had-time-for-its-words-and-only-the-skim-is-a-safe-claim.md))
and *which roles readers engage with and which they skip* (0212). The third is
*which copy a reader actually reached*, and what exists for it is `wordsReadIn`:
a filter over the reading that hands back the text of every part a row says was
seen.

That is the right answer to the question as asked and it is not a measurement.
A list of strings cannot go on a screen as a figure, cannot be compared between
two windows, cannot be ranked, and — the part that matters — **cannot say what is
on the other side of it.** The words nobody reached are the ones a page is
changed because of, and nothing counted them.

The inputs were already in hand. `PartReading.copy` has carried each part's own
words since the join was built, and
[0223](0223-a-prop-is-copy-when-a-reader-could-quote-it.md) made them real by
declaring `copy` across the starter library. The standing beside them says
whether a row reported the part being seen.

**The reason this was not simply done is one piece of arithmetic.** 0230 states
flatly that there is **no page-wide word figure at all**, and a share of a page's
words needs one.

## Decision

`copyReadingOf(reading)` in [`src/signals/copy.ts`](../src/signals/copy.ts)
reports how much of what a page says is read, as words.

1. **A page-wide word total is sound here, and 0230's refusal still stands,
   because they are two different quantities.** A pace reading judges a part
   against **its subtree's** words, because the text on screen while a band was
   up is the band's and its children's — that figure nests, a sum charges one
   reader once per level, and 0230 therefore refused a page total of it. This
   module uses a part's **own** words, which nest nothing: a text node and a slot
   node are never parts, every element descendant is a part in its own right, and
   `PartReading.copy` is a partition of the page's words across its parts exactly
   once. That partition is the property 0212 published so a role row could be
   added up, and a page total is the same addition one level further. Neither
   record is weakened and nothing is superseded; the pace reading has no page
   total and this one does, for a stated reason.

   The partition is also why the root needs no special case. 0230 had to report
   it apart, as `whole`, because by subtree words it contains every part it would
   outrank. Here it contributes its own words like any other part.

2. **Two shares are reported, because *the words somebody read* and *the words a
   reader reads* are different sentences and only one of them is what a person
   hears.** `share` is the share of the page's words that **at least one** reader
   reached, which is exactly what a standing of `read` asserts (0212) — on a page
   with three hundred readers it is usually near 1, and it is true. `typical` is
   the words the average reader got to: every word weighted by the readers of the
   part saying it, over the page's views. Reporting only the first would publish a
   number that reads as the second.

3. **`typical` is a ceiling, and it is withheld rather than qualified where it
   cannot be one.** `reached` is over-counted by the page views that straddled a
   rollup window
   ([0147](0147-a-rollup-is-added-to-what-is-stored-and-a-distinct-view-count-is-therefore-approximate.md))
   and the view floor it is divided by is short of the page views there were
   (0212), so the numerator leans up and the denominator leans down and the figure
   is generous in both terms. The straddle itself very nearly divides out, which
   is the only reason the figure is worth publishing: the same inflation is in
   every `reached` and in the floor they are divided by. That is the cancellation
   a fall between two siblings already rests on
   ([0221](0221-where-reading-stops-is-a-fall-between-two-siblings-and-a-ratio-of-two-counts-off-one-row-set.md)),
   one level up.

   Four states give no figure at all, and the third is the one this adds to the
   subsystem's diagnostics:

   - `wordless` — the revision says nothing.
   - `unmeasured` — the window held no views, so there is no reader to be typical
     of.
   - `floored` — some part's type declared no `copy`
     ([0122](0122-a-primitive-says-which-of-its-props-a-reader-reads.md)), so the
     numerator is short by words nobody declared while the denominator is short
     the other way. The two errors no longer lean the same way, so the figure
     cannot be published as *at most* and is not published at all. A share
     survives a floor and says so; a mean does not.
   - `inconsistent` — a part reports more readers than the page has views, which
     no rollup produces: `reached` never exceeds a row's own `views`, and the
     page's figure is the largest `views` of any row. It is the alarm
     `PageReading.orphaned` is, at the other place a figure here would stay
     plausible while being about nothing.

   Where both `wordless` and `unmeasured` hold, `wordless` is reported: both are
   true, and *the page says nothing* is the one that will still be true when
   readers arrive and the one a deployment can act on.

4. **The floor is counted per standing rather than returned as one boolean,
   because the direction it biases a share in depends on where it is.**
   Undeclared words on a part readers reached are missing from the numerator and
   the denominator together; on a part nobody reached they are missing from the
   denominator only, and the share reads high. A consumer handed `true` would have
   to guess the sign.

5. **`unseen` is `skipped` only, and is ranked by words.** A part whose standing
   is `unknown` reported something other than coming into view, or sat in a window
   with no views at all; putting its words in a list called *nobody read this*
   would turn *nothing can be said* into a claim, in the one direction a reading
   of a quiet window must not be wrong in. Those words stay visible under
   `unknown`, where they can be seen and not acted on. The ranking is by words
   rather than position, for the reason a stop is ranked by the readers it loses
   (0221): the passage nobody saw that costs the page most is the long one, not
   the first one.

6. **A part that says nothing is left out of the passages and counted.** A
   spacer, a rule, a stack that only holds other parts. A part whose words are a
   floor is **kept**, because *this may say something and nothing here can see it*
   is not *this says nothing*, and the first is the answer 0122 exists to keep
   tellable.

7. **The word-counting rule is published once, in `src/signals/words.ts`, and
   both readings import it.** Two modules now cost the same page, and two
   spellings of one rule that agree today is a thing this subsystem has already
   been bitten by in the counter keys its two stores wrote. The remedy there was
   one definition with both sides importing it; this is the same remedy before the
   same bite.

8. **Nothing is collected.** No payload, no browser byte, no column, no store
   method, no kind. The broadcaster is untouched. This is the seventh thing
   derived from the server-side join rather than asked of a reader.

## Consequences

A deployment can state how much of a page is being read, and the sentence a
portal leads with is a comparison of the two shares: *every word of this page
reached somebody, and the average reader gets to a fifth of them.* The second
half is the one that justifies a change.

The other half is a list a model can act on directly: the passages nobody
reached, longest first, with their text. Where the part readings say *the reading
stops at the fifth band*, this says *and these are the four hundred words below
it that nobody has read*. That is the first thing in this subsystem that hands
back the page's own words attached to a measurement rather than a figure about
them.

Role rows gain a word figure that genuinely adds up, where the `RoleReading` of
0212 could only count parts. A view count on a role row is absent there because
distinctness cannot be added (0147); words are a property of the page rather than
of its readers, so they can be.

**The floor is where this is thin, and it is thin in another lane's direction.**
Every figure rests on what types declare as copy, so a deployment whose own
primitives have not declared will see `floored` and no typical figure. 0223
settled the starter library; a deployment's own components are its own to declare,
and `sdk/conformance.ts` is where that is nudged.

**Per-reader identity is neither easier nor harder for this.** Every figure here
is a mean over a window taken off counters already collapsed from view keys to
counts, and by then rule 2 has thrown the keys away. What an identity feature
would want from this question is *which readers read which passages*, which is a
per-view breakdown this cannot be bent into — which is the same reason it is
honest.

## Alternatives considered

**A page-wide subtree word total, with the nesting corrected by subtracting
children.** It would give one figure for *the words readers passed* and it is
what a future run would naturally reach for. Rejected: the correction is exactly
the own-word partition, arrived at by subtraction instead of by construction, and
a subtraction that must be got right at every level is a defect waiting for a
tree shape nobody tested. 0212 already publishes the partition; using it is
cheaper and provably right.

**Weighting the share by readers instead of reporting two figures.** One number,
and the only one most consumers want. Rejected because the unweighted share is
the one that survives a floor and the weighted one is not, so collapsing them
would have meant withholding both in the common case where a deployment has not
declared its copy. Two figures with one of them sometimes absent is more useful
than one figure usually absent.

**Clamping `typical` at the page's words instead of refusing an inconsistent
reading.** It cannot exceed the total for rows a rollup produced, so a clamp
would be invisible in practice. Rejected: a figure quietly cut to fit its own
ceiling is a plausible false number, and the input that would have broken it —
rows no rollup wrote — is worth saying out loud, exactly as `orphaned` says it
one module down.

**Reporting the unseen text as one concatenated passage.** Simpler to put on a
screen. Rejected: a model acting on it needs to know which node each run of words
belongs to, and a reader screen wants to rank them. The concatenation is a
caller's to make, and `wordsReadIn` already shows the shape for the other side.

**Taking the exact page-view denominator from the door rows (0219).** It is the
honest denominator and this module does not reach for it. Rejected here on
scope rather than on doubt: `pageReachOf` already pairs the two denominators that
fail in opposite directions
([0229](0229-a-share-of-readers-is-estimated-against-the-appearances-and-bounded-against-the-openings.md)),
and doing it a second time in a different shape would be two answers to one
question. This module takes a reading and nothing else, which is what lets two
windows of one revision be handed to it.
