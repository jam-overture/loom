# Reader signals — what a window could not answer

**30 October 2026 (morning)** · `Loom signals` · branch
`signals-63-what-a-window-cannot-answer` · §63 of
[`docs/signals.md`](../docs/signals.md) · record
[0324](../decisions/0324-what-a-window-could-not-answer-is-a-census-over-its-silences-and-a-page-is-counted-once.md)

## Before anything was built

**Two open pull requests, both this lane's, and no maintainer comment on either.**
Every non-bot comment on both is a routine's own summary, so nothing outranked
the queue and no review has been left anywhere.

- **#724** — §62, record `0323`, *which pages the readers of a place read*. Last
  night's run. `main` has not moved since it was cut, so it is still the tip's
  child.
- **#706** — `0308` as `Proposed — architectural, needs review`, open since
  24 October and skipped by the merge routine for the reason it exists. **Six
  days old.**

**This work is a new branch off `main` rather than a commit onto #724**, which is
the opposite of what the procedure asked for last night, and the reason is that
#724 is the chosen work's nearest neighbour in the repository. §62 added
`region-pages.ts` and nothing else in `src/`; this adds `silence-census.ts` and
nothing else. Stacking would have put a second unit behind an unreviewed record
and made one branch hold two, where two independent branches can land in either
order. Three shared files collide either way and all three are resolvable:
`FINDINGS.md` is union-merged, `decisions/README.md` and
`reference.generated.json` are generated.

**`docs/signals.md` is the one that needs a human eye at merge.** Both branches
insert a section immediately before `## Still not in scope`, so git will report a
conflict there and **the resolution is to take both sections, §62 then §63**.
Nothing in either edits the other's text.

**`Loom daily build` has no branch open**, so nothing was racing the signal path.

The record is **0324**: `main` holds up to `0322`, `0323` is claimed on #724's
branch, and `0308` on #706's. Taking either would have guaranteed a clash I can
see from here, and the index reports both as holes per `0097` rather than
failing.

Eight open findings owned by this lane were read first. **None of them was the
work.** Seven are limits written down with a recommendation to leave them — two
from last night, one about a ceiling that can be proved kept and not tight, one
about a verdict that reaches only an operator's log — and the eighth waits on a
screen. So the queue fell through to the plan, and the plan's third item is the
one that chose this: *a counter nobody can phrase a question against is not
finished.*

## What I completed

**`silenceCensusOf`** — `src/signals/silence-census.ts`, 21 tests in
`silence-census.test.ts`, exported from `src/signals/index.ts`.

### What was wrong, which was not a bug

§17 built the silence vocabulary and it is the most careful thing in the
subsystem: a hundred and fourteen names across twenty closed sets, each mapped
to the **condition** it reports and the **subject** that condition is true of,
so that *the window held no page views* said by a copy reading and said by a
before-and-after reading is one sentence where the subject agrees and two where
it does not. It published `relateSilences` to hold two reasons against each
other and `distinctSilences` to collapse a card's readings to the states they
are in.

**Between 7 October and today nothing outside `silences.ts` and its own test
imported one name from it** — not the relation, not the dedup, not the table,
not one of the nineteen `meaningOf…Silence` functions, not one of the sentences.
Twenty-three days, every test green, and nothing could be asked of it.

The cause is not neglect and it is worth stating because it is a shape rather
than an oversight. `distinctSilences` takes the silences of **one card** — which
is the call it was built for, by the run that found two readings printing one
state in two voices — and the thing an operator holds is a window of forty pages
with nine readings over each. Handed that list it answers *which distinct
reasons are in it*, and cannot answer *how much of this window is dark*, *which
page is dark*, or *is this one missing door row or forty*. A list with no page on
its entries has no denominator.

### What it answers now

One entry per reading, grouped twice.

- **By the state** — a condition and a subject — with the **readings** it took
  and the **pages** it cost. *Eleven of this window's readings are dark for one
  reason, across three pages* is the sentence, and the two numbers are not each
  other: one page whose nine readings are all `unmeasured` is nine readings and
  one page, where nine pages with one each is nine and nine, and the remedies
  differ.
- **By the page** — the transpose, and the grouping with the denominator.
  *Nine of this page's nine readings are silent, for one reason* is a page to
  fix; one silence out of nine is a page that works. That distinction is the
  whole reason the argument takes an entry per reading rather than per silence:
  the `meaning` is nullable, so a reading that answered is still a reading **of
  that page**, and dropping the nulls before the call would make *nine of nine*
  and *one of one* the same row.

## Decisions I took that were not specified

**A state is one condition about one subject, keyed as a string rather than by
calling `relateSilences`.** The key is the relation's own definition of
`one-state`; calling the relation would turn a grouping into a scan per entry.
Two spellings of one rule is the thing this subsystem has been bitten by twice —
the door's scaling rule and the four upsert keys — so **the two are held
together by a test** instead: no two states of a census may be ones the relation
would call `one-state`, over a window built to produce both ways the key could
disagree with it. That is the device that holds a DDL default to the constant
that spells it.

**A page is counted once per state, however many of its readings report it.**
0271's rule for a fault in a deployment's collection, reapplied, and the
mutation that broke it is in the list below.

**The page is a form and not a tree**, keyed by `formKeyOf` (0290, 0293). A
census keyed by the tree reports one dark page where two forms of it are dark —
which is the direction that under-reports, so it is the one that matters.

**A reading of no one page is counted apart, as `wide`.** A library census and a
deployment order are of something larger than a page, and a reading's subject is
not its scope (0240), so attributing their silences to a form would be an
inference the reading never made.

**No ranking**, and this is the judgement I expect to be argued with. An
operator wants the states in an order and the two costs are in units that
disagree, and a third of the conditions are not faults at all —
`nothing-of-the-kind` means *this deployment does not use that kind of part*,
and at the top of a screen above a missing door row it would be a true number
answering no question. Both figures are published and the order is the order the
readings arrived, so a surface sorts by the figure it means. That is the shape
§60's finding recommended the last time this lane could not take a verdict
honestly: publish the figure, let the operator read it.

**No total of pages across the states**, because one page is in as many states as
it has reasons, and a count that has been added cannot be unadded (0158). What is
published partitions instead, and both identities are tests rather than
sentences.

**No sentence of its own.** `silences.ts` already prints a line for a condition
and for a subject. The only thing a third would add is the counts, which is
pluralisation, and it belongs to whoever draws the screen in whatever language
it is in.

## Records added

- [**0324**](../decisions/0324-what-a-window-could-not-answer-is-a-census-over-its-silences-and-a-page-is-counted-once.md)
  — *What a window could not answer is a census over its silences, and a page is
  counted once.* **Accepted.** It contradicts no record, adds no field to the
  tree schema or the delta model, and nothing in it needs built code migrated,
  so there was nothing to escalate. Five alternatives recorded, including
  widening `distinctSilences` in place, ranking the states, and the
  `answered | partly | dark` closed set this subsystem reaches for by reflex.

## Findings filed and closed

**Filed, open** — *a census over a window's silences is one call now, and
nothing reminds a caller it exists.* It is not a member of `windowAssemblyOf`
and cannot be in the shape the assembly has: the assembly produces readings,
and the census is over the thirty-nine readings taken from those, which the
assembly deliberately does not call. So a caller picks the right one of nineteen
`meaningOf…Silence` functions per entry. The hazard is mild in the direction
that matters — a wrong vocabulary gives a wrong *sentence* and never a wrong
count, because the condition and the subject travel with the silence and not
with the caller's choice. Two shapes costed; **recommendation: leave it until
something draws a census**, and take shape 1 (a tagged union with one dispatcher)
when one is built.

**Filed, closed on filing** — *the silence vocabulary had twenty sets, a
relation, a dedup and no caller for three weeks.* Filed rather than just fixed,
because the shape of it is a check this lane can run in a minute and had not:
**grep for an import of a published name outside its own test.** A set published
at the unit one surface needed can sit unused for three weeks with every test
green.

## Test numbers

`pnpm verify` **green**, every stage: `build`, `typecheck`, `test`,
`findings:check`, `reports:check`, the app's own `verify`, and
`prerender:check`.

- **5,861 tests in 242 files** in the root suite, all passing, and **6,783 in
  375 files** in the app's own. `findings:check` reads 1,357 findings with none
  malformed; `reports:check` reads 2,012 visuals at 143.2MB with none over the
  cap; `prerender:check` reads 137 pages with 0 junctions run together.
- **21 new tests** in `silence-census.test.ts`, in four groups: what a window
  could not answer, what a reason cost, what a page answered, and the identities
  it publishes rather than describes.
- **Nothing was skipped and nothing was weakened.** No test anywhere else
  changed — the unit adds a module and one line to `index.ts`, and alters no
  existing behaviour.

### Seventeen mutants planted, seventeen dead — after two survived

The first pass killed **15 of 17**, and the two survivors were real gaps rather
than equivalent mutants:

1. **A state repeating a vocabulary that said it twice.** The test asserted
   `vocabularies` over two *different* vocabularies and nothing pinned the same
   one arriving twice. Closed by *names a vocabulary once however many of its
   readings reported one state*.
2. **A page's group keyed by the tree instead of the form.** The form rule was
   pinned on a state's `forms` and not on `byForm`, so two forms of one page
   would have merged into one row with nothing failing. Closed by *gives two
   forms of one page a row each* — which also caught my own wrong expectation
   about form order, since `inFormOrder` sorts `aud_riders` before `aud_skiers`.

The second pass killed all seventeen. The list includes both halves of the state
key, a page counted once per reading rather than once, the first vocabulary
replaced by the last, the `silent` count taken as every reading handed over,
`answered` taken as `silent`, a state rebuilt rather than accumulated, every
reading counted as wide, and both orderings flattened. Run **after** the commit,
per the 27 October finding that mutation testing before a commit is how a run
loses the work it is testing.

### The double-count case, per this lane's standing rule

This unit's figures are all counts, so it had to be tested in both directions at
once.

- **A page counted once.** Three readings of one page in one state publish
  `readings: 3` and one page. The mutant that keys a state's pages by
  `formKeyOf(form) + held.readings` — one page per reading — dies here.
- **Two pages counted as two**, and **two forms of one page counted as two**,
  which is the opposite error and the under-reporting one.
- **The partition, which is what makes the states addable at all.** Every silent
  reading is in exactly one state, so the states' `readings` sum to `silent`;
  and every reading is in exactly one group, so the form rows' and `wide`'s
  readings sum to `readings`. Both are asserted over one window built to hold
  six silences, two answered readings, two pages, two forms and two readings of
  no page. The mutant that takes `silent` as `readings.length` dies on the first.
- **No figure over the states is published**, so there is nothing there to be
  added twice. `forms` is a list and a surface that sums it is summing one page
  per reason, which the record says in as many words.

## Browser cost: nothing

**`broadcast.ts` is byte-identical to `main`** — `git diff origin/main` on that
file is empty — and the bundle measures **6,513 bytes** minified, the same number
as the last eight runs. `browser-weight.test.ts` still reports no package in the
broadcaster's import graph.

`silence-census.ts` is server-side, imports two modules for types and one for
`formKeyOf` and `inFormOrder`, and reaches no store, no clock and no DOM. **No
payload field, no column, no migration, no store method and no new kind.**

## Open questions

**Nothing blocking.** Four, and three are not new.

1. **#706 / `0308` is six days old.** One reading of one clause, one member on
   two unions, one line in a switch, and it is the only thing holding that
   branch — the merge routine correctly skips a pull request carrying a
   `Proposed` architectural record. **Recommendation: read it and say yes or no.**
   If you would rather the two states stayed merged, say so and the finding
   closes as settled.
2. **`LOOM_SIGNAL_SWEEP_MS` is unset on this deployment**, so the retention
   notice publishes the weaker sentence and §60's verdict reads `unpromised` on
   every run. **Recommendation: set it to the cron's real interval when the cron
   is scheduled** — one environment variable, and the same number the stall
   check wants.
3. **Sixteen runs with nothing drawing any of it.** Forty readings, nine
   comparisons, an assembly, a context and a census, and not one of them on a
   screen. `Loom portal` is paused so this is yours rather than a
   lane's. What is specific to today: **this census is the cheapest screen in
   the subsystem to draw**, because it is one list and two numbers per row and
   it is the row that explains why every other screen is empty.
4. **Whether the states want an order after all.** I published both figures and
   refused the ranking, for the reasons above. If you would rather have one
   order, the honest version is not a sort inside the framework — it is a
   decision about which conditions are faults, which is a fifth closed thing and
   a record. **Recommendation: leave it to a screen until a screen exists.**

## On keeping the parked door cheap to open

**Nothing here makes per-reader identity more expensive to add later, and nothing
was built toward it.** The census holds conditions, subjects, vocabularies, two
counts and a list of pages. There is no reader in it at any point — its finest
grain is a page in one form, which is a tree and an audience id, and an audience
is a population rather than a person (0284).

One thing worth knowing if that door is ever opened: a consent decision is
exactly the kind of fact this reading is shaped for. An intake that refuses an
identified batch which cannot show which decision allowed it produces a
*condition* — *nothing recorded which decision allowed this* — about a
*subject*, and the vocabulary and this census would both take it as a
twenty-first set and a new condition without any change to either. That is not
an argument for building it; it is one fewer thing to build if it is ever
approved.
