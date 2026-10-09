# The permission nobody used

**Routine:** `Loom primitives` · **Date:** 2026-10-09 ·
**Branch:** `primitives-56-the-permission-nobody-used` · **Section:** §4b

A bound primitive draws one of four things depending on what its source
answered, and until today exactly one of the four was a region a tree could put
words in. The other three were the rows, a region for *nothing to report*, and —
when the source was down — one sentence of muted body text that the primitive
owned and nobody could add to.

That last one was not a design decision. It was an instrument's reach, written
down in the grammar of a design decision, and then copied.

## What shipped

**Four primitives gained a region.** `loom.feed`, `loom.trend`, `loom.voices`
and `loom.plate` declare `slots: ["empty", "unavailable"]`. A page whose data is
down can now draw a heading, a sentence and a way out, built from primitives the
library already had — rather than one grey line.

**The slot sits over the declared sentence, not instead of it.** Every tree
already stored renders byte-for-byte as it did; the fallback is the sentence
that was there. That is what makes this additive rather than a migration, and
it is asserted from both sides under both palettes.

**The audit is handed answers for the first time.** `library.test.ts` carries a
`BOUND_ANSWERS` map — three states for each of the four, two for `loom.tally` —
and decision 1 depends on it: without the answers the four new regions are
regions nothing places, and the audit says so correctly.

**Three assertions that did not exist**, and the last two are the point:

| assertion | what it catches |
| --- | --- |
| `unplacedSlots` empty, given the answers | a region declared and not drawn |
| `unplacedSlots` is **exactly** those four, given none | the fixture being deleted |
| every primitive with non-empty `reads` is a key in the map | a sixth bound primitive arriving unmeasured |

**And a second copy for a different mechanism.** Every member of
`BEHAVIOUR_NAMES` must have a declaring primitive, or the build is red. All five
are covered today.

## Why these, and not four new primitives

The findings queue sits ahead of the plan, and two entries in it were the same
fault with two mechanisms — both filed by `Loom lessons`, both owned here, both
long open.

**`adjust`** was built for `loom.before-after` on 1 September, named for that
primitive in 0096's own Context, and sat undeclared for twenty-eight days while
this repository held a finding marked *closed* saying so. It had in fact been
placed by the time this run read the entry; what had **not** been done was the
entry's third item, the check. So the entry was closed and the check written.

**`auditRegistry`'s reach** was widened on 23 September by 0185, which said in as
many words that whether a failure region becomes a slot is this lane's call,
*"made on the design rather than on what the instrument permits"*. Nobody made
it for sixteen days.

The library is at 107 primitives against a gap inventory of 110–120 and every
part of the catalogue already has two or more designs, so the axis still moving
is **reachability** — and this is four primitives' worth of it in the one state
a page most needs words for. A fifth new primitive would have been a thinner
thing than a region four existing ones could not offer.

## What was turned into what

Not a Hermes port, so the usual *fields → nodes* table does not apply. The
equivalent call, and it is the whole of 0246:

| was | is | why |
| --- | --- | --- |
| `text.unavailable` / `text.mismatched` | **still both**, as the fallback | 0060 keeps its job: a deployment has two strings to replace and a model is not asked to invent words for a failure it cannot see |
| nothing | an `unavailable` **slot** over them | 0051 — it is a region the primitive places, and only an instrument ever said otherwise |
| two failure answers | **one** slot | the difference between *did not answer* and *answered wrongly* is the author's, not the reader's; two regions would be the same copy twice |
| `loom.tally` | **no region** | 0242 — a leaf has no inside, and a tally is one figure rendered inline |

## The thing this run did not expect

**Two lessons' control lines stopped being zero, and both marks said that means
something is wrong.** Lesson 29 asserts `declared slots no component placed: 0`
and lesson 35 asserts `unplacedSlots: (none)`; both exercises call
`auditRegistry(registry)` with one argument, so after this change both report
four.

This was worth stopping on rather than pasting past, because two independent
guards fired on *"this mark does not cover it"*. What it means is not that a
primitive is broken — it is that **`unplacedSlots` was never a fact about the
library.** It was a fact about a library all of whose regions happened to be
reachable without an answer, and it read as the first thing for two weeks after
0185 made the second possible. Which is lesson 35's own subject, arriving in
lesson 35's own transcript.

Four edits in `lessons/`, forced, and one is a teaching paragraph rather than a
number. Declared in full in `FINDINGS.md` and summarised under *Cross-lane*
below, because the 2 October entry on lesson 32 is precisely this going wrong
quietly.

**The externally visible cost, stated plainly:** `auditRegistry(starterRegistry)`
with no answers now reports four primitives where it reported none. The report
is true about the states it tried and misleading about the primitives. Nothing
in the repository is broken by it — the portal, the CLI scaffold and
`behaviour.test.ts` all audit something else or pass answers — but it is a real
property of a published API that a caller can meet, and the fix is one field on
`RegistryAudit` in a lane that is not this one. Filed.

## Records

| record | status |
| --- | --- |
| **0246** — a bound primitive's failure region is a slot over its declared sentence | **Accepted** |

`Accepted` rather than `Proposed` deliberately: it touches no tree schema, no
delta model and no Accepted record. 0185 **delegated this exact call** to this
lane and 0180's restriction was already discharged without being superseded, so
making the call is following the records rather than widening them.

Index regenerated with `pnpm decisions:index`.

## Findings

**Closed**

- *2026-10-08 — the restriction 0185 discharged is still being written into new
  primitives* — items 1 and 2, which were this lane's. Item 3 (0185's deferred
  alternative, now past its five-primitive threshold) is `Loom daily build`'s
  and stays open.
- *2026-09-29 — `adjust` was built for `loom.before-after` twenty-eight days
  ago* — fully. Items 1 and 2 had landed; item 3 is 0246 decision 6.

**Filed**

- *two lessons' control lines stopped being zero* → `Loom lessons`. The forced
  edits, named one by one, and which sentence I most want them to rewrite.
- *a discharged permission has no consequence a suite can watch, unless
  something takes it up* → `Loom daily build`. `auditRegistry` knows which
  primitives declare `reads` and knows whether it was handed answers for them;
  a verdict saying so would have made this visible from the day 0185 landed.
- *the lane with an open pull request parked on a maintainer question now has
  two* → `@jonathanbravecredit`. See below.

## Two open pull requests from one lane, knowingly

`docs/routines.md` step 3 says a lane with an open pull request pushes onto that
branch. #548 is `Proposed — ARCHITECTURAL, needs review`, which is exactly what
`Loom merge` skips, so it does not land until the maintainer answers the
question under it. Pushing today's work there would park an unrelated change
behind an unrelated question indefinitely; the brief's escalation rule says
*build what does not depend on it*, and the file says the brief wins where they
disagree. Taken knowingly and filed rather than left to surface at merge.

**#548 was also un-blocked this run**, which was overdue. It was `dirty`: `main`
had moved to 0243 and **#547 landed its own 0241**, so that branch's record
number named a different decision — fatal under 0097. `main` was merged in, the
record renumbered **0241 → 0245** with a dated note (0244 is claimed by #555 and
#556), the index and API reference regenerated, and `pnpm verify` run green
before pushing. **Nothing the record decides changed and it is still
`Proposed`** — the question under it is still the maintainer's, and the number
was the cheap half.

## Cross-lane edits

Four, all in `lessons/`, all forced by a registered claim or a now-false
sentence, none discretionary:

| file | edit | forced by |
| --- | --- | --- |
| `29-readership.md` | `0` → `4` on the first control line, twice | the transcript test |
| `29-readership.md` | *"The three zeros"* → *"The two zeros"* | `claims.test.ts` counts that word |
| `29-readership.md` | an asterisk on *"Every promise the audit can observe is kept"* | the sentence became false |
| `35-instruments.md` | the exercise E fence, and the paragraph under it | the transcript test; the paragraph asserted the rule 0246 retired |

Both `moves:` marks were left alone — they now describe a world one step behind
and re-aiming them is their author's call, not a thing to do from this branch.

## Test numbers

`pnpm install && pnpm verify` — **green**.

```
Test Files  195 passed (195)      Tests  4355 passed (4355)    [package]
Test Files  412 passed (412)      Tests  7385 passed (7385)    [workspace]
```

Nothing was skipped and no test was weakened. One assertion was **added that
wants a red audit** — the converse check on `unplacedSlots` — which is the only
new test here whose job is to fail if a fixture is removed.

`pnpm verify` was also run green on `primitives-55-…` before that branch was
pushed: same 412 files, 7385 tests, after regenerating `reference.generated.json`
(a `merge=ours` file that drifted when `main` came in, exactly as its own
assertion predicted).

## Pictures

`the-words-a-failure-could-not-say.specimen.ts`, four shots, both palettes, both
viewports, **no overflow on any** (`scrollWidth 1280 / innerWidth 1280`;
`390 / 390`).

| | |
| --- | --- |
| `2026-10-09-primitives-failure-editorial-wide.png` | editorial, 1280 |
| `2026-10-09-primitives-failure-bold-wide.png` | bold, 1280 |
| `2026-10-09-primitives-failure-editorial-phone.png` | editorial, 390 |
| `2026-10-09-primitives-failure-bold-phone.png` | bold, 390 |

The sheet is **pairs, deliberately**. A column of authored failure regions would
photograph well and prove nothing; the claim is that the slot sits *over* the
sentence, so each row is one primitive, one answer, and two trees — left placed
nothing, right placed a region. If a later change ever made the slot replace the
sentence rather than cover it, the left column goes blank and the shot says so.

Shot with `--against origin/main` on the first pass: 4 of 4 differ, which is the
expected answer for a sheet whose right-hand column did not previously exist.
The run was repeated after swapping the region's link for a `loom.action`, so
the shots in `reports/` are from that second pass.

## What the library still cannot express

- **A bound primitive cannot be audited honestly by a caller who does not know
  to pass answers**, and nothing tells them. Filed against `Loom daily build`.
- **No bound primitive has a waiting state**, and `loom.waiting-state` is still
  unreachable from one on purpose: resolution happens before the walk, so by
  render time every binding is `ready` or `unavailable`. Unchanged, still right.
- **`loom.plate`'s answered state still cannot be photographed** without a
  network, so the one state of it this sheet does not show is the one with a
  picture in it. The standing image-placeholder gap, unchanged.
- **A failure region cannot say *why***. The tree's words are static; the
  `DataUnavailable.detail` the walk carries reaches the diagnostics and never
  the page. Probably correct — a reader is not owed a stack trace — but it is
  now a choice rather than an absence, and worth naming as one.
