# 2026-09-23 — The lesson that said nothing ever will

**Landed:** a repair, not a new lesson. [Lesson 09](../09-the-gate.md) has been
teaching a seven-rung ladder since 16 September and the Gate has had eight
rungs since 16 September. The lesson is corrected throughout, gains a section
and an exercise for the rung it was missing, and the course gains
[`claims.test.ts`](../../apps/loom/app/(lessons)/_lib/claims.test.ts) — a
registry holding counted phrases in `lessons/` against the lists in `src/` that
settle them. Lessons 25 and the review schedule are corrected too.

`pnpm install && pnpm verify`: **green, exit 0**, redirected to a file and read
by exit code rather than through a pipe. Runtime **2,954** tests across 159
files — `src/` was not opened. Application **5,210** across 291 files. The delta
was measured rather than inferred: `origin/main` at `5b7d242` runs **5,202**
across 290, so **+8 in one new file**, which is the whole of what a repair run
adds. **109 prerendered pages**, unchanged; no route is added.

## Why a repair rather than Part V's eleventh seam

The 22 September report named the next lesson and I went to write it. Section 5
of the brief outranks section 4: *if a record means an existing lesson is now
wrong, fixing that outranks writing a new one.* No record was superseded. A
list grew, which is the same thing one floor down, and it had been wrong for
seven days in the lesson four later lessons send a reader back to.

It was found the way these things are found: reading `src/runtime/gate.ts`
while drafting a lesson about prose that nothing checks, and noticing the array
had eight entries.

## What was wrong, exactly

`confirmRepointedBinding` landed on 16 September with
`decisions/0163` — the third rule in the band above the ceiling, measuring a
change that points a region at different data. Lesson 09 did not hear about it.

| where | said | is |
| --- | --- | --- |
| *The idea*, the sentence the whole mechanism is stated in | seven rules | eight |
| the ladder list | rungs 6 and 7 | 7 and 8, with a new 6 between |
| *In the code* | eight reason codes | nine |
| the `GateRule` type | a function returning a disposition | an object declaring `code` and `kind`, with `fires` returning a detail |
| Self-check 1, *Come back*, Reflect | seven | eight |
| Answers Q2 | "one is missing, and it is rung 5" | two are missing |
| Answers Q6 | `8deb064d:…` | `b22582aa:…` |
| lesson 25's warm-up 3 | seven rules | eight |
| review sets K and M | seven Gate rules | eight |

The last two rows of that table are the ones I would not have predicted.

**The type signature had been wrong since the same afternoon.** `GateRule` was a
function returning a `Disposition | null` when this lesson was written; it is
now an object that declares its code and kind and answers with the detail line.
The lesson printed the old one in a fence. That is not a count and nothing this
run built would catch it — it was found by reading.

**The fingerprint in exercise F had been wrong for three days.** `GatePolicy`
gained `registeredPrimitiveTypes` on 20 September (#345), which moved the shape
half of every policy fingerprint in the repository, which is exactly what the
shape half is *for*. The lesson's own paragraph predicts this happening and the
lesson had it happen without noticing. It now says so, and tells a reader what
to conclude if their three digests agree with each other and disagree with the
page.

## The mechanism, and why the count was the only part it could reach

`src/record-claims.test.ts` has held three sentences in `decisions/` against the
lists they count since the August drift. Two of those sentences count this
ladder. Both said "seven" on the morning of 16 September and both were right by
that afternoon — not because anyone remembered, but because the suite was red
until they were fixed. Nothing did that for `lessons/`, and lesson 09 said so in
a sentence I deleted this run:

> ~~Nothing connects an array in `src/` to a sentence in `lessons/`, and nothing
> ever will.~~

The first clause was a fact. The second was a prediction, and
`app/(lessons)/_lib/claims.test.ts` is it being wrong.

**It is not `record-claims.test.ts` moved one directory over**, and the
difference is the interesting part of building it. That file registers a
sentence and requires it to appear **once**; a course repeats a count on
purpose, across a lesson's summary, its self-check, its come-back list and two
review sets written months apart. So a claim here is a *phrase*, every
occurrence has to carry the same number, and the occurrence count is pinned —
because a phrase that has quietly stopped matching anything is a check that
passes while reading nothing. Seven claims, twenty occurrences, across the Gate's
ladder, the disposition reason codes and the four delta operations.

A match whose captured word is not a number word is skipped, because lesson 26
writes *a ladder of rules in a fixed order* and lesson 02 writes *the node
kinds*. **Declining to count is a better fix than being checked**, wherever it
reads naturally — lessons 22 and 24 already do it for the size of the primitive
library, and nothing here should discourage it.

**Two things it cannot do, and both are written into the file.** It cannot tell
a claim from a *quotation* of one: my first draft of lesson 09's account of its
own drift quoted the stale sentence verbatim and the check counted it as a third
place the course was wrong. The lesson paraphrases instead, which loses nothing
and leaves no wrong number to be found by search. And a count is the cheapest
second copy a sentence can carry — most of what a lesson says carries none, which
is why the type signature above is not something this run made safe.

## What the lesson gained, beyond being right

**A third instance, which is worth more than the correction.** Lesson 09 already
taught that rungs 4 and 5 share one argument — *a level cannot say "never
auto-apply", because the ceilings are per origin* — and called two instances a
shape. There are three now, the third arrived a month later out of a seam that
did not exist when the shape was stated, and the record that added it is titled
*a binding is weighed like a destination*, which is the repository saying out
loud that it is not a new argument. Nothing above it moved, no existing verdict
changed. That is the ladder's central claim about extension, paid out a third
time, and it is a better teaching example than either of the first two.

**Exercise H, and the sentence it repeats one rung along.** Exercise G exists
because exercise B walked past a rung: `sampleTree` has no form in it, so
`confirmRedirectedSubmission` returned `null` on every row and never spoke.
A month later **G** walked past the new rung for the same reason — its fixture
has a form and nothing that reads data. H is `boundTree`, five rows, and its
last row is the half that is not a transcription of the form case: a binding is
a source *and* the question asked of it, and the second half moves on its own.

The two silent rungs have something in common that is better than "the fixture
is small", and the lesson now says it: both measure a change **between two
trees**, so both need something to have been there beforehand. A fixture with
nothing of the kind does not make those rules fail. It makes them silent, and
from outside the two look identical.

## What the exercises revealed

**Exercise H's fifth row, which I did not expect to be the interesting one.**
Same source, different parameters, and the sentence a reviewer gets is *asks
`catalogue.services` for something else* — a repointing that cannot say what is
now being asked, because naming the difference would mean the runtime claiming
to know what `{ customer: "me" }` means to a source the host registered. It
reports the one thing it can stand behind. `repointing.ts` then makes a call
worth arguing with and states it plainly: it cannot tell a parameter that
*selects* data from one that merely *shapes* it, so every ambiguous one reads as
selection — a widened `limit` costs somebody a confirmation, and the other
direction costs `{ "field": "bio" }` quietly becoming `{ "field": "salary" }`.
That is lesson 05's *fail toward asking*, arriving at the top of the ladder.

**Every number in the repair was taken from a run**, including the three policy
fingerprints, and the whole of lesson 09's Try it program was executed as one
file after every edit. Its eight answer transcripts now match a run exactly. Six
of its seven matched before this run and the seventh matched nothing at all,
which is a state nothing in this repository reports.

## Found while teaching

**One structural gap, and two more stale lessons behind it — one of them
teaching the opposite of what the runtime does.**

`transcripts.test.ts` holds what a lesson says its exercises printed against what
they print, and it reads the lesson's **Try it** section. Lessons 01 to 11 print
their outputs under `## Answers` instead. Nothing has ever compared those, and
the pinned `RECOGNISED_TRANSCRIPTS` cannot notice, because it counts Try it
blocks only.

So I ran all eleven programs and compared them to their Answers fences by hand.
The results are not what I expected in either direction:

| lesson | plain blocks under Answers | what is actually wrong |
| --- | --- | --- |
| 02, 03 | 0 | nothing to compare |
| 04 | 5 | **nothing** — hand-aligned and annotated, every value correct |
| 05 | 6 | **one answer is false** — see below |
| 06 | 6 | nothing |
| 07 | 5 | two analysis transcripts missing three fields — **fixed this run** |
| 08 | 6 | nothing — column alignment only |
| 09 | 8 | the three fingerprints — **fixed this run** |
| 10, 11 | 6 | nothing |

**The one that matters is lesson 05, and it is not a number.** Exercise D emits
into a sink that throws, and the lesson's Q4 answer is *"The caller gets the
exception"*, printed as `threw telemetry is down`. The program prints `returned
applied`. On 16 September — the same commit as the Gate's eighth rung —
`src/runtime/narration.ts` arrived and put every event through one containing
door: *a sink is free to be a bad citizen; what it cannot be is load-bearing*.
The argument is good and 0042 is the record. Lesson 05 teaches its opposite, at
length: three paragraphs of Q4 reason from the exception escaping, and a later
passage states that *"the guarantee lives in each sink, not at the emit call
site, and the runtime does not wrap the sinks it is given"*, which is now exactly
backwards.

**I did not fix it, and the reason is a judgement worth recording.** That is not
a transcript to paste — it is an argument to rewrite, with a genuine teaching
gain in it (an obligation on every implementer became one containment point, for
reasons involving `async` sinks and unhandled rejections on serverless hosts).
Doing it at the end of this run would produce a hurried lesson about not
hurrying lessons. It is the first thing the next run does.

**Why the check was not simply extended to `## Answers`, which was my first
plan.** Lessons 04 and 08 are the answer: their transcripts are hand-aligned into
columns, annotated with a trailing comment on the same line, and wrapped where a
JSON line ran long. Every value in them is right. A line-for-line comparison
calls all of that drift, and the fix would be to flatten four lessons' answers
into raw terminal output — trading a real explanatory device for a check. The
comparison that would work has to normalise whitespace, strip trailing
annotations and rejoin wrapped lines, and each of those three is a way to make
the check quietly weaker. That is the design problem the next run inherits along
with lesson 05.

**Nothing for another lane.** `src/` was read and not opened. Both runtime
changes that stranded these lessons are correct — the eighth rung, and a policy
field moving every fingerprint's shape half, which is precisely what that half
exists to do.

## What is next

**Lesson 05's exercise D, first.** It is a lesson teaching the opposite of the
runtime's behavior, it has been doing so for a week, and the repair is
well-specified above.

**Then Part V's eleventh seam, whose material this run turned up by accident.**
The question lesson 27 left — *a decision record argues for a behavior in the
present tense and a schema three files away quietly disagrees, and nothing
compares them* — is one half of something larger. Every check this repository
runs over `decisions/` checks that **two copies of one fact agree**: a filename
against a heading, a link's label against the file it opens, a sentence's count
against a list. An argument written in English has one copy and nothing to
disagree with, which is why `tools/decisions/` can check a record's shape, its
number, and its citations, and can say nothing at all about whether the code does
what the record says. Six exercises were drafted and run against
`tools/decisions/` before this run changed course — 163 records, 367 citations
between them, 0 problems, 18 reported holes — and the outline holds. They are
worth running again rather than trusting.
