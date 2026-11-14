# 0397. Every silence set in the subsystem is mapped, and a sweep is what makes that true

**Status:** Accepted
**Date:** 2026-11-14
**Section:** §5 (reader signals), the readings

## Context

[0240](0240-a-silence-is-a-condition-and-a-subject-and-the-two-names-for-one-state-were-not-synonyms.md)
published a census over the reasons the readings of this subsystem give for
saying nothing. Each reading keeps its own names; the census says which
**condition** each name reports and what **subject** that condition is true of,
so a surface drawing two readings on one card can tell two spellings of one
state from one spelling of two states.

**The census is a hand-written table.** `silences.ts` maps each set with a
`meaningOf…` of its own, and nothing in the repository looks for a set the table
has never heard of. So a set that lands beside it and is never added to it is
invisible: no test fails, no type complains, and the module goes on claiming to
map everything.

Two had accumulated by 14 November.

| set | published | days outside the census |
| --- | --- | --- |
| `DayShapeSilence` ([0389](0389-a-range-of-hours-is-folded-into-its-days-and-into-the-hours-of-a-readers-day-where-the-mean-is-the-only-comparable-figure.md)) | 10 November | 4 |
| `SenderSilence` ([0393](0393-a-silent-component-is-a-census-over-the-placements-the-defect-could-be-seen-on-and-the-share-is-bracketed.md)) | 13 November | 1 |

The first was **filed as a gap in `FINDINGS.md` on 10 November by the run that
created it**, with three options and a stated preference: take the census as a
unit, add the condition it needs, and map both members. The second was added by
this lane three days later and nobody noticed that the same gap had just
widened — which is the evidence that filing it was not enough and that the
missing piece is a check rather than a note.

The entry's own reasoning is why it waited: `unsettled` is *the range holds
hours and not one of them is over*, which is a statement about a **clock**, and
the nineteen conditions then published were each about a window, a row, a
vocabulary or a filing rule. Adding a twentieth is an edit to a closed set that
0240's table is published over, so it is a record rather than a line.

## Decision

**1. Every published silence set in `src/signals/` is mapped by the census, and
a sweep over the directory's source is what makes that true.**
`silence-sweep.test.ts` reads the source of this directory, finds each `export
type …Silence` whose alias is a union, and then resolves that set's own
published members and its census entry through `index.js`. A set that is not
mapped fails it. The sweep is the artefact; the two mappings below are what it
found.

**2. Three conventions, all of which already held, are now checked.** A set
publishes its own members as `NAME_SILENCES`; a set is mapped by a
`meaningOf…`; and **a set declared in `foo.ts` is the vocabulary `foo`**. The
third is what makes the first two checkable from a file name, and twenty-two of
the twenty-four sets held it by accident of good naming before it was a rule.

**3. A set is discriminated by the shape of its alias and not by its members.**
Six sets here open on another set rather than on a name of their own —
`KindActionSilence` begins `| KindReachSilence`, which is the reuse 0256 and
0265 argued for. A sweep that looked for a string literal first would have
silently dropped exactly the sets that share their states with another, which is
the failure mode of the thing it replaces.

**4. `DayShapeSilence` is the vocabulary `rhythm`, and its subject is the fifth:
`series`.** A fold of an hourly series into the hours of a day is silent about a
run of hours, which is not a page, a part, a pair or a kind. It is the series and
not the range because both of its reasons are facts about what was handed in: a
range is a pair of instants and says nothing about whether a row was ever written
under it.

**5. It brings both of its conditions, and they are the first about a clock.**
`no-hour-counted` is a series holding no hour at all. `no-hour-settled` is a
series holding hours not one of which is over — a deployment read inside its own
first hour, and **the only state in this table that resolves itself if nothing
is done**. Every other condition is a state of the deployment, the window, the
shape of the page or the questions it wrote, and none of those changes because
time passed.

**6. `no-window-folded` could not serve for either, and the pair is the whole
argument.** That condition asserts that readers arrived and the rollup has not
caught up. An empty run of hours is equally what a deployment nobody has read
looks like, what a range older than what is kept looks like, and what a range
ending before counting began looks like. Collapsing them would print *your
counting is behind* at a deployment with no readers.

**7. `SenderSilence` is the vocabulary `library-senders`, at the subject `kind`,
and two of its three members bring nothing.** `unplaced` is the library census's
`nothing-of-the-kind`; `unwitnessable` is `nothing-inside`, the eleventh set's
condition said of the one question a part's own report can be checked by. Both
are `one-state` with their originals, which is asserted rather than described.

**8. `unwitnessed` brings one condition, `no-reach-below`, and it is not
`no-reach-reported`.** That one is the subject's **own** counters reporting no
reach, and its remedy is a sender to fix. This one is about the parts
**underneath** — a placement that holds parts, none of which any view reported
reaching — and its remedy is to come back in a week with readers. A reading that
could not tell them apart would publish *this component is silent* about a
component nobody has stood under, or send a deployment to rewrite a working
primitive.

**9. `rhythm.ts` publishes `DAY_SHAPE_SILENCES`.** It was the one set in the
directory that published no members, which is why nothing could enumerate it —
including the census and including the sweep. No `describe…Silence` is added and
none is required: three sets here publish none, and a sweep that failed on the
state of the tree it was written against is a sweep nobody can land.

**10. The counts come out of the module's prose and into the sweep.**
`silences.ts` opened by saying how many sets and how many members there were.
Both figures had gone false — twenty-one sets and a hundred and eighteen members
against twenty-four and a hundred and fifteen. The sentence now carries no
number and the claim it was making, that there are fewer conditions than
members, is an assertion in the sweep.

## Consequences

**A new silence set cannot land unmapped.** The run that adds one gets a red
sweep naming the file and the export it is missing, in the diff that adds it,
rather than a note in `FINDINGS.md` that the next run has to find.

**It also cannot land unenumerable.** A set with no published members fails the
same sweep, so every set in this directory stays something a census — this one or
a later one — can walk.

**A file name is now load-bearing.** Renaming `library-senders.ts` without
renaming its vocabulary fails the sweep. That is the price of checking the other
two conventions from a file name, and it is a cheap price: the vocabulary is the
name a surface prints, so the two moving together is what a reader of a card
would expect anyway.

**Five subjects, twenty-two conditions, twenty-four sets, a hundred and fifteen
members.** The figures are in this record because a record is dated; they are not
in the module, for the reason clause 10 gives.

**Nothing is collected, stored, sent or counted.** This is a table over
vocabularies and a test that reads source. No payload field, no counter, no
column, no table, no byte on any wire, and nothing in a reader's browser: the
broadcaster's import graph is untouched and the bundle measures what it measures
on `main`.

**Three names reach `@jam-overture/loom/signals`** — `meaningOfDayShapeSilence`
and `meaningOfSenderSilence` from the census, and `DAY_SHAPE_SILENCES` from
`rhythm.ts`. Measured on the front-coded index by building the file both ways:
**27,462 bytes over 2,131 names on `main`, 27,512 over 2,134 with these three**,
which is **50 bytes of the 12,538 there were**.

**The parked door is untouched.** Nothing here has a reader in it at any point,
and an opt-in identified batch would change no clause of it.

## Alternatives considered

**Register `unmeasured` alone and leave `DayShapeSilence` half in.** The option
the 10 November entry listed first and rejected in its own words: a half-mapped
set is worse than an unmapped one, because `relateSilences` would then answer
confidently about one member of a set and silently about the other. Rejected for
that reason, unchanged.

**Rename `unsettled` to reach an existing condition.** The third option in that
entry. Rejected there and here: it would be one word for two states, which is
the fault 0240 exists to prevent and the 9 October entry in `FINDINGS.md`
records an instance of.

**Map `unmeasured` to `no-window-folded`.** The near neighbour, and the entry
hedged towards it — *`no-window-folded` or its neighbour*. Rejected on clause 6:
that condition asserts readers arrived, and the remedy it points at is a rollup
to run. Three of the four ways a series can be empty have no rollup to run.

**Map `unwitnessed` to `no-reach-reported`.** The cheap reading, and it is the
one a surface would make. Rejected on clause 8: the two have opposite remedies,
and the whole of 0393's design is that a silent-sender figure is a floor over the
placements a reader was demonstrably below. A condition that conflated *nobody
was under it* with *it reported no reach* would undo that in the one place a card
reads the census rather than the row.

**Give `rhythm` the subject `page` or a new subject `range`.** `page` is simply
false — a day shape is read at whatever scope its counters were of, and the
deployment-wide one is the one the portal draws. `range` was the first name
tried and is wrong in the way clause 4 states: a range is a pair of instants and
cannot be empty of rows, so neither reason would be about it.

**Add a `describe…Silence` to `rhythm.ts` while we are here, and make the sweep
require one.** Rejected on clause 9. Three sets publish none, and requiring it
would mean either failing on the tree as it stands or writing three sentences for
three other readings in a run whose unit is the census. The thinness is filed
instead.

**Sweep the whole of `src/` rather than `src/signals/`.** The hazard is specific
to a hand-written table in this directory, and `src/signals/` is this lane's.
`source-text.test.ts` widened from this directory to `src/` only after the
instance outside it was filed and closed; there is no silence set outside this
directory today, and widening ahead of one would be a lane taking another's
file.

**Leave it filed and take a unit that publishes a reading instead.** The option
this run actually weighed, and the entry it would have left behind was already
four days old and had already widened once without anybody noticing. A census
that is wrong about its own coverage is worse than a reading nobody has yet: it
answers.
