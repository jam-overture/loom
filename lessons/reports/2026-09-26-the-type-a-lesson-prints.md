# 2026-09-26 — The type a lesson prints

**Chose machinery, not a lesson**, on the alternation the brief allows, and the
choice was already argued in public: yesterday's report nominated the type-fence
check, and [lesson 28](../28-corroboration.md) spent eleven hundred lines
establishing why it is the right shape of remedy. Writing a twelfth Part V seam
while the course's own most recent argument sat unapplied to its own files would
have been the wrong order.

**Landed:** `app/(lessons)/_lib/declarations.ts` and `declarations.test.ts` — every
`type` and `interface` printed in a lesson, held against the declaration in
`src/`. Plus the repair it found within a minute of first running: lesson 11 had
been printing the network boundary with the wrong signature for six days.

`pnpm install && pnpm verify`: **green, exit 0**, redirected to a file and read by
exit code rather than through a pipe. Runtime **3,073** tests across 160 files —
`src/` was not opened. Application **5,995** across 312 files, against `main` at
`18f8b79`, which runs **5,957** across 311: **+38 tests in one new file.**
**112 prerendered pages**, unchanged — this run adds no route. 805 findings, 0
malformed.

## What the check is

Three checks already stand over this course's prose and all three are about
*executed* code. `run.test.ts` compiles every Try it program and runs it against
`src/`. `transcripts.test.ts` holds what a lesson says it printed against what it
printed. `claims.test.ts` holds a sentence that counts a list against the list.
None of them reaches a **declaration**, and the course has been bitten there twice
in two runs — lesson 09's `GateRule`, and the one below.

The reason a fence is checkable at all is lesson 28's sentence turned on this
lane's own files: **a check is a comparison, and a unique thing has nothing to be
compared to.** A fence that opens `export type MarkedHolds = {` is not making a
claim about the code; it *is* the code, quoted. The second copy already existed
and nobody had written the comparison — which is the cheapest of that lesson's
three sources, and the only one whose obligation a program discharges.

**What is compared.** A fence is held to every member it names and to nothing it
leaves out. A member it omits is a silence rather than a claim, because three
lessons abridge on purpose — lesson 10 puts five composition outcomes on five
lines and leaves out `repairFailure?`, which is lesson 13's subject. And a fence
that names *every* member is indistinguishable from the declaration, so it is held
complete from then on: a declaration that grows a field breaks the lessons that
printed it whole and leaves alone the ones that printed four of nine.

That last part is the bit I would defend hardest. **Completeness is read off the
fence rather than declared beside it**, so there is no convention for an author to
remember and no annotation to keep true. Lesson 28's closing argument is that
manufacturing a second copy makes a claim somebody's to keep; an obligation that
derives itself from the artefact costs nobody anything.

**What is deliberately not compared**, stated in the module rather than
discovered: type parameters (lesson 27 writes `LoomPrimitiveProps<…>` over three
parameters with bounds and defaults, and demanding them in full would make that
lesson print eight lines of generics to say a thing about its third field), and
`export`. `…` in a fence matches anything, which is the one wildcard and the only
way a fence elides within a member.

## The pinned half, and why any of it is pinned at all

The comparison is derived; the **inventory** is registered — seventeen rows naming
the lesson, the declaration, how many members the fence lists, and whether it
printed the declaration whole. Nine further declarations are lesson inventions
(`Seams`, `Ask` twice, `Ops` and `Stage` twice, `StatProps`, `Code`) and that
count is pinned too.

Both pins exist for the reason `RECOGNISED_TRANSCRIPTS` exists: a scan that stops
finding anything reports a clean sheet. The member counts are the non-vacuity
guard — a parser that stopped splitting members would take every row to `0` and
pass while comparing nothing. The locals count is the other direction: they are
local on the strength of a name not being found in `src/`, which is a fact about
`src/` and not about the lesson, so the day the runtime publishes a `Code` or a
`Stage` this goes red and somebody decides whether a lesson is now printing a copy
of it.

The one thing this arrangement can say that `record-claims.test.ts` cannot: **its
own completeness is checked.** The registry is compared against the derived scan
exactly, so a fence that appears without a row, or a row without a fence, is a
failure rather than a silence. That is the gap lesson 28 names in hand-registration
and it is closable here only because the population is enumerable.

## What it found

One drift, in the worst available place, on the first run.

Lesson 11 is *the model seam*. Its second cut is the network boundary. The fence
that prints that boundary said:

```ts
readonly complete: (request: ModelRequest) => Promise<Result<…>>
```

[0140](../../decisions/0140-a-call-into-foreign-code-has-a-ceiling-and-the-runtime-owns-it.md)
gave `complete` a second parameter on 13 September and
`src/interpretation/client.ts` grew it on the 20th, in commit `d35c105`. The
lesson printed the one-argument signature for six days, **with every exercise in
it green** — because an exercise calls the seam through a double the lesson writes
itself, and a double satisfies a one-argument signature and a two-argument one
identically. That is the exact shape lesson 09's repair report predicted nothing
would ever reach, and `lessons/README.md` said so in a paragraph this run had to
rewrite.

Found by a program, in the same run that wrote the program, and the message names
the place: `lessons/11-the-model-seam.md:159 against src/interpretation/client.ts:77`.

## What the repair turned into

Correcting a fence is four lines and would have been a poor use of the find. The
second parameter is *about* containment, which is lesson 11's whole subject, so the
lesson gained a section rather than a correction.

**`### The second argument, and the difference between a courtesy and a hole.`**
Two things worth teaching sit in that signature:

- **Why it is a second argument and not a field of `ModelRequest`.** The request is
  the thing the record is of — exercise F hashes it, and two proposals sharing a
  `promptHash` answer a question about whether two changes came from the same ask.
  How long the caller was prepared to wait must not be able to change that answer.
  What is asked and how it is asked are two objects because they have two
  lifetimes in the record.
- **Lesson 05 arriving as a parameter.** The ceiling is enforced in
  `modelInterpreter`, above this boundary rather than inside the vendor adapter, so
  a client that ignores `signal` entirely cannot delay the answer by a
  millisecond — it only fails to release the connection it is holding. Lesson 05's
  test for telling an obligation from a guarantee is *can a stranger violate it*,
  and the answer here is **yes, and nothing breaks**, which is precisely what
  entitles the runtime to ask. The general statement the section ends on: *ask
  across a seam for what you would like; keep on your own side of it what you
  cannot do without* — and which of the two a parameter is has nothing to do with
  how it is typed and everything to do with where the enforcement was put.

`ModelCallOptions` is printed as its own fence, which is the second reason to do
it this way: the sentence *it is a separate type with one field in it* is a count,
and printing the declaration is what stops that count being a claim with no second
copy. The new check holds it.

**Exercise G**, executed. The same hang twice — once through a client that
registers an abort listener, once through one that has never heard of a signal:

```
honours the signal   -> interpreter-unavailable · no reply in 5ms
ignores it           -> interpreter-unavailable · no reply in 5ms

connections released: 1
```

The rows being identical is the point, and the third line is what the second
client actually lost. Written into `src/scratch.test.ts`, run with
`pnpm vitest run src/scratch.test.ts`, deleted before committing; the course's own
runner then executed the whole Try it section and `transcripts.test.ts` compared
all seven `## Answers` fences to it, **green on the first run**, blank line
included.

Also: **Self-check 6** (why not a field of the request; what an ignoring client
costs; the one change that turns the same signature into a hole), a **Q7 answer**,
an *In the code* row for `src/deadline.ts`, and 0140 in *Deeper*.

## The spacing work

No new set, because there is no new lesson and a set is keyed to one. The new idea
went into the two sets that already reach it:

- **Set N** (two days after lesson 11) gains question 9, interleaved with 05 —
  where the ceiling is enforced, why one level up, and which of lesson 05's two
  readings the signal is.
- **Set Q** (one week after Part III) gains question 8, which is the cumulative
  version and the better of the two: *both* of Part III's seams hand something
  across that the runtime does not need honoured — the draft schema asks for
  operations without ids, `ModelCallOptions` asks a client to stop — so which of
  them would become a hole if its enforcement moved one level, and in which
  direction.

`RECOGNISED_ANSWERS` goes 50 → **51**, with the reason in its doc comment.
`lessons/README.md` gains the paragraph describing the third check, and **loses
the sentence that named this fault as unreachable** — it listed "a type signature
the runtime had stopped having" beside two things that genuinely are still out of
reach, and it was right about all three at the time.

## The defect matrix

Each fault restored in turn against a baseline of 38 passing in
`declarations.test.ts`:

| defect restored | went red |
| --- | --- |
| lesson 11's fence back to one argument | 1 |
| lesson 02 drops a field from `ElementNode` | 1 |
| lesson 02 renames a field | 1 |
| the member splitter finds nothing | 16 |
| imports are read as declarations again | 7 |
| a declaration stops at the first closing brace | 2 |
| `…` stops being a wildcard | 2 |

Two of those rows are the two real bugs this module had while being written, and
both are worth naming because both **passed**:

- **A named import and a declaration are the same two tokens in the same order.**
  `import {\n  type ChangeInterpreter,\n  fixedPolicy,\n}` puts `type
  ChangeInterpreter` at the start of a line. The first version read seventeen of
  those as declarations across the course and `src/`, then "compared" a lesson's
  import against `src/`'s import and reported a five-member drift. Loud, and
  therefore cheap.
- **A union closes its first brace four arms before the declaration ends.** The
  obvious rule — stop at the brace you opened — read one arm of five, and
  `CompositionOutcome` still passed with `members: 5` and `whole: true`, because a
  fence that abridges the same union abridges it the same way. **Two halves of one
  declaration agreed with each other**, which is this module's own subject arriving
  uninvited for the second time in two runs. It is why the reader is line-based
  rather than brace-based, and why the member count is in the census.

## Found while teaching

**One, filed for `Loom daily build`, and it is not a defect list.** Pointing the
new reader at `decisions/` and `docs/` took four minutes. Ten fences there open
with a declaration `src/` also has; five say something it does not; two of those
five are this reader's own limit and three are real:

- 0009 (29 Jul) prints `LoomPrimitiveProps` without its generics
- 0090 (24 Aug) prints `cause` as an inline union, since extracted to `NotProbeableCause`
- 0184 (**23 Sep**) prints `default: string`, and `src/` says `default: Name`

All three are **simplifications**, and in each case the declaration became *more*
precise afterwards, so a reader who copies one writes code that compiles. 0184 is
the one to look at twice: three days old, and already a simplification on the day
it was written.

So the finding is not the drift. **It is that two readings of a record's code
fence are both defensible and the repository picks neither** — snapshot as of the
record's date, or quotation of current code. A reader arriving from the generated
index will assume the second, because `Accepted` reads as current, and
`decisions/README.md` requires a status, a date, four headings and a citation and
says nothing about code. Recommended remedy is one sentence in that README rather
than a check, which is lesson 28's own order of preference applied to somebody
else's directory: the cheapest way to stop owing a second copy is to say out loud
that it was never one.

**Nothing for another lane's behavior, and `src/` was read only.** The one thing
in `src/interpretation/` that looked like an omission — an `AbortSignal` any
implementation may ignore — is argued in `deadline.ts`'s own doc comment more
carefully than this lesson now puts it, and that comment is where the section's
best sentence came from.

## This lane's own, still open

**The check does not follow a declaration assembled from others.** `RevisionPage =
PageEnds & { revisions }` has `older` and `newer` in it and this module cannot see
them, so a fence naming either is reported as naming a member that does not exist.
That is both of 0026's rows above. It is a **false red rather than a false green**,
which is the direction to be wrong in, and none of the course's seventeen fences
is affected today because every one of them spells its members out. Stated in the
module; a lesson that wants to print an intersection will find out immediately.

**The two candidates yesterday's report named are both still open**, and one of
them is now cheaper. Exercise E's comparison — supersession reciprocity — was
taken by `Loom daily build` on #395 and is no longer this lane's to want; that
same pull request also carries an interim correction to lesson 28's exercise E
transcript and **files the rewrite back to this lane**, which is the first thing
to do once it lands. It was deliberately not touched here: #395 edits
`lessons/28-corroboration.md` on its own branch, and a second edit to that file on
this one is a conflict this lane would have created for itself.

## What is next

**Part V's twelfth seam**, on exercise E's question — a fact already written twice
by convention and nowhere compared. Of the three candidates named yesterday, the
one this run makes most attractive is **a primitive's declared props against the
props its component actually reads**, because this run's module is half of the
reader it needs.

**Or lesson 28's exercise E**, rewritten properly, the moment #395 is on `main`.
That outranks a new lesson under the brief's rule about a lesson gone wrong, and
the wording currently on that branch is explicitly an interim.
