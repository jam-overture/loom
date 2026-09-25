# 2026-09-25 — The claim that exists only once

**Landed:** [lesson 28](../28-corroboration.md) — *Corroboration: the claim that
exists only once*, the eleventh seam in Part V, and the answer to the question
lesson 27 ended on. Seven exercises, all executed; Set AG in the review
schedule; the syllabus row and the Part V narrative in `lessons/README.md`.
Roughly 45–60 minutes to work through, and closer to 75 if the Predict answers
are written properly, which is where most of the value is.

`pnpm install && pnpm verify`: **green, exit 0**, redirected to a file and read
by exit code rather than through a pipe. Runtime **3,029** tests across 159
files — `src/` was not opened. Application **5,865** across 306 files, measured
against `origin/main` at `be3e648`, which runs **5,863** across the same 306
files: **+2 tests, both in existing files**, which is one `it.each` row in
`run.test.ts` and one in `transcripts.test.ts`. **111 prerendered pages**, up
from 109 — `/lessons/28` and `/lessons/review/set-ag`.

## What the lesson teaches, and why this rather than course machinery

The brief allows alternating between a lesson and a piece of the surface once
`(lessons)/` exists. I took the lesson, for two reasons. The syllabus had one
question outstanding and it was a good one — lesson 27 ended on *when a decision
record argues for a behaviour and the code implements a default instead, what in
this repository would ever notice?* — and the course has now been bitten twice in
three days by the same shape: lesson 09's stale rung count, lesson 05's inverted
answer. Both times the repair built a check. Neither time did anybody write down
*what makes a thing checkable in the first place*, which turns out to be one
sentence with a lot underneath it.

**A check is a comparison.** Not an inspection, not an understanding — a
comparison, which needs two copies of one fact, mechanically reachable in the
same run. That sentence already exists in this repository, in the doc comment of
`app/(lessons)/_lib/claims.test.ts`, written by the run that built it. The lesson
is what happens when you take it seriously for eleven hundred lines.

The material is `decisions/`, because it is the purest specimen available: a
directory of pure argument, with six checks running over it on every commit, none
of which can tell you whether a record is true. Exercise B is the lesson in one
screen — five edits to 0002, one refused, and the refused one is the one that
changed *a digit appearing twice*. Retitling the record to the opposite of what
it decides is green.

**Where this sits in Part V.** The first six seams were a checker that could not
see far enough. 24 was one that saw and could not interpret. 25 was one that saw,
interpreted, and answered a narrower question than it was asked. 26 was a fact two
parties held and neither could compare. 27 was a fact one level down, behind a
promise. This one has no obstacle at all: the checker holds the whole file,
understands every character, is asked exactly the right question, and the question
has no second operand. That is a genuinely new axis and it is why the lesson
exists rather than being a note in a report.

The remedy is never to check harder. It is to arrange for a second copy, and the
three ways of doing that are in a strict order of preference the lesson makes the
reader derive: **derive it** (cheapest, catches least, nobody has to remember —
the generated index, 0015), **write it twice in a form that can disagree** (the
link, 0118 — costs a convention, and a convention can be overruled by a rule that
outranks it), **register it by hand** (`record-claims.test.ts` — reaches a
sentence, and its own completeness is what nothing checks).

## The second half, which the lesson found in its own exercises

This is the part I did not plan and it is the better half.

Exercise D reads every citation in the repository. The natural thing is to print
what it found — *1,272 citations, 635 of them links, across 169 records* — three
real numbers, all interesting. I wrote that version, ran it, and then worked out
what it would do: paste those into a markdown file and a lesson in a directory
nobody else owns goes red when somebody writes a decision record. Six routines
add three a day. On that rate it would have been red within a day of merging.

That is not hypothetical and the repository has it on file. The 22 September
finding from `Loom primitives` records three lesson transcripts edited from
outside this lane because the primitive library grew; the lessons were true, no
prose had moved, and the numbers were in transcripts. A transcript is a second
copy by construction.

So every exercise in this lesson prints a **verdict rather than a total**:

```
  records nothing cites: 0
  citations the checks refuse: 0
  written as a link, carrying two copies: more than a third of them
  written bare, carrying one: more than a third of them
```

*Every record is cited by something* survives the set growing and is still false
the day it stops being true. *One thousand two hundred and seventy-two* is a
claim about one afternoon. Exercise A, E and F went the same way — `holes, and
only holes` instead of eighteen, `the shortest one written is over a hundred
words` instead of 102, the one-way supersession named instead of the eleven
counted.

Which gives the lesson its general statement, and it is the thing I would most
want a reader to keep:

> **Manufacturing a second copy makes a claim checkable and makes it somebody's
> to keep true.** The bill goes to whoever moves the original — normally a person
> with no idea the copy exists.

That re-sorts the three sources for a reason better than "derivation is neat".
Derivation wins because it is the only one whose obligation is discharged by a
program rather than by somebody remembering.

## Every exercise executed

Seven exercises, written into `src/scratch.test.ts`, run with
`pnpm vitest run src/scratch.test.ts`, and the transcripts in the lesson are that
run's. The file was also typechecked by hand (`pnpm typecheck`, which reported
only the four pre-existing `@loom/runtime/*` resolution errors in
`src/cli/scaffold-fixture/`, and nothing from the exercise file). It was deleted
before committing.

The course's own runner then executed the whole Try it section as one program and
`transcripts.test.ts` compared all nine fences to it: **green on the first run
after the lesson was written**, with no drift to chase, which is what pasting
from a run rather than typing from memory buys.

Two things about the exercises that are new for this course:

- **They read the filesystem.** No lesson had done that before. The runner
  anchors a program at `src/scratch.test.ts` and resolves relative specifiers
  from there, so `../tools/decisions/citations.js` works for both the reader
  pasting into a checkout and the build. The one thing to avoid is
  `tools/decisions/collect.ts`, which uses `import.meta.url` — the sandbox
  transpiles to CommonJS. The preamble walks up from `process.cwd()` for
  `decisions/README.md` instead, which is right for `next build` running from
  `apps/loom` and for vitest running from the root.
- **Exercise D excludes the file it is written in**, because exercise C puts a
  citation of `0300` into that file on purpose. Left in, the census reported one
  more distinct record than exists — a check with its own fixture inside its
  population, which is the lesson's own subject arriving uninvited and is now a
  paragraph in it.

## What the exercises revealed

**Exercise E, which I wrote expecting nothing.** A supersession is written at
both ends in this repository — the old record says `Superseded by NNNN`, the new
one says `supersedes NNNN` — and that makes it one fact written twice in two
files, which is precisely the shape every other check here exploits. Eleven
directions are currently written. Ten are answered at the other end. One is not:
0109 says it was superseded by 0137, and 0137 says `Accepted` and never mentions
0109.

Nothing is broken — the README requires the *old* record to be marked and asks
nothing of the replacement. But the shape is the sharpest thing in the lesson:
**a convention followed ten times out of eleven is not a check, it is a habit,
and a habit's output is indistinguishable from a rule's right up until somebody
is in a hurry.** The tool's own test fixture for the quiet case writes the pair
both ways, by that same habit.

That is also the question the lesson hands to a twelfth seam, and it is the first
one in Part V that is not about a limit: *how much of this repository is already
corroborated by habit, and nowhere cashed in?* Finding one of those is cheaper
than designing a check, and it is the only kind of check that costs its authors
nothing, because they have already been paying for it.

**Exercise F, which I expected to be a formality.** A record must carry
`## Alternatives considered`; that is checked by name on every record. A record
with all four required headings and nothing whatsoever underneath them parses,
passes the shape check, and would sit in the index next to 0002. The shortest
*Alternatives considered* actually written here is comfortably over a hundred
words — which is a fact about the people writing records and not about the check,
and that distinction is Part V in one line. **The check establishes that somebody
was asked the question. It cannot establish that they answered it.**

**Exercise G's last two lines**, which are the lesson's ending. 0002's counted
sentence is held against `ESCALATION_LADDER` and a reworded version fails loudly
rather than quietly, which is why the registry asserts its pattern matches
*exactly* once. Two paragraphs above it, in the same record, is the argument for
two axes rather than one score — the sentence every disposition this runtime has
ever produced is downstream of. It is present. It is held against nothing. It
always will be.

## Found while teaching

Two, both filed in `FINDINGS.md` for `Loom daily build`, and **neither is a
defect in anybody's code**:

1. **Supersession reciprocity is unchecked** (`tools/decisions/numbering.ts`).
   Eleven directions, ten reciprocal, one not, and `checkNumbering` only asks
   whether the record named exists. Three options offered and none taken: check
   it (four lines beside `danglingIn`, but it turns a README-compliant act into a
   red build on five other lanes' branches, which is exactly what 0118 declined
   to do to `apps/loom`), write the asymmetry down in the README as deliberate,
   or nothing. **If nothing, the honest cost is that a second one-way
   supersession turns this lesson's exercise E red.** That is a lessons file and
   this lane will fix it, but it is better said here than discovered in a suite.
2. **`decisions/README.md` says a status is one of three things and the parser
   accepts any string** (`tools/decisions/record.ts`). `**Status:** Bananas`
   parses and goes into the generated index. The real statuses are more various
   than the README's sentence — several carry a qualifying clause of prose, one
   is accepted for half of itself and proposed for the other — and **those are
   good statuses**; the finding is that the README's sentence is the one thing in
   `decisions/README.md` that is measurably not true of `decisions/`. Recommended
   fix is the README, not a check.

**Nothing for another lane's behaviour.** `src/` was read and not opened.
`tools/decisions/` is well argued throughout, and the one thing in it that looks
like an omission — a bare citation checked only for existence — is stated as a
limit in 0118's *Consequences* before any reader could find it, which is the
better half of what that record is for.

**Still open from lesson 27, restated because it is this lesson's worked
example:** 0150 argues that being forced to state a chart's ceiling is a feature,
and the schema says `max?` with a default of `100`. The lesson now uses that pair
as the closing illustration — two copies of one fact in two files, disagreeing,
and nothing comparing them because nobody ever wrote down that they were copies
of each other. Not mine to fix and not filed again; lesson 27 filed it.

## This lane's own

**The transcript pin is now 111**, up from 102 — nine fences, and the comment at
`RECOGNISED_TRANSCRIPTS` now records why every one of them prints a verdict.
`syllabus.ts` said *five of the thirty-two sets* and there are thirty-three;
fixed, and it is worth noticing that it was a count in a doc comment with no
second copy anywhere, found by reading, in a file whose subject is that exact
problem.

**The open item from 24 September stands and I did not take it.** A *type
printed in a lesson* has drifted twice in two runs and neither a count nor a
transcript reaches one. This lesson explains precisely why — a fence holding a
type is one copy of a declaration that lives in `src/` — which makes it more
obviously the next piece of machinery than it was, and no cheaper. The honest
version is an extractor that compares a fence against a declaration rather than
against text; the bad version forces every lesson to print types in full.

## What is next

**A piece of course machinery**, on the alternation the brief allows, and the
type-fence check is the candidate with the clearest justification now that lesson
28 has argued for it in public. Second candidate, and cheaper: exercise E's
comparison belongs in `tools/decisions/` rather than in a lesson, and if
`Loom daily build` takes the finding it is a check this course helped write.

**Or Part V's twelfth seam**, on exercise E's question — a fact already written
twice by convention and nowhere compared. Candidates seen in passing while
writing this: a primitive's declared props against the props its component
actually reads; a composition's stated `max` against the magnitudes in it; a
lesson's *Prerequisites* list against the lessons its questions actually cite.
All three are two copies of one fact, and none of them is compared today.
