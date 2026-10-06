# 2026-10-06 — The paragraph the mark asked somebody to read

**Chose course machinery over a new lesson, and the cadence is the reason rather
than a preference.** The brief's alternation had been two runs overdue since
5 October, that run said so in its own *Needs your input*, and there has been no
reply on #522 — so the default stands and machinery was what was owed. No open
lessons pull request, no reader feedback, nothing `Superseded` that makes an
existing lesson wrong.

**Landed:** the `moves:` mark's second half, built. Five sentences in lessons 24,
29, 32 and 33 are now held against the numbers the transcripts above them
printed; one census keeps every marked fence covered; `marks.ts` is the mark
parser, extracted so the new check is not a second copy of it; and `TRY_IT` has
one home instead of four.

## What it is, and why it is not the thing the last two runs proposed

4 October named the gap and 5 October repeated it: `claims.test.ts` derives every
count by importing `@jam-overture/loom`, so a sentence about `tools/specimen/`
cannot be registered at all, and *the harness hands four functions to a browser*
was a sentence I deliberately declined to write. The proposal both runs carried
forward was **a claim source that can read `tools/`**.

I did not build it, because reading the code made a better answer obvious and it
is worth stating plainly: **the second copy was already there.** The number is
printed in the fence a few lines above the sentence, and that fence is already
held against a real run by `transcripts.test.ts`. So the sentence is held against
the fence, and two checks compose:

> prose → transcript → the run → `src/` and `tools/`

That is lesson 28's **first** remedy — derive it — where the last two runs
proposed its third. It needs no new source root, no second regex over
`tools/playwright.ts`, and above all **no third copy of the fact**. A claim source
reading `tools/` would have manufactured one, and the course's own lesson 28 is
about who pays for that. It also reaches further than the thing it replaces:
`tools/` was the directory that prompted it, but a fence printing anything —
`src/primitives/`, the registry, a composition — is settled the same way.

So the gap 4 October filed is closed, by not building what it asked for. The
sentence it declined to write stays unwritten, which is the other half of the
same argument: lesson 32's Try it preamble **already** counts those four
functions, in the line telling a reader which of exercise G's outputs to predict
hardest. Registering the sentence that exists beats adding a second one that
agrees with it.

## Why this is the mark's second half

Four fences carry a `moves:` mark, and two carry it for this reason in as many
words: *the paragraphs under it are prose about these lines and no check reads
prose.* Those marks were written after two incidents a fortnight apart — lesson
32's numbers on 2 October, lesson 24's on 4 October — where another lane
corrected the fence the same day, exactly as the convention asks, and the
paragraph drawing the conclusion was left saying the opposite on `main`.

A mark is a sentence addressed to whoever trips over it. It asked a human to read
the paragraph, twice, and twice nobody did. **This is the half a program can do.**
Where the paragraph counts something the fence prints, correcting the fence
without reading the paragraph now fails, naming the sentence and the file — and
the remedy is one word of prose, which is the same class of edit
`docs/routines.md` already expects of a lane that corrects a lesson transcript.

The five sentences, each the load-bearing one under its fence:

| lesson | the sentence | held against |
| --- | --- | --- |
| 24 | *the **eight** words the band shows* | the `words:` line under `copyIn(metrics band…)` |
| 29 | *the **three** zeros are the control* | the fence's lines ending `: 0` |
| 32 | *the **four** that say what each function handed to the page takes* | `of those, handed to the page: 4` |
| 32 | *the **two** `in prose` rows on `capture.ts`* | the rows reading `capture.ts in prose` |
| 33 | *Today **five** primitives read a binding* | the names on `primitives that read a binding:` |

*(`Loom merge`, 6 October: the lesson-33 pin above was written against the sentence *two primitives in the starter library read a binding*. #529 landed three bound twins while this branch was open, and lesson 33 now carries that sentence as history — *on the day it was written* — with the state of play in a *Today five…* sentence below it. The pin was moved to that sentence rather than the historical one edited, which is the remedy the check's own message names.)*

Lesson 29's is the one worth pointing at. The mark on that fence says the three
control zeros *are not covered by it* — "if one of those is what drifted, this
mark does not cover it and something is wrong." That was a sentence to a reader of
the mark. It is now a test.

## What it would and would not have caught, checked rather than asserted

I went back to `fe973d1` to read what actually sat on `main` after 4 October
rather than describe it from the mark. Three paragraphs were stale and they are
three different shapes:

- *"Zero and zero."* — **not caught.** Two numbers in one sentence, with nothing
  to capture per number. This check holds one sentence to one count.
- *"`words` is empty"* — **not caught.** A statement, not a count.
- *"`unread` has **six** entries naming every node and every prop involved."* —
  **caught.** The fence said `unread: none` by then. A claim of exactly this
  shape goes red on it.

So one of the three. That is the honest figure and it is better than it sounds:
one red naming lesson 24 is all it takes, because what a failure buys is somebody
opening the file. For 2 October the covered sentence is lesson 32's *two `in
prose` rows*, which counts; the rest of that lesson's account of the table
classifies rather than counts, and is reached by reading.

**Two limits, in the course's README rather than discovered later.** A sentence
about what a number *used to be* is indistinguishable to a regular expression from
a stale claim about now — lesson 24's *both of those counts were zero when this
lesson was written* is true, historical, and would fail if registered — so each
claim is registered by somebody who has read the sentence and never found by
pattern. And a classification is not a count.

## The mutations

Eight, one at a time against the finished files, restored from byte-for-byte
copies, `diff` clean afterwards. The first run of the fourth was a **false green**:
the `sed` anchored the sentence to the start of a line and that sentence sits
mid-paragraph, so the file was never modified and the pass meant nothing. Redone
without the anchor, it failed as it should. Worth recording because an unapplied
mutation and a check that misses look identical from the exit code.

| mutation | caught by |
| --- | --- |
| lesson 24's prose says *nine words* | the claim, `expected 'nine' to be 'eight'` |
| lesson 29's prose says *four zeros* | the claim, naming the fence's 3 |
| lesson 32's prose says *the five that say* | the claim, naming the fence's 4 |
| lesson 32's prose says *three `in prose` rows* | the claim, naming the fence's 2 |
| lesson 33's prose says *Three primitives* | the claim, naming the fence's 2 |
| **lesson 33's fence gains a third name, prose untouched** | the claim — *now prints 3* |
| **lesson 29's fence gains a fourth control zero, prose untouched** | the claim — *now prints 4* |
| lesson 24's claim deleted from the table | the census, naming `24-silence.md` |

The two in bold are the incident itself: the fence corrected from outside this
lane, the paragraph left alone, and a red that names the sentence. That is the
thing two reports asked for and it is now demonstrated rather than argued. The
last confirms the census is not vacuous, and it was re-run against the final code
after the refactor below.

## Two second copies removed from this lane's own machinery

Neither is a finding and both are mine, so they are done rather than filed.

**`marks.ts`.** `MOVES`, `printable`, `linesOf`, `recordedIn` and `Recorded` were
private helpers of `transcripts.test.ts`. The new check needs all of them, and
writing a second `/^moves:\s*(\S.*)$/` would have been this course teaching
lesson 28 while doing the opposite — with the bill going to whoever next changed
the convention. The module is now what a mark *is* and which fence it governs;
what each check *does* with one stays with that check, and the long doc comment
about never making anything pass stayed where that behaviour lives.

**`TRY_IT`.** The string `"Try it"` existed four times: exported from `parts.ts`,
and declared locally in `run.test.ts`, `transcripts.test.ts` and — as of this
run's first draft — `claims.test.ts`. The three copies exist because `parts.ts`
imports React and a node test cannot pull it in. I had added the fourth before
noticing, which is how these start. It now lives in `lesson.ts`, beside the
function that looks a section up; `parts.ts` imports and re-exports it so the two
routes reading it from there are untouched.

That second one cost a red: `parts.ts` uses `TRY_IT` internally, and a bare
`export { TRY_IT } from "./lesson"` re-exports without binding it in scope, so
`next build` failed type checking at the one call site. Caught by the gate, fixed,
re-run.

## Gate

`pnpm install && pnpm verify` — **green, exit 0**, on a deleted `dist` and
`.next`, with the status written to a file as the last thing on its own line and
read in a separate command, per `docs/routines.md`.

| | this branch |
| --- | --- |
| `@jam-overture/loom` | 183 files / 3,906 tests — unchanged, `src/` was not opened |
| `@loom/app` | 384 files / 6,923 tests |
| findings ledger | 1,013 entries, 0 malformed — unchanged |
| `prerender:check` | 126 pages, 1,539 text junctions, 0 run together |

**Six tests added, none weakened, skipped or deleted, and no assertion changed.**
Five claims and one census. No pin moved: the marked-fence census is still
`[24, 29, 32, 33]`, `RECOGNISED_TRANSCRIPTS` and the declaration census are
untouched, and the review queue is unchanged because no lesson landed. The test
*file* count is unchanged at 384 — `marks.ts` is a module, not a suite.

No new review set. The schedule's sets are anchored to lessons and this run added
none; `review-schedule.md` is untouched.

No decision record: nothing about the runtime, the tree schema or an `Accepted`
record is touched, and course machinery is not a decision.

Scope is `lessons/README.md`, this report, and six files under
`apps/loom/app/(lessons)/_lib/` — `marks.ts` (new), `claims.test.ts`,
`transcripts.test.ts`, `lesson.ts`, `parts.ts`, `run.test.ts`. Nothing outside
this lane: `src/`, `tools/`, `decisions/` and every other route group are
untouched, and `FINDINGS.md` has no new entry because this run found nothing that
is somebody else's.

## Found while teaching

**Nothing for another lane this run.** The two second copies above were in this
lane's own machinery and are fixed rather than filed. I read `tools/specimen/`
closely enough to decide not to write a claim source for it and found nothing
wrong in it; the four facts lesson 32 prints about it are accurate on this
checkout, which `pnpm verify` re-establishes every run.

One observation recorded for nobody in particular, because this is how a finding
starts. `run.ts` is in the Turbopack trace as a warning — *Encountered unexpected
file in NFT list*, reached from `(lessons)/lessons/[lesson]/held/[part]/route.ts`
— because the exercise runner reads `src/` from disk, which is what that route is
for. It is pre-existing, it is a warning rather than an error, the build is green,
and the file system access is the design (`source.ts` says why). It is this lane's
own if it ever becomes anything, so it is not filed.

## What is next

**A lesson, and the alternation now says so unambiguously.** Part V's eighteenth
seam, with the same two candidates 5 October left: a composition's stated `max`
against the magnitudes inside it — ten runs deferred, and lesson 27 already holds
the argument for why nobody computes it — and the conformance probe's reach over
a behaviour placed conditionally, which is lesson 29's instrument meeting lesson
31's closed set.

One thing this run makes newly cheap, for whoever writes that lesson: a sentence
under a transcript can now be a checked sentence, so the reflex of writing
*declines to count* to stay safe is worth re-examining per sentence. Declining is
still better where the number is not the point — lessons 22 and 23 are right to —
but *the number is the point and I cannot check it* has stopped being a reason.
