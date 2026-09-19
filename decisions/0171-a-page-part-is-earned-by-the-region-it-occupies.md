# 0171. A page part is earned by the region it occupies, not by the content it holds

**Status:** Accepted
**Date:** 2026-09-19
**Section:** §4b

> **Why this number.** The highest record on `main` is `0169`. `0170` is claimed
> by #336, open at the time of writing. `0171` is the next number free on `main`
> and on every open branch, which is the discipline #313 had to be renumbered
> for not following.
>
> **Why `Accepted`.** It contradicts no `Accepted` record and touches no schema,
> no tree, no delta. `COMPOSITION_PARTS` is a `const` tuple inside
> `src/primitives/compositions/`, which is this lane's own, and what is decided
> here is the bar for adding a member to it.
> [0162](0162-the-catalogue-is-a-phrasebook-and-the-page-is-one-path-through-it.md)
> governs what earns a *catalogue entry* and is untouched — this record sits one
> level above it and hands most candidates back to it.

## Context

`COMPOSITION_PARTS` was written on 16 September with nineteen members and has
had nineteen since. Its own doc comment explains what the tuple is for and says
nothing at all about what may be added to it, which is how a list ends up closed
without anybody closing it.

Three consecutive runs then named the closure as the thing in their way and none
of them opened it. The clearest statement is #329's, in its own report:

> `COMPOSITION_PARTS` is closed at nineteen, so a newsletter strip, a careers
> band or a gallery needs the tuple widened first. Two runs have now judged that
> the right bar; this one did not re-decide it.

That caution was correct while the question was unanswered, because the
**expensive** mistake here is obvious and 0162 had just been written about its
sibling: a part per content model produces a vocabulary of near-neighbours, the
canonical page grows a band every time somebody has an idea, and
`PAGE_SEQUENCE` stops being a document. A run that widened the tuple casually
would have undone the thing 0162 had just established.

But *hold it closed until somebody argues otherwise* is not a bar, it is the
absence of one, and its cost had arrived. On 19 September the catalogue could
not express a strip above the navigation or a band showing code — two of the
most ordinary things on a developer product's landing page — and the reason was
not that either had been judged and declined. Nobody had a rule to judge them
against.

### What the wrong bar would be

The tempting bar is **is this content different from everything already here**.
It fails in both directions. *Careers* and *team* hold different content and
are plainly one region of a page; *a logo wall* and *a cluster of faces* hold
content that is barely different at all and are the same region drawn for two
different readers — which makes them two designs of one part, which is exactly
what 0162 already handles.

Content is the wrong axis because the tuple is not a taxonomy of things a page
can say. **It is an order**, and an order is a statement about *places*.

## Decision

**A part earns a member of `COMPOSITION_PARTS` when there is a region of a page
it occupies that no existing part occupies.**

The operational test, because "region" on its own is a word anybody can use to
justify anything:

> **Two parts cannot stand in for each other.** Swap a candidate for the part it
> most resembles, in both directions, and ask what the page loses. If either
> swap loses nothing the page needed, the candidate is a *design* of that part
> and belongs in the catalogue under 0162 without touching this list.

Three consequences follow, and they are the whole of the rule:

1. **A part is admitted with its position, not just its name.** The tuple's
   information is the order, so a candidate that cannot be placed — a band that
   could reasonably go in four places — has not identified a region and is not
   ready.
2. **A part arrives with a canonical design whose id is the part's name.** This
   is already asserted; it is restated here because it is the cost that stops
   the list being free. A part with no canonical design is a red build, so
   naming a region commits somebody to drawing it.
3. **The canonical page gets one band longer.** `PAGE_SEQUENCE` is derived from
   this tuple, and every member is a band on the one document the catalogue
   claims assembles cleanly. That is the price, it is paid by every reader of
   that page, and it is the reason the bar is a region rather than an idea.

### The three admitted on 19 September, worked through the test

| candidate | nearest part | what the swap loses | verdict |
| --- | --- | --- | --- |
| **`banner`** | `cta` | the region is *above the navigation*; nineteen parts begin at the navigation, and a closing band cannot be moved there — it would be a level-2 heading above the page's level-1 | **part**, at position 0 |
| **`code`** | `steps` | `steps` explains the workflow in prose; `code` answers *how much of my repository does this touch* in the only notation that can. Swap either way and the page loses a distinct objection it was answering | **part**, after `steps` |
| **`proof-faces`** | `proof` | nothing. Both occupy the quiet band under the hero that answers *is this real*; one says organisations have signed and the other says people like you have not regretted it, and a page takes one | **design of `proof`** (0162) |

The third row is the one that makes the rule worth having. It is the candidate
that looks most like a new part by the content test — faces and a score against
six wordmarks share not one node type — and is most clearly not one by this
one.

## Alternatives considered

**Leave the tuple closed at nineteen and ship everything as a design of an
existing part.** This is what three runs did, and it works until a candidate has
no part to be a design of. `banner` is that candidate: it is not a second
closing band, it is not a second navigation, and forcing it under either would
give the page a strip whose anchors and heading level belong to something else.
The failure mode of this option is not a refused band — it is a band shipped
under the wrong part, where 0165 then forces it to answer to that part's anchor.

**Admit a part per content model, matching the way Hermes named its blocks.**
Rejected for the reason `docs/hermes-port-map.md` gives about the port
generally: seventy Hermes blocks are perhaps twenty-five content models wearing
different words for different audiences. A `careers` part beside `team`, a
`newsletter` part beside `cta`, a `gallery` part beside `bento` — each is a
plausible sentence and each puts a near-neighbour in a list whose only
information is an order. The canonical page grows without bound and the order
stops meaning anything.

**Let a part opt out of `PAGE_SEQUENCE`, so the vocabulary can grow without
lengthening the document.** Genuinely tempting, and declined for now rather than
refuted. It would dissolve the cost this rule's bar is calibrated against, and
it is the natural shape if the sequence later becomes several named paths. But
it makes `PAGE_SEQUENCE` a hand-kept subset again — the exact thing the derived
list was built to stop, eight days ago — and buying that back to admit two
members is the wrong trade. Named for whoever needs it: the trigger is a second
page type, not a twenty-second part.

**A numeric position field on `Composition` instead of the tuple's order.**
Rejected as a worse spelling of the same thing. An order expressed as numbers on
scattered modules is an order nobody can read in one place, and inserting
between two bands means renumbering or inventing fractional positions.

## Consequences

**The tuple grows, and slowly.** Two members on the day the rule was written,
and the rule is deliberately harder to satisfy than the catalogue's. A
phrasebook of designs grows without limit
([0162](0162-the-catalogue-is-a-phrasebook-and-the-page-is-one-path-through-it.md));
a vocabulary of page regions is bounded by how many places a page has, which is
a small number and is the point.

**The canonical page is now twenty-one bands.** Long, and worth watching: at
some point the honest thing is more than one page sequence — a landing page, a
product page, a pricing page, each a named path through the same phrasebook,
which is 0162's own metaphor taken one step further. That is not decided here
and nothing in this record depends on it. What is decided is that the vocabulary
may grow and on what grounds; if the sequence later splits, this rule is what
each path is assembled from.

**The outline is now checked rather than inherited.** Every band written before
today opened at heading level 2, because every band began with a
`loom.section` and the convention travelled with the copy. A part whose region
is above the navigation inherits no such convention, and the most natural
mistake in writing one is to give the strip a heading — which produces a
level-3 above the page's level-1, breaks a screen reader's outline, and is
invisible in every palette. `compositions.test.ts` now asserts that the
assembled page never climbs more than one heading level at a time. That check
is a consequence of opening the tuple, not a coincidence of this run.
