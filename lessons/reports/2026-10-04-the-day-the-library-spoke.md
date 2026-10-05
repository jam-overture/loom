# 2026-10-04 — The day the library spoke, and a repair that missed its own merge by nineteen minutes

**Second report of the day, and it exists because of a race rather than a plan.**
The morning's run repaired lesson 32 — a transcript whose numbers had been corrected
from outside this lane on 2 October with the paragraph under them left asserting the
opposite — and opened #508. Then the same failure mode arrived again, on lesson 24,
and this is that repair.

It is a separate report and a separate pull request because **#508 merged while this
work was in progress.** The sequence, from the primary sources rather than from
memory:

| time (UTC) | what happened |
| --- | --- |
| 15:54 | #508 opened on `8580784`, lesson 32 only |
| 16:43 | `Loom merge` merged `main` into the branch as `38161c7` |
| 16:43:57 | **#508 merged to `main`** at that head, squashed as `ab57b95` |
| ~17:00 | lesson 24's repair pushed to the same branch as `b7078cc` |

The two middle rows are nineteen seconds apart and I read them in the wrong order:
the base merge arrived as a push event, the merge-to-`main` arrived as an event I did
not read until after the second push. So the lesson 24 work was committed onto a
branch whose pull request was already closed, which cannot track it. The remedy is
the one the harness states and `docs/routines.md` implies: **a merged pull request is
finished.** This branch is a fresh one off `main`, carrying that commit, and nothing
was force-pushed or rewritten — `lessons-32-the-number-moved` is merged history now
and stays as it is.

**What I would do differently** is read the queue before pushing rather than after.
The mistake was cheap here because the work was additive and `main` had moved only in
ways that cherry-pick cleanly. It would not have been cheap on a branch somebody else
was reviewing.

## What was wrong on `main`

#503 landed the `copy` declaration pass — 102 declarations and one `role` — and did
with lesson 24 exactly what `Loom daily build` had done with lesson 32 the day
before: re-ran the exercise, pasted in the lines that moved, **touched no prose**, and
filed the contradiction rather than rewriting another lane's teaching. That is the
convention and it is right. So `main` read:

| | |
| --- | --- |
| the transcript | `declaring copy:            102` |
| three paragraphs under it | *Zero and zero* · *`words` is empty* · *the third field is a promise kept against a day that has not arrived* |

Two instances of one failure mode in three days, from two lanes, both handled
correctly by the lane that moved the number. The second instance is what turned the
morning's one-off mark into a rule, below.

## The repair is the better half of the lesson's own argument

Lesson 24 shipped on 13 September describing a seam nothing had used yet. The three
stale paragraphs are not replaced with corrected numbers; they are replaced with what
the numbers now let the lesson say:

- **The return shape did not have to move.** The fields were designed for a library
  that had told them nothing. On the day the library spoke, the honest gap became the
  answer *in place* — `words` went from empty to the eight words the band shows,
  `unread` from naming every node and prop to `none`, and not one field changed. That
  is the strongest claim available for a result type and **it could not be made until
  it happened.** A shape that is only right once the data arrives is a shape somebody
  has to replace on the day it arrives, and that somebody is whoever happens to be
  doing the pass, in a lane that does not own the seam.
- **The figure that matters is not 102.** Exercise F now also prints **58** — the
  declarations that are `copy: []`, a primitive saying *I show no words of my own*.
  That is the half that pays, because a reading cannot tell an arrangement holding no
  words from one that forgot to declare, so a single undeclared `loom.stack` puts a
  whole page's reading in doubt. Declaring the absence is what makes the presence
  worth anything.
- **`unspoken` has a live example in the lesson for the first time.** A second
  reading, of `proof-faces`: its `loom.rating` declares `score` and its component
  prints that number itself, so the reading hands over the sentence beside the rating
  — *on G2, from 214 reviews* — and declines the rating. Sixteen days from
  [0169](../../decisions/0169-a-declaration-is-what-makes-a-value-a-missing-word.md)
  adding the field to anything in this repository being able to produce it, and the
  lesson says so, because the field was argued for, had its cheaper one-line form
  rejected, and was built and shipped for a day that had not arrived.
- **Two kinds of empty, which the lesson could not distinguish before.** `copy` was
  waiting on a library. `role` is waiting on a *reason* — 0114's bar for widening that
  vocabulary is a consumer that cannot answer its question, and nobody has brought
  one. In a count they are the same number.

**Exercise G's line three is the sharper repair of the two.** It printed *Untitled
page* before and prints *Untitled page* now, and everything underneath has changed.
Then: the starter library's answer was the empty array, so swapping a hard-coded array
for a registry question would have named every page in the repository *Untitled page*.
Now: the array holds `loom.heading`, the swap is finally the improvement it always
looked like, and the line still reads *Untitled page* because this page's heading is
`acme.hero` — a type the starter library has never heard of. **A registry question is
only as good as the registry you ask it of**, and the hard-coded array was never wrong
about `loom.heading` either. So the lesson now tells a reader whose prediction was
right to check their *reason*, which is the one case where a correct answer is worth
interrogating.

The lesson's general-form paragraph — *replacing a local guess with an authoritative
source is a regression until the authority has been told* — needed no repair and gains
one sentence: this instance is out the other side of that *in between*, which is the
only way such a rule gets confirmed rather than merely believed.

## What the exercises turned up

Every line was executed in `src/scratch.test.ts` against this checkout and the file
deleted before committing. Two things came from running rather than from reading:

- **The finding's paste was accurate and I did not take its word for it.** Re-running F
  reproduced all seven lines. What it also gave me was the `copy: []` count, which is
  not in the finding and is the number the repaired lesson actually argues from.
- **`proof-faces` is not the only live `unspoken`.** The finding suggested it; probing
  all 52 starting compositions found `hero-split` as well, with two `loom.meter`
  values. I used `proof-faces` because one node reads better than two, and the words
  it *does* return make the point sharper than a bare gap would: the caption about the
  rating comes back and the rating does not.

## The fourth mark, and the rule the second one forced into the open

Lesson 24's fence is marked, which makes four. Writing a second mark in a day made the
criterion statable, and it is now in `transcripts.test.ts` and `lessons/README.md`
rather than in one run's head:

| reason | fences |
| --- | --- |
| **an expected red** — the set printed *is* the lesson's subject, so a new member is news | 29, 33 |
| **load-bearing prose** — correcting a line of it is not the whole repair | 32, 24 |

That second row is also why **lessons 22 and 23 have no mark** though their fences pin
the size of the library too: their prose declines to lean on the number, deliberately
and in as many words. The rule is *a fence wants a mark when correcting a line of it is
not the whole repair*, which is a better rule than *when its red is expected* — the one
I had after the first two marks, and which would not have predicted either of this
week's two incidents.

**It still buys a message and never a verdict.** A marked fence that has drifted fails.
A lane that pastes in a corrected line and says nothing still leaves the paragraph as
stale as it was; the mark makes the obligation legible, not automatic.

## Found while teaching

**Nothing for another lane.** `src/`, `tools/` and `decisions/` are untouched. One
`FINDINGS.md` Status line is edited — the 4 October entry from `Loom primitives`,
owned by this lane, closed naming this pull request — and nothing else in the ledger
moved.

One observation rather than a finding: `role` now has exactly one declaration, and the
lesson describes that as waiting on a reason rather than on a library. If that bar
should come down, the argument belongs to `Loom primitives` and 0114, not to a lesson,
and nothing here asks for it.

## What no check reaches

Unchanged from this morning's report and worth repeating because this run is its second
instance: **a paragraph that contradicts its own transcript fails nothing.** Both of
this week's incidents were green suites. The mark makes the next one legible to the
lane that causes it; it does not make prose checkable, and nothing in this course does.

## Gate

`pnpm install && pnpm verify` — **green, exit 0**, on a deleted `dist` and `.next`,
with the status written to a file as the last thing on its own line and read in a
separate command, per `docs/routines.md`. Run on this branch, off `main` at
`f79e1d9`, after the cherry-pick.

| | this branch |
| --- | --- |
| `@jam-overture/loom` | 180 files / 3,803 tests — `src/` was not opened |
| `@loom/app` | 378 files / 6,776 tests |
| findings ledger | 996 entries, 0 malformed |
| `prerender:check` | 124 pages, 1,536 text junctions, 0 run together |

**No test added and none weakened, skipped or deleted.** One assertion changed on
purpose: the marked-fence census, `[29, 32, 33]` → **`[24, 29, 32, 33]`**, which failed
before the mark and passes after. `RECOGNISED_TRANSCRIPTS` stays at **148** — the fence
gained two printed lines and is still one block, which is honest here because every
line in it is a second copy of a fact about `src/primitives/`.

No new lesson, so no new review set. Two questions in `review-schedule.md` are
**rewritten** — Set AC's 7 and 8 — because both asked the reader to recite a claim the
declaration pass falsified, and lesson 24's own self-check question 7 for the same
reason. No decision record: nothing about the runtime, the tree schema or an `Accepted`
record is touched.

Scope is `lessons/24-silence.md`, `lessons/README.md`, `lessons/review-schedule.md`,
`apps/loom/app/(lessons)/_lib/transcripts.test.ts`, one `FINDINGS.md` Status line and
this report. **This morning's report is not edited**, because it is accurate about what
#508 landed and a report is never overwritten.

## What is next

**Part V's seventeenth seam**, on lesson 33's question about timing: when does the
party that knows this run, relative to the moment somebody needs to be told? The
candidates are unchanged and now nine runs deferred for the first of them — a
composition's stated `max` against the magnitudes inside it, and the conformance
probe's reach over a behaviour placed conditionally.

**And one thing this week has earned.** Two lessons were falsified in three days by
other lanes doing the right thing, and both were found by a person reading rather than
by a check. The marks make the next one legible at the moment it happens. What they do
not do is tell this lane that it happened — a lane that pastes a line and says nothing
is still the failure mode, and the obvious next mechanism is a report, not a test: a
build-time list of *which marked fences changed since the last lessons run*, which this
lane would read first every morning. I have not built it, because two incidents is
where a rule gets stated and three is where it gets automated.
