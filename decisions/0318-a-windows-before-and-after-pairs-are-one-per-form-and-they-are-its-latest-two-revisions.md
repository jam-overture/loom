# 0318 — A window's before-and-after pairs are one per form, and they are its latest two revisions

**Status:** Accepted

**Date:** 27 October 2026

**Section:** §4c (reader signals)

## Context

0309 built the step between a store and a question: `readReaderWindow` reads the
four row sets, and `windowReadingsOf` joins them to the pages they are about and
hands back one `PageReading` per page, per revision, per form. Every reading in
this subsystem that is a function of **one** `PageReading` became reachable from
a store that day.

**Nine of them are functions of two.** `readingChangeOf`, `copyChangeOf`,
`paceChangeOf`, `actionChangeOf`, `funnelChangeOf` and the four library
comparisons each take two sides, and nothing turned a window into a pair — even
though a window usually holds both sides, because one page's revision 5 and its
revision 9 are two readings in the same list. `deploymentChangeOf` states the
missing step in its own docblock:

> Takes the comparisons rather than the counters … A caller with two windows of
> counters reads each page's parts, then its progress, then its comparison, then
> this.

So the comparison half of the subsystem — the half the product's whole argument
rests on, that a change can be inspected and attributed — was reachable only by
a caller that wrote the pairing itself. And the pairing is not a detail. 0293
exists because four library comparisons each spelled it by tree alone, which
drops a second form as a duplicate where two forms sit at one revision and gates
both out as ambiguous where they do not. A caller writing the pairing is a
caller writing 0293 again, in a file nobody reviews for it.

There are three ways to pair one form's revisions, and they are not equivalent.

## Decision

**`windowPairsOf(readings)` in `src/signals/window.ts`, which produces one pair
per form, of that form's latest two revisions in the window.**

```ts
const { pages } = windowReadingsOf(window, treesIn(trees), registry)
const { pairs } = windowPairsOf(pages)
const order = deploymentChangeOf(
  pairs.map(({ was, now }) => readingChangeOf(was, now)),
  window.pageViews
)
```

Five clauses.

**1. Grouped by `formKeyOf` and by nothing else (0293).** A pair's two sides are
therefore of one tree and one audience by construction. Three of the four states
`readingChangeOf` refuses are unreachable from a pair this produces:
`different-trees` needs two trees, `different-audiences` needs two named
audiences that differ, and `audiences-mixed` needs a side that holds two forms
and names none — which is a reading `windowReadingsOf` does not produce, because
it splits a revision serving two forms into one reading each. What is left is
`nothing-measured`, which is about a deployment's readers rather than about its
caller. That division is the point: a silence off this path is a fact about the
readership and never a mistake in the asking.

**2. One pair per form, and it is the latest two revisions.** A form with
revisions 3, 5 and 9 in the window has two consecutive pairs in it and this
produces 5 against 9.

**3. What it left below `was` is on the pair.** `WindowPair.superseded` lists
the revisions of that form older than the earlier side, oldest first, so a
surface can say *and one earlier revision in this window* and a caller that
wants that older pair has two readings and one call.

**4. A form with one revision is reported, not dropped.** `WindowPairs.unpaired`
carries it with its one reading, for the reason `UnjoinedRevision` is published:
a page published inside the window, a page nobody has changed since the window
began, and both sides of a deployment that upgraded across 0284 all land there,
and a screen that left them out would show a deployment fewer pages than it has.

**5. A reading handed in twice under one `readingKeyOf` is dropped and counted.**
The first wins, as the first of two trees does in `treesIn`, and
`WindowPairs.duplicated` says how many were dropped. It is nought for anything
`windowReadingsOf` produced; it is not nought for a caller that concatenated two
reads, and that caller is the one this clause is for — a form whose latest
revision arrived twice would otherwise pair that revision with itself and
publish *nothing changed* about a change that was made.

**It adds no figure of its own.** Nothing here counts, divides, sums or
withholds; it decides which pairs a window holds and hands each of them its two
readings. That is the rule 0309 set for the first step of this rung, kept for
the second.

## Consequences

**The comparison layer is reachable from a store.** Nine comparisons, each one
call off a pair, and the deployment-wide change order is three lines where it
was an unwritten pairing plus four.

**A deployment that published a page three times in one window keeps that page
in the order.** Clause 2 is the reason. `deploymentChangeOf` gates a form handed
two different revision pairs as `ambiguous` and drops it — rightly, because
*which page did the change hurt most* cannot be answered about a form that
changed twice — so a rung producing every consecutive pair would take every
such page out of the order it exists to rank, and the figure it vanished out of
would go on looking right (0158). The test for this asserts both halves: the
pairs this produces give `ambiguous: []` and `compared: 1`, and every
consecutive pair of the same three readings gives `ambiguous: [TREE]` and
`compared: 0`.

**The widest pair is not available from here, and that is deliberate.** 3
against 9 is two changes added together and labelled as one. *What did this
change do* is a question about the change that was made.

**The pair spanning the 0284 upgrade is not produced.** A deployment whose older
revisions' rows never carried the audience column has those revisions in a form
that names no audience, and its newer ones in a form that names one, and those
are two forms under clause 1. `crossesAudiences` deliberately allows that pair —
it is unprovable rather than proven two populations — but allowing it is not the
same as asserting it: nothing in the rows says the two are one population. Both
sides are in `unpaired`, and the caller that knows its own publishing history
makes the comparison in one call, where `ComparedAudiences` on the result says
what it was read across. The alternative was a tenth spelling of the pairing
rule, inside the one module written to stop there being a second.

**It does not assemble the two windows the four library comparisons take.** Those
compare a whole library before against a whole library after, and a form with
one revision cannot be put on a side: a page published inside the window belongs
to the later one, a page nobody has changed belongs to both, and nothing in the
counters tells them apart. Guessing would publish a page nobody touched as a
page gained (0295). The forms are reported and the placing is left to the only
party that knows what it published when. Filed as a finding rather than left
unsaid.

**Nothing reaches a reader.** No payload field, no browser byte, no column, no
migration, no store method and no kind. `broadcast.ts` is byte-identical.

**One local helper was renamed.** `window.ts` held a private
`inFormOrder(one: AudienceId | null, other: AudienceId | null)` that orders
audiences and takes no tree, while the published `inFormOrder` in
`audiences.ts` orders forms. The pairs need the published one, and two rules
cannot carry one name in one subsystem — so the private one is
`inAudienceOrder`, which is what it does.

**Cost.** Linear in the readings but for one sort per form, which is a sort of
that form's revisions rather than of the window. A deployment's revisions per
page are a handful where its pages are not, so the window is never sorted whole
(rule 4).

## Alternatives considered

**Every consecutive pair.** The honest-looking answer: a window holding three
revisions holds two changes, so publish two pairs. Rejected on its only
consumer. `deploymentChangeOf` drops a form it was handed two pairs of, so this
removes from the deployment's change order exactly the pages that changed most
often — and silently, because a shorter order looks like a calmer week.

**The widest pair (first against last).** Fewer pairs, and every page in the
order. Rejected: it reports two or more changes as one, and the one number a
surface prints beside it says *what this change did*.

**Every pair, with a `pairs` argument choosing a rule.** A
`{ pairing: "latest" | "every" | "widest" }` option. Rejected: the caller cannot
know better than this module which of the three is sound, because what makes
`every` unsound is what the *consumer* does with it, and a rung whose correct
argument depends on something the caller cannot see is an argument that will be
set wrong.

**Pairing the 0284 upgrade across the `null` boundary, where a page has exactly
one form of each.** It is the comparison a deployment that just upgraded most
wants, and `crossesAudiences` would allow it. Rejected as clause 1's
consequence: the rule that decides what one form is would have an exception here
and nowhere else, and the exception would assert a population identity no row
states. The caller makes it by hand in one call, and the result says what it
spans.

**Returning the pairs already compared** — `changes: readonly ReadingChange[]`
on the result instead of, or beside, the pairs. Rejected for 0309's reason: it
would privilege one of nine comparisons, make this a thirty-ninth reading, and
derive a figure in a second place. The pairs are the artefact; the comparisons
are one call each.

**Putting it in a file of its own.** Rejected: it is the second step of the rung
0309 built, it is a function of `WindowReadings.pages`, and it reuses that
module's revision ordering. A second file would be a second place to look for
one answer.
