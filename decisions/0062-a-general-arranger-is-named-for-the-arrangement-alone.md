# 0062. A general arranger is named for the arrangement alone, and a named band wins where one exists

**Status:** Accepted
**Date:** 2026-08-17
**Section:** §4b

## Context

[0054](0054-a-container-is-its-childs-name-plus-the-arrangement.md) settled how
to name a container **that repeats one kind of thing**: the child is the
singular word, and the container is that word plus the arrangement —
`loom.stat-grid` over `loom.stat`. Every container in the library follows it,
and it has decided the name of seven pairs without an argument.

It does not reach the containers that repeat *nothing in particular*. A column
with a gap has no child type: the buttons under a headline, the avatar beside a
name, the three lines of a footer column. The library had no way to say any of
that. The 16 August report named the consequence plainly — every container is a
named band, so "these things, in a column, with this gap" has to borrow a band
that means something else, and a `loom.feature-grid` holding two buttons is a
tree that lies about what it contains.

So two questions, and the second is the one that matters:

1. **What is such a container called**, when there is no child word to build the
   name from?
2. **Once it exists, why would anyone use a named band again?** This is the real
   risk. A model that can reach `loom.stack` and `loom.card` can build any page
   without ever naming what it built, and a tree of anonymous boxes is worth
   strictly less than a tree of bands: the projection a model reads, the
   analysis the Gate weighs, and the person reviewing a diff all key off the
   fact that a node called `loom.tier-table` *is a price list*. Shipping the
   general layer badly means dissolving the vocabulary the first twenty-five
   primitives exist to be.

## Decision

**A container with no child type of its own is named for the arrangement
alone.** `loom.stack`, `loom.grid`. Nothing is prefixed, and nothing is
qualified — this is 0054's own exemption for the primitives that are not halves
of a pair, applied to the case 0054 did not have in front of it.

**The stem rule is untouched, and not by luck.** 0054's check is that stripping
an arrangement word off a container names something registered, and it strips
`-grid` with the hyphen. `loom.grid` has no hyphen, so it is not a container
missing its child; it is a primitive whose whole name is the arrangement. The
registry walk that enforces the pair rule keeps passing unchanged, and the
catalogue reads the difference the same way: `loom.feature-grid` is a grid *of
features*, `loom.grid` is a grid.

**`stack` joins the arrangement vocabulary** — `grid`, `list`, `cloud`,
`table`, `row`, `carousel`, `stack`. It stays a small descriptive set, and
`stack` is what a person calls that arrangement.

**A named band is preferred wherever one fits**, and the general arrangers are
what you use when nothing is named for it yet. Concretely, and this is the part
that is binding:

- Each general arranger's own `description` says so, because the description is
  all a model has when it chooses. `loom.grid` reads *"the general grid; prefer
  a named band where one fits."*
- **The same arrangement of the same kind of thing, twice, is a band waiting to
  be named.** That is the signal to port or write the pair, not to reach for the
  general one a third time. A run that finds itself building the same
  `loom.grid` of `loom.card`s in two places has found the next primitive.
- The general layer is a **floor, not a ceiling**: it exists so that a page can
  be built before every band exists, and so that the arrangements nobody will
  ever name — a glyph beside a word — have somewhere to live.

**`direction` stays a prop of one `loom.stack` rather than becoming
`loom.column` and `loom.row`.** Turning a row into a column is then a
`configure`, which is the adaptation this layer exists to keep reachable; as two
primitives it is a `remove` and an `insert` that throws away the subtree's
history and its attribution to say something about its axis.

## Consequences

- The compose-and-arrange layer can ship without waiting for the remaining
  forty-odd Hermes bands, and those bands can be assembled out of it in the
  meantime — which is what makes them cheap to name properly later, since a
  `loom.grid` of `loom.card`s becomes a named pair by an `insert` and a
  `remove`, not by a rewrite.
- The catalogue now contains two plausible answers for some questions, and that
  is a real cost paid deliberately. It is mitigated by the descriptions and by
  registration order — the general arrangers sit with page structure, so a model
  reading down the catalogue meets `loom.feature-grid` before it has a reason to
  reach for `loom.grid`.
- **A dilution this rule does not prevent is a dilution to report.** If a future
  run finds trees full of `loom.stack` where bands existed, the mitigation was
  not enough and this record is the thing to revisit — the alternative below is
  still sitting there.
- Six gap steps is more resolution than any other prop in the library carries.
  It is spent here on purpose: a stack is the one primitive used at every scale
  on a page. It is also the largest single addition to the compiled grammar
  ([0014](0014-the-reply-schema-must-fit-a-grammar-budget.md)) this layer makes,
  so it is the first thing to trim if that budget ever binds.

## Alternatives considered

- **Do not ship general arrangers at all.** The status quo until now, and the
  purest version of "every node means something". It is what forced a page to
  borrow a band that means something else, which does not preserve the
  vocabulary — it corrupts it with a wrong name instead of an honest general
  one. A tree that says `loom.stack` where no band fits is more truthful than
  one that says `loom.feature-grid`.
- **`loom.column` and `loom.row` instead of `loom.stack`.** Two names that read
  beautifully in a catalogue, at the price of making the single most likely
  adaptation — flip the axis — a delete and a re-insert. The granularity doc's
  test decides it: `direction` changes no node, so it is a prop.
- **One `loom.box` with a `layout: "stack" | "grid"` prop.** Fewer primitives,
  and it collapses two genuinely different layout models into one prop bag where
  half the props are inert for whichever mode is not selected — `columns` means
  nothing to a flex column, `wrap` means nothing to a grid. A model choosing
  props it cannot use is the failure `strict()` schemas exist to make loud.
- **Qualify the names — `loom.layout-stack`, `loom.generic-grid`.** Solves a
  collision that does not exist, since 0054's stem rule already distinguishes
  them, and spends catalogue legibility to do it.
- **Let the general arrangers replace the named bands entirely**, and keep the
  library small. This is the coherent opposite position and it was taken
  seriously: a page really can be built from five primitives. It loses the thing
  Loom is for — a proposal against a tree of anonymous boxes cannot be *assessed*
  in terms a person recognises, and the Gate's stakes analysis has nothing to
  key on. The named bands are the semantics; the arrangers are the mortar.
