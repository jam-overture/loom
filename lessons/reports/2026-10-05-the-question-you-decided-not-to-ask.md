# 2026-10-05 — The question you decided not to ask

**Chose a new lesson over course machinery, and the reason is the syllabus rather
than a preference.** The `(lessons)` surface got four runs out of the last five —
the marked fence on 3 October, two repairs on 4 October — and Part V's
seventeenth seam had been named and deferred twice. Lesson 33 landed on 2 October
and nothing has been written since, so a lesson was the thing owed.

**Landed:** [lesson 34 — *Hindsight: the fact a witness saw and may not write
down*](../34-hindsight.md), the seventeenth Part V seam, with seven executed
exercises; Set AM; three new counting claims registered against `src/`; and one
finding for another lane, turned up by an exercise.

Roughly **55–70 minutes** to work through, on the long side for this course
because exercise D is four policies against two records and exercises E to G are
three readings of one construction at three distances.

## What it teaches, and why this seam is not the one lesson 33 predicted

Lesson 33 ended by sorting seams by *when the party that knows runs*: a fact
nobody owns needs an instrument, a fact one party owns and knows early needs a
declaration, a fact one party owns and knows too late needs somebody to come and
ask for it.

This seam has a fourth answer and that list cannot hold it. `assessStakes` ran at
**exactly** the right moment, held the whole `ChangeAnalysis`, got the level
right, and wrote it down; the answer is still on the record months later and
still correct. What cannot be answered is the question somebody asks afterwards —
*would this policy have changed anything* — because the level was recorded and
*how it was arrived at* is a function of a page three months of revisions behind
you.

So the obstacle is not reach, not interpretation, not a second store, not a
narrower question, not timing. **It is a rule the system wrote for itself about
what it is allowed to keep**, and the fact is on the wrong side of it. Six of the
analysis's lists name parts of a particular page, which is content, which 0023
keeps out of a record and always will. The fact is not inaccessible or unknown.
It is *forbidden*, by a property the system wants.

That makes the remedy the eighth, and the first in Part V that is a decision about
**questions** rather than about facts:

> Partition the rules by which ones are a function of what you *did* keep. Run the
> real rules over that half rather than a copy of them. Answer the rest by
> publishing the fact that you cannot.

Three things I emphasised over the obvious ones, in the order they earn it.

**The naive remedy is wrong on a population, not at a rate.** This is the lesson
and it is exercise B. The gap was filed as *add two optional fields and let a host
rebuild a `StakeInput` and re-run `assessStakes` itself* — the Gate's own
function, no copy. A caller doing that must supply six lists of specifics it does
not have, so it passes six empty arrays, and five of those six are the inputs to
`critical` rules. The transcript is the argument: the redesign comes back
`critical`, six rules, identical to the record — and the one-operation change the
Gate **refused** comes back `low`. Three rungs, in the reassuring direction, on
the only row somebody opens that screen to understand. A simulation that is
perfect about the changes nobody worried about and silent about the refusals is
not approximately right.

That is lesson 25's sentence from the other end. There: *a check is bounded by the
population of values that pass through the place it runs.* Here: a simulation is
wrong on a population, and the population is the one the feature exists for.

**A floor that happens to be right is still a floor.** Exercise E is one record
asked under two policies, and both answers are `critical` — one marked
`unreadable: protected-prop-configured`, one exact. If `unreadable` meant *this
number is wrong*, the mark there would be noise. It means something else, and the
lesson says it in as many words: **you are not entitled to believe this number.**
You cannot tell the two kinds apart by looking, which is the whole reason the
field exists, and a screen that suppressed the mark whenever the figure looked
plausible would suppress it exactly when it is working.

Exercise E's record is one field short and says so once; exercise G's is six
months older and says so in seven places, with `low` against a recorded
`critical` and zero factors. Setting those two transcripts beside each other is
the honest statement of what the field buys: it makes the shortfall
**representable**, not impossible to ignore. A caller that reads `level` without
reading `unreadable` turns exercise G straight back into exercise B.

**A missing field is sometimes provably harmless, and that is an argument rather
than a lookup.** `affectedNodeCeiling` is the best thing in this change and the
easiest to read past. Breadth is the one measuring rule whose input is a length,
and an old record does not carry it — but an insert or a remove contributes its
whole subtree to both the affected set and its own count, a move and a configure
contribute one node to both, and the affected set is a set, so the length can
never exceed the four counts added up. Under the ceiling, the rule *provably
cannot fire*. Exercise F is the two records side by side: 20 against a threshold
of 8 is unreadable, 1 against 8 is answerable anyway. That is the difference
between *we did not keep it* and *we do not need it*, and it is why the lever
answers over a journal written before any of these fields existed.

The connection worth having, and the one no part of this course had made: the
ceiling is lesson 28's **first** remedy — derive it — in the one place in this
lesson where the second copy was already lying around. Everything else here is
that lesson's second or third.

## What the exercises turned up

Every line of all seven transcripts was executed in `src/scratch.test.ts` against
this checkout before it was written down, and the file was deleted before
committing. Three things came out of running it that reading the record would not
have given me.

- **Exercise B needed two records, not one.** The first draft had one — the
  redesign — and it reproduced perfectly, because its criticality comes from
  `protected-type-removed`, a *measured* rule. The lie only appears on a change
  whose only critical rule is a fixed one. The two-record preamble is the whole
  exercise, and the version with one record would have shown the naive remedy
  working.
- **The partition comes out as a clean cut rather than interleaved**, which I had
  assumed was tidiness and is not. The two lists were one list, cut where the
  kinds change and *not reordered*, because `stakeFactorCodes` on a record is
  written in the order the factors came out — so reordering would change what
  every record already written means. The order is data. That is in the lesson
  under exercise A because the transcript shows it and nothing else would have.
- **Exercise D's right-hand column never moves, and that is the result.** I
  expected to have to apologise for it. An operator who loosens every knob in the
  policy and still reads `invention critical` has been told something true and
  useful — this refusal is not a consequence of how cautious you chose to be —
  and the screen says so without pretending to have simulated anything.

## Found while teaching

**One, for `Loom daily build`, with the same answer for `Loom portal`.** Filed in
`FINDINGS.md` as *a `GatePolicy` has fourteen fields and two places say
seventeen, counting something else*, and nothing outside this lane was changed.

Exercise A prints `Object.keys(gatePolicySchema.shape).length` to show a reader
how much of a policy a counterfactual can reach. It is **14**. `levers.ts` and
0215 both say *a policy has seventeen fields*. Seventeen is right about the number
of *dials* — the two removal thresholds counted separately, the four ceilings
counted separately, `policyId` excluded as a name rather than a setting — which is
the correct population for that screen. It is wrong about the word `fields`, and
`keyof GatePolicy` has fourteen members.

It is worth a line rather than a shrug for one reason: **lesson 25 is about this
repository's own `GatePolicy` list**, and what it taught was that
`keyof GatePolicy` is the derived second copy and a hand-written mirror is the
drift. A reader who goes to check seventeen against the schema gets fourteen and
has no way to tell which number is the mistake. The cheap fix is one word and it
is not mine to make; the finding says so and says the expensive one is not worth
it, because neither place renders the number.

Nothing else. `src/`, `tools/` and `decisions/` are untouched. 0215's partition —
the subject of the lesson — is right in every particular, and `remeasureStakes`
does what its doc comment says.

One observation for nobody in particular, recorded because this is how a finding
starts. `RemeasuredStakes` has no field for *the record names a measured rule I
cannot make fire*, and 0215's consequences require every caller to reproduce the
recorded verdict before believing a counterfactual. So every caller writes the
same three-line diff of `factors` against `summary.stakeFactorCodes`, which is
what exercise C does by hand. The portal already has the discipline, one step
earlier, from the ladder. It is not a defect and it is not this lane's to propose.

## What I added to the course's own checks

Three counting claims in `claims.test.ts`, all held against `src/`:

| phrase | held against | places |
| --- | --- | --- |
| `stakes vocabulary has (\w+) rules` | `STAKE_FACTOR_CODES.length` | 3 |
| `(\w+) of those rules read a field of the policy` | `MEASURED_STAKE_FACTOR_CODES.length` | 1 |
| `(\w+) are fixed at their code` | `FIXED_STAKE_FACTOR_CODES.length` | 1 |

The first is the one that earns its place: it is the same three positions —
the sentence stating the mechanism, the self-check, and the review set — that
lesson 09's ladder count was wrong in **twice**, about the list one level down
from this one. The day the Gate gains a fifteenth stakes rule, three sentences
and seven transcripts in this lesson go red together, which is why none of the
seven fences needs a `moves:` mark: a count that is checked in prose *and*
printed in a fence has no red to explain.

`NUMBER_WORDS` grew `thirteen` and `fourteen`, because the table stopped at
twelve and `wordFor` throws rather than guesses — which is the error message
inviting exactly this.

Three fences joined the declaration census: `StakeMeasurement` (nine members),
`RemeasuredStakes` and `RemeasuredFactor` (three each), all three printed whole
and therefore held whole from now on. `StakeMeasurement` is the one worth
printing: the nine facts *are* the contract, and the lesson's argument is that
the narrowing is which questions a record can be asked rather than an
abridgement for convenience.

The doc comment on that census said *the twenty fences this check reaches* and
there were twenty-two. It now declines to count, which is this course's own
standing advice where it reads naturally: the list below it is its own second
copy and a number beside it is a third that nothing compares.

## The mutations

Six, introduced one at a time against the finished files, restored from
byte-for-byte copies taken before the first, `diff` clean afterwards.

| mutation | caught by |
| --- | --- |
| exercise B's `rebuilt low` becomes `rebuilt medium` | `transcripts.test.ts`, naming lesson 34 |
| the lesson says *thirteen rules* | `claims.test.ts` — `expected 'thirteen' to be 'fourteen'` |
| the `StakeMeasurement` fence drops `affectedNodeCount` | the declaration census, as a row whose `members` moved 9 → 8 |
| the fence types `configuredPropKeys` as `readonly PrimitiveType[]` | `declarations.test.ts`, with both line numbers |
| Set AM loses question 9 | `schedule.test.ts` — the last set holds nine |
| Explain it back stops naming an earlier lesson | `elaboration.test.ts` |

The third is the one worth the lines it takes, and the first run of it was a
false green: filtered to the row named `StakeMeasurement`, the suite passed,
because the per-row comparison holds a fence to the members it *names* and a
fence naming eight of nine is an abridgement rather than a drift. What catches it
is the census, which is a different test with a different name — so the mutation
was only caught on the unfiltered run. That is the non-vacuity pin working exactly
as its own doc comment says, and it is a reminder that `vitest -t` is a worse
instrument than it looks when a file's checks are distributed across describes.

## Gate

`pnpm install && pnpm verify` — **green, exit 0**, on a deleted `dist` and
`.next`, with the status written to a file as the last thing on its own line and
read in a separate command, per `docs/routines.md`.

| | this branch |
| --- | --- |
| `@jam-overture/loom` | 180 files / 3,803 tests — unchanged, `src/` was not opened |
| `@loom/app` | 378 files / 6,786 tests |
| findings ledger | 997 entries, 0 malformed |
| `prerender:check` | 126 pages, 1,536 text junctions, 0 run together |

**No test added and none weakened, skipped or deleted.** Five assertions changed
on purpose and every one of them failed before the change and passes after, which
is the test for a pin being bumped rather than loosened:

| pin | from | to |
| --- | --- | --- |
| `RECOGNISED_TRANSCRIPTS` | 148 | 155 |
| the declaration census | 22 rows | 25 rows |
| `LESSONS_WITH_A_DERIVATION` | 32 | 33 |
| the review queue's length, and its last three letters | 38 · `AJ AK AL` | 39 · `AK AL AM` |
| the schedule's set list and its last set | … `AL` | … `AM` |

No decision record: nothing about the runtime, the tree schema or an `Accepted`
record is touched, and a lesson is not a decision. No new route and no new page —
`/lessons/34` and `/lessons/review` are the existing routes reading one more
file, which is why `prerender:check` gains two pages without this lane adding a
`page.tsx`.

Scope is `lessons/34-hindsight.md`, `lessons/README.md`,
`lessons/review-schedule.md`, six files under
`apps/loom/app/(lessons)/_lib/` (`claims.test.ts`, `transcripts.test.ts`,
`declarations.test.ts`, `schedule.test.ts`, `queue.test.ts`,
`elaboration.test.ts`), one appended `FINDINGS.md` entry, and this report.

## What no check reaches, stated rather than discovered

The lesson's central claim — that a simulation built on six empty lists is wrong
*about refusals specifically* — is held by exercise B's transcript, which prints
`critical` and `low` and nothing about which population those belong to. I can
rewrite the paragraph under it to say the opposite reading (*wrong at a rate,
which a wider sample would wash out*) and the lessons suite stays green. That is
the same residue 4 October's run reported and nothing here changes it:
`lessons/README.md` says so under *Two things it still does not reach*, and this
is its third instance. What is different from 2 October is that the three counts
this lesson argues from are now output *and* checked prose, so the drift this
course has actually suffered twice is closed on this lesson before it happens.

## What is next

**Part V's eighteenth seam**, and the question is now about the record rather than
about the party: *which questions did you decide you would never be able to ask,
on the day you chose what to write down?* Two candidates, both older than this
run. A composition's stated `max` against the magnitudes inside it — nine runs
deferred, and lesson 27 already has the argument for why nobody computes it. And
the conformance probe's reach over a behaviour placed conditionally, which is
lesson 29's instrument meeting lesson 31's closed set.

**Or the machinery, which is now two runs overdue.** The highest-value piece
remains the one 4 October proposed and declined to build: a build-time list of
which marked fences changed since the last lessons run, so that a drift is legible
to *this* lane rather than only to the lane that causes it. There are four marks
now and the rule behind them has been stated twice. The brief's alternation says
machinery next; I would rather it were that than a sixth transcript check.
