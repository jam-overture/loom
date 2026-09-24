# 0186. A what's-on band occupies the come-back region, so it is a design of `articles` and not a twenty-third part

**Status:** Accepted
**Date:** 2026-09-24
**Section:** §4b

> **Why this number.** The highest record on `main` is `0184`. `0185` is claimed
> by #378, open at the time of writing. `0186` is the next number free on `main`
> and on every open branch.
>
> **Why `Accepted`.** It contradicts no `Accepted` record and touches no schema,
> no tree, no delta. It *applies*
> [0171](0171-a-page-part-is-earned-by-the-region-it-occupies.md)'s test to one
> candidate and reaches the outcome 0171 says most candidates reach — a design
> under [0162](0162-the-catalogue-is-a-phrasebook-and-the-page-is-one-path-through-it.md),
> with `COMPOSITION_PARTS` unchanged at twenty-two.

## Context

`loom.event` and `loom.event-grid` shipped on 14 September and no band placed
either. The 21 September gap inventory filed them under *not a landing page*;
[0183](0183-a-page-for-another-kind-of-business-is-the-same-sequence-with-different-nodes-in-it.md)
showed that row was reasoning from what a band *says* rather than from where it
goes, and closed four of its twelve. It did not close this one, and said so
explicitly:

> `event` and its grid are a run **and one judgement** — the swap against
> `changelog` loses something in both directions, so a what's-on band may be the
> twenty-third part rather than a design, and that is a 0171 question somebody
> has to answer rather than assume.

That sentence contains the whole difficulty, and it is not the swap. It is the
choice of **which part to swap against**, which 0171 leaves to the person
running the test — *"swap a candidate for the part it most resembles"* — and
which decides the outcome before any swapping happens.

## The two readings

### Against `changelog`, it is a part

A changelog is dated entries pointing backwards; a what's-on band is dated
entries pointing forwards. They share a shape almost exactly — a column, a date
set first, an entry beside it — and the swap fails in both directions:

- Put a what's-on band where a developer tool's changelog goes and the page
  loses its evidence of shipping, which is the objection that band exists to
  answer.
- Put a changelog where a conference's what's-on band goes and the page loses
  the thing it is *for*. A conference has no changelog.

Neither stands in for the other, and by the letter of 0171's test that makes it
a part.

### Against `articles`, it is a design

`articles` is not *the blog*. Its region is **the come-back band**: the one near
the end of a page that gives a reader a reason to return, and it already holds
three designs that agree about nothing else. `articlesBand` is four posts,
`feedBand` is a bound list, `episodesBand` is a back catalogue of recordings —
and 0183 admitted the third on exactly this ground, that *a page with a shelf of
episodes where the writing band goes is still a page that says we make things,
here they are, come back.*

Swap a what's-on band into that region and the page says the same sentence with
a different verb: *we are doing things, here they are, come*. Nothing the page
needed is lost. By 0171 — *"if either swap loses nothing the page needed, the
candidate is a design"* — one clean swap is enough.

## Decision

**A what's-on band is a design of `articles`.** `COMPOSITION_PARTS` stays at
twenty-two and the band ships as `articles-whats-on`, answering to the
`articles` fragment like every other design of it.

**The `changelog` reading is rejected because it is the content test wearing the
region test's clothes**, and 0171 refuses the content test in as many words:

> Content is the wrong axis because the tuple is not a taxonomy of things a page
> can say. **It is an order**, and an order is a statement about *places*.

A shared shape — a dated column — is content. Two bands that look alike from a
distance are not thereby in one region, and 0171's own worked example is the
mirror image of this: `proof-faces` and `proof` *"share not one node type"* and
are one part, because the axis is not what the nodes are.

So the question *which part does it most resemble* has to be answered by region
and not by silhouette, and by region the nearest part is plainly `articles`:
both bands sit between the social proof and the FAQ, both exist to make a reader
return, and a page takes one of them.

### The three consequences, checked

1. **A part is admitted with its position.** Not applicable, and the fact that
   it *would* have been hard is corroborating. A what's-on band could
   defensibly go before the FAQ, after the changelog, or above the closing ask —
   which is 0171's own symptom of a candidate that has not identified a region.
2. **A part arrives with a canonical design.** Not paid, because no part was
   added. `articles` already has one.
3. **The canonical page gets one band longer.** Not paid. `PAGE_SEQUENCE` is
   twenty-two bands and a landing page does not want a calendar in it by
   default, which is the strongest practical argument against the other reading.

## What would reopen this

A page sequence that is genuinely not this one. The `changelog` swap fails
because it is run against *two different pages* — a developer tool's and a
conference's — and 0171's test assumes one. If the catalogue ever grows a second
`PAGE_SEQUENCE` for a business whose product is occasions, the calendar is that
sequence's spine rather than its come-back band, and the region argument is
different. That is a decision about page sequences, not a widening of this
tuple, and it is the honest shape of the objection rather than a reason to admit
a part now.

## Alternatives considered

**Admit `events` as the twenty-third part, after `changelog`.** The reading
above, taken. It costs a band on every assembled page for a region that page
does not have, and it sets the precedent that a distinctive silhouette earns a
part — which is exactly the growth 0171 was written to stop, one candidate at a
time.

**Ship it as a design of `changelog` instead.** Worse than either. It would
inherit the `changelog` fragment, so a page swapping its changelog for a
what's-on band would keep a nav link reading *Changelog* that lands on a list of
things that have not happened yet — [0165](0165-an-anchor-belongs-to-the-part-and-is-unique-over-the-assembled-page.md)'s
failure mode, arrived at deliberately.

**Leave it unplaced for another run.** Three runs have now reported
`loom.event` as unreachable. The judgement was not going to get easier by
waiting, and the cost of leaving a registered primitive in every interpretation
request that no band can build is paid per request.

## Consequences

- `articles` has **four** designs — posts, a bound feed, a back catalogue and a
  calendar — and is the most designed part in the catalogue. That is a fact
  about the region rather than about the part: *give a reader a reason to come
  back* is the one band whose right answer depends most on what the business
  makes.
- `articles-whats-on` answers to the `articles` fragment, so a page that swaps
  the writing band for it keeps its own navigation working (0165), and a page
  that carries both would carry a duplicate anchor — which
  `compositions.test.ts` already refuses over the assembled page. Two designs of
  one part are alternatives, not neighbours.
- `loom.event` and `loom.event-grid` are reachable, which closes the last of the
  *not a landing page* row opened by the 21 September inventory and continued by
  0183. Nothing in that row is behind a decision now.
- The judgement is recorded where a later run will look for it, which is the
  half 0183 could not supply: a run that reads `COMPOSITION_PARTS` and wonders
  why a calendar is not in it has an argument to disagree with rather than an
  absence to interpret.
