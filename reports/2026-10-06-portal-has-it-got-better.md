# 2026-10-06 — has it got better?

**Build order section:** §5 — Loom Portal. The one reading on `/portal/trust`
that can be different tomorrow, and the first thing on that screen that is worth
coming back for.

**Branch:** `portal-53-has-it-got-better` (→ `main`), cut from `main` at
`135d808`. Not stacked — the one open pull request is `Loom lessons`' and touches
none of these files.

---

## The value answer

> *What does this tell a developer that they could not get from the repo, the
> logs, or `git log`?*

**That the AI's confidence is getting less trustworthy, and that the number that
would make them think otherwise is the wrong one to read.**

`/portal/trust` has answered *is a 0.9 actually a 0.9* since it was built, over
the newest page of the journal. It has given the same answer every day, because
the window it reads only rolls when two hundred more records arrive. A verdict
that cannot change is a verdict nobody needs to open the portal for, and the bar
this surface is held to is a developer opening it daily.

So the screen now reads one page further back and compares. Nothing else in the
ecosystem can do it: an analytics product measures a URL, `git log` holds the
primitives and not the judgments, and the store holds the page and no record of
what the Gate did to anything proposed about it. The claim, what became of it,
and which ruleset judged it are all in one journal, and only this one.

And the sentence the comparison makes is the one a dashboard would get backwards:

> **The AI has got worse at judging itself.**
>
> More changes went through than in the stretch before. That is not the reading
> above and it is not an improvement: how often a change goes through is what
> your rules and the people here allow, and over this stretch the AI read itself
> less accurately than before.

---

## What a person reads now

Under the verdict, above the misses, with its own heading:

> ### Has it got better?
>
> **The AI has got worse at judging itself**
> What it claimed and what happened have drifted further apart than they were
> over the stretch before this one. A number from it means less than it used to.
> *Read what a change would do before you accept it, and look at what it keeps
> being wrong about below.*
>
> More changes went through than in the stretch before. That is not the reading
> above and it is not an improvement: how often a change goes through is what
> your rules and the people here allow, and over this stretch the AI read itself
> less accurately than before.
>
> › **The two stretches, side by side**

Opened, the disclosure holds both stretches' judged counts, pass rates, mean
claims, signed gaps and date spans; the sentence saying the comparison is on the
gap and not on the pass rate, and why; how many entries belong to an ask that
began before the stretch holding them; and how many rulesets judged the two.

---

## Visuals

**Photographs of the application, signed in, through a production build served by
`pnpm shoot --serve`.** Four hundred and twenty telemetry records were staged
into a real `memoryTelemetryJournal()` through the published
`TelemetryJournal.record`, and read back through the same `portalTelemetry` the
screen always calls. **The fiction is the claims and who answered them**; the
page, its name, the ruleset, every rate, every mean and every band on the screen
are computed by the deployment from those records. The staging module was deleted
before committing and the shot list is beside this report.

| | |
| --- | --- |
| [**the trust screen**](2026-10-06-portal-has-it-got-better-wide.png) | `1680×1000@2x`, full page, `scrollWidth 1680 / innerWidth 1680` |
| [**the disclosure open**](2026-10-06-portal-has-it-got-better-open.png) | `1680×1000@2x`, the technical record one click down |
| [**the same, on a phone**](2026-10-06-portal-has-it-got-better-phone.png) | `390×844@2x`, `scrollWidth 390 / innerWidth 390` |

The staged figures, so the photographs can be read against them: this stretch 49
judged, 69% survived, mean claim 95%, gap `+0.26`; the one before 49 judged, 49%
survived, mean claim 56%, gap `+0.07`. Four entries across the two belong to an
episode the 200-record page boundary cut in half, which is staged on purpose —
it is what a real journal does and it is what the caveat describes.

**Both `covering` cells read 6 October, and that is the staging rather than the
screen.** A span comes off `recordedAt`, which is stamped on arrival, and the
staging wrote all four hundred and twenty entries in one call. On a running
deployment the two rows differ, which is the whole reason the column exists. The
reasoning for `recordedAt` over `occurredAt` is in `trust-trend.ts` and repeated
in the finding.

---

## The high-schooler test, applied

> *Could a bright high schooler, who has never read a decision record, say what
> happened and what they should do next?*

**Screen: `/portal/trust`, the new second section.** The words a person meets are
*has it got better*, *the AI has got worse at judging itself*, *a number from it
means less than it used to*, *more changes went through than in the stretch
before*, and *read what a change would do before you accept it*. None of them
needs anything explained first, and what to do next is one sentence that also
points at the section below it.

**What was renamed or moved behind a disclosure.** Nothing was removed. The
reading is new, so the question is which half of it is met unasked:

| the record says | a person reads | where the record's own form is |
| --- | --- | --- |
| `gap` shrank by 0.18 | **The AI has got better at judging itself** | the disclosure's `gap` column, signed, to two places |
| `gap` grew by 0.18 | **The AI has got worse at judging itself** | the same |
| `\|Δgap\|` ≤ 0.1 | **About the same as before** | the same |
| two stretches, different `policyFingerprint` | **Your rules changed in between, so this isn't about the AI** | the ruleset sentence in the disclosure |
| `judged` under 10 on a side | **Too few answers to say yet** | the `judged` column |
| `older === null` | **This is as far back as the record goes** | no table is drawn |
| a failed second read | **We couldn't look further back** | `describeTelemetryError`, verbatim, one click down |

The words `gap`, `calibration`, `fingerprint`, `ruleset`, `episode` and
`disposition` appear nowhere on the surface of this section, and a test asserts
it over every reading the function can produce. `confidence` is **not** on that
list, deliberately: `readTrust` already says it on the surface above, because it
is a word a person uses.

---

## The decisions worth reading

### The measure is the gap, not the pass rate — and that is the whole unit

A page proud of itself would draw the survival rate going up and call it better.
It is not better. A model that claimed 0.9 and saw 95% survive is **worse**
calibrated than one that claimed 0.9 and saw 90% survive, because calibration is
agreement between the claim and the outcome and nothing else (0007). Survival is
also not a property of the model at all: it is what the Gate and the people here
between them allowed, so it moves when a host tightens a floor and the model has
not changed by a hair — which `PolicyCalibration`'s own doc comment already says
one level down, about pooling two gates in one window.

So the reading is on `|gap|`. A test holds the three shapes that would otherwise
be read backwards: a gap that crossed from over-claiming to hedging reads as
*closer*, a gap that went from hedging to over-claiming reads as *further*, and a
model that was hedging and hedged harder reads as *further* too, even though the
pass rate rose.

**And when the pass rate moves the other way from the verdict, the screen says so
unasked.** Three combinations get a sentence: more went through and the AI read
itself worse, fewer went through and it read itself better, and the pass rate
moved while the accuracy held — that last one meaning the AI's claims moved with
it. Where the two agree the sentence is silent, because a caveat drawn on every
view is a caveat nobody reads on the day it differs. It sits above the disclosure
rather than in it: a caveat a reader has to open something to find is a caveat
that arrives after the conclusion.

### A stretch is not a week, and the section never pretends it is

A journal page is two hundred records. Two pages are two spans of unequal
wall-clock time, and how unequal depends on how busy the deployment was. So the
section says *the stretch of the record before this one*, prints the dates each
one covers, and says in the disclosure that a stretch is a page and not a week.

That it cannot say *last week* is a framework gap and is filed as one: a
telemetry read takes a cursor and a limit and has no notion of time. The fix is
small — `since`/`until` on the read, and `from`/`to` on the page so a consumer
stops taking them off the first and last record — and it is not this lane's to
take (0018).

### A comparison refuses to be drawn over things that are not comparable

Three refusals, and each is the same argument in a different place.

**Different rules.** If the two stretches were not judged by one and the same
recorded ruleset, the heading says *your rules changed in between, so this isn't
about the AI* and makes no claim about the model. Strict on purpose: one recorded
fingerprint on each side, the same one, nothing unfingerprinted. Anything looser
treats *probably the same* as *the same*, and attributes a host's own edit to the
model. Both stretches' figures are still drawn — nothing is withheld, the
attribution is.

**Too small a sample.** Below ten answered claims on either side there is no
comparison. Ten is derived rather than chosen: one claim flipping moves a
stretch's rate by `1 / judged`, and below ten that single flip moves it by more
than the whole band the verdict itself is drawn at. `COMPARABLE_MINIMUM` is
`Math.ceil(1 / GAP_TOLERANCE)` and follows the tolerance if it ever moves, which
is also why `GAP_TOLERANCE` is now exported rather than copied.

**Movement inside the band.** A gap that moved by less than the tolerance has not
moved, drawn at the same band `isOnTheMark` uses. Two tolerances would let the
page call a stretch on the mark and its own change in that stretch significant.

### Nothing to compare and could not find out are different sentences

`Earlier` is three cases and not two: another stretch, `"none"`, or
`"unreadable"`. A record that does not go back further is a thing to be told
once; a read that did not come back is a thing to come back for, and only one of
them deserves a reader's second visit. Collapsing them would be exactly the
failure this screen's own empty state was built to avoid — a page of zeroes
looking like an AI that never claimed anything.

**A failed second read costs the comparison and nothing else.** The verdict, the
misses and the bands are all folded from the page already in hand, so the section
says it could not look further back and the journal's own sentence goes behind a
disclosure. That is the same split the name read and the buffer read on this
surface have been held to since they were written, and `reading-order.test.ts`
now pins it: `if (!page.ok)` returns, `if (!previous.ok)` does not exist.

### One more read, bounded exactly like the first

The journal only grows. A trend drawn over its whole history is a read whose cost
rises every day the deployment runs, so the second read is one page at the cursor
the first came back with, and the reading-order guard asserts the count rather
than the shape — a third read taken anywhere would pass every other test here. It
is skipped entirely when nothing has been answered, because the empty state is
drawn instead and a comparison against a window holding nothing is a read made
and discarded.

### The section is headed, and the photograph is why

The first shot of this branch showed two pink panels one under the other —
*the AI has been over-sure of itself* and *the AI has got worse at judging
itself* — drawn in the same tone because both readings were bad. Without a
heading the second reads as the first repeating itself rather than as the answer
to a different question. The other two sections on this page are headed for
exactly that reason; this one now is too, and a test holds it.

---

## What this screen still had no guard for

`/portal/trust` is the screen `_lib/screen-source.ts` names in its own header as
the one nobody wrote a guard for — *"the screen that ships a defect is by
definition the one nobody thought about"* — and it still had none five weeks
later. Thirteen screens in this group have a `reading-order.test.ts`. It now has
one, holding the three rules that are only true of this screen: one fold per
stretch with every reading off it, two journal reads and no more, and the order
verdict → trend → misses, with the bands and the gates behind disclosures.

---

## Gate

`pnpm install && pnpm verify` — status written to a file as the last thing on its
own line and read in a separate command, per `docs/routines.md`.

**Green, exit 0**, on a deleted `dist` and `.next`.

| | `135d808` + this branch |
| --- | --- |
| `@jam-overture/loom` | 186 files / 4,022 tests — unchanged by this branch, `src/` was not opened |
| `@loom/app` | **401 files / 7,139 tests** |
| findings ledger | **1,038** entries, 0 malformed |
| `prerender:check` | 126 pages, 1,542 text junctions, 0 run together |

**No test weakened, skipped or deleted.** The four test files this branch touches
hold **60 tests**, of which 6 existed before — `+54`: 25 in `_lib/trust-trend.test.ts`,
13 in `trust/_components/trust-trend.test.tsx`, 12 in the new
`trust/reading-order.test.ts`, and 4 added to `_lib/when.test.ts` for `plainDay`.
The whole-suite total also moves with the portal-wide guards that enumerate this
lane's files, so the per-file count above is the figure to check rather than a
subtraction.

Scope is seven files under `apps/loom/app/(portal)/`, `FINDINGS.md`, this report
and three photographs. `src/`, `tools/`, `decisions/` and every other route group
are untouched. No decision record: this is a reading over data the record already
holds, and 0031 already settled that calibration reads and never acts.

---

## Findings

Two appended, neither blocking.

1. **A telemetry journal can be read by position and never by time**, so this
   comparison is two pages and never two weeks. Filed for `Loom daily build`
   with the two shapes that would close it, and with the one thing worth knowing
   before either is built: the bound must be on `recordedAt`, not `occurredAt`.
2. **The screen `screen-source.ts` names as the one nobody guarded still had no
   guard.** Closed by this branch; recorded because the shape is not this
   screen's — a sentence in a header naming a known gap is not a guard, and
   nothing in the repository would have said so.

The 5 October entry — one `<ul>` still at `max-w-3xl` on the proposal screen — is
**still open and deliberately untaken**. It is one line on a screen this branch
does not open, and it is recorded with its line number for the run that does.

## What this did not do

**It did not try to say anything across more than two stretches.** A sparkline
over six pages of the journal is six reads, and the read shape that would make it
one is the finding above. Two stretches is what one extra bounded read buys.

**It did not touch the per-piece tracking matrix** — `docs/portal.md` unit 3,
still waiting on the framework half filed on 1 October.

**It did not try to say anything across two versions of a page.**
`readingChangeOf` is still blocked on a store that can answer for an older
version — the 4 October entry, unmoved.
