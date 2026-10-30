# Reader signals — whether a kind of part is read, and not merely reached

**30 October 2026 (evening)** · `Loom signals` · branch
`signals-64-whether-a-kind-is-read` · §64 of
[`docs/signals.md`](../docs/signals.md) · record
[0325](../decisions/0325-a-kinds-pace-is-a-pooled-ratio-over-its-outermost-placements-and-an-unscaled-page-is-kept.md)

## Before anything was built

**One open pull request, and no maintainer comment anywhere.**

- **#706** — `0308` as `Proposed — architectural, needs review`, open since
  24 October and skipped by the merge routine for the reason it exists. **Six
  days old.** Its only non-bot comment is the merge routine's own summary, so
  nothing outranked the queue.
- #724 and #725, this lane's two from last night and this morning, both merged.
  `main` is at `482081a` and this branch is cut from it.

**`Loom daily build` has no branch open**, so nothing was racing the signal
path. The record is **0325**: `main` holds up to `0324` and `0308` is claimed on
#706's branch, which `0097` reports as a hole rather than failing on.

**The open findings owned by this lane were read first and none of them was the
work.** Most are limits written down with a recommendation to leave them,
and two — the §62 and §63 discoverability gaps — are revisited below rather than
taken, because this run made them a third of the same thing. So the queue fell
through to the plan, and the plan's first item chose this: *the interpretation
layer — which roles readers engage with and which they skip*.

## What I completed

**`libraryPaceOf`** — `src/signals/library-pace.ts`, 30 tests in
`library-pace.test.ts`, exported from `src/signals/index.ts`, with
`KindPaceSilence` registered as the twenty-first silence vocabulary and
`atDoorScale` published from `door.ts`.

### What was missing, which was not a bug

Five readings stand on one list of `PageReading`s and answer five questions
about one primitive type: the **places** it stands and how many were reached
(0257), the share of the **readers** who met those places that read it (0256),
the share of those that acted inside it (0265), and what a change did to two of
them.

**Every one of them is about reach.** A part counts as reached when half of it
stood half a viewport up the screen, which is a fact about scrolling and not
about a reader. A page's own reading has answered the next question per part
since 0230 — *did anybody have time to read what it says* — and asked of a kind
it was unaskable, for the reason every library question was before the join that
answered it: a type's placements are scattered across forty readings and nothing
added them up.

Nothing is collected to answer it. No payload, no browser change, no counter
that does not exist, no column and no byte on any wire.

### What it answers now

*Do the readers who meet your testimonial band have time for what it says,
anywhere it stands?* — and the same question of a role, and of every type at
once in the order of the reading time their readers are short of.

## Decisions I took that were not specified

**A pooled ratio and never a mean of ratios.** The figure is `Σ dwellMs ÷ Σ
(readers × wordsWithin × msPerWord)`, which comes to a mean of the
per-placement paces weighted by the words each placement put in front of
readers. A plain mean lets a caption two readers hurried past drown a band four
hundred of them did; weighting by words passed is 0221's ranking rule stated as
an average, and it is the quantity `pace.ts` already orders a page's parts by.

**The straddle correction is in the readers and nowhere else**, and it is read
off each page's own row rather than taken as an argument. A page view a rollup
counted twice carries one page view's seconds, so the numerator needs no
correction at all — the whole of it divides out of the denominator, which is the
same cancellation 0229 relies on one level down. That is also why this reading
takes the door rows where a page's reading takes an `inflation` number: one
scalar over forty pages would be a correction nobody measured (0250).

**A page the door cannot scale is kept, where a share of readers refuses it.**
This is the deliberate divergence from 0256 and the judgement I most expect to
be argued with. A share of readers must withhold, because a weighted mean over
the pages that could be priced has a denominator nobody named and no safe
direction. A pace has one: leaving the correction off makes the readers more
numerous, the denominator bigger and the pace lower — towards `skimmed`, which
is the verdict 0230 was built to be able to defend. So the page is kept, the row
says how many of its readers came from such a page, and the reading names the
pages in the vocabulary whose subject is a page.

**The outermost placement of a kind on a page stands for the ones inside it.** A
part is judged against its subtree's words, so a kind's figures nest wherever it
stands inside itself. A stack inside a stack would be counted twice — and the
role row for parts that declare none is nearly every part of nearly every page,
so without a rule it would count one page's words once per level of its tree.
The inner placement goes to `nested` and is in no term.

**No pace over the whole library**, because two *different* kinds nest in each
other wherever a band holds a paragraph. `dwellMs`, `needMs` and `shortMs` all
nest across rows and nothing adds them.

**The page root is kept in the rows and out of `mostSkimmed`**, which is 0230's
own rule at the other scale: its pace is the sentence a screen opens with, and
by words it would win every ranking it was entered in.

**`atDoorScale` is published from `door.ts`**, which is the one change outside
the new unit. See the finding below: the module that exists to hold that rule
once held half of it, and the other half was five hand-written copies across
three modules. A sixth was the alternative.

## Records added

- [**0325**](../decisions/0325-a-kinds-pace-is-a-pooled-ratio-over-its-outermost-placements-and-an-unscaled-page-is-kept.md)
  — *A kind's pace is a pooled ratio over its outermost placements, and an
  unscaled page is kept.* **Accepted.** It contradicts no record — the
  divergence from 0256 is a different reading reaching a different answer for a
  stated reason, not a reversal of that one — adds no field to the tree schema
  or the delta model, and needs no built code migrated. Six alternatives
  recorded, including the mean of ratios, withholding on an unscaled page,
  counting the nested placements, and shipping a places census first the way
  reach was split from the library census.

## Findings filed and closed

**Filed, closed on filing** — *three library readings spelled the door's
per-placement scaling out, and the module that exists to hold that rule held
only half of it.* `door.ts` published `PageDoor` and `doorOf` — the per-page
half — and `count × counted ÷ appearances` stayed written out five times across
three modules. Every copy agreed, including the detail that makes them agree:
the multiplication before the division, because the three floats agree to
fifteen places in the other order and not to sixteen. All five now call
`atDoorScale`, bit-identically. **The check worth keeping** is that a module
whose stated purpose is to hold a rule once can hold half of it for a month with
every test green, and grepping for a rule's *arithmetic* rather than its name
finds it in a minute.

**Filed, open** — *a third reading now hangs off the window assembly without
being in it, and the pattern is no longer one gap.* `regionPagesOf` (§62),
`silenceCensusOf` (§63) and now `libraryPaceOf`. Each was filed alone with a
recommendation to leave it; three makes it a shape. What they have in common is
not that the assembly forgot them — the assembly produces subjects and
deliberately produces no figures, and all three are figures. **What is missing
is a second rung**: something that takes an assembly and produces the readings
over it. That is a real unit and not a small one, because the honest version
decides which of the thirty-odd readings a deployment gets by default.
**Recommendation: still leave it — but a future run should take all three at
once rather than any of them individually.**

**Filed, open** — *the role rows of a library's pace are thinner than every
other role figure, and the reason is the nesting rule rather than the registry.*
With no role declared, every part of a page is one kind, so the `null` row holds
the page root and `nested` holds the rest. It is the only honest answer
available, and it means that row says something different from the `null` row of
the other five library readings. **Recommendation: leave it and do not
special-case the key.**

## Test numbers

`pnpm verify` **green**, every stage: `build`, `typecheck`, `test`,
`findings:check`, `reports:check`, the app's own `verify`, and
`prerender:check`.

- **5,919 tests in 244 files** in the root suite, all passing, and **6,837 in
  379 files** in the app's own. `findings:check` reads 1,367 findings with none
  malformed; `reports:check` reads 2,023 visuals at 144.0MB with none over the
  cap; `prerender:check` reads 137 pages with 0 junctions run together.
- **35 new tests** in `library-pace.test.ts`, in six groups: whether the readers
  who meet a kind have time for it, what the door does to its pace, what it has
  no pace for, a kind keyed by the part it plays, what the reading publishes
  over the kinds, and the costing rate.
- **Nothing was skipped and nothing was weakened.** The three tests that changed
  outside the new file are `silences.test.ts`'s own enumerations, which gain the
  twenty-first vocabulary. No assertion anywhere was relaxed.
- **Three modules changed for `atDoorScale` and no test of them changed**, which
  is the point of the way it is written: the multiplication stays before the
  division, so every call is bit-identical to the copy it replaced. All 1,783
  tests in `src/signals/` pass unaltered.
- **One generated file regenerated**: `reference.generated.json`, via
  `pnpm --filter @loom/app docs:api` — 17 entry points and 1,875 exports.

### Twenty-two mutants planted, twenty-two dead — after three survived

The first pass killed **19 of 22**, and all three survivors were real gaps
rather than equivalent mutants. Run **after** the commit, per the 27 October
finding that mutation testing before a commit is how a run loses the work it is
testing.

1. **A page counted once per counted placement.** `pages` was never asserted at
   all. Closed by *counts a page bearing it once, and two pages as two*, and by
   a `pages` assertion on the two-places-on-one-page case.
2. **Each page's straddle dropped on the way into the per-placement verdicts.**
   The correction has two halves — the readers in the pooled denominator, and
   the `spentMs` behind each placement's own standing — and only the first was
   pinned, because the pooled figure cannot show the second. Closed by a page
   whose section is `skimmed` at 1,500 ms a reader and `paced` once its doubled
   appearances are corrected for.
3. **The rows ordered by the ratio rather than by the time missing.** The
   ordering test asserted `shortMs` descending over a fixture where the two
   orders happened to agree. Closed by a library where they disagree: a note
   read at a tenth of the pace costing nine hundred milliseconds, against a band
   read at four tenths costing four hours.

The second pass killed all twenty-two. The list also includes a nested
placement counted, a part's own words taken for its subtree's, no door scaling
at all, the corrected time per reader taken as the numerator, the pace
inverted, the floor ignored in the verdict, the silence order reversed, a
floored kind keeping its verdict, the root allowed to win the ranking, a
negative short time, an open-kind stack that never closes, readers from an
unscaled page not named, a repeated reading read again, the costing rate
ignored and then trusted however absurd, an unscaled page listed where nothing
was counted, and both ways `atDoorScale` could be wrong — dividing by the
openings, and taking one door where the counterfactual needs two.

### The double-count case, per this lane's standing rule

Every figure here is a sum, so it was tested in both directions at once.

- **A placement inside another of its own kind is counted once.** A section
  holding a section publishes `nested: 1`, `counted: 1`, and the outer one's
  forty words — never its own twenty plus the subtree's forty. The mutant that
  lets the inner one through dies here.
- **Two placements side by side are counted as two**, which is the opposite
  error and the under-reporting one, and **two forms of the `null` role row**
  are the same case at the key where it bites hardest: a three-part page
  publishes `placements: 3`, `nested: 2` and the page's words once.
- **One reading handed over twice is read once**, and a second door row for one
  revision is ignored rather than added — which would double a page's arrivals
  and halve every pace taken against it.
- **A page is counted once however many of its places are counted.**
- **The two partitions, which are what make the counts addable at all.** Every
  placement is in exactly one of `nested`, `counted` and the silences, and every
  placement the nesting rule did not set aside has exactly one standing. Both
  are asserted over every row of both groupings of a four-part library, not over
  one chosen row.
- **No figure is published over the kinds**, so there is nothing there to be
  added twice. The shape of the published object is itself a test, because the
  thing this record refuses is a field that does not exist.

## Browser cost: nothing

**`broadcast.ts` is byte-identical to `main`** — `git diff origin/main` on that
file is empty — and the bundle measures **6,513 bytes** minified, the same
number as the last nine runs. `browser-weight.test.ts` still reports no package
in the broadcaster's import graph.

`library-pace.ts` is server-side, imports six modules for types and four
functions, and reaches no store, no clock and no DOM. **No payload field, no
column, no migration, no store method and no new kind.**

## Open questions

**Nothing blocking.** Five, and four are not new.

1. **#706 / `0308` is six days old.** One reading of one clause, one member on
   two unions, one line in a switch, and it is the only thing holding that
   branch. **Recommendation: read it and say yes or no.** If you would rather
   the two states stayed merged, say so and the finding closes as settled.
2. **Whether a page the door cannot scale should be kept.** The one judgement
   in this unit that reverses a neighbouring reading's answer, for a stated
   reason: the missing correction only makes a kind read as more skimmed, and
   `skimmed` is the claim 0230 was built to defend. 0256 refuses the same page
   because a share has no safe direction. **Recommendation: keep it** — a
   deployment that has not finished wiring its door is exactly the one that
   needs the verdict, and `unscaled` on the row says how much of it is
   uncorrected. If you would rather the two readings behaved alike, that is one
   branch and a superseding record.
3. **`LOOM_SIGNAL_SWEEP_MS` is unset on this deployment**, so the retention
   notice publishes the weaker sentence and §60's verdict reads `unpromised` on
   every run. **Recommendation: set it to the cron's real interval when the cron
   is scheduled.**
4. **Seventeen runs with nothing drawing any of it.** Forty-one readings, nine
   comparisons, an assembly, a context, a census and now a library's pace, and
   not one of them on a screen. `Loom portal` is paused, so this is yours.
5. **The second rung.** Three readings now hang off `windowAssemblyOf` without
   being in it, and the finding above argues the answer is one unit rather than
   three one-line additions. **Recommendation: leave it until a surface exists**
   — but a future run of this lane should not take any of the three
   individually.

## On keeping the parked door cheap to open

**Nothing here makes per-reader identity more expensive to add later, and
nothing was built toward it.** The finest grain in this reading is *one kind of
part, on one revision of one page, in one form* — a type or a role, a tree and
an audience. There is no reader in it at any point, and `readers` is explicitly
a weight rather than a headcount, for the reason 0256 already refused to round
one into people.

One thing worth knowing if that door is ever opened: this reading would get
**better** rather than harder. Its weakest assumption is the one 0230 names —
dwell counts a part that was merely on screen, and a mean over page views cannot
tell one reader's four visits from four readers' one. An identified batch would
sharpen the denominator without changing a single figure's definition. That is
not an argument for building it; it is one place the parked work would pay off
if it is ever approved.
