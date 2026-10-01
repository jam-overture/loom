# 2026-09-24 — The promise nobody was keeping

**Landed:** a repair, and the machinery that would have caught it. [Lesson
05](../05-purity-at-the-seams.md) has taught the opposite of what the runtime
does since early August: its exercise D emits into a sink that throws, and the
answer said the exception reaches the caller. It prints `returned applied`. The
lesson gains the argument it should have had, three exercises, and a section
about its own seven weeks of being wrong. `transcripts.test.ts` now reads the
`## Answers` sections of lessons 01 to 11 as well as Try it — **fifty blocks
that nothing had ever compared to anything.**

`pnpm install && pnpm verify`: **green, exit 0**, redirected to a file and read
by exit code rather than through a pipe. Runtime **2,999** tests across 159
files — `src/` was not opened. Application **5,393** across 300 files, measured
against `origin/main` at `b2a5176`, which runs **5,392** across 300: **+1 test
in one existing file**, which is the new pin. **109 prerendered pages**,
unchanged; no route is added.

## Why this rather than Part V's eleventh seam

Section 5 of the brief: a lesson that is now wrong outranks a lesson that does
not exist. The 23 September run found this one, specified the repair, and
deliberately did not do it at the end of a run — its reasoning was that the
repair is an argument to rewrite rather than a transcript to paste, and it was
right. It is over five hundred lines of change to the lesson.

## What was wrong, and it was not a number

| where | said | is |
| --- | --- | --- |
| Answers Q4, the transcript | `threw telemetry is down` | `returned applied` |
| Answers Q4, four paragraphs | the throw unwinds past the `return`, taking the applied tree | the throw does not leave `narrator` |
| Answers Q4, the closing passage | the guarantee is upheld sink by sink and the runtime does not wrap what it is given | the runtime wraps everything, once |
| the section heading, *The promise the runtime does not keep for you* | the defect, asserted in the title | the promise is kept, and *where* is now the lesson |
| Self-check 4's answer | what happens "depends on the sink" | it does not depend on the sink |
| the `CompositionRuntime` fence | six fields | seven — `propsVocabulary` arrived with 0179 |
| the quoted `EventSink` comment | a sentence the file no longer contains | reworded when 0042 landed |

**None of it is a count**, which is the whole point of the entry below. The
course's claims registry went in on 23 September and would not have flinched at
any row of that table.

## The repair, and what the lesson gained by being wrong

The correction is four sections and three new exercises, but the reason to spend
a run on it is that the fault has a better lesson in it than the fact did.

**The idea the lesson now teaches**, which it did not before: `EventSink`'s
comment is a sentence that reads identically whether the rule is an *obligation*
on every host that writes a sink or a *guarantee* the runtime provides. You
cannot tell which from the comment. You find out at the call sites — and for as
long as the seam had existed, this codebase read as the second while being the
first, with every sink in it complying and nothing enforcing anything.

**The asymmetry that decided the design**, put to the reader as a prediction
before the answer: a sink can fail at `change-applied`, before anything is
persisted, or at `change-committed`, after `store.append` has returned. Under a
bare `emit` both took the change down, and they are not equally bad. Losing a
change costs a change. The other direction leaves the store at revision 1 with
the change durably in it while the caller is told it failed — the record and
reality disagreeing, which is the only thing Loom is selling. That is 0042's
argument and the lesson now makes it.

**Three exercises for the three things the containment does**, all executed:

- **E** — the same failure written `async`. `emit` is declared `() => void` and
  TypeScript assigns `() => Promise<void>` to it without a murmur, so the sink a
  host reaches *by accident* rejects rather than throws. The exercise then
  re-emits a captured envelope bare and prints what a call site would have been
  handed: `bare emit returned a promise`. A `try`/`catch` around that catches
  nothing; the failure arrives later, at the process. **The obvious guard closes
  the shape a host reaches on purpose and leaves open the one they reach by
  accident**, which is the half of 0042 I would not have thought of.
- **F** — the write path, with a store, a hold store and a sink that refuses
  `change-committed`. Prints `committed`, `1 Rewritten`. The store was identical
  before 0042; the only thing that changed is what the caller was told.
- **G** — the clock, which is *not* contained, and the rule that explains why
  without being "contain the unimportant one": **contain the failure whose
  consequence is a gap in the record, not the one whose consequence is a false
  entry in it.** A lost event is visibly missing. A fabricated `occurredAt` is
  not, and the same clock stamps `appliedAt` on the commit.

**Four rejected alternatives from 0042**, because three of them are cheaper than
what was chosen and one is better. The best is `emit` returning a `Result`,
which is this lesson's own first rule applied evenly and was still rejected —
the caller's only possible response to the error is to ignore it. That yields a
sharper statement of the rule than the lesson had: **a `Result` is for a failure
the caller can do something about.** It came from somebody trying to apply the
lesson too uniformly, which is a good way to find where a rule's edge is.

## Every exercise executed

The seven `ts` fences in Try it were extracted from the markdown by script,
concatenated, and run as one file — so what is recorded is the lesson's own
program, not a variant of it. Eight transcripts, all of them from that run:

```
returned applied                         (D)
returned applied / 6 change-applied      (E)
bare emit returned a promise             (E)
committed / 1 Rewritten / change-committed   (F)
threw no clock                           (G)
```

A, B and C were re-run unchanged and print exactly what they printed in August —
`18` leaf values differing across four field names, four events ending at
`assessment-failed`. The file was typechecked as well as run (`tsc --noEmit`
clean over it), which is how the claim in E that **there is no cast anywhere in
that block** is a checked claim rather than a remembered one. The course's own
runner transpiles without typechecking, so that one needed doing by hand.

`src/scratch.test.ts` was deleted before committing.

## The machinery: the other half of the course's promise

`transcripts.test.ts` held what a lesson says its exercises printed against what
they print, and it read the **Try it** section. Lessons 01 to 11 print under
`## Answers`. Nothing had ever compared those — and the existing pin could not
notice, because it counts Try it blocks and there were always exactly as many of
those as there were.

It now reads both. The measurement, before anything was decided:

| lesson | answer blocks | drifted lines |
| --- | --- | --- |
| 01, 02, 03 | 0 | — |
| 04 | 4 | 5 |
| 05 | 9 | 0 *(after the repair)* |
| 06, 08, 10, 11 | 6 | 0 |
| 07 | 5 | 0 |
| 09 | 8 | 0 |

**Fifty blocks, and only lesson 04 needs anything.** The previous run expected
worse, and expected the normalisation to be the hard part — three steps, each a
way to make the check quietly weaker. Only one of the three turned out to be
needed, and it is the one that cannot weaken anything: **collapsing runs of
spaces to one.** A value is never whitespace, so it hides a difference in layout
and nothing else. That alone took lesson 08's six column-aligned rows from five
drifted lines to none, and it changed nothing at all for Try it — same 102
blocks recognised, same zero drift — so there is one comparison rule for both
sections rather than two.

The other two steps were not taken. Lesson 04 labels two transcripts `move:` and
`rebuild:` and appends three trailing glosses like `a look-alike is not it`;
stripping annotations and rejoining wrapped lines would have let those through
and would each have hidden a class of real difference. So lesson 04 gets a
**declared allowance of exactly five annotated lines**, with the reason written
where the number is. Held exactly, not as a maximum: annotate a sixth line and
it fails, remove one and it fails, let a real transcript drift and it fails,
because a drift makes six. What it cannot catch is a real drift arriving in the
same commit that removes an annotation. That residue is written down rather than
left to be discovered.

**The check was tested against the fault it exists for.** Putting
`threw telemetry is down` back into lesson 05's Q4 fails the suite, naming the
lesson and printing the line. That is the negative test, and it was run.

## What the exercises revealed

**The story is better than the previous run had it, and worse.** This was not a
runtime change that stranded a lesson. Reading the August reports:

- **6 August** — lesson 05 shipped with a *Found while teaching* entry stating
  this exact gap, having run both failure directions, recommending containment
  at both call sites and naming the cheap alternative (reword the comments).
- **7 August** — the framework routine did it: 0042, the recommended half rather
  than the cheap one, one door instead of two `try`/`catch` blocks, plus the two
  things the lesson had not thought of.
- **8 August** — that run's report: *"#54 fixes the behavior lesson 05's
  exercise D documents. Landing them together would ship lesson 05 already
  wrong."* Two subsequent reports carried the note forward as an open item.

So the drift was **predicted in writing, by name, in the report that caused it**,
and it happened anyway. The previous run dated this to 16 September and to the
Gate's eighth-rung commit; that is wrong, and the correction matters because it
changes what the failure was. Not a lesson overtaken by a change nobody told it
about — a lesson overtaken by a change it asked for, on a schedule it was given
in advance.

The thing that was missing was never information. It was **a place to put a
claim where getting it wrong is an event**, which is lesson 25's own conclusion
arriving at lesson 05's expense. A note in a report is not one. The `## Answers`
check is.

## Found while teaching

**Nothing for another lane.** `src/` was read closely and not opened. 0042 is
right, `narration.ts` is the best forty lines in the runtime to hand a reader,
and the one thing in it that looks like an omission — containment reports
nothing — is argued for in the record and correct.

Two things for **this** lane, filed here rather than in `FINDINGS.md` because
both are mine:

**1. The `CompositionRuntime` fence was stale and no check reaches a fence that
is not a transcript.** `propsVocabulary` arrived with 0179 and the lesson still
printed six fields. It was found by reading `pipeline.ts`, exactly as lesson
09's `GateRule` signature was found by reading `gate.ts` the run before. That is
twice in two runs that a **type printed in a lesson** had drifted, and neither a
count nor a transcript reaches one. It is the obvious next piece of machinery
and it is not obviously cheap: a fence holding a type is a hand-trimmed extract
with the doc comments removed, so the comparison is against a declaration rather
than against text, and doing it badly would force every lesson to print types in
full. Not started this run; named so the next one can decide.

**2. The lesson's count of `CompositionRuntime`'s required fields cannot be
pinned, and it should be said why.** `claims.test.ts` needs a list in `src/` to
hold a phrase against. Five required fields of a TypeScript type is not a list
anything can read at runtime. The lesson says "five" in four places and the
schedule in one, and all five are currently right by nobody's arrangement. The
honest note: **a claim is checkable when there are two copies of one fact**, and
a type's shape has exactly one copy unless somebody derives a value from it.

## What is next

**Part V's eleventh seam.** The outline the 23 September run drafted still
holds and is now the only thing in front of the course: every check this
repository runs over `decisions/` compares two copies of one fact, and an
argument written in English has one copy. Six exercises were drafted and run
against `tools/decisions/` — 163 records, 367 citations, 0 problems, 18 reported
holes. They are worth running again rather than trusting.

It is also, after this run, a lesson about something the course has now been
bitten by twice in two days. That is the right time to write it.
