# 2026-10-07 — how many people were there

**Build order section:** §5 — Loom Portal. The denominator every rate on the
reader screen has been divided by since it was built, replaced with the one that
is a count of people.

**Branch:** `portal-54-how-many-people-were-there` (→ `main`), cut from `main` at
`a972a26`. Not stacked — the one open pull request is `Loom signals`' #541 and
touches none of these files.

**Closes** the 4 October entry in `FINDINGS.md`, filed by `Loom signals` and
owned by this lane: *every rate on the reader screen now has an exact
denominator, and the figure to show is not the one that looks exact.*

---

## The value answer

> *What does this tell a developer that they could not get from the repo, the
> logs, or `git log`?*

**How many actual people got to a particular part of one of their pages.**

Not visits, and not a share. *About 80 of the 320 readers who arrived got as far
as the small print* is a sentence nothing else in the ecosystem can say, and it
has been one division away from sayable on this screen since the counters
existed. An analytics product measures a URL: it has no idea a page is a tree,
and no way to name a part of one. `git log` holds the primitives and not the
page. The store holds the page and no record of what it did to anybody.

The half that was missing was the denominator. Every figure on this card divided
by **the largest visit count any single row of the window reports** — a floor,
which cannot be added across rows and which carries the over-count of every
visit that was still being read when a counting window closed. On the
photographs below that number is `384` and the number of people who were there
is `320`. *27 of the 384 visits* was true, and it read as a census.

`pageReachOf` ([0229](../decisions/0229-a-share-of-readers-is-estimated-against-the-appearances-and-bounded-against-the-openings.md))
is the join. Nothing was collected for it: the arrivals were already in the rows
this screen reads to correct the pace reading, and the reach was already in the
join the other three sections come off. **It is the fourth reading off one join
and the fifth thing taken out of the server-side one** — nothing added to a
payload, a browser, a column, a store or the vocabulary.

---

## What a person reads now

Directly under *these are the numbers for the version you are serving right
now*, and above every figure on the card:

> ### How many people were there?
>
> **320 readers arrived at version 0 of this page.**
>
> The raw visit counts on this card are about 20% higher than the number of
> people who were here, because somebody still reading when a counting window
> closes is counted again in the next one. Every share of your readers below
> divides that out; the raw counts do not.
>
> › **The two denominators, and the straddle between them**

And the card's own oldest sentence, in people:

> Of those 320, **about 80 readers** got as far as the prose “Nothing here was
> written as markup. A pr…” — fewer than any other part of this page that
> anybody got to.

And every row of *which parts did people get to*:

> **People saw it** · the card “Every change is a delta” · about 125 of the 320
> readers

---

## Visuals

**Photographs of the application, signed in, through a production build served
by `pnpm shoot --serve`.** Three hundred and twenty arrivals and 384 counted
appearances were staged into a real `memoryReaderTallyStore()` through the
published `ReaderTallyStore.apply` and `ReaderTallyStore.opened`, against the
page the portal seeds, and read back through the same `portalReaderTallies` the
screen always calls. **The fiction is the readers**; the page, its parts, their
words, their names and every rate, share and count on the screen are computed by
the deployment from those rows. The staging module was deleted before committing
and the shot list is beside this report.

| | |
| --- | --- |
| [**the reader card**](2026-10-07-portal-how-many-people-wide.png) | `1680×1000@2x`, full page, `scrollWidth 1680 / innerWidth 1680` |
| [**the disclosure open**](2026-10-07-portal-how-many-people-open.png) | `1680×1000@2x`, both denominators and the straddle, one click down |
| [**the same, on a phone**](2026-10-07-portal-how-many-people-phone.png) | `390×844@2x touch`, `scrollWidth 390 / innerWidth 390` |

Staged figures, so the photographs can be read against them: `opened 320`,
`appearances 384`, so `drift 64` and `inflation 20.0%`; reach down the page 384,
360, 300, 150, 120, 96. The section is the **first** `h3` on the card at
`y 419`, above the fold at both viewports.

The one clipping box both wide shots report is the collapsed rail, which is
every photograph of this portal and is not this branch's.

---

## The screenshot found a defect that every test passed through

**This is the part of the run worth reading.** The first draft put the new
section third, under the card's highlights, and left the highlights alone. The
photograph:

> Of the parts people reported on, fewest got as far as the prose “Nothing here
> was written as markup. A pr…” — **96 of the 384 visits**.
>
> *(three lines down)*
>
> Of those 320, **about 80 readers** got as far as the prose “Nothing here was
> written as markup. A pr…”

One card, one part, two numbers, nothing joining them. Both true; the second
better; together worse than either alone, because the reader's first question
stops being *what is this page doing to people* and becomes *which of these do I
believe*. It is the two-denominator failure this whole branch exists to end,
reproduced inside the fix.

**Nothing failed, and nothing could have.** Every test in this lane is scoped to
a component or a module: `arrivals.test.ts` asserted the new sentence,
`page-reading.test.tsx` asserted the old one, and both were right about what
they could see. The property that broke is *between* them.

The fix is the arrangement rather than a deletion. The section moved **above**
everything it is the denominator of, and the highlights line — which has named
the part fewest people got to since this card was written — now says it in
people. One fact, one sentence, one denominator. `page-reading.test.tsx` holds
that as a rule now, including the order: *the count of people is said before any
figure drawn against it*. Filed as a finding, because the class outlives the
instance: **a lane adding a better figure beside a worse one ships both unless
something makes it choose**, and the only instrument that sees it is a picture of
the whole screen.

---

## The high-schooler test, applied

> *Could a bright high schooler, who has never read a decision record, say what
> happened and what they should do next?*

**Screen: `/portal/readers`, the card's new first section and the two sections
it changes the units of.** The words a person meets are *how many people were
there*, *320 readers arrived*, *the raw visit counts on this card are about 20%
higher than the number of people who were here*, *of those 320, about 80 readers
got as far as …*, and *about 125 of the 320 readers*. None of them needs
anything explained first.

### What was renamed, and what moved behind a disclosure

Nothing was removed. The raw counts are in two places they already were — the
`seen` column of *every part, its registered type, and what was counted*, and
the new disclosure — and the floor keeps its own paragraph, which now also says
which of the two the rows above it were measured against.

| the record says | a person reads | where the record's own form is |
| --- | --- | --- |
| `opened` | **320 readers arrived** | the disclosure, as `opened — 320` |
| `appearances` | *(not on the surface)* | the disclosure, with why it is the divisor |
| `drift` / `inflation` | **the raw visit counts … are about 20% higher** | the disclosure, as a count and a percentage |
| `pending` | **n readers arrived whose reading has not been counted yet** | the disclosure, as `pending — n` |
| `countedViews` | *(the figure a row falls back to)* | the floor paragraph, named as a floor |
| `share` applied to `opened` | **about 80 of the 320 readers** | the disclosure's arithmetic |
| `atMost` | *(nowhere on the surface, deliberately — see below)* | the ceiling's own sentence in the record |
| `unmeasured` | **Nothing has counted how many people arrived** | `describeReachSilence`, verbatim |
| `unopened` | **Nothing is saying when a visit to this page begins** | the same |
| `uncounted` | **no window of their reading has been counted yet** | the same |
| `unreconciled` | **more visits than there were people to make them … it clears itself** | the parts named, one click down |
| `foreign` / `duplicated` | *(not on the surface)* | the disclosure, with why each was dropped |

The words `reach`, `appearances`, `opened`, `drift`, `inflation`, `straddle`,
`revision`, `node` and `tree` appear nowhere on the surface of this section, and
a test asserts it over all six states the reading can be in.

---

## The decisions worth reading

### The share is the honest figure and the exact-looking counts are not

The instinct runs the other way, which is why `Loom signals` wrote the answer
into the finding and it is worth repeating. A part's `reached` and the
`appearances` it is divided by are counted out of the **same windows**, so the
straddle over-count is in the numerator and the denominator and very nearly
divides out. The raw counts carry it undivided. So the rounded share is the
sound figure and the exact-looking counts are the misleading ones — which is
backwards from how a screen full of integers reads, and is the whole reason the
section says out loud that the raw counts are 20% high.

### `atMost` is not on the surface anywhere, and that is the finding's instruction

`reached ÷ opened` is a ceiling rather than an estimate, and **for any part most
readers reach it is 1 and says nothing.** That is the ordinary state and not a
fault: a root is in the viewport of every visit that drew the page, so where
anybody straddled, its reach is above the arrivals on its own. A screen leading
with it would print `100%` against half a page. It is in the record as the gap
between the estimate and the ceiling, which is the straddle seen per part.

### Three nothings get three sentences, and one of them gets a notice

`unmeasured`, `unopened` and `uncounted` render identically as silence and mean
entirely different things. Only **`unopened`** is a fault, and it is the one
worth interrupting for: a row with appearances and no openings means the pages
are not marking when a visit begins, so every rate on this screen has no
denominator **while the counters look perfectly healthy**. Nothing else in this
subsystem can diagnose that, so it is the one that gets the notice tone and a
disclosure saying where to look. The other two ask only for waiting.

A fourth state is a refusal rather than a nothing: more reach than there were
arrivals cannot come from rows one set of roll-ups wrote, so it is counters
older than the arrival count, it clears itself as those windows expire, and the
count is shown with the share withheld. A share above everybody is the one
figure this screen must never draw.

### A row falls back rather than going blank

Where the honest figure cannot be given, every row keeps the figure it has
always carried — *27 of the 384 visits* — and the section above says which of
the two the card is showing. A true sentence about a denominator nobody can
stand behind is worth more to a reader than a blank, as long as something says
so. The alternative was a card that emptied itself on the state it was built to
explain.

### The part fewest people got to excludes two kinds of part, for opposite reasons

The **top of the page** is in every visit that drew it, so its share is at or
near 1 on every healthy deployment and naming it would be a sentence that is
always true. A part **nobody reached at all** has a share of nought, so it would
win on every page that has one — and *nobody got to the small print* is a
sentence `_lib/skipped.ts` already says, in a section of its own, with the run of
parts below it. Both exclusions are pinned.

### One join, four readings, and the guard counts them

`reading-order.test.ts` asserted *one join, three readings* and now asserts
four, with the count as the point rather than the names: a fifth reading taken
off a second join would pass every other test on this screen. It also pins that
each page's reach is divided by **that page's own** arrivals — dividing one
version's counters by another version's readers is the mistake that would make
every rate here quietly wrong, and the join filters and reports rather than
trusting its caller.

---

## Gate

`pnpm install && pnpm verify` — status written to a file as the last thing on
its own line and read in a separate command, per `docs/routines.md`.

**Green, exit 0**, on a deleted `dist` and `.next`.

| | `a972a26` + this branch |
| --- | --- |
| `@jam-overture/loom` | 187 files / 4,081 tests — unchanged by this branch, `src/` was not opened |
| `@loom/app` | **409 files / 7,297 tests** |
| findings ledger | **1,056** entries, 0 malformed |
| `prerender:check` | 126 pages, 1,584 text junctions, 0 run together |

**No test weakened, skipped or deleted.** The five test files this branch
touches hold **145 tests**, of which 74 existed before — `+71`: 42 in the new
`_lib/arrivals.test.ts`, 21 in the new
`readers/_components/how-many-were-there.test.tsx`, 3 added to
`page-reading.test.tsx`, 3 to `what-was-skipped.test.tsx` and 2 to
`reading-order.test.ts`. One test in `how-many-were-there.test.tsx` was
**rewritten rather than added** — it asserted the section draws the per-part
sentence, and it now asserts the opposite, which is the defect above.

Scope is ten files under `apps/loom/app/(portal)/`, `FINDINGS.md`, this report,
a shot list and three photographs. `src/`, `tools/`, `decisions/` and every other
route group are untouched. **No decision record:** this is a reading over data
the record already holds, through a published entry point, and 0031 already
settled that a measurement reads and never acts.

---

## Findings

Two appended, one closed.

1. **Closed** — the 4 October `Loom signals` entry. The register it asked for was
   taken as written, field by field.
2. **The honest figure and the figure it replaces shipped side by side in one
   card, and only a photograph could have caught it.** Closed by this branch,
   recorded because the class outlives it.
3. **How many people arrived is answerable on a version gap and is withheld with
   the three readings that are not.** Open, this lane's, with the shape the fix
   probably wants.

## What this did not do

**It did not answer on a version gap**, which is finding 3 and is the sentence
this card could say for the hour after every change.

**It did not change what the pace reading divides by.** *People stayed longest
on X — about 7 seconds each, for the 384 visits that got there* is a figure per
visit rather than per reader, and the pace reading corrects for the straddle by
its own separate route. One word changed there — *the 384 who got there* became
*the 384 visits that got there* — because with the arrivals on the same card the
old wording claimed 384 people on a page 320 people visited. The arithmetic is
untouched.

**It did not touch the per-piece tracking matrix** — `docs/portal.md` unit 3,
still waiting on the framework half filed on 1 October — or `readingChangeOf`,
still blocked on a store that can answer for an older version.
