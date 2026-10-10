# 2026-10-09 — what Loom was checking, and the accusation the screen was making by accident

**Build order section:** §5 — Loom Portal. `/portal/trust` has been able to say
*the AI got worse* since it was built, and it could not tell that apart from
*you wired a registry into the write path on Tuesday*. This is the half of
*what judged these claims* that a policy fingerprint cannot reach.

**Branch:** `portal-56-what-it-was-checking` (→ `main`), cut from `main` at
`e8047d0`. Not stacked — the one open pull request is #548, `Loom primitives`'
`primitives-55-the-page-read-rather-than-scanned`, which touches no file here.

**Closes** the 8 October entry in `FINDINGS.md` filed by `Loom framework` and
owned by this lane: *three fixtures in your lane gained two keys, and the row
that would read them is yours to write.* Taken as written, and the entry's
closing sentence — *"`readRuleset` is correct and half the sentence"* — is the
whole brief of this branch.

---

## The value answer

> *What does this tell a developer that they could not get from the repo, the
> logs, or `git log`?*

**That the AI's track record moved because of something they changed in their
own deployment — and which half of it.**

> *What Loom was checking changed in between, so this isn't about the AI. Your
> rules did hold still.*

`git log` has the commit that wired a props vocabulary into the composition
root. It does not know that the refusal rate moved the same week, and nothing
joins the two. An analytics product measures outcomes and has never heard of a
write path. The policy fingerprint — the one thing in the ecosystem that could
have been expected to catch it — **cannot**, by construction: a props vocabulary
and a binding reader are functions, and a policy is a Zod-parsed serialisable
value (0179, 0208), so the deployment that wires one on Tuesday produces
judgments on Wednesday whose fingerprint is **byte-identical** to Monday's and
whose outcomes are not.

So the sentence this screen can now say is one that needs three facts nobody
else holds at once: what the model claimed, what became of it, and what the
write path was holding at the moment it decided. That is Loom's own data and it
is the whole of the advantage.

---

## What a person reads now

Three places, and the first is the only one on the surface.

**The trend verdict**, where the comparison used to be drawn:

> ### Has it got better?
>
> **What Loom was checking changed in between, so this isn't about the AI**
>
> Your rules did hold still. But your deployment can also hand Loom checks it
> runs before a change goes on, and any of them can turn a change that would
> have gone through into one that was turned down — so a different set of them
> across these two stretches means anything that moved may be that wiring rather
> than the AI.
>
> Compare them again once a stretch of the record has run with the checks you
> have now. Which ones were in place is below.

**The two stretches, one click down**, as a second sentence beside the rulesets
one and never folded into it:

> This stretch was judged by 2 different sets of checks; the one before it, by
> nothing beyond your rules. These are checks your deployment hands Loom rather
> than rules you wrote, and either of them can turn a change that would have
> gone through into one that was turned down — so a comparison needs them to
> have held still too.

**The breakdown**, which now opens for a third reason and says which one:

> ▸ Careful: what Loom was checking changed while these were judged
>
> Your rules held still on this page. What your deployment hands Loom to check
> before a change goes on did not …
>
> | policy | judged | survived | mean claim | reading |
> | --- | --- | --- | --- | --- |
> | checkout | 53 | 79% | 85% | on the mark |
>
> `what Loom was checking changed under this name` — These claims were judged
> with 2 different sets of checks in place — “none” and “props” — so this row
> pools two write paths whether or not its rules ever moved.
>
> the settings check · `props`
> Before a change goes on, Loom checks that every setting it would write is one
> the part receiving it actually accepts.
>
> the data check · `bindings`
> Before a change goes on, Loom checks that the data a part is pointed at is
> something this deployment can really read.

---

## The defect the brief did not ask for, found in the condition it did

**`rules-changed` was an accusation, and the screen was making it at people who
had changed nothing.**

`judgedByTheSameRules` was a boolean over a four-valued record. It was false for
a stretch whose rules were edited — and equally false for a stretch some of
whose judgments **recorded no ruleset at all**, which is every journal written
before the fingerprint field existed. Both produced:

> *Your rules changed in between, so this isn't about the AI … Compare them
> again once a stretch of the record has run under the rules you have now.*

For the second case every word of that is wrong in the way that costs somebody
an afternoon: they go into a configuration that never moved, looking for an edit
they never made, and nothing they find there will clear it. **The record rolling
forward is what clears it**, and the screen never said so.

It was found by writing the same condition for the checks, where the identical
trap is sitting one field over — `unrecordedChecks` is kept beside `checkSets`
for exactly `unfingerprinted`'s reason — and noticing that the answer about the
rules would have to be the one I was refusing to write about the checks.

So the condition is three-valued now, in both halves, in one shape:

| | what it means | what the screen says |
| --- | --- | --- |
| `held` | one answer on each side, the same one, nothing unrecorded | the comparison is drawn |
| `moved` | shown to be two | *your rules changed* / *what Loom was checking changed* — go and look |
| `unproven` | not shown to be one | *we can't show it held still* — **nothing to do, this clears itself** |

`incomparable` lands in `unproven` rather than `moved`, which is `readRuleset`'s
own reading of that state spelled the same way: two policies with different sets
of knobs are two Loom versions, and whether the values were edited **cannot be
read from a digest**. An upgrade is not an incident.

---

## Visuals

**Photographs of the application, signed in, through a production build served
by `pnpm shoot --serve`.** Seventy-two judged asks were staged into the memory
journal through the published `TelemetryJournal.record`, built with
`buildIntent`, `buildProposal` and `recordOf` from `@jam-overture/loom/testing`
— the first forty judged with nothing wired, the rest with the settings check in
place, and one unchanged policy fingerprint throughout. **The fiction is the
seventy-two asks**; every figure, every date, the page boundary, the two
stretches and both readings are computed by the deployment from those records.
The staging module was deleted before committing and the shot list is beside
this report.

| | |
| --- | --- |
| [**the verdict, and the refusal under it**](2026-10-09-portal-what-it-was-checking-wide.png) | `1680×1000@2x`, full page, `scrollWidth 1680 / innerWidth 1680` |
| [**both disclosures open**](2026-10-09-portal-what-it-was-checking-open.png) | `1680×1000@2x`, the two stretches and the breakdown with its legend |
| [**the same, on a phone**](2026-10-09-portal-what-it-was-checking-phone.png) | `390×844@2x touch`, `scrollWidth 390 / innerWidth 390` |

The refusal is the second `h2`'s panel at `y 369`, above the fold at both
viewports — a reader meets it without scrolling, which is the point of it
sitting under the verdict rather than after the misses. The one clipping box
both wide shots report is the collapsed rail, which is every photograph of this
portal and is not this branch's.

### The photograph found one thing, and it was in the new legend

The first draft rendered each legend line as `{label} {technical}`, which the
photograph showed as:

> the settings check props

The plain name and the record's own name running together as one phrase, which
is the one thing a legend must not do — and it is invisible to the test, because
`getNodeText` reads a `dt`'s direct text children and the record's name is
inside a `span`. A `·` separates them now, and the comment above the markup says
what the photograph showed. Third run in three days where a full-page photograph
caught something every test passed through.

---

## The high-schooler test, applied

> *Could a bright high schooler, who has never read a decision record, say what
> happened and what they should do next?*

**Screen: `/portal/trust`, the “Has it got better?” section and the breakdown.**
The words a person meets are *what Loom was checking changed in between, so this
isn't about the AI*, *your rules did hold still*, *checks it runs before a change
goes on*, *a change that would have gone through into one that was turned down*,
*compare them again once a stretch of the record has run with the checks you
have now*, *nothing beyond your rules*, *the settings check*, *the data check*,
and *nothing to do, and nothing is wrong: this is not a change you have to
find*. None of them needs anything explained first, and every one of the four
refusals ends in a next move.

### What was renamed, and what moved behind a disclosure

Nothing was removed. The record gained two fields and every one of them is
readable; three of the four states below could not be read anywhere before.

| the record says | a person reads | where the record's own form is |
| --- | --- | --- |
| `wiredChecks: ["props"]` | **the settings check** | the legend, beside `props`, with what it checks |
| `wiredChecks: ["bindings"]` | **the data check** | the legend, beside `bindings` |
| `wiredChecks: []` | **nothing beyond your rules** | the row note, as `describeWiredChecks`' own “none” |
| `checksContinuityOf → "changed"` | **what Loom was checking changed in between** | the row note, with both sets named as the record spells them |
| `checksContinuityOf → "unrecorded"` | **we can't show Loom was checking the same things** | the row note, as `no checks recorded` |
| `unrecordedChecks > 0` | **a further 3 claims across the two recorded no checks at all** | the row note, as `checks partly recorded` |
| `rulesetContinuityOf → "incomparable"` | **we can't show your rules held still** *(was: “your rules changed”)* | unchanged — `judged under different versions of the policy` |

The words `props`, `bindings`, `wired`, `write path`, `fingerprint`, `segment`
and `continuity` appear nowhere a reader meets unasked. `props` could not have
appeared even by accident: it is on `_test/plain-language.ts`' list, which is
that rule catching the exact shortcut this table exists to refuse — printing a
record's own key at a person.

---

## The decisions worth reading

### The empty set is a write path, not an absence

`checkSets: [[]]` is the ordinary healthy state of most deployments: Loom judged
by the rules alone, because nobody handed it anything else. Two things follow
and both were easy to get wrong. It must **compare equal to itself**, or every
deployment that has not wired a registry would be refused every comparison for
ever. And it must not render as blank space — `describeWiredChecks` gives it the
word “none”, which is right on a record and reads on a screen as data somebody
failed to collect, so the portal says *nothing beyond your rules*: the same fact
as a property of the deployment rather than as a hole in it.

### The two halves are two sentences, because they move independently

A policy you edited moves the fingerprint and leaves the checks alone. A
registry you wired moves the checks and leaves the fingerprint byte-identical.
So the disclosure carries two paragraphs rather than one compound one, the
breakdown row carries two notes rather than one, and when both moved the
headline is the rules — the half a person wrote and can go and look at — with
the other named in the aside rather than dropped. A reader who fixes the cause
they were told about and comes back to find the comparison still refused has
been sent on the same errand twice.

### The notes are keyed by the question, not by their words

Both readings can honestly print *partly recorded* on one row. The write-path
one is called **checks partly recorded** so two stacked badges are not the same
word twice, and the rows are keyed by which question they answer so React cannot
treat them as one row and drop the second.

### The breakdown's summary line says which of the two it is

The summary is what a closed disclosure shows, so it is the one line that has to
be right. A page whose rules never moved and whose write path did now reads
*Careful: what Loom was checking changed while these were judged* — because a
reader told their **rules** changed goes looking through a configuration that
never moved.

### The legend lists every check this version has, not only the ones on the page

A reader working out why two write paths differ is working out what is
**missing** from one of them, and a legend listing only what is present cannot
answer that. It is generated from `WRITE_CHECKS`, so a third check arrives in it
without anybody remembering to come back.

---

## Gate

`pnpm install && pnpm verify` — status written to a file as the last thing on
its own line and read in a separate command, per `docs/routines.md`.

**Green, exit 0**, on a deleted `dist` and `.next`, against `main` at `e8047d0`.

| | `e8047d0` + this branch |
| --- | --- |
| `@jam-overture/loom` | 199 files / 4,465 tests — unchanged by this branch, `src/` was not opened |
| `@loom/app` | **419 files / 7,679 tests** |
| findings ledger | **1,096** entries, 0 malformed |
| `prerender:check` | 129 pages, 1,644 text junctions, 0 run together |

**No test weakened, skipped or deleted to get there.** Across the five test
files this branch touches: **149 tests before, 191 after (+42)**.

Three existing assertions say something different now, and each is the
three-valued condition rather than a weakening:

- `readTrend(now, earlier with ["other"])` expected `rules-changed`. Its fixture
  used fingerprints with **different shape halves**, which is two Loom versions
  and not an edit — so it now expects `rules-unproven`, and a new case with a
  shape-sharing pair asserts `rules-changed` where the old one meant to.
- The same fixture correction in the component test, where the assertion is on
  the rendered label.
- `readTrend(spanWith({ unfingerprinted: 1 }), …)` expected `rules-changed` and
  now expects `rules-unproven`, with the label and the next move asserted — the
  defect above, pinned.

Scope is eleven files under `apps/loom/app/(portal)/`, `FINDINGS.md`, this
report, a shot list and three photographs. `src/`, `tools/`, `decisions/` and
every other route group are untouched. **No decision record:** 0248 is Accepted
and this is a reading of the field it added, through published entry points, and
0031 already settled that a measurement on this screen reads and never acts.

---

## Findings

One closed, two appended.

1. **Closed** — the 8 October `Loom framework` entry. Both halves taken: the
   fixtures were already correct, and the row that reads them is the unit above.
2. **A comparability condition that is a boolean over a record with an
   unrecorded state will accuse somebody of a change they did not make.** Closed
   in the instance, recorded because the shape is general and the next screen to
   read a continuity will meet it.
3. **The tenth consecutive hand-written photograph preload**, and the first that
   needed telemetry rather than a store — which sharpens what the harness the
   27 September entry asks for would have to hold.

## What this did not do

**It did not compare across the upgrade, and that is deliberate and
self-healing.** A journal holding judgments from before 0248 landed has
`unrecordedChecks > 0`, so the trend will read `checks-unproven` until a whole
stretch has run since — on the deployment, one page of the journal. The reading
says exactly that and says there is nothing to do about it. The alternative was
to treat *not recorded* as *unchanged*, which is the assumption that would hide
the one case this whole branch exists to surface.

**It did not put the checks in the two-stretch table as a column.** Six columns
at `2xs` is already the width this disclosure has; the per-stretch fact is a
sentence beside the rulesets sentence, which is the form that screen already
uses for a fact about a stretch rather than a figure in it.

**It did not touch what a check *concluded*.** The record says which checks were
in place and never what they found — a primitive's schema tightening changes
what a props vocabulary refuses while the list stays byte-identical. That is a
limit of what a runtime can know about a function (0248 says so in as many
words), not a gap for a later run.
