# 2026-10-07 — The pair that is not a pair

**Chose a repair over a new lesson, and the brief decides it rather than my
judgement.** Two open findings owned by this lane say an existing lesson is now
wrong, and the brief puts that above the syllabus. The older of the two — 26
September, eleven days open — is the one where the framework lane had already
patched the transcript to keep `main` green and written *"the rewrite is yours,
and there is a better version of this section in it."* It was right about that.

**Landed:** [lesson 28 — *Corroboration*](../28-corroboration.md), repaired in
six places rather than the two the finding named, with its exercise E rebuilt
around a question that has a live answer again; Set AG's question 6 rewritten;
one finding closed and one filed.

Roughly **15–20 minutes** to re-work for someone who has done the lesson
before, and the lesson as a whole is unchanged in length and difficulty.
Exercise E is the only one that moves.

## What was actually wrong, which was more than was filed

The finding named two sentences. Reading the lesson for them turned up six
places resting on the same dead premise, and the two worst were not in the
finding:

| where | said | was |
| --- | --- | --- |
| The idea | "Nothing checks it … whether the record named agrees that the relationship exists is not asked" | `oneWayIn` asks, and blocks |
| The idea | "The rest of this section is what it looked like before that, left standing" | the rest of the section is about exercise F and has nothing to do with it |
| Exercise E | "Predict the number of lines under the second heading. Most people predict zero" | the answer is now zero |
| It could have been otherwise | "**Require a superseding record to name what it supersedes.** Not in any record" | it is 0193, taken the next day |
| Come back to this | "Ten pairs of records already write one fact twice. Nothing compares them." | twelve, and something does |
| Set AG, question 6 | "say why the first got a function and the second got nothing" | the second got a function |

**The third row is the real defect and no check could have found it.** The other
five are false statements, which is bad and is the kind of thing this course has
machinery for. That one is worse and is invisible: every sentence in it is true.
The exercise asks the reader to predict an empty list, tells them most people
predict it will be empty, and prints an empty list. **Generation before
instruction with a correct obvious answer is not a desirable difficulty, it is a
reassurance** — and it had been sitting in the lesson whose own subject is a
claim nothing can check.

That is worth stating as its own finding about the course, because it is a shape
rather than an incident: **cashing a habit in buys you a check and costs you the
measurement.** Every exercise in this course that measures an unenforced
convention is one decision record away from printing zeroes forever. Lesson 28's
closing section now says so, and that is the honest version of the question it
used to end on.

## What the exercise asks now, and why this question rather than a rewrite of the old one

The old exercise measured whether the convention was followed. That question is
closed for good — `checkNumbering` fails the build on a silent end, so the answer
is zero and cannot be anything else. The question one step along is not closed
and is better:

> A second copy makes a comparison possible. It does not say *which* comparison.

So exercise E now invents four pairs that exist in no file and puts each to the
check that guards the pairs that do. **Predict how many of the four it refuses.**
The executed answer is one:

```
  0001 superseded by 0002, and 0002 supersedes 0001: 0
  0001 superseded by 0002, and 0002 says only Accepted: 1
  each of the two says the other one superseded it: 0
  0001 says it was superseded by 0001: 0
```

Three things I emphasised, in the order they earn it.

**The two pairs it waves through are not the same kind of thing, and telling them
apart is the exercise.** The contradictory pair — each record claiming the other
superseded it — passes *deliberately*, and `oneWayIn`'s doc comment makes the
argument before the exercise was written: reading `supersedes` against
`superseded by` would make the check an opinion about English, and the fault it
exists to catch is the same fault whichever end wrote first. A reader who files
that as a bug has not read the comment. The self-referencing record passes
because nobody thought about it. **Same transcript line, `0` both times, and
completely different facts** — which is exactly the discrimination this course
is supposed to build and is why both are in one fence rather than one being
dropped.

**The hole is this lesson's own subject arriving inside the remedy.** The check
is satisfied when a second copy exists; a record naming itself satisfies
`referencesIn(named.status).includes(record.number)` because `named` *is* the
record. One file is accepted as its own corroboration, in the check built to
catch claims that exist only once. I did not plan that and would not have found
it by reading 0193.

**Existence is the cheap comparison and it is the one that gets written, twice in
one lesson.** Exercise D's closing line was already there — a bare citation
carries one fact, so the only property anything holds it to is that the record
exists, *and existence is precisely the property that was true of the eight wrong
ones.* Exercise E is the same sentence about a pair that carries two facts: the
property held is that the other end speaks. Both checks are real. Neither reads
the claim. That connection is now stated under exercise E and it is the best
thing the rewrite added, because it makes two exercises that read as separate
complaints into one argument.

## What the exercises turned up

Every line of the transcript was executed against this checkout in
`src/scratch.test.ts` before it was written down, and the file was deleted before
committing. Three things came out of running it.

- **The first version printed `supersession directions written: 14` and I took it
  out.** Fourteen is a second copy of a set that six routines add to, in the
  lesson that spends a section explaining why its own exercises print verdicts
  rather than totals. It now prints `more than ten`, which is exercise D's house
  style and survives the set growing. **I committed the lesson's own named
  mistake while rewriting the lesson**, and caught it by reading the fence rather
  than by any check — that is the course's standing advice about counts working
  exactly as it says it does, and it is why the line is worth the space here.
- **The self-reference needed the one-clause spelling to stay silent**, and my
  first write-up of it was wrong. If the superseding record also speaks, the
  pair is reported from *its* end, so the finding would have overstated the
  reach. What passes is a typo written once on a record whose replacement says
  only `Accepted`. The finding says so and says which half is caught.
- **`refusals()` had to filter by problem code.** `checkNumbering` runs four
  checks and two invented records produce gap and clash problems that have
  nothing to do with the question; an unfiltered count would have printed
  numbers that looked like answers.

## Found while teaching

**One, for `Loom daily build`.** Filed in `FINDINGS.md` as *a decision record can
corroborate itself, and `oneWayIn` is satisfied* — `tools/decisions/numbering.ts`,
nothing changed outside this lane.

Nothing on `main` is in that shape, no record is affected, and the repair is one
line. It is filed rather than fixed because `tools/` is not this lane's, and
**the lesson teaches it as it stands and does not need the fix** — if the hole is
closed, that transcript line moves from `0` to `1` and three paragraphs under it
change meaning, which `transcripts.test.ts` will say in this lane's own suite
rather than quietly. That is the arrangement working.

Nothing else. `src/`, `tools/` and `decisions/` are untouched. 0193 is right in
every particular and `oneWayIn`'s reasoning about what it declines to compare is
better than the sentence lesson 28 used to have about it.

## What I did not do, and the one thing that nearly went wrong

**The container's clone was five commits behind `main`** — local `main` and
`origin/main` both at `6686895`, with `41c65e9` the real tip. I read, edited and
ran a full green `pnpm verify` against the stale tree before noticing, and
`#534` — this lane's own previous pull request, which added the held-sentence
check — was among the five. Lesson 28 and `review-schedule.md` turned out to be
byte-identical across the gap, so the edits applied, but `FINDINGS.md` had grown
by 1,114 lines and `claims.test.ts` by 242. **The first verify is void and the
numbers below are from a second run on the correct base.** Worth a paragraph
because nothing in `docs/routines.md` says to check it and a green gate on a
stale tree reads exactly like a green gate.

**No new review set**, because no new lesson landed; the brief ties a set to a
lesson. Set AG is amended in place instead — question 6's premise was gone, and
its closing note pointed at a trap that no longer exists.

**No new counting claim registered.** The numbers in this lesson are now
deliberately verdicts rather than counts, which is the opposite move, and
`claims.test.ts` has nothing to hold.

## Gate

`pnpm install && pnpm verify` — **green, exit 0**, on a deleted `dist` and
`.next`, with the status written to a file as the last thing on its own line and
read in a separate command, per `docs/routines.md`. The completion notification
said exit 0 and so did the file; both were read, and the file is the one that
counts.

These four numbers are identical to the ones `#535` reported on 6 October, which
is the corroboration that the base was the problem and not the tree: the stale
run gave 183 / 3,906, 1,013 findings and 1,539 junctions, and every one of them
moved to `#535`'s figure once the correct base was underneath. **Exactly one
thing changed after this run started** — a single sentence of lesson 28's prose,
tightened while the `src/` suite was running. The only phase that reads a lesson
markdown file is `pnpm --filter @loom/app verify`, which had not begun, so the
398 files above read the committed text; `src/` cannot read that file at all. The
committed tree and the verified tree differ in nothing a check looks at.

| | this branch |
| --- | --- |
| `@jam-overture/loom` | 186 files / 4,022 tests — unchanged, `src/` was not opened |
| `@loom/app` | 398 files / 7,087 tests |
| findings ledger | 1,037 entries, 0 malformed (1,036 before this run's one) |
| `prerender:check` | 126 pages, 1,542 text junctions, 0 run together; 3 metadata conventions, 0 unserved |

**No test added, removed, weakened or skipped**, and no pin moved. The transcript
pin, the recognised-transcript count, the declaration census, the review-queue
length and the schedule's set list are all untouched: exercise E keeps exactly
one output fence, the lesson gains one Self-check question, and nothing about the
course's shape moved. No decision record — a lesson is not a decision, and
nothing in `src/`, `tools/` or `decisions/` is touched.

Scope is `lessons/28-corroboration.md`, `lessons/README.md` (the syllabus row),
`lessons/review-schedule.md` (Set AG), `FINDINGS.md` (one entry closed, one
appended), and this report. Nothing else, in or out of this lane.

## Why this pushed onto the open pull request

`#535` was open from 6 October with no comments on it but mine, and it edits
`lessons/README.md`. Extending lesson 28's syllabus row edits the same file, so
a second branch would have been two open branches from one lane touching one
file — which `docs/routines.md` step 3 names as the conflict a lane creates for
itself and hands to the maintainer at merge time. Pushed onto that branch
instead. The brief says to branch off `main`; where the two disagree the brief
wins, but the brief is describing the normal case and `docs/routines.md` is
describing this one, so this is not a case of overruling it.

It does mean `#535` is now two things: a one-line README repair and a lesson
rewrite. That is the cost and it is the maintainer's call whether it was the
right trade — flagged on the pull request rather than decided here.

## What is next

**Lesson 24's three one-field-short places**, filed 18 September and now the
oldest open defect in this lane: a `// →` comment showing `NodeCopy` without
`unspoken`, a file table missing `UnspokenCopy`, and a sentence saying two
branches are worth stopping on where there are three. No transcript breaks,
which is why it has survived nineteen days. It is small and should not wait
again.

**Then Part V's eighteenth seam**, with the two candidates 5 October named still
standing: a composition's stated `max` against the magnitudes inside it, and the
conformance probe's reach over a conditionally placed behaviour.

**The machinery is now three runs overdue** and I am not going to keep saying so
without saying why I keep not doing it: the piece 4 October proposed — a
build-time list of which marked fences changed since the last lessons run — is
tooling for *this lane*, not for the reader, and every time a lesson turns out to
be false the lesson wins. Two lessons are false right now. When that queue is
empty the machinery is the next thing.
