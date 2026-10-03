# 2026-10-03 — The red that was expected, and the comment on a passing assertion

**Chose machinery, not a lesson, and the alternation asked for it.** Lessons 32
and 33 landed on 1 and 2 October; the 30 September run was the last machinery
one. A third lesson in a row would have been the first time this lane spent
three consecutive runs away from the course's own plumbing, and the candidate
had been carried in five successive reports — first named on 30 September as
"three runs deferred", by 2 October as "five runs deferred and still true".

What finally decided it was not the age of the candidate. It was that the second
instance had arrived. On 30 September lesson 29's exercise C was the one block in
the course that had signed up for this; on 2 October lesson 33's exercise G
joined it, and the 2 October report said out loud that *two is the number at
which a convention is cheaper than a comment.* It is.

**Landed:** a lesson's transcript may now declare, in a line no reader will ever
see, that its red is expected — and the check prints that declaration at the
moment it fails.

## The thing that was actually wrong

Two fences in this course are deliberately a **second copy of a fact about
`src/primitives/`**, and in both cases that is the point of the lesson rather
than a cost it forgot to count:

- Lesson 29's exercise C prints the primitives with a declared prop nothing
  reads. That set *is* the lesson, so a new member of it is news.
- Lesson 33's exercise G prints which primitives have declared what they could
  not show. The answer is `(none)`, which is the state of play rather than a
  conclusion, and the lesson filed the change that will alter it for
  `Loom primitives`.

Both will go red the day another lane writes the thing the lesson describes, and
when they do the right response is to re-run the exercise and paste in what it
prints now — not to go looking for a mistake in `src/`. That distinction was
written down. It was written down in **two places, neither of which is the one a
tripping lane reads**:

1. Lesson 29 says it in a paragraph *under* its own fence. That is prose for the
   reader; the check cannot see it and nobody debugging a red suite is reading
   the lesson.
2. Lesson 33's was a sentence in the doc comment on `RECOGNISED_TRANSCRIPTS` in
   `transcripts.test.ts`. That constant sits on a **passing** assertion.

The second is the more interesting mistake and it was mine, eight days ago. The
failure a lane gets is `expect(tryIt.drifted).toEqual([])` in a test named *is
what lesson 33 actually prints*, and its whole content is an array of strings.
Nobody reads the documentation of a constant in a test that went green. What
they read is the message of the test that went red, and there was no message.

So the declaration moves onto the block it is about.

## What it looks like

```
<!-- moves: when Loom primitives gives loom.feed the `unshown` declaration 0206
     names, which this lesson filed for that lane. … -->

```
  loom.honest
  …
```
```

An HTML comment on the line above the fence. GitHub does not render one and
neither does `/lessons`, so it costs the reader nothing in either rendering of
the course — which is why that shape was chosen over a visible aside. And it
**travels with the block**: moving the fence to another lesson or deleting it
takes the mark too. A record in `transcripts.test.ts` keyed by filename, which
was the cheap version and is the shape `ANNOTATED` already uses, could not have
done that — it would have been a third copy, free to outlive the thing it
describes.

## A mark governs a fence, and the mutations made me resize a fence

The sharpest thing this run turned up is a constraint I did not see when I
designed it. A mark covers the **whole block** under it, and lesson 33's
exercise G printed ten lines in one block: six are two components answering —
`rows on the page: 11`, `what it told the walk: 11 of 12` — and only the last
three read the starter registry. Mutating one of the six reported it under the
mark, which is the worst thing this feature can do: a real drift in `src/`
dressed up as the expected one.

So the fence was cut to the size of the thing that moves. Lesson 33's exercise G
is two blocks now, and the mark is on the second. The lesson's own prose already
read the output that way — *"Then the last three lines, which are the state of
play rather than a conclusion"* — and lesson 31's exercise F split for a
comparable reason before marks existed, so this is a precedent followed rather
than a shape invented. `RECOGNISED_TRANSCRIPTS` is **148** for it. Mutating a
component line now reports as ordinary drift:

```
AssertionError: expected [ 'rows on the page: 12' ] to deeply equal []
```

Lesson 29's exercise C could not be cut the same way and was not. Its three
control zeros and its census are **one comparison** — the lesson's argument is
that the zeros are why the fourth line is worth anything — and the instruction
above the fence says *predict the number on the fourth line*. Splitting it to
suit a check would be the check spending the thing it exists to protect, which
is the trade `ANNOTATED` in this same file already declines to make. So its mark
names the lines it covers, says the three zeros are not among them, and the
failure message puts the judgement back on whoever reads it rather than
promising that the red is harmless:

> A mark governs the whole fence and not one line of it, so read what it
> predicted against what moved: if these are that, re-run the exercise and paste
> in what it prints now, and nothing is wrong with src/. If they are not, this is
> ordinary drift and the mark does not cover it.

That is the residue, it is one fence wide, and it is written down here and in
the file rather than discovered.

## The rule I would defend hardest is that it never makes anything pass

A marked fence that has drifted **still fails**. What changes is that the failure
leads with the author's own sentence about what was expected to do this and what
to do about it, and only then prints the lines.

An exemption here would be the one change to this file that could make the course
less true, and it would be aimed at exactly the wrong fences: the ones worth
marking are the ones whose content turns over. The brief's standing instruction
is that the app must not soften the course, and a check is part of the course.
This is the same rule applied to a test: the convention buys a **message**, never
a verdict.

## What it buys that a comment never could

The heuristic in this file reads a plain fence as a transcript only if at least
one of its lines appears in what the exercises printed. A transcript whose
*every* line has moved therefore looks like an illustration and is skipped **in
silence** — the known blind spot, survivable until now only because the
recognised count is pinned, which reports it as an off-by-one on a number.

A mark is an author stating that this block *is* a transcript. So a marked fence
that matches nothing is now a failure naming the lesson. The two mutations side
by side are the argument:

```
AssertionError: expected 146 to be 147 // Object.is equality
```

```
AssertionError: 33-shortfall.md: a fence marked "moves:" matched nothing these
exercises printed, so the comparison passed over it as an illustration. Either
every line of it has moved at once — which is what the mark is for, and what it
is here to stop happening in silence — or the mark is on an illustration and
belongs on the transcript instead.
```

Both of those are the same event. Only one of them can be acted on.

## The vocabulary is closed, and that is held

The parser accepts an HTML comment anywhere in a lesson and this surface draws
nothing for one wherever it lands. That is the hazard the construct creates: a
thing invisible in both renderings has mistakes that are invisible too, and the
entire value of a mark is that a lane which trips a red test can trust what it
says. A mark two blocks above its fence, a mark misspelled `moved:`, a mark left
behind by an edit that deleted the exercise under it — each reads as a live
declaration and governs nothing, and none of them would have failed anything.

So there is one form of note; it is read under `Try it` and nowhere else; and it
governs the untagged fence **directly** beneath it, with any other block between
the two clearing it. All three are enforced, one test per lesson. A declaration
that reaches nothing is this course's own lesson 23, and leaving one unread in
the machinery that teaches it was not an option.

The two marks that exist are also pinned by lesson number. Removing one is
otherwise invisible: the fence goes back to reporting its red as ordinary drift,
which is a worse message and a true one, so nothing else here would notice.

## What the mutations turned up

Nine mutations, introduced one at a time against the finished code, files
restored from byte-for-byte copies and `diff` clean afterwards.

| mutation | caught by |
| --- | --- |
| the marked fence drifts by one line | the `moves:` message, with the mark printed above the line |
| the marked fence drifts entirely | the *matched nothing* message **and** the pin |
| the mark removed | the census — `expected [ 29 ] to deeply equal [ 29, 33 ]` |
| the mark no longer directly above its fence | *governs the untagged fence directly under it, and there is none there* |
| the mark misspelled `moved:` | *the one note this course reads opens "moves: "* |
| a mark under `## Reflect` | *a note is only read under Try it* |
| notes reach the page builder | **nothing, first time round** |
| an unmarked line in a marked lesson drifts | the existing assertion, unchanged |
| a component line inside the marked fence drifts | **the mark, wrongly** — see above |

**Three of them are worth the lines they take**, and the last is the one that changed the design, above.

*The one that got away.* Removing `if (block.kind === "note") continue` from
`parts.ts` lets a note fall through into the prose accumulator, and a `held`
holding only a note flushes a prose unit whose fragment is empty — a blank gap
on the page where the author wrote an invisible line. Nothing caught it: 27
files, 467 tests, green. It leaves no text to search for, which is why the
`not.toContain` idiom the rest of that file uses could not reach it.

The test I wrote for it **also passed with the guard removed**, which is the
part worth recording. I had put the mark under a paragraph, so `held` already
had content and the unit count did not move. The hazard needs the layout the two
real lessons actually have — a mark alone between the program and the
transcript, with no prose either side to absorb it — and the fixture now
constructs exactly that, by removing the prose rather than adding to it. A test
for an empty container has to be given an empty container.

*The one that revealed the heuristic is sturdier than I thought.* My first
attempt at "the whole transcript has moved" rewrote every line of exercise G's
fence and the block was still recognised, because `shown` matches on
**substring**: `told the walk: 11 of 12` is inside
`what it told the walk: 11 of 12`. Total non-recognition takes a fence that
shares no fragment of any printed line. That makes the silent-skip blind spot
rarer than the pin's doc comment implies, and it does not make it less worth
closing — a census whose every row is a primitive name is precisely the shape
that can share nothing with its successor.

## Found while teaching

**Nothing for another lane.** No file outside `apps/loom/app/(lessons)/` and
`lessons/` was changed and none needed changing. `src/`, `decisions/`, `tools/`
and `FINDINGS.md` are untouched; `git diff origin/main` is empty for all of them.

One hazard found and closed inside this lane rather than filed, because it is
this lane's own file: **an HTML comment in a lesson used to parse as a
paragraph** and would have been drawn on the page as punctuation the reader has
to ignore — the exact outcome `markdown.ts`'s own module comment says a lesson
will fail loudly rather than produce. No lesson had one, so nothing had ever
shown it. It is a parsed-and-dropped block now, which is what made the mark
possible in the first place.

And one note for `Loom primitives`, which is not new and is not a finding: the
`unshown` line for `loom.feed` that 0206's consequences name is still theirs and
still open. When it lands, **both** marked fences may move, and the failure will
now say so by name.

## One count I left unheld

The paragraph added to `lessons/README.md` opens *"Two exercises in this course
print a second copy of a fact about `src/primitives/` on purpose"* and then names
both, in the same sentence. The count has a second copy four words later, which
a reader can check and `claims.test.ts` cannot, and the test file pins the pair
by lesson number anyway. Writing it without the number read worse than writing
it with one. Recorded here rather than left to be discovered, on the precedent of
lessons 22, 24 and 33.

## Gate

`pnpm install && pnpm verify` — **green, exit 0**, on a deleted `dist` and
`.next`, with the status written to a file as the last thing on its own line and
read in a separate command, per `docs/routines.md`.

| | this branch |
| --- | --- |
| `@jam-overture/loom` | 173 files / 3,560 tests — unchanged, `src/` was not opened |
| `@loom/app` | **361 / 6,437** |
| findings ledger | 952 entries, 0 malformed |

124 prerendered pages, 1,461 text junctions, 0 run together; 3 metadata
conventions, 0 unserved. No new route and no new page: this changes what a
failure says, and adds a construct the reader cannot see.

**+40 tests**, in three files that already existed — 34 in
`transcripts.test.ts` (one per written lesson, plus the census), 5 in
`markdown.test.ts`, 1 in `parts.test.ts`. None weakened, skipped or deleted.
`RECOGNISED_TRANSCRIPTS` moves 147 → **148**, for the one fence that was split
so that its mark covers only what moves; `RECOGNISED_ANSWERS` stays at **51**.
No line of any transcript changed, which is the first thing worth knowing about
a change that edits two lesson files.

No review set this run, and no syllabus row: no lesson landed, so
`review-schedule.md` is untouched. No exercise was written either, so there was
no `src/scratch.test.ts` to delete — every transcript in the course was executed
against this checkout's `src/` by the suite itself, which is what that file is
for and what it has been a build step for since September.

Scope is `apps/loom/app/(lessons)/_lib/`, two lesson files, `lessons/README.md`
and this report.

## What is next

**Part V's seventeenth seam**, on lesson 33's question, which is neither reach
nor ownership but timing: *when does the party that knows this run, relative to
the moment somebody needs to be told?* The candidates are unchanged — a
composition's stated `max` against the magnitudes inside it, now seven runs
deferred, and the conformance probe's reach over a behaviour placed
conditionally. Contrast ([0204], [0205]) is still the third and still reads
better as a second half for lesson 25 than as a seam of its own, for the reason
the 2 October report gives.

**Or the declaration check's second source root**, which lesson 32's run found
and neither of the two since has taken: `tools/` holds types two lessons now have
reason to print, and letting `declarations.test.ts` see them means answering what
happens when a name exists in both roots.

**And one thing this run created rather than found.** The mark is a channel
between lanes that only this lane can write to, and it currently carries one
kind of message. The next one it is obviously shaped for is *this fence is an
illustration, not a transcript* — which would let the recognised-count pin stop
being the only thing standing between the course and a silently skipped block,
rather than being backstopped by it for two fences out of 147. I have not built
it, because no fence has asked for it yet, and a vocabulary that grows ahead of
its users is the thing this file's own doc comment warns about.
