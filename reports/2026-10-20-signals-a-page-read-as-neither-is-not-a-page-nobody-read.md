# Reader signals — a page read as neither population is not a page nobody read

**Routine:** `Loom signals` · **Date:** 2026-10-20 (evening run) · **Branch:**
`signals-43-a-page-read-as-neither-is-not-a-page-nobody-read` · **Section:** §43
of [`docs/signals.md`](../docs/signals.md)

## What I completed

This morning's run published `AudienceScope` (0300) and closed with a note that
the refusal it makes is published and nothing downstream reads it. That note was
too mild. **The refusal is published as a nought that already means something
else**, and three readings derived from a page reading branch on that nought.

A page reading of a window holding two forms with none asked for puts every part
at `unknown` and its view floor at nought. A page nothing has opened does exactly
the same. What the two readings downstream printed:

```
readingChangeOf       silence  nothing-measured   one of the two windows held no page views
deploymentReadingOf   standing unread             nothing reported a view of this version
                      opened   1,000              ← the door sums both forms (0299)
```

**The deployment order's row contradicts itself**, and that is the part I would
want a maintainer to read twice. That order asks the door for each page's
arrivals, and the door answers a two-form window by **summing** it, because
arrivals are people (0297, 0299). So on fixtures of a hundred skiers and nine
hundred riders, handed in unsplit, the published row read *a thousand readers
arrived at a page nobody read* — both halves off one window. I reproduced it on
`main` before changing anything.

**`ReadingProgress` could not have told them apart, so this was not an oversight
downstream.** It carries `audienceId` — deliberately, for a stated reason — and
dropped `audiences`. `audienceScopeRead` needs both: a reading's `audienceId` is
`null` for a window that named one audience and for a window that named two, and
only the census separates them. The refusal was unreachable there.

- **`ReadingProgress` carries `audiences`**, from the page reading, unchanged.
  Additive, and the whole of what makes the rest possible.
- **`ChangeSilence` gains `audiences-mixed`**, taken off either side's own
  published scope and checked **before** the view floor, because the refusal is
  that floor's cause and a cause names itself better than its symptom. The parts
  census still stands, for `nothing-measured`'s reason: what a change did to the
  tree is read off the two trees and off no counter.
- **`RankStanding` and `MovementStanding` gain `unsplit`**, mapped in the
  silences table to `two-forms-unsplit` — the condition the funnel comparison
  brought this morning, now reported by a **page** as well as by a pair.
- **The arrivals stay published beside the refusal.** The honest row is *this
  many readers arrived; which of them read what is a question per form.*
- **`pageViewsFor` reads the rule from `audienceScopeOf`**, which closes the
  fourth and last of §42's joins and the finding filed this morning.

Record
[0301](../decisions/0301-a-refused-reading-is-not-a-page-nobody-read-and-the-census-travels-with-the-progress.md),
Accepted, nothing superseded.

## Decisions I took that the step did not specify

**The one thing the adoption must not adopt, which nearly moved a published
field.** The obvious way to take `audienceScopeOf` into `pageViewsFor` is to hand
`scope.audienceId` to the row it publishes. That changes behaviour: the scope's
`one` member fills a single-membered census in, so a deployment-wide reading of a
window holding one form today would have started publishing *a reading of that
form*. The door's own documentation already refuses that in so many words — *it
is what the asking named and never what the rows turned out to say* — and a test
written for 0299 catches it. So the scope decides which rows are read and
`where.audienceId` decides what the reading says it is of. That is not an
inconsistency in the type: the member collapses the two cases because the
readings that merely filter rows want them handled alike, and the door is the
only one of the four that publishes the field. Filed for the fifth reading, with
the question of whether `one` should carry *who decided* left open — one call
site is not evidence of a rule.

**Not adding a standing to the change order for `different-audiences`.** That
order puts every comparison silence but `different-trees` into `unread`, which
maps to the condition `no-view-reported`. I took `audiences-mixed` out of that
bucket and left `different-audiences` in it, because its argument is genuinely
different: a comparison of two known populations really does have nothing to
compare, in a way a full two-form window does not. Deciding it inside this unit
would have been two decisions in one record. Filed, open, mine, with the two
shapes it could take.

**Not touching `readingProgressOf`'s answer, only its census.** A progress
reading publishes no silence and needs none — *no runs and no steepest fall* is
right for both kinds of nought. Giving it a silence set would have put a
nineteenth vocabulary in the table to say what the two readings above it say.

**Rejecting the fix at the source, which was my first instinct.** Having
`pageReadingOf` publish a view floor of `null` rather than `0` when it refuses
removes the ambiguity where it is created. It is also a breaking change to a
field eleven readings and four comparisons divide by, it turns every one of them
into a null-handling question, and the first one that coalesces it to nought puts
the two meanings back under one spelling. The census answers the question without
moving a number.

**Editing one test in my own lane that I would otherwise not have touched.**
`silences.test.ts` records which silence set first brought each condition by
folding over the sets in **arrival order**. The before-and-after reading is one
of the first five, whose conditions are seeded in as already-reported, and
`two-forms-unsplit` was brought by the eleventh set this morning. So the seed
swallowed it and the eleventh set's declaration computed as empty — reporting
that nobody had ever brought it, which the test's own note says is the one fact
it exists to keep. Set arrival order was standing in for *(set, condition)*
arrival order. A declared condition is now credited to its declarer whichever set
reports it first; an **undeclared** one is in neither the seed nor the declared
list, so it still fails as the novelty of the first set to report it. That is the
guard that matters and it is unchanged.

## Records, findings and the plan

- **Added:** record 0301, Accepted. Nothing superseded. `pnpm decisions:index`
  regenerated.
- **Closed:** the `pageViewsFor` adoption filed this morning, with a note on the
  rule it turned up.
- **Filed, closed on filing:** the refused-reading-reported-as-unread defect, and
  the provenance fold, both written up because the first is a number somebody
  would have acted on and the second is the second instance in two days of one
  shape.
- **Filed, open, mine:** the change order's `different-audiences` mapping to
  `no-view-reported`.
- **Filed, open, `Loom portal`'s:** no screen draws `unsplit` or
  `audiences-mixed`. Three new members on three published unions, each with a
  sentence written for it.
- **`docs/signals.md`:** §43 written, a row added to the table of what is built,
  and the limit found in this lane's test method written down there because it is
  about the plan's method rather than about one test.

## Test numbers, and what they actually prove

`pnpm install && pnpm verify` green, exit 0. Figures below are from that run.

| | |
| --- | --- |
| Root suite | **233 files, 5,503 tests**, all passing |
| App suite | **343 files, 6,071 tests**, all passing |
| `funnel.test.ts` | 78 tests, up from 77 |
| `silences.test.ts` | 55 tests, up from 53 |
| `change.test.ts` | 39 tests, up from 35 |
| `deployment-change.test.ts` | 31 tests, up from 29 |
| `deployment.test.ts` | 28 tests, up from 23 |
| `progress.test.ts` | 23 tests, up from 21 |
| Findings ledger | 1,270 entries, 0 malformed |
| Prerender | 133 pages |

**Nothing was skipped. Two things failed on the way and neither was mine to
weaken.**

- `silences.test.ts`'s provenance fold, which is written up above and in the
  record, because what it caught is real: an old set adopting a new condition
  rewrites a record the test exists to hold.
- `extract.test.ts`, which wanted the API reference regenerated — three unions
  grew a member and `ReadingProgress` grew a field, so the published surface
  moved. It also showed me a doc comment whose record citation sat at the start
  of a line, so lifting the parenthetical left a bare `.` in the published
  signature. Reworded rather than un-cited.

**Twelve planted mutations, eleven caught, each run against the committed tree
with the source restored between runs:**

| mutation | caught by |
| --- | --- |
| don't refuse — a two-form reading is `unread` again | 3 tests |
| check the refusal after the view floor rather than before | 3 |
| withhold the door's arrivals on a refused reading | 1 |
| drop the comparison's refusal, so a mixed side is `nothing-measured` | 5 |
| withhold the parts census on a mixed side, as it is for two pages | 1 |
| drop the census from the progress, so the scope reads `one` | 5 |
| publish the scope's audience from the door, not the asking's | 1 |
| refuse at the door instead of summing a mixed window | 11 |
| map the comparison's refusal onto `unread` in the change order | 2 |
| map the page's refusal onto `no-view-reported` in the silences table | 2 |
| read the scope off the audience alone, census carried but unused | 3 |
| *refuse the mixed side before it refuses two known audiences* | **survived** |

**The survivor found a false claim, not a dead test — and it is a correction to
what this report said in its first draft.** I had written that
`audiences-mixed` is checked *after* `different-audiences` because two provable
populations outrank one unreadable window, and put the same sentence in the
member's doc comment, the record and the plan. It is wrong. `crossesAudiences`
needs an audience on **both** sides and a mixed side has none; a side that names
one and holds two forms in its census reads as `one`, because an audience asked
for always wins (0300). **The two states partition the window**, so the order
between them changes nothing and no test could have caught the swap.

The test I had written for that precedence was passing for the wrong reason —
its fixture named an audience on the mixed side, which made that side `one` and
the mutation a no-op. It is replaced by one that asserts the partition, which is
the true fact in the neighbourhood. The ordering that **is** real — the refusal
before the view floor — is caught three times.

That is twice in two days that a claim about the order of two guards turned out
to be unobservable, and both times the mutation that was supposed to prove the
order was the one that survived. The pattern worth carrying: **a guard ordering
is only a decision if a single window can reach both guards.** Write the fixture
that reaches both before writing the sentence that ranks them.

**A second method note, and it is a correction to this morning's.** This morning's
report said a test over a two-form window has to make the rows **collide**. True,
and insufficient. Every test of these three readings used a window of two forms
and asserted on the reading's own output, which is where the refusal is visible.
The faults here were in readings **derived** from that output, so the fixture had
to be built through the whole pipeline — counters to page reading to progress to
order — which is what `deployment.test.ts`'s own header already says it does and
why that file is where the headline case lives. A test that constructs a
`ReadingProgress` by hand cannot find this, because by hand nobody writes a view
floor of nought with two audiences beside it.

## Nothing reaches a reader

No payload field, no browser code, no column, no store, no new kind.
`broadcast.ts` is byte-identical to `main` and measures **6,477 bytes minified**
(esbuild, bundled, browser platform) — unchanged, because nothing in this change
is on that side of the wire. The thirty-second thing taken out of what this
subsystem already knows rather than collected.

Rule 4's budget is untouched and `browser-weight.test.ts` passes. **Nothing here
makes per-reader identity cheaper or dearer to add later:** every field added is
about a column a host wrote and an audience predicate Loom never sees, and an
`aud_` remains an opaque name for it.

## Another lane has a branch in the signal path

**#686**, *A project's key at registration, its snippet, and delivery from any
site (4c)*, touches `src/signals/broadcast.ts`, `src/signals/deliver.ts` and
`apps/loom/app/_lib/reader-signals/keys.ts`. I have touched none of those three,
so the two should not conflict; I am saying so rather than assuming it. Nothing
on that branch adds a decision record or edits `docs/signals.md`, so the
numbering and the plan are clear.

## Open questions

Three, each with a recommendation, none blocking. They are in the pull request
comment.
