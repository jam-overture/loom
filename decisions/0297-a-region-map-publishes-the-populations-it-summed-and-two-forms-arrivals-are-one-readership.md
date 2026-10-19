# 0297 — A region map publishes the populations it summed, and two forms' arrivals are one readership

**Status:** Accepted

**Date:** 19 October 2026

**Section:** §4c (reader signals)

> **Renumbered on 2026-10-19**, from 0296, when this branch (#675) was merged.
> `main` had meanwhile accepted a different 0296 — *a project holds exactly one
> application and the portal never names it*, from #674 — and two records
> sharing a number is fatal
> ([0097](0097-a-hole-in-the-numbering-is-reported-and-a-clash-is-fatal.md)), so
> the record already on `main` keeps the number and this one gives way. This
> record was written on 19 October and nothing in it changed but its number;
> references on the branch were updated with it.

## Context

[0294](0294-a-comparison-is-of-one-readership-and-a-pair-that-proves-two-audiences-is-refused.md)
gave `RegionReading` an `audienceId` so that `readershipChangeOf` could refuse a
pair of two populations, and its clause 7 left one call naming none on purpose:

> `regionReadingOf` leaves it `null` deliberately: it groups whatever it is
> handed, and a deployment's whole window is *a readership* rather than one
> form's. That keeps a comparison of two such maps answerable rather than
> refused, which is the common case.

**The limit that leaves was filed the same day**, as the one honest gap 0294
admits to. A caller that builds **both** sides of a readership comparison with
`regionReadingOf`, over a window holding two audiences, gets two maps that each
name no audience — so the pair is unprovable, is compared, and is a comparison
of two *mixes* rather than of two readerships. Every figure in it is arithmetic
about two populations, and nothing in the output said so. The filed closure was
*a field and a sentence, not a decision*: report the audiences the map grouped
across, refuse nothing.

**Reading the two calls to add that field found a second thing, and it is a
number rather than a silence.** `regionReadingFor` deduplicates a revision's
rows by region alone, so that a caller who concatenated two reads of the store's
running totals cannot double a bucket (0158). A revision served in two forms
([0263](0263-a-page-is-a-base-tree-and-the-deltas-an-audience-earns.md)) has
**two rows for one country**, one per form — and the second was dropped as the
first handed in twice:

```
SKIERS  GB   60
RIDERS  GB  400   →   GB 60, duplicated: 1
```

60 views published where 460 arrived, with the missing 400 reported as a count
of duplicates nobody would read as an undercount. A form's own map was never
affected, because the audience is picked before the dedup and region alone keys
the same rows region-and-audience does. What was wrong is the path a
**deployment-wide** map takes, which is the one the readership question asks
for — the same shape as the fault
[0290](0290-a-reading-is-of-one-audience-and-two-forms-of-a-page-are-two-readings-rather-than-one-handed-in-twice.md)
found in the node counters, in the one reading that was given the audience
column and only half used it.

## Decision

**A region map says which populations it summed; a map read whole sums them
all; and neither fact is a refusal.**

1. **`RegionReading.audiences`** — the census `audiencesIn` already answers over
   rows, taken over the rows the map added, in the three-valued shape
   `PageReading.audiences` publishes: `[]` where the rows named none, one name,
   or more than one where the map is a sum over forms.

2. **More than one member is a measurement and never a fault.** A page reading
   of two audiences is read as neither, because adding two forms' node counters
   is one number about two pages (0290). A region map of two audiences is read
   whole, because **arrivals are people**: a reader who arrived arrived once,
   whichever form they were served, so the sum is the deployment's readership
   and not a collapse of two.

3. **The census is not the field a comparison refuses on, and cannot be made
   into one.** An `aud_` is a name the host chose for a predicate Loom never
   sees, so two different names are not two disjoint sets of readers —
   `aud_everyone` is a name for everybody. One member means one name was on the
   rows, not that one population was behind them. `audienceId` stays exactly
   what 0294 clause 7 made it, and nothing in that clause is changed.

4. **Two forms' arrivals in one country are two rows and one readership.** The
   dedup key in `regionReadingFor` is the region **and** the audience, which is
   what the store keeps one row per (0284). A map read whole of a two-form
   revision now adds both forms; a form's own map is byte-identical arithmetic
   to before; and `duplicated` means what its doc comment always claimed — a
   window handed in twice, which is still dropped and still counted.

5. **`readershipChangeOf` carries `populations: ComparedPopulations`**, beside
   the `audiences: ComparedAudiences` 0294 put there, under a silence and under
   none. The type is the one
   [0295](0295-a-library-comparison-reports-the-populations-it-was-taken-over-and-refuses-none-of-them.md)
   published for the four library comparisons and the reason is the same: a side
   of this comparison is a *set* of audiences, and a set is not a `ComparedAudiences`.
   A surface can now tell *the pro form last week against the pro form this
   week* from *two sums over two forms* from *a window that named nothing at
   all*, which read identically before.

## Consequences

- **Nothing is superseded.** 0214, 0284, 0290, 0294 and 0295 stand, and 0294
  clause 7 holds literally: a map read whole still names no audience, and a pair
  of two such maps is still compared rather than refused.
- **Nothing reaches a reader.** No payload, no browser code, no column, no
  store and no kind of signal. `broadcast.ts` is byte-identical to `main` at
  **6,477 bytes minified and 2,941 gzipped**. This is the twenty-ninth thing
  taken out of what this subsystem already knows.
- **A deployment serving one form of every page sees no figure move.** Its maps
  gain a census with one member in it and its comparisons gain a `populations`
  with one name on each side.
- **A deployment serving two forms gets a number corrected rather than
  withheld**, and the correction is upward: a revision's whole-window map was
  publishing one form's arrivals as the revision's.
- **The floor is unaffected and is still applied after the grouping.** A country
  whose two forms each hold fifteen arrivals is thirty arrivals of one country,
  which is a readership and is now named rather than withheld twice.
- **A screen can be wrong in one fewer way and must say so.** `populations` is a
  real three-state dimension, so a surface that draws nothing for it cannot tell
  a mixed window from one that named nothing. Filed for `Loom portal`.
- **The parked per-reader identity work is no harder.** The census is a set of
  `aud_` names a host wrote, nothing keys on a reader, and `[]` stays *nothing
  recorded* rather than defaulting to anything.
- **One thing is left and is filed**: `pageViewsFor` deduplicates a revision's
  door rows the same way region rows were deduplicated, so a whole-window read
  of a two-form revision takes one form's door and reports the other as a
  duplicate. It is the same fault in a different reading, and summing two door
  rows is a change to `pageViewReadingOf` rather than to a key.

## Alternatives considered

- **Refuse a pair whose two censuses are non-empty and disjoint** — the
  generalisation of `crossesAudiences` from a name to a set, which reduces to it
  exactly where both sides name one audience. The tidy answer, and wrong on
  clause 3: `[aud_everyone]` against `[aud_pro]` is disjoint as a set of names
  and is the migration comparison 0294 explicitly refused to withhold, because
  one of those names is a name for everybody. It would also have refused the
  case 0294 clause 7 built on purpose — a whole window held against one form's
  map — which is tested and documented as compared.
- **Infer `audienceId` from a single-membered census**, as `pageReadingOf` does
  for a window. Rejected twice over: it contradicts 0294 clause 7, and it is
  clause 3's mistake in one step rather than two. The inference is right there
  and wrong here because the two readings are asking different things — which
  counters to read is answered by a name on a row, who the readers were is not.
- **A new member of `ReadershipComparability` for a mixed window.** Rejected:
  that vocabulary has no silences in it precisely because every member is a
  reason a figure is absent, and no figure is absent here. A mixed window is a
  caption, and a caption is a field.
- **Leave the dedup as it was and report the drop more loudly.** Rejected: an
  undercount reported as a count of duplicates is 0158's shape exactly — a
  number that was never added cannot be noticed, and this one looked right.
- **Sum the forms in `regionReadingOf` only, and leave `regionReadingFor`
  picking the first form it meets.** Rejected: a caller asking about one
  revision without naming an audience is asking the deployment-wide question
  about that revision, and the two calls would answer one question two ways —
  which is the drift every published rule in `audiences.ts` exists to stop.
- **Carry one flag, `mixed: { was, now }`, rather than the two sets.** Rejected:
  the sets are what a caller needs to split the window with `byAudience`, and a
  boolean derived from them would be a second spelling of the census.
