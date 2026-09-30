# 2026-09-30 — The section with no answer, and the one control it does not have

**Chose machinery, not a lesson, and this is the third run the alternation has
asked for it.** Lessons 29, 30 and 31 landed on the 27th, 28th and 29th. Each of
those reports names the same deferred candidate and the last one says out loud
that it is "two runs deferred". A fourth lesson would have been the fourth in a
row.

What landed is not that candidate either, and the reason is worth stating.
`transcripts.test.ts` having no way to say a block's red is *expected* is still
small, still true, and still a check on this lane's own markdown. Reading the
surface for it turned up something larger: **`lessons/README.md` names seven
principles the course is built on, and six of them have machinery behind them.
The seventh is elaboration, and `Explain it back` renders as prose.**

Thirty-one lessons have that section. It is a numbered prompt set — the same
shape as Warm-up and Self-check, which the surface has treated as questions since
August — and `parts.ts` fell through to the branch that renders anything it does
not recognise as the author's paragraphs. The section says *closed book* and, in
most lessons, *then compare*. Nothing on the page held the first and nothing was
in a position to offer the second.

**Landed:** `Explain it back` is a part of its own at `/lessons/NN`. Prompts come
one at a time, each takes something written before the next appears, and when the
last one is in, the reader is shown **what they wrote about the lesson this one
says it derives from**.

## The design decision I would defend hardest is a missing control

Every other input on this surface takes a confidence rating first, and that is the
whole argument for the surface existing: a rating given before the reveal is the
only calibration measurement paper cannot make. So the obvious thing to do with a
new input is to rate it.

This one does not, and it must not. A confidence is a prediction about an
**outcome**. An elaboration prompt has no outcome: there is no printed answer to
*explain the ladder to somebody who has written the OR-of-predicates version*
anywhere in this repository and there cannot be, because the words being asked for
are the reader's own. A number rated here could never be scored against anything,
so what it would actually measure is **how fluent the explaining felt** — which is
the illusion this course's own README opens by naming as the enemy.

A control that produces an unscoreable number is worse than no control, because it
looks like a measurement. So step 1 of `answer.tsx`'s four steps is absent for this
kind of question, the component says so on the screen rather than leaving a gap
where every other question has a row of buttons, and the reason is written into
`Explanation`'s doc comment in `progress.ts` — because a missing control reads as
an oversight until somebody writes down that it is a decision.

## What paper cannot do here, which is the reason it is stored at all

Requiring something written is a gate and gates are cheap. The part worth building
is the second half of the section's own instruction.

Thirty of the thirty-one lessons have a prompt reading *derive it from lesson 08*,
*lesson 03 told you operations are ordered*, *derive this lesson from lesson 01 and
lesson 14 without looking at either*. The comparison a reader wants at that point
is **not** against lesson 08's text — they can reread that whenever they like, and
rereading is the study method this course exists to talk them out of. It is against
**what they wrote about lesson 08 when they were in lesson 08**: the same model, in
their words, months older.

That document exists in exactly one place — the reader's own browser — so:

- the page cannot contain it, and no address could serve it, which makes it the
  first held thing on this surface whose source is not a route handler;
- it arrives **after** the writing and never before, because arriving before is
  reading your notes;
- and when there is nothing there, the section says **which** nothing it is.
  Never having written an explanation for lesson 08 and having written *I can't
  explain this yet* are different facts about the reader, and only the second is
  about their understanding. A blank would have said both. That distinction is
  lesson 24's, applied one floor down from where it is taught — the same move the
  empty-record readings made in September.

Finding lesson 08 in *derive it from lesson 08* means reading a sentence, which is
a guess, and it is deliberately a **second function** rather than a widening of
`referencedLessons`. A `*(04)*` marker is data the schedule writes for the queue,
exact by construction, and being wrong about one means grading a reader against the
wrong lesson. A prose mention is an author addressing a reader. Folding them
together would let the guess into the pointers; keeping them apart means the guess
is only used for the one thing it is good enough for, where a false positive costs
a paragraph of the reader's own words they did not ask for.

The guess is held to a **census**: 30 of 31 lessons have a prompt naming another
lesson, every lesson named is in the syllabus, and lesson 01 names none and cannot,
because there is nothing behind it. A prose parser that quietly stopped matching
would take the feature away in silence with every other test green, which is the
failure mode `transcripts.test.ts` and `claims.test.ts` were each written after
meeting.

## What I did not do, and why

**No second page-wide gate.** Predict locks the rest of the lesson because
everything below it is literally the answer to it. Self-check is not the answer to
`Explain it back`, so gating it on elaboration would be strictness for its own
sake, which is not the same thing as desirable difficulty.

**Explanations do not enter the corrections queue**, and `ELABORATION_PART` is a
constant in `slugs.ts` rather than a fourth member of `RECALL_PARTS` for exactly
that reason, with the reason written there. The queue brings back questions that
were **missed**, and a miss needs a right answer to be measured against. `try-it`
is excluded from that list for a neighbouring but different reason — it holds
predictions, which are answered and never graded — and the two reasons are worth
keeping apart.

**An explanation replaces rather than accumulates**, which is the opposite of a
correction's rule. Two goes at the same review question a week apart are two
retrievals and the count of them is the measurement; two goes at explaining lesson
09 are a document and an older draft of it, and merging two machines under the
append rule would leave the reader holding both with nothing able to say which was
which.

## Found while reading: the README was counting its own list wrong

`lessons/README.md` said *reading one there differs from reading the file in
exactly **three** ways* above a list of **four**, and had said it since the fourth
was added on 28 September. Every check in this repository was green throughout, and
they were right to be: no runtime list is being counted, so `claims.test.ts` had
nothing to hold it against. The count is of a list four lines below the number.

Which makes it [lesson 28](../28-corroboration.md)'s **first** remedy rather than
its third. There is no author to ask and nothing to register — the second copy
already exists, as the list itself — and what was missing was the comparison. So
`claims.test.ts` gains a second describe: it reads the number word out of the
sentence, counts the top-level items of the list that follows it, and requires them
to agree. The sentence now reads *five ways*, which is the four it always had plus
this run's.

It is deliberately not general. A pattern hunting for every *N things* in the
course would find the sentences counting a list, the sentences counting something
in `src/` — which is the registry it sits under — and the sentences counting
nothing, and would have to guess between them. Each entry is a sentence somebody
decided is counting the list under it.

This one is in this lane's own file, so it is **fixed rather than filed**.

## The file this lane could not have reviewed

`record.ts` holds the rules an import is allowed to have, and it is the most
consequential module in this directory: a merge that counts one retrieval as two
retires a question the reader has not earned. Its correction key joins six fields
with a byte that can occur in none of them — lesson 18's trick, and correct — and
that byte was written as a **literal NUL**. So `git` classified the file as binary
and printed `Bin 13206 -> 14798 bytes` in place of every diff of it.

Nobody had needed one until this run, which touched it. The literal is now
`"\u0000"`, which is the same string and the same key, and there is a
`.gitattributes` in this route group saying its sources are text — because fixing
the file fixes one byte and the attribute fixes the class. This is in this lane's
own directory and is the only change here that is not about elaboration; it is in
this pull request because without it the pull request cannot be read.

## Found while teaching

**Nothing for another lane this run.** No exercise was written, `src/` was not
opened except to typecheck against it, and the one fault found is the README's own,
above. The two findings lesson 31 filed for `Loom primitives` on 29 September —
`adjust` built for a primitive that does not declare it, and
`docs/primitive-gap-inventory.md` describing a Tier B that 0176 has already split —
are both still open and still theirs.

## Every change mutation-tested, and one mutation survived

Five deliberate breakages, introduced one at a time against the finished code, with
the files restored from byte-for-byte copies and `diff` clean afterwards:

| mutation | caught by |
| --- | --- |
| the comparison renders before anything is written | 7 tests, including the one asserting the earlier explanation is absent |
| the empty-answer filter dropped from the earlier explanation | the *which nothing is it* test |
| `Answer` waits for a rating an elaboration prompt never gives it | 6 tests |
| a prompt may point at its own lesson | **nothing — see below** |
| explanations accumulate instead of replacing | the round-trip test in `progress.test.ts` |

The fourth is the one worth the run's word. The fixture lesson was numbered **99**,
which is not in the syllabus, so its self-reference was being dropped by
`lessonPointer` returning `undefined` for a lesson that does not exist — not by the
filter the test claimed to be checking. Two different mechanisms produce the same
output, which is [lesson 25](../25-exhaustiveness.md)'s whole subject: a question
the checker was never asked and a question it answered yes both produce nothing.
The fixture is now numbered **09**, the self-reference names a lesson that exists,
and removing the filter fails with `expected [ 8, 9 ] to deeply equal [ 8 ]`.

The README count check was mutation-tested the same way: set to *four* against a
list of five and it reports the list's length in the failure message.

## Gate

`pnpm install && pnpm verify` — **green, exit 0**, on a deleted `dist` and `.next`,
with the status written to a file as the last thing on its own line and read in a
separate command.

| | this branch |
| --- | --- |
| `@jam-overture/loom` | 169 files / 3,327 tests — unchanged, `src/` was not opened |
| `@loom/app` | **338 / 5,879** |
| findings ledger | 897 entries, 0 malformed |

119 prerendered pages, 1,371 text junctions, 0 run together; 3 metadata
conventions, 0 unserved. No new route, so the page count does not move — this run
adds a section to a page that already existed.

**+56 tests**, in one new file and four existing ones. None weakened, none skipped,
none deleted.

Scope is `apps/loom/app/(lessons)/`, `lessons/README.md` and this report. `git diff
origin/main` is empty for `src/`, `decisions/`, `tools/` and every other route
group.

## What is next

**The machinery this run still passed over**, now three runs deferred and smaller
than it was: `transcripts.test.ts` cannot say that a block's red is expected, and
lesson 29's exercise C is the one block that has signed up for it.

**Or Part V's fifteenth seam**, on lesson 31's question rather than lesson 28's:
*what is the last moment at which this is still visible, and is anything checking
it there?* The two candidates lesson 31's report named are unchanged — a
composition's stated `max` against the magnitudes inside it, which has now been
carried for four runs, and the conformance probe's reach over a behaviour placed
conditionally.

**And one thing this run created rather than found.** `Explain it back` now stores
what the reader wrote, and nothing on the surface shows them the collection of it.
Thirty-one lessons' worth of their own explanations is the only document in this
course they are the author of, and there is no page for it. That is a real feature
and it is deliberately not in this pull request: it is furniture, this one is a
principle, and they should be reviewable apart.
