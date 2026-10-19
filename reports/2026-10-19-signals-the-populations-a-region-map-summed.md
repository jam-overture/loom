# Reader signals — the populations a region map summed

**Routine:** `Loom signals` · **Date:** 2026-10-19 (morning run) · **Branch:**
`signals-40-the-populations-a-region-map-summed` · **Section:** §40 of
[`docs/signals.md`](../docs/signals.md)

## What I completed

The open finding at the top of my queue asked for a caption. **Adding it found a
number, and the number is the half of this unit that matters.**

### What the finding asked for

Yesterday's run shipped
[0294](../decisions/0294-a-comparison-is-of-one-readership-and-a-pair-that-proves-two-audiences-is-refused.md):
a comparison whose two sides prove two populations is refused. Its clause 7 left
one call naming no audience deliberately — `regionReadingOf` groups whatever it
is handed, and a deployment's whole window is *a readership* rather than one
form's — and the limit that leaves was filed the same day. A caller that builds
**both** sides of a readership comparison that way, over a window holding two
audiences, gets two maps that each name no audience: the pair is unprovable, is
compared, and is a comparison of two *mixes*. Every figure in it is arithmetic
over two populations and nothing in the output said so.

The filed closure was *a field and a sentence, not a decision*. I took it as
written: `RegionReading.audiences` is the census of the audiences the map's rows
named, `ReadershipChange.populations` is the pair of them, and **nothing is
refused on either**.

### What reading the two calls found, which was not a caption

`regionReadingFor` deduplicates a revision's region rows so a caller who
concatenated two reads of the store's running totals cannot double a bucket
(0158). It keyed that dedup by the **region alone**. A revision served in two
forms (0263) has two rows for one country, one per form — so a map read whole of
such a revision kept the first and dropped the second:

```
SKIERS  GB   60
RIDERS  GB  400   →   GB 60, duplicated: 1
```

**60 views published where 460 arrived**, with the missing 400 reported as a
count of duplicates, which is the one number in that output nobody reads as an
undercount. It is 0290's fault in the one reading that was given the audience
column and only half used it, and it is 0158's shape: a count that was never
added cannot be noticed.

Two things kept it invisible. The existing test for that path used two
**different** countries, so it documented the intent — *take every form's
rows* — while the implementation failed only where two forms share one. And the
`duplicated` doc comment asserted the fault away: *"the audience is picked
before this is counted, so this cannot come out of one read"*, which is true of
a form's own map and false of the deployment-wide one.

A form's own map was never affected: the audience is picked before the dedup, so
region alone selects the same rows region-and-audience does.

### What shipped

- **`RegionReading.audiences`** — `audiencesIn` over the rows the map added, in
  the three-valued shape `PageReading.audiences` publishes. `[]` where the rows
  named none, one name, or more than one where the map is a sum over forms.
- **More than one member is a measurement and never a fault.** Arrivals are
  people: a reader who arrived arrived once, whichever form they were served, so
  a sum over two forms is one deployment's readership. A page reading of two
  forms is read as neither because adding two forms' *node counters* is one
  number about two pages (0290) — the two are not the same kind of sum, and that
  asymmetry is the record.
- **`ReadershipChange.populations: ComparedPopulations`**, beside the
  `audiences: ComparedAudiences` 0294 put there, carried under a silence and
  under none. The type is the one 0295 published for the four library
  comparisons, for the same reason: a side here is a *set*.
- **The dedup key is the region and the audience**, which is what the store keeps
  one row per (0284). `duplicated` now means what it always claimed.

## Decisions I took that were not specified

**The census cannot be made to refuse, and it was tempting.** Once a map says
which audiences it summed, the obvious next move is to generalise
`crossesAudiences` from a name to a set and refuse a pair whose two censuses are
non-empty and disjoint — it reduces exactly to the existing rule where both
sides name one audience, which is the kind of symmetry this subsystem rewards.

I did not, and the reason is in the names. An `aud_` is a name the host chose
for a predicate Loom never sees, so two different names are not two disjoint
sets of readers. `[aud_everyone]` against `[aud_pro]` is disjoint as a set of
names and is exactly the migration comparison 0294 refused to withhold, because
one of those names is a name for **everybody**. The same rule would also have
refused the case 0294 clause 7 built on purpose — a whole window held against
one form's map — which is documented and tested as compared. So the census is
published as a dimension and `audienceId` remains the only field a refusal keys
on. It is clause 3 of the record and the first alternative I rejected.

**I did not infer `audienceId` from a single-membered census**, which
`pageReadingOf` does for a window of tallies. It would have made the field
richer at no apparent cost, and it is the same mistake in one step rather than
two: one name on the rows is not one population behind them. It also
contradicts 0294 clause 7 in as many words, which would have made this an
architectural change needing review rather than a unit.

**I fixed the dedup here rather than filing it.** It is my lane's file, it is a
published number that is wrong in the loud direction for exactly the
deployments 0263 was built for, and the fix is a key rather than an arithmetic
change. The same fault in `pageViewsFor` **is** an arithmetic change — two door
rows have to become one `RevisionPageViews` — so that one is filed with the
shape it needs rather than taken half-done beside this.

## Records added

[0296](../decisions/0296-a-region-map-publishes-the-populations-it-summed-and-two-forms-arrivals-are-one-readership.md)
— *A region map publishes the populations it summed, and two forms' arrivals are
one readership.* Accepted; five clauses; nothing superseded, and 0294 clause 7
holds literally. Six alternatives recorded, including the two above.

**On its number.** #674 holds 0296 on an open branch. `main`'s highest record is
0295, and the brief is to take the next number free on `main`, so this takes
0296 with a dated note under its header saying so. If #674 lands first,
`Loom merge` renumbers this one — the way it renumbered 0294 twice last week —
and the references to update are the record's filename, two doc comments, two
test comments, `docs/signals.md`, three `FINDINGS.md` entries and this report.
**Nothing in the unit depends on the number**; I have flagged it on the pull
request so the cost of the renumber is visible before it is paid.

## Findings filed or closed

**Closed:** *a region map read whole over two audiences names none, so a
readership comparison across two forms is unprovable rather than refused*
(18 October, mine) — taken as described, as a field and a sentence.

**Filed and closed in the same run:** *a region map of a revision served in two
forms published one form's arrivals and reported the other form's as a duplicate
it dropped.* Written down rather than silently fixed because it is a number a
deployment would have read and acted on.

**Filed, open:** *`pageViewsFor` picks one form's door row for a revision served
in two, and reports the other as a duplicate* — mine, with the arithmetic it
needs named and the double-count case it has to be tested against. And *a
readership comparison now says what each of its two maps was a sum over, and no
screen reads it* — `Loom portal`'s, with the three states and the one thing that
must not be drawn (`populations` is not a fault badge).

## Test numbers

**`pnpm install && pnpm verify` is green, exit code 0.** The root suite is
**233 files and 5,434 tests passed**, in 534 seconds; the app suite is **338
files and 5,986 tests passed**, in 235 seconds. `prerender:check` reports 133
prerendered pages, 1,848 text junctions, 0 run together.

`src/signals/region.test.ts` is **42 tests**, thirteen of them new: six on the
census, three on the two-part key and four on the audience a map is of.
`src/signals/readership.test.ts` is **34 tests**, four of them new, on the
compared populations.

### Planted mutations, each caught

Every count this unit touches was tested against the case where it would
double-count, and then the arithmetic was mutated to check the tests bite:

| Mutation | Caught by |
| --- | --- |
| Dedup keyed by the region alone — the original fault | *adds two forms' arrivals in one country*, *counts each form's country once however many times the window is handed in* |
| Dedup keyed by the audience alone | *keeps one form's two countries apart*, *names both forms where a revision's rows were read whole* |
| Census always `[]` | eight tests, across both files |
| `populations` sides swapped | *names each side's audiences on a pair it refused*, *names none for a window that counted nothing* |
| Census taken over every row handed in rather than the rows summed | *names the one form where the rows were picked for one*, *does not count the other form's rows it was told to ignore* |

The last one is the one worth naming: a census over the rows the caller handed
in rather than the rows the map added would report a form's own map as a sum
over both forms, which is the caption being wrong in the direction that reads as
a fault.

### Nothing was skipped and nothing was weakened

One existing test changed and it is the key whitelist on `ReadershipChange` —
*publishes the two arrival counts and no growth between them*, which asserts the
exact set of published fields so that a growth ratio cannot appear. `populations`
is added to the list. No assertion was relaxed and no test was skipped.

One check failed on my first run and the failure was mine: `documentation.test.ts`
refuses a decision-record number that is part of a published sentence, and three
of my new doc comments wrote one as a markdown link or as *"(0294 clause 7)"*,
neither of which is the parenthetical the site can lift out. Rewritten as plain
`(0296)` citations; the check passes.

## Browser cost

**Nothing.** `src/signals/broadcast.ts` is byte-identical to `origin/main` — an
empty `git diff` — and nothing this unit touched is in the import graph
`browser-weight.test.ts` walks. Measured anyway, because the rule is to measure
rather than to reason: bundled and minified with esbuild it is **6,477 bytes**,
**2,956 gzipped**. The minified figure is the same as the last four reports';
the gzipped one is 15 bytes above the 2,941 they quote, from this container's
`gzip` rather than from any change to the file, which the empty diff is the
proof of.

**One module graph did grow, and it is a server one.** `region.ts` now imports
`audiences.ts` for the census, so the `@jam-overture/loom/signals/postgres`
entry point reaches 18 files where it reached 17 — visible in
`reference.generated.json`, which I regenerated with
`pnpm --filter @loom/app docs:api` rather than editing. Nothing on that path runs
in a browser: the broadcaster's graph is unchanged, which is both what the empty
diff says and what the identical minified figure measures.

## Preview

https://loom-git-signals-40-the-popu-932970-jpizzolato36-6341s-projects.vercel.app

## Open questions

Nothing blocking. Two things are worth the maintainer's eye and both are in the
record:

1. **The census is a dimension and not a guard**, which means a deployment that
   begins serving a second form between two windows gets a readership comparison
   that is partly reading its own new form, published with both sides' names
   beside it rather than withheld. I think that is right — the alternative
   withholds the deployment-wide answer this reading exists to give — but it is
   the judgement in the unit that a surface can undo by drawing it as a fault.
2. **The number 0296 may need renumbering on merge**, per above.

## Beside the framework lane

`Loom daily build` has no branch open. The one open pull request is #674
(`Loom portal`, *a project holds exactly one application*), which touches
`decisions/`, `decisions/README.md` and `docs/portal.md` — no signal path, and
the only overlap is the record number. I regenerated `decisions/README.md` with
`pnpm decisions:index` rather than editing it, as the brief requires, so that
file resolves by regeneration.

## The door this lane is keeping cheap

Nothing here makes the parked per-reader identity work harder. The census is a
set of `aud_` names a host wrote about predicates Loom never sees, `[]` stays
*nothing recorded* rather than defaulting to anything, and the fix to the dedup
key is about which **counter rows** are one bucket — no row in it says anything
about a person, and no key in it would need unpicking if a consented per-reader
id ever arrived behind a gate.
