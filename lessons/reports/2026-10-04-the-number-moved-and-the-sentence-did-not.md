# 2026-10-04 — The number moved and the sentence under it did not, twice

**Chose repairs, and they outranked the seventeenth seam.** There was a lesson on
`main` contradicting its own printed output, filed on 2 October by
`Loom daily build` and owned by this lane. The brief's rule is that fixing a lesson
that has become wrong beats writing a new one, and this is the wider reading of
that rule: a `Superseded` record is one way a lesson goes stale and a test somebody
else wrote is another.

**And then it happened again, in the middle of the run.** #503 landed the `copy`
declaration pass while this branch was open, did exactly what the framework lane did
on 2 October — re-ran lesson 24's transcript, pasted in the new lines, touched no
prose, filed the contradiction — and `main` spent the afternoon reading *"Zero and
zero"* under a transcript saying `declaring copy: 102`. The second half of this
report is that repair. Two instances of one failure mode in three days, from two
lanes, both handled correctly by the lane that moved the number.

Lesson 24 was deferred at first and the reason was stated on the pull request: this
branch's base had the old `src/primitives/`, so lesson 24's transcript here still
printed `0` and its prose matched it. `Loom merge` then merged `main` in at 16:43,
which removed that blocker, so the repair was done on this branch rather than left
for tomorrow — which is what `docs/routines.md` asks for anyway: push onto the branch
you already have open.

It also turned out to be the better lesson. The fact that falsified the paragraph
is more interesting than the one it displaced, and it connects lesson 32 back to
lesson 05 — which no part of this course had done.

**Landed:** lesson 32's exercise G rebuilt, its conclusion rewritten, the claim
that rotted turned into output, and a `moves:` mark on the fence carrying the
message that 2 October had nowhere to put.

## What was wrong

Exercise G reads `tools/specimen/` and prints which DOM reading faculties appear in
which file, what the harness hands to a browser, and what the one suite driving it
does with that. On 2 October `#476` added a unit test for `readBoxes`, the exercise
went red, and the framework lane did the right thing twice: it corrected the three
lines that had moved, and it did **not** touch the paragraph under them, filing the
contradiction instead rather than authoring another lane's curriculum.

So `main` carried:

| | |
| --- | --- |
| the transcript | `getBoundingClientRect  …  specimen.test.ts true` |
| the paragraph directly under it | *No DOM reading API appears in the suite at all.* |

For two days, this lesson's own output was the thing that falsified it.

## What the repair actually teaches

The new fact is not *the suite got better*. It is this:

> **`In the page` against `in Node` was never where the line falls. What a
> function reaches for is.**

`measureDocument`, `readClippingBoxes` and `pinNavigation` take **nothing** — each
fetches `document` or `window` itself, so a double has nothing to hand them and the
only thing it can do is answer in their place. `readBoxes` takes
`elements: Element[]`. It is handed what it reads, so a test hands it six numbers on
an object literal cast to `Element` and the real loop — the one that ships to the
browser — runs in Node.

That is **lesson 05's injected clock**, eleven lessons later, in a measuring
instrument, not announcing itself. Nothing here was made testable by trying harder.
A signature decided it.

Three further things the exercise now prints, in the order they earn their place:

- **Two doubles, not two attempts at one thing.** The `page.evaluate` double returns
  a reading somebody typed and discards the function; the `evaluateAll` double
  returns `body(...)`. Both are correct, because what each is handed differs in
  whether it *can* be run here. The transcript prints both return expressions off
  the suite rather than describing them.
- **The function the suite names is not the function it runs.** `pinNavigation` is
  the only one named in the suite's code — the double journals
  `evaluate ${body.name}` — and it is one of the three that cannot be run.
  `readBoxes` is named in the suite's code nowhere, only in a doc comment, and it is
  the one that executes. *Named* and *run* are independent here and distributed
  opposite ways round, which is lesson 29's own mistake in a new coat.
- **The thesis is untouched, and the lesson says so rather than implying it.** What a
  test can now reach is what `readBoxes` does *with six numbers it was given*. Where
  those numbers come from is exactly as unreachable as before. And the three
  fetching functions are, between them, where every rule that makes this instrument
  good lives — the walk, the stop condition, the text range, the out-of-flow skip.
  The one that became testable is the shortest of them and contains no rule at all.

## The first column is a classification now, and that is the mechanism half

The old first column was `true` or `false` and the paragraph did the interesting
work in prose: *the `clientWidth` on the `capture.ts` row is in a doc comment —
a sentence, not a call.* That hand-classification is what went stale, so it is
printed instead: `in code`, `in prose` or `no`, derived by stripping the comments
and looking again. The claim that was wrong is now output, and output drifts loudly.

**And the derivation immediately found something the hand-written version had been
wrong about since the day it shipped.** The old paragraph accounted for one prose
sighting on the `capture.ts` column. There are two — `getBoundingClientRect` is in
that file as well, in the note saying layout is fractional. Nobody noticed and
nobody could have. A sentence that enumerates can be incomplete, and the cheap
defence is to stop enumerating by hand.

## The third mark, and why it is not the same construct as the first two

`transcripts.test.ts` grew `moves:` marks on 3 October for fences whose **red is
expected** — two second copies of `src/primitives/`, both waiting on the same lane.
This is the third and the first that is not about `src/primitives/`. Its reason is
different and worth separating:

- Marks one and two exist so an expected red is not mistaken for drift.
- **Mark three exists so that a lane correcting a line is told the prose under it is
  load-bearing.** That is the half of 2 October no file said anywhere: the number
  moving was handled correctly and the sentence was left behind, because nothing
  told anybody there was a sentence.

The pinned census moves `[29, 33]` → **`[29, 32, 33]`**. `RECOGNISED_TRANSCRIPTS`
stays at **148**: the fence is still one block, and it is honest as one block
because *every* line in it is a second copy of another lane's files — there is
nothing in there that moves for nobody, which is the condition the 3 October run
established for a mark covering a whole fence.

**It buys a message and never a verdict**, and the limit is written down in the
lesson and in `lessons/README.md` rather than left to be discovered: a lane that
pastes in a corrected line and says nothing leaves the paragraph as stale as it was.

## What the exercises turned up

Every line of the new transcript was executed in `src/scratch.test.ts` against this
checkout before it was written down, and the file was deleted before committing.
Two things came out of running it that reading would not have given me:

- **The old program under-reported by one.** It looked for `evaluate(name)`, and
  `readBoxes` goes to the page through `locator.evaluateAll(fn)`. So the fourth
  function had been invisible to this exercise since the day it arrived — the
  transcript said *of those, handed to `page.evaluate`: 3* and was true about the
  question it asked. The exercise now asks which of the two routes carried it, and
  the route turns out to be the thing that matters: `evaluateAll` is the only one
  whose double can run what it is given.
- **`top-level functions in playwright.ts: 11` counted consts, one of which is a
  string.** Relabelled to `top-level consts`, same number, no longer slightly false.

## The second repair: lesson 24, and the day the library finally spoke

Lesson 24 shipped on 13 September describing a seam that nothing had used yet. Its
exercise F printed two zeroes, and three paragraphs rested on them: *`words` is
empty — the same empty a caller would have got before any of this existed*,
*`unread` has six entries naming every node and every prop involved*, and *the third
field is a promise kept against a day that has not arrived.*

The day arrived. Every line of that fence is different now, and the repair is **not**
a number bump — it is the lesson getting the better half of its own argument:

- **The return shape did not have to move.** The fields were designed for a library
  that had told them nothing; on the day the library spoke, the honest gap became
  the answer in place. That is the strongest thing that can be said for a result
  type and it could not be said until it happened. A shape that is only right once
  the data arrives is a shape somebody has to replace on the day it arrives — and
  that somebody is whoever happens to be doing the pass, in a lane that does not own
  the seam.
- **The interesting figure is not 102.** It is the line the exercise now also prints:
  **58 of those declarations are `copy: []`**, a primitive saying *I show no words of
  my own*. That is the half that pays, because a reading cannot tell an arrangement
  that holds no words from one that forgot to declare, and one undeclared
  `loom.stack` puts a whole page's reading in doubt.
- **`unspoken` has a live example for the first time**, and the exercise now prints
  it: `proof-faces`, a starting composition, whose `loom.rating` declares `score` and
  whose component prints that number itself. The reading hands over the sentence
  beside the rating — *on G2, from 214 reviews* — and declines the rating. Sixteen
  days from 0169 adding the field to anything in this repository being able to
  produce it. I found it by probing all 52 starting compositions rather than by
  taking the finding's word: `hero-split` is the other one, with two `loom.meter`
  values.
- **Two kinds of empty, which the lesson could not distinguish before.** `copy` was
  waiting on a library. `role` is waiting on a *reason* — 0114's bar for widening
  that vocabulary is a consumer that cannot answer its question, and nobody has
  brought one. The lesson says that now, because the two look identical in a count
  and are nothing alike.

**Exercise G's line three is the sharper repair of the two.** It printed
*Untitled page* before and prints *Untitled page* now, and the reason underneath has
completely changed. Then: the starter library's answer was the empty array, so
swapping a hard-coded array for a registry question would have named every page in
the repository *Untitled page*. Now: the array holds `loom.heading`, the swap is
finally the improvement it always looked like, and the line is still *Untitled page*
because this page's heading is `acme.hero` — a type the starter library has never
heard of. **A registry question is only as good as the registry you ask it of.** So
the lesson now tells a reader whose prediction was right to check their *reason*,
which is the one case where a correct answer is worth interrogating.

The lesson's general-form paragraph — *replacing a local guess with an authoritative
source is a regression until the authority has been told* — needed no repair and
gains one sentence: this instance is out the other side of that *in between*, which
is the only way such a rule gets confirmed rather than merely believed.

Also repaired, because the course repeats a claim on purpose and all of it was
leaning on the two zeroes: lesson 24's **self-check question 7**, and **Set AC's
questions 7 and 8** in `review-schedule.md`.

## The fourth mark, and the rule that now decides who gets one

Lesson 24's fence is marked too, which makes four. Writing the second one in a day
forced the rule out into the open, and it is in `transcripts.test.ts` and
`lessons/README.md` rather than in my head:

| reason | fences |
| --- | --- |
| **an expected red** — the set printed *is* the lesson's subject, so a new member is news | lessons 29, 33 |
| **load-bearing prose** — correcting a line of it is not the whole repair | lessons 32, 24 |

That second row is also why **lessons 22 and 23 have no mark** though their fences
pin the size of the library as well: their prose declines to lean on the number,
deliberately and in as many words. The rule is *a fence wants a mark when correcting
a line of it is not the whole repair*, and it is a better rule than *a fence wants a
mark when its red is expected*, which is what I had after the first two.

## Found while teaching

**Nothing for another lane.** No file outside `lessons/` and
`apps/loom/app/(lessons)/` was changed and none needed changing. `src/`, `tools/` and
`decisions/` are untouched. Two `FINDINGS.md` Status lines are edited and both are
entries owned by this lane, closed naming this pull request: the 2 October entry from
`Loom daily build` about lesson 32, and the 4 October entry from `Loom primitives`
about lesson 24. Nothing else in the ledger moved.

One observation for nobody in particular, recorded because it is the kind of thing
that becomes a finding later: `readBoxes` is the only in-page function in that file
with the argument-taking shape, and it got that shape because a locator's
`evaluateAll` passes the match set in. Nobody chose testability. If the other three
ever want it, the move is the same one lesson 05 is about — and it is not this
lane's to propose.

## What no check reaches, stated rather than discovered

I rewrote one of the new paragraphs to assert the exact opposite of what the
transcript above it prints — *every faculty is now executed against a laid-out page
by this repository's own suite* — and **the lessons suite is green**. That is the
same fault this run repaired, reproduced deliberately, and it is unchanged by
anything here. The mark makes the next drift *legible*; it does not make prose
checkable, and nothing in this course does. `lessons/README.md` already says so
under *Two things it still does not reach*, and this is its second instance.

## The mutations

Five, introduced one at a time against the finished files, restored from
byte-for-byte copies taken before the first one, `diff` clean afterwards. They were
run against the lesson 32 half; the lesson 24 half uses the same construct and the
same two assertions, and the one new thing it exercises — a fourth entry in the
marked-fence census — is the second row of the table below.

| mutation | caught by |
| --- | --- |
| a line inside the marked fence drifts | the `moves:` message, with the mark printed above the line |
| the mark removed | the census — `expected [ 29, 33 ] to deeply equal [ 29, 32, 33 ]` at the time; `[24, 29, 32, 33]` now |
| the mark moved above the `ts` fence | *a moves: mark governs the untagged fence directly under it, and there is none there* |
| the classifier stops stripping comments | the `moves:` message, on both `capture.ts` rows at once |
| **a paragraph asserts the opposite of its own transcript** | **nothing** — see above |

The fourth is the one worth the lines it takes. If the derivation silently stopped
being a derivation, the lesson would go back to printing exactly the booleans whose
hand-classification rotted — and that is the regression a check should catch,
because it is the one that restores the original fault.

## Gate

`pnpm install && pnpm verify` — **green, exit 0**, on a deleted `dist` and `.next`,
with the status written to a file as the last thing on its own line and read in a
separate command, per `docs/routines.md`.

Run twice: once on the branch as opened, and again after `Loom merge` brought `main`
in and the lesson 24 repair went on top. The numbers below are the second run, which
is the one that counts.

| | this branch |
| --- | --- |
| `@jam-overture/loom` | 180 files / 3,803 tests — unchanged, `src/` was not opened |
| `@loom/app` | 378 files / 6,763 tests |
| findings ledger | 995 entries, 0 malformed |
| `prerender:check` | 124 pages, 1,536 text junctions, 0 run together |

The package and application counts are higher than when this branch opened because
the merge brought four other lanes' pull requests in with it, not because anything
here added a test. On the branch as opened the figures were 178 / 3,743 and
374 / 6,674.

**No test added and none weakened, skipped or deleted.** One assertion changed on
purpose — the marked-fence census, from `[29, 33]` to `[24, 29, 32, 33]` — which is
the pin doing its job rather than being loosened: it failed before each lesson was
marked and passes after. `RECOGNISED_TRANSCRIPTS` stays at **148** across both
repairs: each marked fence is still one block, and each is honest as one block
because every line in it is a second copy of another lane's files. No new route and
no new page.

No new review set: no lesson landed, so `review-schedule.md` gains none. Three
questions in it are **rewritten**, all three because they asked the reader to recite
a claim that is no longer true — Set AK's question 7 for lesson 32, and Set AC's
questions 7 and 8 for lesson 24. Set AK's header now names 05 among the lessons it
interleaves, for a reason that lesson only learned after it shipped.

No decision record: nothing about the runtime, the tree schema or an `Accepted`
record is touched, and a lesson is not a decision.

Scope is `lessons/32-layout.md`, `lessons/24-silence.md`, `lessons/README.md`,
`lessons/review-schedule.md`, `apps/loom/app/(lessons)/_lib/transcripts.test.ts`,
`FINDINGS.md` (two Status lines, both on entries owned by this lane) and this report.

## What is next

**Part V's seventeenth seam**, unchanged and now one run older: lesson 33's question
is about *timing* — when does the party that knows this run, relative to the moment
somebody needs to be told? The candidates are the same two: a composition's stated
`max` against the magnitudes inside it, eight runs deferred, and the conformance
probe's reach over a behaviour placed conditionally.

**Or the thing this run makes newly worth doing.** The declaration check's second
source root — `tools/` — was named by lesson 32's own run and deferred twice. This
lesson now prints four facts about `tools/specimen/` and leans on them in prose, and
`claims.test.ts` cannot register a count about that directory at all, because it
derives its counts by importing `@jam-overture/loom`. A claim source that can read
`tools/` would let *the harness hands four functions to a browser* be a checkable
sentence instead of a sentence I deliberately declined to write.
