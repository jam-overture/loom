# 28 — Corroboration: the claim that exists only once

**After this lesson you will be able to** say what a check actually is, and why
that definition rules out most of what a repository writes down; name the three
places a second copy of a fact can come from and what each one costs; say why a
bare citation of a decision record cannot be held to its own meaning while a
linked one can, and give the rule that forced the bare form to stay; explain what
a hand-maintained registry of sentences buys over a sweep, and the two ways such
a registry rots; say what it means that a check is bounded by the population of
values that reach it, applied to prose rather than to a union; and — the half
that is not about `decisions/` at all — say what you take on the moment you
manufacture a second copy, and who ends up paying for it.

**Prerequisites:** [01](01-why-a-runtime.md), [02](02-ui-as-data.md),
[03](03-change-as-data.md), [04](04-identity.md),
[05](05-purity-at-the-seams.md), [06](06-undo-as-computation.md),
[07](07-measuring-a-change.md), [08](08-two-axes.md), [09](09-the-gate.md),
[10](10-the-pipeline.md), [11](11-the-model-seam.md), [12](12-projection.md),
[13](13-refusal-and-repair.md), [14](14-rendering.md),
[15](15-primitives-and-the-registry.md), [16](16-persistence.md),
[17](17-telemetry.md), [18](18-data.md), [19](19-destinations.md),
[20](20-origins.md), [21](21-appearance.md), [22](22-reach.md),
[23](23-anchors.md), [24](24-silence.md), [25](25-exhaustiveness.md),
[26](26-liveness.md), [27](27-scale.md).

Lesson 27 ended with a question, and it was not rhetorical:

> When a decision record argues for a behavior and the code implements a default
> instead, what in this repository would ever notice?

The answer is nothing, and the interesting part is *why* nothing — because it is
not for want of checking. This repository checks the decision records on every
run. It refuses a record whose heading disagrees with its filename, a record
missing a required section, two records claiming one number, a status naming a
record nobody has written, a link whose label and destination disagree, and a
sentence whose count has fallen behind the list it counts. Six checks, one
directory, every commit.

None of them can tell you whether a record is **true**.

That is not a gap in the checks. It is the shape of what a check is, and this
lesson is about that shape — where a system can hold its own writing to account,
where it cannot, and what it costs to move the line.

---

## Warm-up

Closed book, five minutes, mixed across five lessons. Write something for all
five before you look anything up.

1. The log is the truth and the snapshot is a view you can rebuild. Say what a
   snapshot is a second copy **of**, and then say what follows for a snapshot
   that disagrees with the log — which of the two is wrong, and how you know
   without being told. *(16)*
2. Confidence is self-graded by the model. Say what has to arrive before a
   confidence number can be called wrong, where it comes from, and why the thing
   that measures the gap is not allowed to act on it. *(17)*
3. *Is every member of this union handled* sounds like one claim and is three.
   Name all three, say which one the compiler answers, and say which one is not
   checkable at all. *(25)*
4. The Gate is a ladder in a fixed order rather than a score. Give the reason the
   order is the mechanism, and then say where the length of that ladder is
   written down twice — one of the two copies is not in `src/`. *(09)*
5. Lesson 27's exercise D put four correct figures over four invisible bars with
   three instruments saying yes. Say where the defect was, given that no file
   involved had a bug in it. *(27)*

Question 3 is the one this lesson is built on top of. Question 1 is the one most
likely to come back as a description rather than as an argument — if your answer
does not contain the word *derive* or something doing its work, it is a summary.

---

## Predict

**In writing, before reading on.** Four questions. Question 3 is the one to rate
your confidence on.

1. Here is the top of a real decision record, [0002](../decisions/0002-gate-is-a-pure-function-of-two-axes.md):

   ```text
   # 0002 — The Gate is a pure function of two independent axes

   **Status:** Accepted
   **Date:** 2026-07-28
   **Section:** §2 — Composition Runtime
   ```

   Write two lists. **List one:** every edit you could make to those five lines
   that would turn `pnpm verify` red. **List two:** every edit you could make to
   those five lines that would leave the build green and the record wrong.

   Be specific — name the edit, not the category. Which list is longer?

2. A record can be cited from code in two ways, and this repository writes both:

   ```text
   (0095)
   [0095](../../decisions/0095-a-frame-carries-its-url-and-the-deployment-carries-the-origins.md)
   ```

   One of these can be held to its own meaning and one cannot. **Say which, and
   say why** — the answer is not about links being nicer. Then: `src/` carries
   nearly three hundred citations in the bare form. Write down the complete list
   of things a checker can conclude about all of them.

3. 0002 contains this sentence, and it is checked on every run:

   > The decision is eight ordered rules, each returning a disposition or
   > deferring to the next.

   Two paragraphs above it, in the same record, is this one:

   > Collapsing them loses the distinction between "large but undoable" and
   > "small but permanent" — and it is the second that most needs a human in the
   > loop.

   The first is checked and the second is not. **Write down what makes the
   difference** — then write down what would have to exist in this repository for
   the second sentence to be checkable, and say whether you could build it.
   **Rate your confidence 1–5.**

4. You are writing a lesson. You add an exercise that prints the number of
   decision records in the repository, and you paste what it printed into the
   markdown. Write down two things: **what you have just made checkable**, and
   **who now has to keep it true.**

Do not read on until all four are written. Question 1 is the one where the
lengths of your two lists matter more than their contents, and question 4 is the
one that looks like a footnote and is the second half of this lesson.

---

## The problem

Every seam in Part V so far has been a fact that was somewhere. Out of scope, or
undeclared, or in a store the reader may not open, or one level down behind a
promise. The remedy was always about **reaching** it.

This one is a fact that is right here, in front of the checker, in a file the
checker has already opened and read into memory — and it is still not checkable,
because there is nothing in the world to compare it against.

### What the repository can say about its own reasoning

`tools/decisions/` runs on every `pnpm verify`. Exercise A runs the whole of it
over the real directory, and the useful output is not the zeroes:

- **The filename and the heading.** `0002-gate-is-a-pure-function-of-two-axes.md`
  begins with a heading that says `# 0002`. Two numbers, and they must agree.
- **The numbers across the set.** No two records may claim one number; a hole in
  the sequence is reported and passes ([0097](../decisions/0097-a-hole-in-the-numbering-is-reported-and-a-clash-is-fatal.md));
  a status naming a record that does not exist fails.
- **The four required sections.** `Context`, `Decision`, `Consequences`,
  `Alternatives considered`, held by name, with one record excused by name.
- **Every citation, everywhere in `decisions/`, `src/` and `tools/`.** A bare
  number must name a record that exists; a link's label must match the file it
  opens.
- **Counts.** `src/record-claims.test.ts` registers three sentences that count a
  list in the runtime, and holds each against the list.

That is a serious amount of machinery, and it has caught real things: two
concurrent sessions each writing an `0032`, two records citing a renumbered file
by its old number, a link to a record nobody ever wrote, a Gate that grew a rung
while two records went on saying the old number.

### What it cannot say, and the size of it

Exercise B takes one record and edits it five ways. One edit is refused. Four
are accepted without a murmur, and the fourth of those is worth stopping on:

| the edit | what happens |
| --- | --- |
| renumber the heading `0002` → `0003` | **refused** — the filename says otherwise |
| retitle the heading to the opposite of what the record decides | accepted |
| set the status to `Bananas` | accepted |
| set the section to a `§` this project does not have | accepted |

`decisions/README.md` says, in as many words, that `Status` is one of `Proposed`,
`Accepted`, or `Superseded by NNNN`. Nothing holds a status to that sentence.
`parseDecisionRecord` requires the field to be *present* and reads whatever
follows the colon as an opaque string — which is why `Bananas` is a status, and
why the README's sentence about statuses is exactly as checkable as the
argument in 0002's Context.

And the title. A record's heading is the one line that says what the record
decided, it is the line the generated index shows, and it is the line a reader
picks a record by. Change it to its own opposite and every check in this
repository stays green.

### The definition that explains all of it

Line the two lists up and one property separates them completely.

**A check is a comparison.** Not an inspection, not an opinion, not an
understanding — a comparison. Something has to be held against something else,
and "something else" has to already exist, mechanically reachable, in the same
run. Where there are two copies of one fact, a check is possible and cheap.
Where there is one, no amount of care produces one.

The heading number is checkable because the filename holds it too. The link is
checkable because the label and the destination both name the record. The rule
count is checkable because `ESCALATION_LADDER` is the same fact in another form.
The title is not checkable, the status value is not checkable, the argument is
not checkable — **not because they are subtle, but because they are unique.**

This is the axis Part V had not yet been on. Lesson 23's checker could not see
far enough. Lesson 24's could see everything and could not interpret it. Lesson
25's compiler could see and interpret and was answering a narrower question than
the one being asked. Here the checker sees the whole fact, interprets it
perfectly, is asked exactly the right question — and has nothing to put on the
other side of the `===`.

---

## The idea

### Where a second copy comes from

There are three, and the order is the order of preference.

**Derive it.** One copy is the source; the other is computed from it and
overwritten. The index table in `decisions/README.md` is this: it used to be
maintained by hand beside the records, which made it a second copy that could
drift, and it drifted twice in two days. It is now generated by
`pnpm decisions:index` and the build fails if what is committed is not what the
generator produces. The primitive registry made the same move first
([0015](../decisions/0015-the-registry-is-generated-and-a-filename-is-a-type.md)),
and 0015 is about code while this is about prose, which is the point — the move
does not care.

A derived copy costs the least and catches the least: it can only ever tell you
that the copy has drifted from the source, never that the source is wrong.

**Duplicate it on purpose, in a form that can disagree.** This is the link.
`[0095](0095-a-frame-….md)` writes the number twice — once as the label a reader
sees, once as the file a click opens — and two copies of one fact can disagree,
which is the whole of
[0118](../decisions/0118-a-citation-is-a-claim-and-only-a-link-can-be-checked.md).
Exercise C shows both forms failing and passing:

- `(0094)` in a comment that means 0095 — **0 problems**, because 0094 is a real
  record about a card's prose. The reader arrives somewhere coherent and wrong.
- `[0094](…/0095-a-frame-….md)` — **1 problem**, `link-number-mismatch`, because
  the two copies disagree.

That is the same mistake, written two ways, and only one of the two writings can
be caught. Eight doc comments in the framing seam made it. They were found by a
person writing a lesson, and they were fixed by hand, and 0118 says plainly that
nothing stops a ninth.

The cost of this kind of second copy is a **convention** — everyone has to write
the longer form — and a convention is exactly the kind of thing another rule can
forbid. Which is what happened: the documentation site generates its API
reference from these doc comments, the maintainer's rule is that published
documentation must not carry internal record numbers, and the generator lifts a
bare parenthetical out of a sentence and leaves anything else in. Converting the
eight to links turned six published comments red the moment it was tried. **So
the repository knows the checkable form, has the check for it, and writes the
unheckable form anyway, for a reason that has nothing to do with checking.**

**Register it by hand.** Where no copy exists and none can be derived, you can
write one down. `src/record-claims.test.ts` registers a *sentence* — a regular
expression, the record it lives in, and the list in `src/` that settles it —
and `apps/loom/app/(lessons)/_lib/claims.test.ts` does the same for the course,
with the difference that a course repeats a count on purpose so a claim there is
a phrase with a pinned number of occurrences.

This is the most expensive kind and the only one that reaches a sentence. It is
also the only one that can rot, and exercise G shows both ways it does.

### The registry, and its two rots

Exercise G takes 0002's registered sentence and does three things to it.

```text
  as it stands        matches: 1   agrees with ESCALATION_LADDER: yes
  count edited        matches: 1   agrees with ESCALATION_LADDER: no
  sentence reworded   matches: 0   nothing to compare
```

Row two is the check working: the number moved, the sentence did not, the suite
is red. That is what it is for, and it has done it — 0002's own amendment block
says the count was held against the ladder *"so this sentence cannot go stale
again"*, and when the ladder grew again in September it was this check, not a
person, that made the record catch up.

Row three is the first rot. The sentence was reworded — not falsified, just
written differently — and now the pattern finds nothing. A registry that matches
nothing passes trivially, which is a check that reads nothing while reporting
success. Both registries defend against this the same way: **the number of
matches is asserted, not just their content.** One match required in a record;
a pinned occurrence count across the course. A claim that stops matching fails
loudly rather than dropping quietly out of the set.

The second rot is the one exercise G cannot show, because it is about what is
*not* registered. A sweep would read every number in every record; a registry
reads three. The difference is deliberate and is argued in the file: most numbers
in a record are about the world, or about an argument, or about something that
no longer exists, and a sweep over those is a test that fails on prose. So the
registry is the honest shape — and the cost is that **its coverage is a list
somebody maintains**, which is lesson 25's problem exactly, one directory over.

### The population a check runs over

Lesson 25 ended on a rule worth restating here, because this is its second
instance and the two together are what make it a rule rather than an anecdote:
**a check is bounded by the population of values that pass through the place it
runs.**

There it was a scale that could not place a level, and the remedy that closed the
route the fault was found by did not close the fault. Here it is prose. The
citation check reads four-digit numbers beginning with a zero, inside
parentheses, inside a comment. That population is a decision about *syntax*, and
it has already been wrong in the other direction — the first draft read the CIE
luminance constants `0.7152` and `0.0722` out of `src/theme/separation.ts` as
citations of records nobody has written.

Exercise D is that population measured. Every record in this repository is cited
by something; no citation anywhere in the three checked roots fails to resolve;
and the citations split near enough evenly between the form that carries two
copies and the form that carries one. The half written bare is checked for
existence and for nothing else, and **existence is precisely the property that
was true of the eight wrong ones.**

### What a convention looks like when nothing enforces it

Exercise E is the cleanest specimen in this lesson, because it is a fact this
repository has *almost* made checkable by accident.

When a record supersedes another, the older one's status says so. The convention
here has been to say it at both ends — the new record's status carries
`supersedes NNNN`, the old one's carries `superseded by NNNN` — and when both
ends say it, the pair is two copies of one fact, which is checkable. Nothing
checks it. What `checkNumbering` verifies is that a number named in a status
belongs to a record that exists; whether the record named agrees that the
relationship exists is not asked.

```text
  statuses naming a record that does not exist: 0
  supersessions whose other end says nothing back:
```

**That list was not empty when this lesson was written**, and the second heading
is the reason it is empty now. On 25 September it held `0109 -> 0137`: ten of the
eleven directions then written were answered at the other end and one was not.
Nothing was broken — `decisions/README.md` required the *old* record to be marked
and did not require the new one to say anything — but the shape was worth seeing
clearly. A convention followed ten times out of eleven is not a check. It is a
habit, and a habit's output is indistinguishable from a rule's right up until the
first time somebody is in a hurry.

Somebody was, the next day. 0191 was written with 0117 marked
`partially superseded by [0191]` and 0191 saying only `Accepted`, which made it
twelve directions and two unanswered — and that measurement is what turned the
habit into a rule
([0193](../decisions/0193-a-status-line-is-data-and-a-supersession-is-written-at-both-ends.md)).
`checkNumbering` now compares the two ends and fails the build when one is
silent, so this exercise prints nothing and cannot print anything again.

The rest of this section is what it looked like before that, left standing
because the argument it makes is the reason the check exists. The tool's own test
fixture for this case writes the pair both ways, by that same habit.

### The section that is present and empty

Exercise F is the same shape one level up, and it is the one that most looks like
a check doing real work.

A record must carry `## Alternatives considered`. That is checked by name, on
every record, with one exemption written down and verified in both directions so
it cannot outlive its reason. The `README` explains why that section in
particular: *"the rejected options are the part a future reader cannot
reconstruct."*

What is checked is the heading. A record with all four headings and nothing at
all underneath them parses, passes the shape check, and would go into the index
beside 0002:

```text
  four headings with nothing under them: 0 problem(s)
  and it parses: true
```

The shortest *Alternatives considered* actually written in this repository is
comfortably over a hundred words. That number is a fact about the people writing
records, not about the check — and the distinction is the whole of Part V in one
line. **The check establishes that somebody was asked the question. It cannot
establish that they answered it.**

### And then the turn: a second copy is a liability

Everything above treats a second copy as a good you acquire. It is also an
obligation you take on, and this lesson found that out about itself.

Exercise D reads every citation in the repository. The obvious way to write it is
to print what it found — *1,272 citations, 635 of them links, across 169
records.* Three real numbers, all of them interesting, and every one of them a
**second copy of a set that six other routines add to three times a day.** The
moment they are pasted into this file, a lesson in a directory nobody else owns
becomes a thing that goes red when somebody writes a decision record.

That is not hypothetical here. It has already happened to this course three
times: lessons 22, 23 and 24 print the size of the primitive library, the library
grew, and their transcripts were edited from outside this lane by the routine
whose change made them wrong. The finding that came back said the lessons were
*true* and that no prose had moved — the numbers were in transcripts, and a
transcript is a second copy by construction.

So the exercises in this lesson print **verdicts rather than totals**:

```text
  records nothing cites: 0
  citations the checks refuse: 0
  written as a link, carrying two copies: more than a third of them
  written bare, carrying one: more than a third of them
```

*Every record is cited by something* is a claim about the set that survives the
set growing, and is still false on the day it stops being true. *One thousand two
hundred and seventy-two* is a claim about one afternoon.

This is worth generalising, because it is the sentence the rest of the lesson has
been building toward without saying it:

> **Manufacturing a second copy makes a claim checkable and makes it somebody's
> to keep true.** The cost lands on whoever moves the original — who is usually
> not the person who wrote the copy, and who may not know it exists.

Look back at the three sources with that in mind and they re-sort themselves.
Deriving is best precisely because the obligation is discharged by a program:
nobody has to remember. Duplicating is second because the obligation is a
convention, and a convention is carried by people. Registering by hand is last
because the obligation is a *list* — and the list's own completeness is the thing
nothing checks.

And one more, which is where lesson 27's question finally gets its answer. The
record argues that being forced to state a chart's ceiling is a feature. The
schema says `max?` and defaults to `100`. Those are two copies of one fact,
sitting in two files, disagreeing — and nothing compares them because **nobody
ever wrote down that they were copies of each other.** The pair is only visible
to a reader who holds both in their head at once, which is what the person
writing lesson 27 did, and is the reason that finding exists at all.

---

## In the code

| Where | What |
| --- | --- |
| `tools/decisions/record.ts` | Parsing one record. The filename wins over the heading, and the reason is written where the comparison is. `Status` and `Section` are read as opaque strings. |
| `tools/decisions/numbering.ts` | The invariants across the set: clashes are fatal, holes are reported, a status naming nothing fails. Read `gapsIn`'s comment for why the severities differ. |
| `tools/decisions/shape.ts` | The four required sections, the one exemption, and the exemption checked in both directions. |
| `tools/decisions/citations.ts` | The whole argument of this lesson, in a doc comment: *a bare number is one fact, one fact cannot disagree with itself.* Also `proseIn`, and why a check that failed on the tests proving it works is a check somebody deletes. |
| `src/record-claims.test.ts` | The registry: a sentence, a pattern, a list. Its comment explains why it is a registry and not a sweep. |
| `apps/loom/app/(lessons)/_lib/claims.test.ts` | The same idea for this course, where a phrase is repeated on purpose and the occurrence count is pinned. |
| `apps/loom/app/(lessons)/_lib/transcripts.test.ts` | What a lesson says it printed, held against what it prints. The reason the exercises below print verdicts. |
| [0118](../decisions/0118-a-citation-is-a-claim-and-only-a-link-can-be-checked.md) | The record. Its *Consequences* state the check's own limit before a reader could find it. |
| [0097](../decisions/0097-a-hole-in-the-numbering-is-reported-and-a-clash-is-fatal.md) | Two severities, and what happens when you manufacture a fatal problem to forbid a survivable one. |
| [0099](../decisions/0099-a-record-is-amended-when-only-the-count-moved.md) | What to do when a record is still right and a number under it moved. |
| [0015](../decisions/0015-the-registry-is-generated-and-a-filename-is-a-type.md) | Derivation, made first for code, and the move the generated index copied. |

---

## Try it

Seven exercises. **Predict every output in writing, then run.** Exercise B is the
one to commit to hardest — it is Predict 1, executed — and exercise E is the one
whose answer most people assume without checking.

Put each snippet into `src/scratch.test.ts` and run

```bash
pnpm vitest run src/scratch.test.ts
```

The shared preamble for all seven:

```ts
import { existsSync, readFileSync, readdirSync } from "node:fs"
import { basename, dirname, join } from "node:path"

import { describe, it } from "vitest"

import { checkCitations, citationsIn, proseIn, type Citation } from "../tools/decisions/citations.js"
import { checkNumbering, describeNumberingProblem, severityOf } from "../tools/decisions/numbering.js"
import { describeRecordProblem, parseDecisionRecord, RECORD_FILE } from "../tools/decisions/record.js"
import { checkShape, describeShapeProblem, REQUIRED_SECTIONS } from "../tools/decisions/shape.js"
import { ESCALATION_LADDER } from "./runtime/gate.js"

/** The checkout, found by walking up until the records are underfoot. */
const ROOT = (() => {
  let at = process.cwd()

  for (;;) {
    if (existsSync(join(at, "decisions", "README.md"))) return at

    const up = dirname(at)
    if (up === at) throw new Error(`loom: no decisions/ above ${process.cwd()}`)
    at = up
  }
})()

const RECORDS = join(ROOT, "decisions")

/** Every record file, in number order, with its text. */
const records: readonly (readonly [string, string])[] = readdirSync(RECORDS)
  .filter((file) => RECORD_FILE.test(file))
  .sort()
  .map((file) => [file, readFileSync(join(RECORDS, file), "utf8")] as const)

const files = new Set(records.map(([file]) => file))

const parsed = records.flatMap(([file, text]) => {
  const result = parseDecisionRecord(file, text)

  return result.ok ? [result.value] : []
})

const padded = (number: number): string => String(number).padStart(4, "0")

const fileOf = (number: number): string =>
  records.find(([file]) => file.startsWith(padded(number)))?.[0] ?? ""

const textOf = (number: number): string =>
  records.find(([file]) => file.startsWith(padded(number)))?.[1] ?? ""

const statusOf = (number: number): string =>
  /^\*\*Status:\*\*\s*(.+?)\s*$/m.exec(textOf(number))?.[1] ?? ""

/** Every four-digit number a status line names, which is how it points elsewhere. */
const named = (status: string): readonly number[] => [
  ...new Set([...status.matchAll(/\b(\d{4})\b/g)].map((match) => Number(match[1]))),
]
```

### Exercise A — everything this repository checks about its own reasoning

```ts
describe("A", () => {
  it("runs every check this repository has over its own reasoning", () => {
    const unparsed = records.filter(([file, text]) => !parseDecisionRecord(file, text).ok)
    const malformed = records.flatMap(([file, text]) => checkShape(file, text).map(describeShapeProblem))
    const numbering = checkNumbering(parsed)
    const reported = numbering.filter((problem) => severityOf(problem) === "reported")
    const blocking = numbering.filter((problem) => severityOf(problem) !== "reported")

    console.log(`  records that do not parse: ${unparsed.length}`)
    console.log(`  records the shape check reports: ${malformed.length}`)
    console.log(`  numbering problems that fail the build: ${blocking.length}`)
    console.log(
      `  numbering problems that are reported and pass: ${
        reported.length > 0 && reported.every((problem) => problem.code === "gap") ? "holes, and only holes" : "none"
      }`
    )
    console.log(`    e.g. ${describeNumberingProblem(reported[0] ?? { code: "gap", missing: 0 })}`)
  })
})
```

Before you run it: write down how many of these four lines you expect to be zero,
and what the one that is not zero is going to be about.

The output:

```
  records that do not parse: 0
  records the shape check reports: 0
  numbering problems that fail the build: 0
  numbering problems that are reported and pass: holes, and only holes
    e.g. 0123 has no record here — either one was deleted, or the number is claimed on a branch that has not merged
```

A clean sheet, and a set of holes that are reported and pass on purpose (0097).
Now hold that clean sheet next to exercise B.

### Exercise B — five edits to one record, and what anything can see

```ts
describe("B", () => {
  it("edits one record five ways and says which edits anything can see", () => {
    const file = fileOf(2)
    const original = textOf(2)

    const edits: readonly (readonly [string, string])[] = [
      ["untouched", original],
      ["heading renumbered 0002 -> 0003", original.replace("# 0002", "# 0003")],
      [
        "heading retitled to the opposite",
        original.replace("a pure function of two independent axes", "a weighted risk score"),
      ],
      ["status set to Bananas", original.replace("**Status:** Accepted", "**Status:** Bananas")],
      [
        "section set to a § nobody has",
        original.replace(/^\*\*Section:\*\*.*$/m, "**Section:** §99 — Nowhere"),
      ],
    ]

    for (const [what, text] of edits) {
      const result = parseDecisionRecord(file, text)
      const shape = checkShape(file, text)

      console.log(
        `  ${what.padEnd(33)} ${
          result.ok
            ? `accepted, status ${JSON.stringify(result.value.status)}`
            : `refused: ${describeRecordProblem(result.error)}`
        }${shape.length > 0 ? `, ${shape.length} shape problem(s)` : ""}`
      )
    }

    console.log(`\n  every status line in decisions/ parses: ${parsed.length === records.length ? "yes" : "no"}`)
  })
})
```

This is Predict 1. Write your two lists down before you run it if you have not
already.

The output:

```
  untouched                         accepted, status "Accepted"
  heading renumbered 0002 -> 0003   refused: 0002-gate-is-a-pure-function-of-two-axes.md is numbered 3 in its heading
  heading retitled to the opposite  accepted, status "Accepted"
  status set to Bananas             accepted, status "Bananas"
  section set to a § nobody has     accepted, status "Accepted"

  every status line in decisions/ parses: yes
```

One edit of five is visible, and it is the one that changed a **digit that
appears twice**. The title is the sentence the whole record exists to state; the
status is a value the README declares a closed set for; the section is a
reference into a document structure this repository really does have. All three
are single copies, and all three sail through.

### Exercise C — the same mistake, written two ways

```ts
describe("C", () => {
  it("cites one record and means another, in both forms", () => {
    const opens = "0095-a-frame-carries-its-url-and-the-deployment-carries-the-origins.md"

    const written: readonly (readonly [string, string])[] = [
      ["bare, meaning 0095", `/** The origins belong to the deployment (0094). */`],
      ["linked, meaning 0095", `/** The origins belong to the deployment ([0094](../../decisions/${opens})). */`],
      ["bare, naming nobody", `/** The origins belong to the deployment (0300). */`],
    ]

    for (const [what, source] of written) {
      const problems = checkCitations("src/frame/index.ts", source, files)

      console.log(
        `  ${what.padEnd(21)} ${problems.length} problem(s)${problems[0] === undefined ? "" : `: ${problems[0].code}`}`
      )
    }

    const [, bare] = written[0] ?? ["", ""]
    const [, linked] = written[1] ?? ["", ""]
    console.log(`\n  what a checker has of the bare one:   ${JSON.stringify(citationsIn(bare))}`)
    console.log(`  what a checker has of the linked one: ${JSON.stringify(citationsIn(linked))}`)
  })
})
```

All three comments are wrong in the same way. Predict how many of the three are
caught, and predict the last two lines — especially the shape of the object,
which is the argument made as data.

The output:

```
  bare, meaning 0095    0 problem(s)
  linked, meaning 0095  1 problem(s): link-number-mismatch
  bare, naming nobody   1 problem(s): unknown-record

  what a checker has of the bare one:   [{"kind":"bare","number":94}]
  what a checker has of the linked one: [{"kind":"link","number":94,"opens":"0095-a-frame-carries-its-url-and-the-deployment-carries-the-origins.md"}]
```

Two fields against one. The bare citation's object has nothing in it that can
contradict anything else in it, and that is not a limitation of the checker —
there is no checker anyone could write that does better, because the information
is not present. The third line is the only thing existence buys you: a number
nobody has written is catchable, and a number somebody has written that means
something else is not.

### Exercise D — the population, measured without pinning it

```ts
const CITING = /\.(ts|tsx|md)$/

const under = (directory: string): readonly string[] =>
  readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name)

    if (entry.isDirectory()) return under(path)

    /** This file cites 0300 on purpose, one exercise up. */
    if (basename(path) === "scratch.test.ts") return []

    return CITING.test(entry.name) ? [path] : []
  })

describe("D", () => {
  it("asks what the repository's citations can be held to", () => {
    const sources = ["decisions", "src", "tools"].flatMap((directory) => under(join(ROOT, directory)))

    const all: readonly Citation[] = sources.flatMap((path) => [
      ...citationsIn(proseIn(path, readFileSync(path, "utf8"))),
    ])

    const links = all.filter((citation) => citation.kind === "link").length
    const cited = new Set(all.map((citation) => citation.number))
    const problems = sources.flatMap((path) =>
      checkCitations(path.slice(ROOT.length + 1), readFileSync(path, "utf8"), files)
    )

    console.log(`  records nothing cites: ${records.filter(([file]) => !cited.has(Number(file.slice(0, 4)))).length}`)
    console.log(`  citations the checks refuse: ${problems.length}`)
    console.log(`  written as a link, carrying two copies: ${links * 3 > all.length ? "more than a third of them" : "fewer"}`)
    console.log(
      `  written bare, carrying one: ${(all.length - links) * 3 > all.length ? "more than a third of them" : "fewer"}`
    )
  })
})
```

Two things to predict here. First the four lines. Then, harder: **why does this
exercise print "more than a third of them" instead of the number it has in
hand?** Write your answer down before reading the paragraph after the output.

The output:

```
  records nothing cites: 0
  citations the checks refuse: 0
  written as a link, carrying two copies: more than a third of them
  written bare, carrying one: more than a third of them
```

The exercise has the totals and declines to print them, and the reason is this
lesson's own subject one floor down. A transcript in a lesson is compared against
a live run on every build. Printing *1,272 citations across 169 records* would
make this file a second copy of a set that six routines add to daily, and going
red in a lesson would become the ordinary consequence of writing a decision
record. It has happened to this course three times already with the size of the
primitive library. A verdict that survives the set growing, and is still false the
day it stops being true, is the better shape — and choosing it is a small worked
example of the decision the rest of the lesson is about.

Note also the exclusion in `under`: this file is skipped, because exercise C put
a citation of `0300` into it on purpose. A check that reads the file it is
written in is a check with a fixture in its population.

### Exercise E — a convention followed ten times out of eleven

```ts
describe("E", () => {
  it("asks whether a supersession is claimed at both ends", () => {
    const oneWay = parsed
      .filter((record) => /supersed/i.test(record.status))
      .flatMap((record) => named(record.status).map((to) => [record.number, to] as const))
      .filter(([from, to]) => !named(statusOf(to)).includes(from))

    console.log(`  statuses naming a record that does not exist: ${
      checkNumbering(parsed).filter((problem) => problem.code === "unknown-reference").length
    }`)
    console.log(`  supersessions whose other end says nothing back:`)
    for (const [from, to] of oneWay) console.log(`    ${padded(from)} -> ${padded(to)}`)
  })
})
```

Predict the number of lines under the second heading. Most people predict zero,
and the reason they predict zero is the interesting part — write down *why* you
expect the number you expect, because that sentence is about what you think a
convention is.

The output:

```
  statuses naming a record that does not exist: 0
  supersessions whose other end says nothing back:
```

**Empty, and it was not when the exercise was written.** The list held
`0109 -> 0137` on 25 September. `decisions/README.md` required the superseded
record to be marked and said nothing about the replacement, so 0137 was
compliant — and look at what that meant: the repository had ten pairs where one
fact was written twice and could be compared, one pair where it was not, and no
code anywhere that knew the comparison was available. The convention produced
checkable data as a by-product of being followed, and then nobody checked it.

Somebody read this exercise and checked it. Both ends are now required and
compared, 0137 and 0191 were given the clause they were missing, and the list
this prints is empty for good. **That is the exercise's real answer**: the
measurement was worth taking because acting on it was cheap, and the printout
going blank is what acting on it looks like.

### Exercise F — the heading that is checked and the section that is not

```ts
describe("F", () => {
  it("measures the section whose presence is checked and whose content is not", () => {
    const sectionOf = (text: string, heading: string): string => {
      const at = new RegExp(`^## ${heading}\\b.*$`, "m").exec(text)
      if (at?.index === undefined) return ""

      const rest = text.slice(at.index + at[0].length)
      const next = /^## /m.exec(rest)

      return (next?.index === undefined ? rest : rest.slice(0, next.index)).trim()
    }

    const words = records
      .map(([, text]) => sectionOf(text, "Alternatives considered"))
      .filter((body) => body.length > 0)
      .map((body) => body.split(/\s+/).length)

    console.log(`  records missing the section and not excused: ${
      records.flatMap(([file, text]) => checkShape(file, text)).length
    }`)
    console.log(`  the shortest one written is over a hundred words: ${Math.min(...words) > 100 ? "yes" : "no"}`)

    const hollow = [
      "# 0999. A record that decided nothing",
      "",
      "**Status:** Accepted",
      "**Date:** 2026-09-25",
      "**Section:** §2",
      "",
      ...REQUIRED_SECTIONS.map((section) => `## ${section}\n`),
    ].join("\n")

    const file = "0999-a-record-that-decided-nothing.md"
    console.log(`\n  four headings with nothing under them: ${checkShape(file, hollow).length} problem(s)`)
    console.log(`  and it parses: ${parseDecisionRecord(file, hollow).ok}`)
  })
})
```

Predict the last two lines, and then predict which of the four printed facts is
about the check and which is about the people.

The output:

```
  records missing the section and not excused: 0
  the shortest one written is over a hundred words: yes
```
```
  four headings with nothing under them: 0 problem(s)
  and it parses: true
```

The first line is the check. The second is the authors. The hollow record is the
distance between them, and it is not a small distance — it is the whole of the
thing the README says that section exists for.

### Exercise G — the registry, edited and then reworded

```ts
describe("G", () => {
  it("holds a counted sentence against the list, then rewords it", () => {
    const SENTENCE = /The decision is (\w+) ordered rules/
    const original = textOf(2)

    const versions: readonly (readonly [string, string])[] = [
      ["as it stands", original],
      ["count edited", original.replace(SENTENCE, "The decision is zero ordered rules")],
      ["sentence reworded", original.replace(SENTENCE, "The decision is a ladder of ordered rules")],
    ]

    const WORDS = ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine"]

    for (const [what, text] of versions) {
      const matches = [...text.matchAll(new RegExp(SENTENCE, "g"))]
      const word = matches[0]?.[1]

      console.log(
        `  ${what.padEnd(19)} matches: ${matches.length}   ${
          matches.length === 1
            ? `agrees with ESCALATION_LADDER: ${word === WORDS[ESCALATION_LADDER.length] ? "yes" : "no"}`
            : "nothing to compare"
        }`
      )
    }

    const ARGUMENT = /it is\s+the second that most needs a human in the loop/
    console.log(`\n  the sentence two paragraphs above it: ${ARGUMENT.test(original) ? "present" : "absent"}`)
    console.log(`  what it is held against: nothing`)
  })
})
```

This is Predict 3. Predict all five lines, and be exact about row three — what a
check *should* do when its pattern stops matching is a design decision, not an
accident.

The output:

```
  as it stands        matches: 1   agrees with ESCALATION_LADDER: yes
  count edited        matches: 1   agrees with ESCALATION_LADDER: no
  sentence reworded   matches: 0   nothing to compare
```
```
  the sentence two paragraphs above it: present
  what it is held against: nothing
```

Row three is why `record-claims.test.ts` asserts the match count rather than only
the captured word. Without that assertion this row passes: no match, no
disagreement, green. The last two lines are the lesson. That sentence is the
reason 0002 exists — it is the argument for two axes rather than one score, and
every disposition this runtime has ever produced is downstream of it — and it is
present, and it is held against nothing, and it always will be.

---

## It could have been otherwise

Four from [0118](../decisions/0118-a-citation-is-a-claim-and-only-a-link-can-be-checked.md)
and two that are in no record.

**Convert every bare citation in `src/` to a link.** Nearly three hundred sites,
mechanically safe, and it would make the whole repository self-checking rather
than only the records. This is the alternative worth understanding, because it is
*correct* and was still not taken. It cannot be done at all until the reference
generator lifts a linked citation the way it lifts a bare one, which is another
lane's file — and even then it is a diff across more than a hundred files that
changes no behavior and conflicts with every open branch. 0118 records it as
deferred rather than rejected, which is the honest word: it is the only thing
that would close the gap the record admits to.

**Require a title fragment beside a bare number** — `(0095 — a frame carries its
URL)` — so that the bare form carries two facts too. Rejected as a convention:
half the time it is longer than the sentence it sits in, and it prevents exactly
the failure a link prevents, which the repository already writes. Worth noticing
what this one is, though: it is *manufacturing* a second copy at the point of
use, which is the same move the link makes, wearing different clothes.

**Report rather than block.** The numbering check has both severities and a hole
is deliberately only reported (0097). Rejected for citations: a hole is a normal
state of a repository with six branches in flight, and a citation that resolves
to nothing is not — nobody has a reason to write one, so nobody is inconvenienced
by refusing it. The general test is the one 0097 states: *what does manufacturing
the fatal problem cost, compared to tolerating the survivable one?*

**Backfill 0081's missing alternatives from its own reasoning.** Its Context and
Decision do weigh options and a plausible section could be assembled. Rejected,
and this is the sharpest of the four: it would be reconstruction presented as
record, **in the one section whose entire value is that it is not
reconstructable.** An exemption written where the check is says the true thing;
a backfilled section says a false one and passes.

**Have a model read every record and every file that cites it, and report where
they disagree.** Not in any record. It is the only proposal that addresses the
actual gap, and it is worth taking seriously rather than dismissing — this is a
repository where an AI writes things. What it runs into is the thing lesson 11 is
about. A check is a comparison, and its value is that the same input gives the
same answer today and in March; a reading is a judgement, and two readings of one
record may differ. That does not make it worthless — a reading is a very good way
to *find* a candidate, which is how the eight framing citations, lesson 05's
inverted answer and lesson 27's `max?` were all found. It makes it a different
instrument. It belongs where a finding belongs and not where a gate belongs.

**Require a superseding record to name what it supersedes.** Not in any record,
and exercise E is the argument for it: ten of eleven directions already comply, so
the convention exists and only the enforcement is missing. The cost is a real one
and is this repository's recurring shape — a new check turns a legitimate, README-
compliant act into a red build on somebody else's branch, and that is a cost you
may not impose on five other lanes by writing a lesson about it.

---

## Explain it back

Two things to write in your own words. Do not look at the earlier sections while
you write. Then compare.

1. **A colleague wants to add a check that a decision record's title is
   accurate.** They are not being naive — they have read the record, they can see
   the title is wrong, and they can tell you exactly why in one sentence.

   Explain why the check cannot be written, **without using the words "subjective"
   or "semantic"**, both of which make it sound like a hard problem rather than an
   impossible one. The version that transfers names a thing that does not exist
   and says what would have to exist instead. Then, having explained it, give
   *one* design change to this repository that would make a title checkable — and
   say what the change costs, because it costs something real.

2. **Derive this lesson from lesson 16 and lesson 17 together, without looking at
   either.**

   Lesson 16: the log is the truth, the snapshot is a view you can rebuild.
   Lesson 17: a self-graded confidence number is worth nothing until it has been
   calibrated.

   Both of those are this lesson's idea wearing other clothes, and they are
   wearing *different* ones — one is about a copy you derive, the other is about
   a copy that arrives later and from outside. Say what each of them is a copy
   **of**, and then say which of the three sources in *Where a second copy comes
   from* each one is. The useful part is the second: calibration does not fit the
   three sources cleanly, and saying precisely how it does not is worth more than
   forcing it in.

Predict, before writing (2): the hard half is not spotting that a snapshot is a
derived copy. It is saying what an *outcome* is a second copy of, given that the
confidence number was about a future that had not happened yet.

---

## Self-check

Seven questions. For each: **rate your confidence 1–5 before you write your
answer, then check.**

1. Define a check in one sentence, in the form this lesson uses, and then use
   your definition to explain why a record's heading number is checkable and its
   title is not. Do not appeal to how hard titles are.
2. Name the three sources of a second copy, in order of preference, and give what
   each one costs and what each one cannot catch. Be specific about the third —
   it has a cost the first two do not have at all.
3. `(0095)` and `[0095](0095-….md)` cite the same record. Say what each carries,
   what can be held against each, and then say why this repository writes the
   weaker form in `src/` on purpose. Name the rule that outranked the check.
4. `record-claims.test.ts` asserts that its pattern matches exactly once, not
   *at least* once. Say what that assertion is defending against, and describe
   the failure it prevents in terms of what the suite would report.
5. Exercise F's hollow record passes every check this repository has. Say which
   fact about `## Alternatives considered` is established by the check and which
   is established by the people writing records — and then say what you would
   conclude if the shortest one in the repository were eleven words instead of
   over a hundred.
6. State the rule about the population a check runs over, and give two instances
   from this course: one where the population was a union's members and one where
   it was a shape in prose. Then say what each remedy did and did not close.
7. This lesson's exercise D has the totals in hand and prints verdicts instead.
   Give the reason, and then state the general rule about what you take on when
   you manufacture a second copy — including who pays, and why it is usually not
   the person who wrote it.

Question 1 is this lesson's question. Question 7 is where a confident
half-answer is most likely: an answer that says "because the numbers change" has
described the mechanism and stopped. What transfers is that a second copy is a
*coupling*, that a coupling has an owner, and that the owner is normally somebody
who has never read the file the copy is in.

---

## Reflect

Write for two minutes, then move on.

- Predict 1 asked for two lists. Compare their lengths. If your "would turn the
  build red" list was the longer one, write down where that expectation came
  from — it is almost always an inference from how much machinery a repository
  *has*, and the whole point of exercise B is that the amount of machinery tells
  you nothing about what is covered.
- Predict 2 asked what a checker can conclude about three hundred bare
  citations. If your list had more than one item on it, write down which extra
  item you assumed and what you were imagining the checker reading to get it.
- Predict 3 and your confidence. If you wrote that the argument sentence could be
  checked with enough effort — a model, a proof, a test naming the record — and
  rated yourself 4 or 5, that pair is the most valuable line in your notes. It is
  not a gap in your knowledge of this repository. It is a belief about what
  verification is, and it is the belief this entire lesson exists to move: the
  obstacle is not difficulty, it is arity.
- Predict 4 asked who has to keep a pasted number true. Go and check whether your
  answer named a *person* or named a *role*. This course's answer turned out to
  be "whichever routine next adds a primitive", which is neither.
- Now go and look at your own work. Find a comment, a README line, or a variable
  name that makes a claim about behavior elsewhere in the system. Work out three
  things and write them down: whether a second copy of that fact exists anywhere,
  what would have to change for one to exist, and — the one people skip — who
  would be the one to notice when it went wrong, and how long that would take.
- Last, the general version, and it is not about software. Corroboration is what
  the word means outside this repository too: a receipt, a second witness, a
  control group, a double-entry ledger. Pick one institution you deal with and
  work out which of its claims about itself are corroborated and which are single
  copies. Then ask the question this lesson ends on — for the single copies, who
  would notice, and what would it take.

---

## Come back to this

Set AG in [`review-schedule.md`](review-schedule.md), two days after this lesson.
Interleaved with 09, 11, 16, 17, 25, 26 and 27 — heavy on 25, because this lesson
is its rule applied to prose instead of to a union, and heavy on 16, because a
derived copy is the cheapest and best of the three and lesson 16 is where that
idea is properly argued.

Part V has eleven lessons now. The first six were about a checker that could not
see far enough; 24 was one that could see and not interpret; 25 was one that saw,
interpreted, and answered a narrower question than it was asked; 26 was a fact two
parties both held and neither could compare; 27 was a fact one level away behind
a promise the system had made to itself.

This one has no obstacle at all. The checker has the whole file. It understands
every character. It is asked exactly the right question — *is this record true* —
and the question has no second operand. **A check is a comparison, and there is
nothing to compare a unique thing to.**

So the remedy is never to check harder. It is to *arrange for a second copy to
exist*: derive one (cheapest, catches least, and nobody has to remember), write
one deliberately in a form that can disagree (costs a convention, and a convention
can be overruled by a rule that outranks it), or register one by hand (reaches a
sentence, and the register's own completeness is the thing nothing checks).

The second thing to carry is the one this lesson found in its own exercises, and
it is the one that will change how you read a repository. **A second copy is not
free and it is not yours.** The instant you write one down you have created a
coupling, and the bill goes to whoever moves the original — who is usually
somebody with no idea your copy exists. That is why derivation wins: not because
it catches more, but because it is the only one of the three whose obligation is
discharged by a program rather than by a person remembering.

And the question to carry into a twelfth seam comes from exercise E, which is the
one in this lesson that is not about a limit at all. Ten pairs of records already
write one fact twice. Nothing compares them. So: **how much of this repository is
already corroborated by habit, and nowhere cashed in?** A convention that has
been followed for two months has been quietly producing checkable data the whole
time. Finding one of those is cheaper than designing a check, and it is the only
kind of check that costs its authors nothing, because they have been paying for
it already.
