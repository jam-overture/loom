# 0162. The catalogue is a phrasebook of designs, and the page is one derived path through it

**Status:** Accepted
**Date:** 2026-09-16
**Section:** §4b

> **Renumbered on 2026-09-16**, from 0161, when the branch that carried it
> (#313) was merged. `main` had meanwhile accepted a different 0161 — *a public
> page writes to one application endpoint, and is counted by a key that outlives
> nothing* (#312) — and two records sharing a number is fatal (0097). The record
> that was already on `main` keeps the number. Nothing in this record changed
> but its number; 0162 was the next number free on `main` and on every open
> branch, 0163 being claimed by #314. References on this branch were updated
> with it, and the note below is the reasoning as it stood when the record was
> written.

> **Why this number.** The highest record on `main` is `0160`, and `0158` and
> `0159` are both taken. Nothing is skipped here.
>
> **Why `Accepted`.** It refines no `Accepted` record and changes neither the
> tree schema nor the delta model. It is closest to
> [0157](0157-the-catalogues-public-surface-is-the-list-and-the-lookup-not-every-band-by-name.md),
> which rules on *which names cross the package boundary*, and it does not
> disturb that ruling: no band becomes a named export, and the catalogue is
> still reached by the list and the lookup. What it changes is what the list
> *means*, and that meaning was never in a record — it was in a doc comment,
> which
> [predicted its own expiry](#the-comment-that-called-this) and asked the next
> run to watch for it.

## Context

`STARTER_COMPOSITIONS` has been doing two jobs since it shipped, and until now
one list could do both because the catalogue held exactly one design of each
band. It was:

1. **the catalogue** — everything a surface may offer a person to drop on a page;
2. **the page** — taken in order, one complete landing document, with nothing
   missing and nothing repeated.

The second job is real and is the part somebody assembling their first landing
page does not know. It is also the one that breaks first.

### The comment that called this

The list's own doc comment, written on 13 September when it went from nine bands
to thirteen:

> **This list stops being a page before it stops being useful**, and that is the
> thing for the next run to watch. A second hero, a two-tier pricing band, a
> testimonial wall as a marquee — all legitimate, none of them insertable into a
> sequence that is meant to read as one document. At that point the catalogue is
> a phrasebook rather than a page and wants two lists: everything on offer, and
> the ordered subset that assembles a page. It is not split here because
> thirteen still assembles one, and splitting it before it breaks would be
> inventing a structure ahead of its reader.

Every clause of that turned out to be right, including the last one. This record
is written at the moment it broke and not before.

### It broke against a test, not against an opinion

The forcing move is the range mandate: the honest ceiling on distinct primitives
is about 110–120 (`docs/primitive-gap-inventory.md`), the target is 250
droppable things, and the arithmetic says the gap is compositions. But there is
only one page's worth of *distinct bands* — that is what a page is — so growing
the catalogue means **more designs of the same band**, which is precisely what
21st.dev's numbers count. Its 1152 heroes are one block drawn 1152 ways.

The repository had already written down how a single list would fail, in
`compositions.test.ts`:

> Nine bands assembled in order are one document outline, and the hero is the
> only band that opens one. A second `level: 1` further down is the defect a
> hand-built page acquires by copying a hero's heading into a section, and it is
> invisible in every palette.

Adding `hero-split` to a list that is also the page turns that test red, and
**correctly** — two heroes are two `<h1>`s and that is not a document. The test
was not in the way. It was the measurement saying the two jobs had come apart,
which is the cheapest possible way to find that out.

## Decision

**`STARTER_COMPOSITIONS` is the phrasebook: every design on offer, growing
without limit. `PAGE_SEQUENCE` is one design of each band in page order, and it
is _derived_ from the phrasebook rather than kept beside it.**

Three parts make that work:

**A band declares which part of a page it is a design of.** `Composition` gains
`part: CompositionPart`, drawn from `COMPOSITION_PARTS` — a tuple that is both
the vocabulary and the page order. This is
[0114](0114-a-primitive-declares-what-part-it-plays-and-the-registry-is-asked.md)'s
shape one level up: a member declares what part it plays and the catalogue is
asked, instead of a caller matching on ids it has to know in advance.
`compositionsForPart("hero")` is the question a surface actually has.

**A part's canonical design has the part's own name as its id.** `hero` is the
canonical hero; `hero-split` is another design of the same part. So
`PAGE_SEQUENCE` is `COMPOSITION_PARTS` looked up one at a time, and there is no
second list to fall out of step with the first. A part left with no canonical
design is a red test rather than a page quietly missing a band.

**A design earns a catalogue entry only by building a different set of nodes.**
This is [0052](0052-a-repeated-item-is-a-node-and-a-fixed-field-is-a-prop.md)'s
own test lifted one level, and it is the load-bearing half of this record. A
band that differs from another design of its part only in its **props** is not a
second design — it is a `configure` of the first, and shipping it puts a
catalogue entry where a one-operation edit belongs. A centred hero and a
left-aligned hero are one band. A hero with an empty media region and a hero
holding a framed product surface are two.

`compositions.test.ts` asserts it by comparing the node-type shape of every
design of a part, so the near-miss fails the build rather than getting reviewed.

## Consequences

**The catalogue can now grow the way the target needs.** A part with six designs
costs six entries here and **nothing per interpretation request**, because a
composition adds no registered type — which is the whole argument of the gap
inventory and the reason the 250 is reachable without a 250-entry vocabulary.

**A surface now has to choose which list it wants**, and that is a real new
obligation on callers rather than a free win. A menu of bands offers the
phrasebook; an offer to *start a page* offers `PAGE_SEQUENCE`. A surface that
reaches for `STARTER_COMPOSITIONS` when it meant the page will now render two
heroes, which is visible immediately and is the failure mode to prefer.

**0157 is untouched and worth re-reading before adding names.** The catalogue's
public surface is still the list and the lookup; no band is a named export. This
record adds four published names — `COMPOSITION_PARTS`, `CompositionPart`,
`compositionsForPart`, `PAGE_SEQUENCE` — and four names is what the docs search
index counts, not the twenty-three bands behind them. That asymmetry is exactly
0157's finding and it is the reason this shape is affordable: **the next fifty
designs cost the published surface nothing.**

**The `part` vocabulary is now a thing that can run out.** It is closed, and a
band that is genuinely not one of the nineteen parts — a newsletter strip, a
careers band — cannot be added without widening it. That is deliberate and is
the same bar 0114 sets one level down: widen it when there is a design that
needs it, not in advance.

## Alternatives considered

**Keep one list and refuse second designs.** Honest, and it caps the catalogue
at one page's worth of bands — about nineteen. It makes the 250 unreachable by
any route except padding the primitive vocabulary, which the gap inventory
measures at ~42,600 characters per request and argues against at length.

**Keep one list and let the page be whatever a caller picks.** Drops the
ordering information entirely. The order is the part a first-time page assembler
does not know, and 0120 already recorded that *the order of the catalogue is
information*; throwing it away to avoid a second list is a bad trade.

**A `canonical: boolean` flag instead of the id convention.** Works, and adds a
field that can be set twice or not at all for a part. The id convention cannot
be: a part has exactly one band whose id is its name, or the lookup returns
nothing and the test says so. A flag needs a test to catch two `true`s; the
convention needs a test to catch zero, which is the cheaper failure to check.

**A second hand-maintained list of the page.** The thing this is written to
avoid. Two lists that must agree, with nothing making them, is how the catalogue
and the page disagree in three weeks and nobody notices until a screenshot.
