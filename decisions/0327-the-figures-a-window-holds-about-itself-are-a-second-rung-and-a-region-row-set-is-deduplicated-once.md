# 0327 — The figures a window holds about itself are a second rung, and a region row set is deduplicated once

**Status:** Accepted

**Date:** 31 October 2026

**Section:** §4c (reader signals)

## Context

[0322](0322-a-window-is-read-off-one-deployment-context-and-the-region-floor-is-not-optional.md)
built the rung between a store and a question: `windowAssemblyOf` takes a window
of counters and a deployment's context and produces the three **subjects** every
reading and comparison of that window takes — one reading per page per revision
per form, the before-and-afters, and the two libraries. After it, forty of the
forty-two readings in this subsystem are one call with one argument. There is
nothing to compose, so nothing can be composed wrongly.

**Three of them were not reachable that way, and all three were filed as gaps.**

- `regionPagesOf` (§62, [0323](0323-the-pages-a-places-readers-read-are-published-at-a-floor-on-the-cell.md)),
  filed 29 October.
- `silenceCensusOf` (§63, [0324](0324-what-a-window-could-not-answer-is-a-census-over-its-silences-and-a-page-is-counted-once.md)),
  filed 30 October.
- `libraryPaceOf` (§64, [0325](0325-a-kinds-pace-is-a-pooled-ratio-over-its-outermost-placements-and-an-unscaled-page-is-kept.md)),
  filed 30 October.

The 30 October entry stopped filing them one at a time and named the shape: what
is missing is **a second rung** — something that takes an assembly and produces
the readings over it, the way the assembly takes a window and produces the
subjects — with a recommendation that a run take all three at once rather than
adding any of them individually. The 31 October entry recorded that it could not
be built that morning, because `libraryPaceOf` was still on an unmerged branch.
All three are now on `main`.

### What the three have in common, which is not that the assembly forgot them

The assembly produces subjects and deliberately produces no figures, and all
three of these are figures. Adding any of them to `WindowAssembly` would make it
the thing it refuses to be. What they share is that **each of them needs
something the assembly does not publish**, so each has a composition a caller
has to get right — and all three of those compositions type-check, run, and are
wrong without saying so, which is the one error class in this subsystem that
cannot be undone afterwards (0158).

```ts
regionPagesOf(window.regions ?? [], { floor: DEFAULT_REGION_FLOOR })
libraryPaceOf(libraries.now.readings, window.pageViews)
silenceCensusOf(/* whatever the caller happens to have mapped */)
```

**The region line has three faults in it.** `?? []` collapses two sentences that
0240 and 0309 keep apart — *we cannot say where your readers are* and *you have
no readers abroad*. The floor is a number typed at the call site rather than the
deployment's, so the breakdown can be read at a floor the assembly's own maps
were not. And the rows are handed over **as they came**: a caller that
concatenated two windows holds a bucket twice, and `regionPagesOf` adds both.

That last one is the fault worth a record of its own. `windowRegionsOf` drops a
repeat of one tree, revision, form and region and counts it in
`WindowRegionReadings.duplicated`; `regionPagesOf` has never had that rule,
because it was written to take whatever rows a caller chose. So a window with a
repeated bucket produces **two readerships of one window** — the assembly's map
with the bucket once, the breakdown with it twice. And a doubled bucket is worse
than a wrong number: the floor exists so a place with too few readers in it is
not named (0146), and a bucket counted twice **clears a floor it should not have
cleared**. The reading answers *which pages the readers of this place read*
about a place that should have been withheld.

**The pace line drops two thirds of the evidence.** Every other reading of a
kind takes `libraries.was` or `libraries.now`, so the nearest line to hand is a
library side — and a side holds one reading per form. It drops the earlier
revision of every page revised inside the window and every form the placings
could not place. `libraryPaceOf` is a reading rather than a comparison, so its
evidence is every reading the window holds.

**The census line has no obvious spelling at all**, which is why it was filed
as *nothing reminds a caller the census exists*. It takes one entry per reading
with the meaning mapped through that reading's own `meaningOf…Silence`, and the
subject of a reading is not its scope: a figure about a kind attributed to a page
is a guess (0324).

## Decision

**A second rung, `windowFiguresOf` in `src/signals/window-figures.ts`**, which
takes the window, the assembly and the context and publishes the three figures
a window holds about **itself** rather than about one of the assembly's
subjects: the regions by page, the pace by kind, and the census over the
silences.

- **It composes and does not count.** Nothing in it counts, divides, sums or
  withholds — the rule all four steps under it keep. It decides which rows each
  of three published readings is entitled to, and calls them. There is no total
  of what the three left out: a withheld region bucket, a kind with no pace and
  a silent reading are three absences in three units, and a sum over them would
  be a figure in none.

- **The window and the context are handed in again**, rather than carried on the
  assembly. Two of the three readings are of **rows** the assembly deliberately
  does not republish, and the floor has to be the one the assembly's own maps
  were read at. Both are arguments the caller passed one line above.

- **The region figure is `RegionPagesReading | undefined`**, carried exactly as
  `ReaderWindow.regions` carries it. `undefined` is *no region store was
  offered* and a reading of no views is *a store answered with nothing* (0240,
  0309).

- **`distinctRegionRows` is published from `window.ts` and both callers use
  it.** The dedup rule was written once, inside `regionGroupsOf`, where it was
  entangled with the grouping. It is now its own function, `windowRegionsOf`
  calls it and so does this rung, so the assembly's `readership` and this
  breakdown are built from the same rows and cannot disagree about one window.
  The cost is a second linear pass over the rows, which rule 4 allows and a
  second spelling of a counting rule does not (0265).

- **The census is over the caller's entries plus the pace's own rows**, and the
  list it was taken over is published beside it, so `census.readings ===
  silences.length` is an identity rather than a sentence. A census's denominator
  is *the readings somebody is looking at* and this cannot know what a surface
  draws, so the caller chooses by what it hands in and may slice the published
  list for a narrower one.

- **The caller's entries come first**, so where one state is reported by both it
  keeps the caller's vocabulary — its readings are the ones on the screen, and
  0324's rule is that the first reading's vocabulary stands.

- **Each of the pace's kind rows is mapped through `meaningOfKindPaceSilence`
  and attributed to no page.** A kind is not a page; a `KindPace` row with no
  pace is an answer about that kind, and putting it on a form would be the guess
  0324 refused.

- **`arrivalStandingOf` is not a fourth member**, which is the 31 October
  finding upheld rather than revisited. A refusal is not in a window at all — it
  is the deployment's own counter, keyed by application and reason, written on
  the request path and holding nothing a window holds (0309, 0326).

## Consequences

**Three readings that were reachable only by a caller that already knew they
existed are now one call off a window.** The two findings that asked for this
close.

**One real defect is fixed rather than documented.** A window with a repeated
region row no longer produces two readerships of itself, and no longer names a
place the floor should have withheld. Nothing stored changes and no figure over
rows without repeats moves, so there is nothing to migrate: the deployment's own
window comes from one read of one store, which cannot hold a repeat.

**`regionPagesOf` is unchanged**, and still takes whatever rows it is handed.
The rule is applied by the caller that knows it is reading a window, which keeps
the reading usable for a caller reading one revision on purpose, and keeps the
dedup in the module that owns it rather than in two.

**The census the rung publishes is not the census a screen wants** unless the
screen hands in its own readings' silences. That is stated in the type and is
the honest shape of a denominator nobody but the surface can choose. A caller
that hands in nothing gets a true census of what this rung computed.

**Nothing reaches a reader's browser.** `broadcast.ts` is byte-identical, the
bundle is unchanged, and this adds no payload field, no column, no migration, no
store method and no kind.

**It does not decide which of the forty-two readings a deployment wants by
default**, which is the question the 30 October finding said made the honest
version large. The three it takes are the three with a composition to get wrong.
Any reading that is one call on one of the assembly's subjects stays the
caller's, and a surface that wants all of them still writes them out.

## Alternatives considered

- **Add the three to `WindowAssembly`.** Rejected: the assembly publishes
  subjects and no figures, and 0322's argument for a required floor does not
  transfer — none of the three has a parameter that is dangerous to omit, which
  is what made the floor required there. A `WindowAssembly` carrying figures
  would be the thing that record refused to build.

- **A rung that computes every reading over the window.** Rejected as the 30
  October finding predicted: it has to decide which of forty-two readings a
  deployment wants by default and what it costs to compute the rest, which is a
  policy this lane cannot take and a surface has not asked for. The three taken
  here are picked by a rule rather than by taste — a figure that is not one call
  on a subject the assembly publishes.

- **Take only the assembly, and reach the rows through it.** Rejected: the
  assembly deliberately republishes no rows, and a breakdown by page needs the
  region rows' cells, which no map holds. Adding the rows back onto
  `WindowAssembly` to avoid a second argument would carry two large arrays
  through a type whose value is that it carries subjects.

- **Take the window alone and assemble inside.** Rejected: a caller that already
  holds an assembly would compute it twice, and the rung's whole claim is that it
  is the step *after* the assembly rather than a second spelling of it.

- **Make `regionPagesOf` deduplicate internally.** Rejected: it would change a
  published reading's behaviour for a caller that chose its rows deliberately,
  and it would put the rule in two modules. `distinctRegionRows` puts it in one,
  which is the fix 0265's module made for the door's scaling rule a day earlier.

- **Publish the rung's own silence entries and take no census.** Rejected: it
  leaves the orphan where it was. The entries are the cheap half; the reason the
  census had no caller is that nothing composed one.

- **Take the census over the pace's rows alone, ignoring the caller's.**
  Rejected: a census of five rows is a census of what the rung computed and not
  of what a window could not answer, which is what 0324 built it for.

- **Carry `arrivalStandingOf`'s result as a fourth field.** Rejected: it would
  add no figure, and it would make `WindowFigures` generic in a deployment's
  refusal reasons for one passthrough. A surface that wants both calls both.

- **A `duplicatedRegions` count on `WindowFigures`.** Rejected: the assembly
  already publishes it on `WindowRegionReadings.duplicated`, off the same rows by
  the same rule, and a second copy of one number is how two figures come to
  disagree.
