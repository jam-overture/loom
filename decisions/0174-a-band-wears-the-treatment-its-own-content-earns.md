# 0174. A band wears the treatment its own content earns, and adds to its ground rather than replacing it

**Status:** Accepted
**Date:** 2026-09-20
**Section:** §4b

> **Why this number.** The highest record on `main` is `0172`. `0173` is claimed
> by #345, open at the time of writing. `0174` is the next number free on `main`
> and on every open branch.
>
> **Why `Accepted`.** It contradicts no `Accepted` record and touches no schema,
> no tree, no delta, and no primitive's props. It decides which bands in
> `src/primitives/compositions/` may build a wrapper node, which is this lane's
> own directory.
> [0110](0110-an-entrance-the-reader-drives-is-a-wrapper-not-a-prop-on-every-band.md)
> and [0130](0130-atmosphere-is-a-wrapper-and-the-paints-are-one-vocabulary.md)
> decided that these treatments are wrappers and are untouched; this record is
> the first thing anybody has written about **where one goes**, which is a
> different question and had no answer.

## Context

Three treatment primitives exist and the catalogue used none of them.

| | shipped | what it does | bands using it, 19 September |
| --- | --- | --- | --- |
| `loom.reveal` | 6 Sep, 0110 | a band lifts and fades in as the reader reaches it | **0** |
| `loom.backdrop` | 11 Sep, 0130 | atmosphere behind whatever it wraps | **0** |
| `loom.halo` | 13 Sep | light around one thing so it is read before its neighbours | **0** |

Thirty-four bands, zero. A page assembled from `PAGE_SEQUENCE` was one lit hero
followed by twenty flat bands — which is, word for word, the failure
`loom.backdrop` was written to fix and says so in its own header:

> a page's first screen looked like a product and the eight bands under it
> looked like a document, which is the exact failure the maintainer's brief
> names — *"when we demo this it really needs to pop"*

`loom.halo` is sharper still, because the gap it names is a specific band:

> A pricing band draws three tiers that are typographically identical; the one a
> page is actually selling is marked by nothing at all.

That was still true a week after the primitive shipped, and `loom.tier-table`
had already reserved the room for the ring in a comment. Nothing was blocked and
nobody missed anything: **a primitive entering the library and a band picking it
up are two pieces of work, and only the first had an owner.** This is the same
shape the maintainer's 12 September finding took — *a fix is not finished when
the schema accepts it* — arriving at the treatments instead of at anchors.

So the work was obvious and the rule for doing it was not. A treatment applied
by taste is a treatment on every band within two runs, and a page where
everything is emphasised has no emphasis. The question this record answers is
the one that had to be settled before a single wrapper could be added to a
canonical band: **which band wears which treatment, and why that one.**

## Decision

**A band may build a treatment its own content has already earned. It may not
build one that its position on the page would have to earn. And a treatment adds
to the band's ground; it never replaces it.**

### The first clause: the distinction must already be in the band

Each treatment draws a distinction. The band may wear it only if the band's own
content already makes that distinction some other way — so the treatment is
saying something the band means, rather than something the page might mean.

| treatment | the distinction it draws | what a band must already have |
| --- | --- | --- |
| `loom.halo` | **this one, not those** | a named exception among peers |
| `loom.reveal`, per child | **these are peers, and here they come** | interchangeable children with no inherent order |
| `loom.backdrop` | **stop here** | content that is the page's object of attention, and space between its objects for atmosphere to be seen in |

Applied to the catalogue on the day this was written, it picks two bands and
refuses the other thirty-two:

- **`pricing`** has a `loom.badge` reading *Most popular* on one of three
  otherwise identical tiers. The exception is named in the band's own copy, so
  the light has something to light: it wears a `loom.halo`. Its content is also
  a **decision** rather than a summary, which is the one thing on a landing page
  a reader is unambiguously meant to stop at, and its three cards are opaque
  with wide gutters between them — so it wears a `loom.backdrop` too. Two
  treatments on one band is not an exception to the rule; it is what the rule
  says when a band earns both, and it is the clearest demonstration that the
  wrappers compose.
- **`features`** has six interchangeable tiles. Peers with no order is a
  sequence to arrive in, so each tile goes inside a `loom.reveal` and the grid
  comes in by row. A reveal around the *grid* would have been one thing fading
  in, which is not a cascade.

And the refusals are the part that makes it a rule. `bento` has a lead cell that
is wider than the other four and the band's heading says *one of these is the
reason* — which looks like a named exception until you notice the exception is
already drawn, in the strongest way a layout can draw one. `cta` is the page's
closing moment and a reader is certainly meant to stop at it, but *closing* is
where it sits, not what it holds: the same band a third of the way down a page
is not a close, and nothing in the band would know.

**`metrics` is the refusal that had to be photographed**, and it is why the
backdrop's row above names area as well as attention. It takes `tone: "surface"`
and its own header says why — *the band that changes the page's rhythm* — which
read like a band declaring itself the stop, and it was the first band this rule
was applied to. It is also the shortest composition in the catalogue. A paint in
a 170-pixel strip is **invisible** under `editorial` and a **grey smear** under
`bold`: the ruled paints wash out against their own mask at that height, and the
two glow paints concentrate into exactly the blob `backdrop.ts` warns about.
Nothing failed and nothing could have — a backdrop renders as well in a strip as
in a band, and both shots were clean. Filed, and the band was reverted. A
summary a reader passes is not a stop, which is the better reading of that band
and is the one the picture forced.

### The second clause: a treatment may not cost the band its ground

A treatment goes **inside** whatever gives the band its ground. Where a band
paints no ground of its own, there is none to lose and a treatment may hold the
whole band — which is why `pricing`, whose section takes no `tone`, is rooted in
a `loom.backdrop`, and why `metrics` and `cta` could not be however they were
judged on the first clause.

This is not tidiness. `loom.section`'s tones and `loom.feature`'s card are
opaque, so a backdrop *behind* one of them paints nothing a reader sees, and the
only way to make it visible is to take the opaque ground away. That trade looks
free on the palette you are looking at and is not free on the next one. Three
places in this library have now reached the same conclusion independently —
`backdrop.ts` on `editorial`'s slate reading as dirt rather than light,
`loom.halo`'s `RIM_OFFSET` choosing distance over colour, and the aurora finding
of 20 August that is still open — and the fact they had to reach it separately is
why it is written down here:

> **A palette may have almost no chroma to give, and no primitive can know that
> it does.** So a treatment may be the reason a band is beautiful. It may never
> be the reason a band is legible.

The clause has a corollary the same photographs supplied, and it is the one a
next run should have in hand before reaching for a paint: **a treatment carried
by colour needs area, and a treatment carried by geometry needs contrast.**
Neither is free and the two fail in different places. `aurora` reads as
atmosphere across a five-hundred-pixel band and as a smudge in a strip; the
ruled `grid` reads as a blueprint against a large ground and as nothing at all
where its own mask has faded it out. `loom.halo` is the member of the family
that needs neither, because a rim standing four pixels off a card is legible at
any size and under any palette — which is why it is the treatment that went onto
a canonical band with the least argument.

## What this does not decide

**Nothing about a treatment a reader could reach for.** This is about what the
catalogue *ships*. A page that wants a glow on its closing band adds one, and a
`loom.backdrop` inserted by hand or by a model is an ordinary node judged by the
ordinary rules. The catalogue declining to ship one is not the library refusing
one.

**Nothing about the page-spanning backdrop**, which remains out of reach and is
filed rather than fudged. `loom.backdrop`'s own header names the use a page
actually wants — *a backdrop can hold three sections at once so the light runs
behind all of them* — and a `Composition` builds one band, so no catalogue entry
can express it. That is a gap in the catalogue's surface, not in this rule.

## Alternatives considered

**Treat every band's treatment as a second catalogue design** — ship `pricing`
and `pricing-lit` side by side and let the page choose. Rejected. It doubles the
phrasebook with pairs nobody chooses between, and it puts a catalogue entry
where the honest answer is *the first one was below the bar*. A band that cannot
mark the tier it is selling is not a design, it is a band missing a piece.

**A `treatment` prop on the arrangers** — `halo: "ring"` on `loom.tier-table`,
`reveal: true` on `loom.feature-grid`. Rejected, and it is 0110's and 0130's
argument unchanged: a prop on seventy schemas to say one thing, still
unreachable for the band nobody thought to give it to. The treatments are
wrappers precisely so this does not have to happen.

**Wrap every band in a `loom.reveal` and be done.** Rejected on the first
clause, and it is the alternative worth naming because it is the cheap one and
would have looked like progress. A reveal on every band is an effect that
distinguishes no band from any other, costs a node on each, and takes a decision
about the whole page and spreads it across twenty-one files where nobody can
change it in one place.

## Consequences

**Two canonical bands changed, and a primitive gained a line.**
`loom.reveal` had never been inside an arranger, so nothing had found that a
wrapper between a grid and its cell has to be transparent to stretching —
`display: grid` and `height: 100%`, which `loom.halo` had already worked out and
documented for itself. The wrapper family now agrees. This is the ordinary shape
of a treatment's first real use and should be expected of the next one.

**`CATALOGUE_TYPES` grows by three**, so `selectPrimitives(STARTER_PRIMITIVES,
CATALOGUE_TYPES)` — the slice a deployment registers to get the catalogue
([0170](0170-a-library-is-a-set-to-choose-from-and-a-vocabulary-is-priced-per-entry.md))
— now includes the three treatments. A host taking that slice gets a library
that can light a page, which it could not before.

**The rule is not a ceiling and must not become one.** A band that later grows a
named exception may wear a halo then; a treatment is earned by content and
content changes. What the rule forbids is a treatment added because the band
looked plain, which is the failure mode it exists to catch.

**A band is now the place to look when a treatment is unused.** Before today the
measurement that mattered was whether a primitive was *registered*; the 19
September run added the one that matters more, whether a band can *reach* it.
This record adds the third question, which is whether a band should — and its
answer for most primitives, most of the time, is no.
