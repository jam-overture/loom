# 0165. An anchor belongs to the part, and uniqueness is asserted over the assembled page

**Status:** Accepted
**Date:** 2026-09-17
**Section:** §4b

> **Why this number.** The highest record on `main` is `0163`. `0164` is claimed
> by #320, which is open at the time of writing. Nothing is skipped; the gap is
> a live branch rather than an omission, and taking the next free number on
> `main` and on every open branch is what #313 had to be renumbered for not
> doing.
>
> **Why `Accepted`.** It refines no `Accepted` record, changes neither the tree
> schema nor the delta model, and adds no prop, type or published name. It rules
> on a convention inside `src/primitives/compositions/`, which is this lane's
> own, and it does not disturb
> [0122](0122-a-primitive-says-which-of-its-props-a-reader-reads.md) or
> `anchor.ts`'s standing judgement that per-node uniqueness is the render seam's
> to enforce — it says what the catalogue does **in the meantime**, and says it
> in the one place that can.

## Context

`loom.section`, `loom.hero` and `loom.callout` carry an `anchor`, which is the
only prop in the library a node writes straight into the document as an `id`.
`anchor.ts` has been explicit since it shipped about what its schema cannot
check:

> **What it does not check: that it is unique.** Two nodes may carry the same
> anchor and the schema cannot see it, because a schema validates one node's
> props and duplication is a fact about a tree. […] it belongs to whatever walks
> the whole tree, which is the render seam rather than this file. Filed for the
> framework lane rather than faked here — a per-node schema that pretended to
> enforce it would be enforcing nothing.

Every word of that is right, and it is still the framework's to do. What it left
open is that **the catalogue assembles a tree**, and had two defects in it that
nothing in the repository was positioned to see. Both were found on 17 September
by listing every anchor in `PAGE_SEQUENCE` and counting, which took one script
and had never been done.

| | |
| --- | --- |
| `features` and `bento` both carried `anchor: "features"` | both are on the canonical page, so the rendered document had **two elements with `id="features"`**. A link to `#features` reaches the first; the bento band has been unaddressable by fragment since it shipped |
| `testimonials` carried no anchor; `testimonials-wall` carried `#testimonials` | a nav link to `#testimonials` resolved on a page that had taken the alternate design and resolved nowhere on the default page |

Neither produced an error, a diagnostic or a failing test. The whole of what a
duplicate `id` does is that the second one stops being found, and the whole of
what a missing one does is that a link goes nowhere — both are silent, and both
are visible only to a reader who arrived from a menu.

## Decision

**An anchor names the part, not the design.** Every design of a part carries the
same anchors as that part's canonical design. `hero` and `hero-split` both
answer to `#top`; `steps` and `steps-cards` both answer to `#how-it-works`.

**No two bands on the assembled page answer to the same anchor.** This is
asserted over `PAGE_SEQUENCE` — a tree — rather than over any one band, which is
[0125](0125-a-geometric-property-is-asserted-over-the-page-not-the-primitive.md)'s
rule about where a property of a *page* is measured, applied to the one property
of a page that is spelled rather than drawn.

Both are tests in `compositions.test.ts`. Restoring either defect fails by name.

## Why the first half is the load-bearing one

The uniqueness check is the one that found a defect today. The **part** rule is
the one that stops the next one, and it is worth separating.

A design is a thing a host *swaps in*. The whole value of `compositionsForPart`
is that a surface can offer *show me the heroes* and a host can take a different
one without the rest of the page knowing. An anchor is the one piece of a band
that something **outside the band** points at — a nav item, a hero's own button,
a link in prose two screens up. So an anchor that varies between designs of one
part is a dependency that breaks on exactly the operation the catalogue exists to
make cheap, and breaks *quietly*, on the page nobody re-checks after a swap.

Naming it after the part rather than the design makes that impossible rather
than unlikely.

## What this does not decide

**It does not move the check into the render seam.** `anchor.ts`'s finding stands
unchanged and is still the framework lane's: a *host's* tree can duplicate an
anchor freely and nothing will say so. What is asserted here is a property of the
**starting compositions this library ships**, which is the subset this lane can
be held to. A page assembled from bands that are individually correct can still
be made wrong by a host, and that is the seam's to catch.

**It does not make the anchor required.** `proof`, `metrics` and `cta` carry
none, and that is right: an anchor exists so a page can link to a place inside
itself, and nothing links to those three. Adding one to every band so the rule
reads more evenly would be putting an `id` in a document to satisfy a convention,
which is the shape of change that makes a rule stop meaning anything. The rule is
that designs of a part **agree**, and agreeing on nothing is agreeing.

## Alternatives considered

**Wait for the render seam.** `anchor.ts` filed this for the framework lane and
the filing is right — a host's tree can duplicate an anchor and only the seam
walks one. Rejected because the defect is **live on the canonical page today**,
and the two facts are independent: a check in the seam would catch a host's
duplicate, and would still have said nothing about the fact that this library
ships two bands with the same anchor and puts both on its own starting page. The
seam's check remains wanted. This is not a substitute for it and does not claim
to be.

**Assert uniqueness over `STARTER_COMPOSITIONS` instead.** The larger list, and
the obvious place to put a check about the catalogue. Rejected because it would
make the two halves of this record **contradict each other**: the first half says
every design of a part carries the part's anchor, so the phrasebook is *required*
to contain `hero` and `hero-split` both answering to `#top`. A collision there is
correctness; a collision on a page is the defect. `PAGE_SEQUENCE` is the only
list of bands that is a document, and a property of a document has to be measured
on one (0125).

**Derive the anchor from the part, in `Composition` or in `planComposition`.**
Structurally stronger than a test — an anchor that is computed cannot disagree
with its part — and it was the first shape tried. Rejected on two counts. It
would break `build`'s contract that a composition is **a pure function from an
`IdFactory` to a subtree**: a catalogue that rewrote a prop after `build`
returned would make the function no longer the whole truth about what a band
builds, and `compositions.test.ts` asserts against exactly that today. And the
part's name is frequently the wrong anchor: `hero` answers to `#top`,
`credentials` to `#certifications`, `articles` to `#writing`. Those are better
names than the part names and were chosen deliberately; deriving would cost all
three to buy a rule a test states more cheaply.

**Give every band an anchor, so the rule reads evenly.** Rejected in the body
above: an `id` written into a document to satisfy a convention rather than
because something links to it is the change that makes a rule stop meaning
anything. Agreeing on nothing is agreeing.

## Consequences

`bento`'s anchor moves from `features` to `what-it-does`, and `testimonials`
gains `#testimonials`. Both are one-word edits to a starting composition, so
nothing that has already landed on a host's page is touched — a composition
leaves no trace of itself in the nodes it builds ([0162](0162-the-catalogue-is-a-phrasebook-and-the-page-is-one-path-through-it.md)),
and a band dropped on a page before today keeps whatever anchor it was built
with. A host who wants the fix applies a `configure`.

A future band whose anchor collides with one already on the page is a red test
naming both bands, rather than a page that renders clean with one of its links
pointing at the wrong band.
