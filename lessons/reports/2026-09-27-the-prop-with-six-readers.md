# 2026-09-27 — The prop with six readers

**Chose a lesson, not machinery**, on the alternation the brief allows. Yesterday
landed `declarations.ts` and the run before it landed lesson 28; a third
consecutive piece of course plumbing would have left Part V standing still while
the tooling got nicer. Yesterday's report also nominated this seam by name — *a
primitive's declared props against the props its component actually reads* — and
said the declarations module was half of the reader it needs. That turned out to
be wrong in an interesting way and is the first thing below.

**Landed:** [lesson 29 — *Readership: the declaration with more than one
reader*](../29-readership.md), Part V's twelfth seam. Seven exercises, all
executed. Set AH. Roughly 50–65 minutes to work through, which is in line with 27
and 28; the Predict section is four questions and one of them is a nine-cell grid.

`pnpm install && pnpm verify`: **green, exit 0**, on a `.next` and a `dist`
deleted first, written to a file as the last thing on its own line and read by
exit code in a separate command. Runtime **3,200** tests across 165 files —
`src/` was not opened, and `git diff origin/main -- src/` is empty. Application
**5,383** across 310 files against `main` at `565a27b`, measured by stashing this
branch and running the suite rather than quoting a number off another lane's pull
request: **5,381 across 310**, so **+2 tests, both `it.each` rows in existing
files, no new file.** 833 findings, 0 malformed. **114 prerendered pages** on this
branch, including the new `/lessons/29`; `main`'s figure was not re-measured,
because that check reads a build and the build on disk is this one's.

## The seam, and why it is not the one I went looking for

The question was lesson 28's instruction followed literally: find a fact this
repository already writes twice and has never compared. A primitive declares its
props; its component reads props out of a bag. Two copies, one file, thirty lines
apart, no comparison.

**And [0009](../../decisions/0009-primitives-receive-props-in-a-bag.md) states the
invariant between them, in its Decision section, in a clause:** *a primitive reads
what it declares out of the bag; nothing else can be smuggled past it.* The second
half is enforced — the bag is validated and every schema in the starter library is
`.strict()`. The first half has been enforced by nothing since 29 July. It is the
cleanest specimen of lesson 28's subject I have found, and it was in an `Accepted`
record the whole time.

**What makes it a Part V seam rather than a to-do** is the reason nothing checks
it, which took most of the reading to see. `auditRegistry` calls every component
under every configuration its schema closes over and reports five kinds of broken
promise: no decoration, a dropped slot, a dropped behaviour control, an
undelivered `submits`, a throw. Every one of those is a promise **whose keeping
shows up in what the component returned.** Reading a prop returns nothing. A
component that honours `tone` and one that ignores it can emit byte-identical
markup.

The axis was already in `audit.ts` and stops one notch short of this. Its comment
on `unplacedBehaviours` ranks two broken promises by how visible each is — a
dropped slot loses content a reader might notice, a dropped control loses nothing
a reader can see. One more notch along is a prop that loses nothing at all.

So the remedy is a third kind, and it is the part of this lesson I would defend
first. Every earlier Part V seam ended in *reach further* or *arrange for a second
copy*. Here both copies exist and nothing needs reaching; what was missing is that
one of them was not **observable**. A `Proxy` on the props bag makes the read
itself the record — `Reflect.get` returns exactly what a property access would, so
the render is unchanged — and that is instrumenting a place rather than moving a
fact.

## What it printed, and the turn

Seven declared props in the library that no call touched:

```
  declared slots no component placed:      0
  declared behaviours no component placed: 0
  components that threw under their own schema: 0
  primitives with a declared prop nothing read: 4
    loom.tally       prefix, suffix
    loom.recording   shape
    loom.feed        density, meta, separators
    loom.embed       src
```

The three zeros are the control and they are why the fourth line is worth
anything: every promise anything has ever looked at is kept by every primitive in
the library. The fourth line is the first promise nothing had looked at.

**And six of the seven rows are the measurement.** `loom.feed` and `loom.tally`
read those props only in the branch where an answer arrived; exercise D supplies
one `nodeDataOf` each and both lists go empty. That is **lesson 25's population
rule for the third time in five lessons**, and 0185 already says why the probe
cannot close it: an invented answer measures the guess.

`loom.recording` is the one I would not have predicted and it is why the lesson
has an exercise E. `shape` is the *only* closed choice its schema has, so
`probeConfigurations` sets it explicitly, by name, in its own render — and the
component still never reads it, because the branch that uses it is gated on
`artwork`, an arbitrary URL. **Setting a prop is not the same as reaching the code
that reads it.** No product of closed sets would have helped either.

**The seventh is real and it is correct.** `loom.embed` never reads its `src`,
because [0095](../../decisions/0095-a-frame-carries-its-url-and-the-deployment-carries-the-origins.md)
gave the URL to the frame seam; what the component places in the `iframe` is the
seam's normalised `url`, and exercise F prints the two strings side by side to show
they differ. A check asserting *every declared prop is read by its component* would
have been red on the day it was written, on a correct library, about a security
boundary working exactly as designed.

So the turn, and it is the lesson's reason to exist rather than a caveat:
**the sweep answered its question exactly and the question named the wrong
party.** *Does the component read this prop* treats one reader as the reader. A
props schema has six — the render seam, the catalogue the model is told it may
write against (0013), the portal's insert menu, telemetry, the four sibling
declarations the registry already holds against it, and the component. Exercise G
asks *who reads `loom.embed.src`* and gets four affirmative answers before the
component's `false`, which is the least important of the five.

The check worth wanting is therefore narrower and not buildable from here: a
declared prop with **no** reader anywhere is a prop the model is invited to write
and nothing consumes — a whole pipeline running correctly on a change that cannot
matter. The readers are in other packages and in deployments this repository has
never seen. The honest output is a list of candidates for a person to classify,
which is lesson 28's reading-versus-check distinction arriving from the other side.

## Yesterday's nomination, corrected

Yesterday's report said `declarations.ts` was "half of the reader it needs". It is
not, and the lesson says why under *It could have been otherwise*: a source parser
answers *does this text mention this prop*, which is blind to a read behind a
rename or in another module and sees reads on branches that can never execute.
Observation under-reports; static analysis over-reports. Both instruments are
wrong in opposite directions and the true set is between them, which is worth more
than either — but it is not one being half of the other. The lesson keeps the
parser as a rejected alternative with that reasoning attached.

## Every exercise executed

Written into `src/scratch.test.ts`, run with `pnpm vitest run
src/scratch.test.ts`, deleted before committing. The course's own runner then
compiled the whole Try it program against `src/` and `transcripts.test.ts`
compared all seven plain fences to what it printed — **green on the first run**,
every line, including the two-space indentation.

Two corrections the exercises forced on themselves, both before the transcripts
were written down and both worth having in the report because both would have
produced a confident wrong lesson:

- **The first sweep passed `NO_FRAMES` and reported `loom.embed.title` unread as
  well as `src`.** It is not: a refused frame takes the notice branch, which never
  reaches the `iframe` the title belongs to. `framesFor` in the preamble now hands
  a primitive that declared `frames` the same `allowed` verdict the audit's probe
  does. An eighth row that was entirely the measurement's fault, in the one
  primitive the lesson's argument turns on.
- **A swallowed throw is a state in which no prop was read**, which would inflate
  every row silently. `propsRead` swallows one and says so in a comment, on the
  audit's own rule. Nothing in the starter library throws under its own schema —
  measured, not assumed — so it costs nothing today.

The typecheck half of Predict 1 was run separately, since no program prints a
compiler diagnostic: three definitions in `src/scratch.ts`, `npx tsc -p
tsconfig.json --noEmit`, one error on the third and silence on the other two. It
is fenced as `text` rather than left plain, on lesson 25's precedent, so
`transcripts.test.ts` does not look for a transcript nothing can produce.

## The one transcript that is deliberately a liability

Exercise C's block is a second copy of a fact about `src/primitives/` — the set of
primitives with a conditionally-read prop — and it will go red when a primitive
joins that set. Lesson 28 spent a section arguing against exactly this, so the
choice is made out loud in both the lesson and `transcripts.test.ts`: here the set
*is* the subject, so a new member is news rather than noise, and the bill is four
words for whoever next writes such a primitive. It is the only block in the course
where that trade is taken on purpose.

## The spacing work

**Set AH**, nine questions, interleaved with 12, 15, 20, 24, 25 and 28. Heavy on
25, because the population rule is the reason six of seven rows say nothing; heavy
on 12, because *what the model is told it may write* is what turns an unread
declaration from untidiness into a fault. Question 9 is the set's point — lesson
28 asks where the second copy is, lesson 29 has two copies, no obstacle and a
correct answer and is still wrong — and asks the reader to state the rule without
mentioning props or primitives and then apply it to `decisions/`.

`RECOGNISED_TRANSCRIPTS` goes 111 → **118**, with the reasoning in its doc comment,
including the paragraph about exercise C above. `LOCAL_DECLARATIONS` goes 9 → **10**
for `ExtraState`, the shape the exercises pass around. `schedule.test.ts` and
`queue.test.ts` gain AH; `syllabus.ts`'s comment goes thirty-three → thirty-four.

## Found while teaching

**Nothing filed, and the reason is the lesson.** Every candidate this run turned up
was one of the seven rows, and after exercises D, E and F all seven are either the
measurement or correct by design. Filing *`loom.embed` does not read its `src`* for
`Loom primitives` would have been filing 0095 working.

The one thing worth another lane's attention is not a defect and is offered as an
observation rather than an entry: **`auditRegistry` has a category for exactly this
shape of fault and it is the only declaration missing from it.** If `Loom
primitives` ever wants it, the lesson's *It could have been otherwise* has the four
versions and why each of the first three is wrong — the short form is that it
belongs beside `notDecorated` as a list a host asserts empty if it cares, not
beside `unplacedSlots` as a list of certainties, and that it would need the
`frames` exemption derived rather than listed and would still be noisy on six
answer-gated rows. That is a real cost for a real but small benefit and it is that
lane's call, not this one's. No `FINDINGS.md` entry, because a finding that says
*you could build this and probably should not yet* is a paragraph in a report.

**`src/` was read only**, and read a great deal: `sdk/definition.ts`,
`sdk/registry.ts`, `sdk/audit.ts`, `sdk/conformance.ts`, `catalogue.ts`,
`frame/resolution.ts` and four primitives. The best sentences in the lesson are
quoted out of those files rather than written for it, which is the second time in
two runs that has been true.

## This lane's own, still open

**Lesson 28's exercise E was rewritten from outside this lane and did not need
rewriting again.** #395 landed the correction under the Merging provision and filed
the rewrite back here; reading it, the wording is a proper account of what
happened rather than the interim it was announced as — the exercise now prints an
empty list, says it was not empty when written, names the pair and the day, and
says 0193 is why it can never print again. Left alone deliberately. The one thing I
would still change is cosmetic — the sentence *the rest of this section is what it
looked like before that* in the body reads as an editor's note — and it is not
worth a commit on its own.

## What is next

**Part V's thirteenth seam**, and this run leaves two candidates, both from
yesterday's list and both still uncompared:

- **A composition's stated `max` against the magnitudes inside it**, which is
  lesson 27's exercise D as a seam of its own — an author's argument and a set of
  numbers that can contradict it, with nothing in a position to say so.
- **A lesson's *Prerequisites* list against the lessons its questions actually
  cite.** This one is now more attractive than it was, because this run added a
  twenty-eight-entry Prerequisites list by copying the one above it, which is
  precisely the way such a list stops being true.

**Or a piece of course machinery**, and there is one the surface wants: lesson 29's
exercise C is the first block in the course whose red is *expected*, and
`transcripts.test.ts` has no way to say so — a drifted line and an expected drift
report identically. Naming that distinction is smaller than it sounds and is
exactly lesson 24's subject applied to this lane's own suite.
