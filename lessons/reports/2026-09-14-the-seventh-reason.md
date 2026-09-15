# 2026-09-14 — Lesson 18 repaired: the seventh reason, and the one nothing could produce

**Landed:** a repair of `lessons/18-data.md`, one stale instruction fixed in
`lessons/09-the-gate.md`, the syllabus row in `lessons/README.md`, the transcript
count in `apps/loom/app/(lessons)/_lib/transcripts.test.ts`, three findings
closed and one filed in `FINDINGS.md`.

`pnpm install && pnpm verify`: **green, exit 0.** Runtime 2,446 tests across 143
files; application 4,163 tests across 244 files; 615 findings, 0 malformed; 99
prerendered pages, 752 text junctions, 0 run together. **No test was added or
removed** anywhere in the repository — the only `it(` declarations in this diff
are inside lesson fences, which run in the exercise sandbox rather than as
suites — so those two counts are `main`'s, by construction rather than by
measurement.

The branch is cut from `main` at `0b21266`, which is four commits newer than the
checkout this run started in; the exercises were re-run and `pnpm verify` re-run
in full after rebasing, because three of those four commits touch `src/`.

**A repair rather than a new lesson**, which the brief ranks above writing
lesson 25, and this was not a close call: two open findings owned by this lane
said lesson 18 was wrong, both had been open through six subsequent lessons, and
the lesson was in fact wrong in more places than either of them listed.

**Sixty to eighty minutes** to work through now, up from the fifty to seventy
the original report estimated. Two exercises were added and the two new sections
of The idea are long. It is still the longest lesson in the course and it is
still the one to do in one sitting.

## What was wrong

Two findings, both filed by `Loom daily build`, both owned by this lane:

- **5 September** — `DataUnavailable` has a seventh reason, and lesson 18
  teaches six. `not-resolved` was split out of `no-such-source` on 12 September,
  which was itself the closure of a finding this lane filed on 3 September.
- **12 September** — the same thing again, with the four line numbers.

Both are closed. The count was wrong in **seven** places rather than four. The
findings between them named lines 241, 317, 568 and 959; they did not name the
objectives paragraph at the top, *"all six produce a diagnostic"* in *Every
failure is total*, or the test name inside Exercise C's own code, which is the
one that would have gone on being wrong after every visible count was fixed.

And one nobody had filed, which is the larger half of this run. On 13 September
[0140](../../decisions/0140-a-call-into-foreign-code-has-a-ceiling-and-the-runtime-owns-it.md)
gave every await into foreign code a ceiling. Lesson 18 was written before it
and said, in its list of failures, *"an adapter that reports a timeout"* — which
described the only route that existed when it was written and is now the lesser
of two. Its *In the code* section also described `src/data/resolve.ts` as
"twenty lines, one `Promise.all`", which it has not been since.

A count going stale is a small defect. The thing underneath it was not.

## What I emphasised, and why

**1. A reason nobody could produce is not a reason, it is a sentence.**

This is the new spine of the lesson and it is the part I would defend hardest.
`unavailable` has been in the union since the seam was designed on 15 August. Its
definition reads *"ask again later — a timeout, a dead connection"*.
`describeDataUnavailable` has a sentence for it, distinct from `refused`'s. The
primitive in the lesson's own preamble has a branch for it. The argument for
keeping it apart from `refused` — only one of the two is worth retrying — is
sound and always was.

And until 13 September, nothing in the runtime could produce one *for the failure
it is named for*. The only route was a host's adapter noticing its own timeout
and coming back to say so, and an adapter that hangs does not come back.

The generalisation is the thing worth a reader's month, and it is not about
timeouts: **exhaustiveness checks that every member of a union is handled and
nothing checks that any member is reachable.** A union is a claim about what can
happen, and the compiler holds you to the second half of it and never to the
first. Every test passed. The switch had no missing case. The state was named,
documented, rendered, and dead.

This is also, exactly, the question lesson 24 left for the next seam — *when your
system cannot answer, what does it return, and who would notice if it started
returning that when it could?* — arriving backwards, in a lesson six numbers
earlier. I said so in the lesson's closing section rather than leaving it to be
noticed.

**2. The seventh reason is an address for a person, not a label for a state.**

`not-resolved` is the only one of the seven that neither a tree nor an adapter
can cause. Six of them are faults on the far side of the seam, fixed by whoever
owns the data or whoever wrote the binding. This one is a fault in the
composition root, between two calls that are each correct.

Which is why sorting the union by *who fixes it* — rather than by what is true,
which is how a union is usually read — is the only reading that explains why
there are seven and not six. The parable is in `adapter.ts` and I quoted it
twice on purpose: sharing a code with `no-such-source` produced the diagnostic
*"no source is registered for it — this binding was never resolved"*, two
sentences contradicting each other, sending one reader to the registry and the
other to the composition root, for a fault that was only ever one of the two.

**3. The abort signal, which is the half that is invisible in the page.**

Exercise G has two adapters that never answer, one listening for the abort and
one ignoring it, and **they are indistinguishable from the page's side**. The
deaf one cannot delay anything; what it can do is hold a connection for a result
nobody will read. The difference shows up in a deployment under load, which is
the worst place to find out about it. That is why the signal is in the adapter's
signature rather than being advice in a doc comment, and it is the one part of
0140 that a reader would skim past.

**4. What the lesson guessed about Part V, and what happened.**

The old closing section said *"Where Part V goes next is genuinely open. This
lesson is the first of a part that has one lesson in it."* Part V has seven
lessons now, so a reader arriving at 18 today was being told something false
about the course they are in the middle of. I rewrote it as what it actually is
— a guess, scored — because the guess was right about the next two seams and
broke at the fourth, and knowing that a pattern is about to break is worth more
before you read the lessons that break it than after.

## The exercises

Eight now. All eight were executed against this checkout's `src/` before
anything was written down, by extracting the `ts` fences from the Try it section
in document order into `src/scratch.test.ts` and running
`pnpm vitest run src/scratch.test.ts`. The transcripts in the lesson are that
run's. `src/scratch.test.ts` is deleted.

**The six that existed still print exactly what the lesson said they printed** —
checked first, before anything was edited, because a repair that also breaks
something is worse than the staleness it fixes. Nothing in A–F drifted.

**Exercise G — the source that never comes back.** Three sources; two return a
promise nobody ever settles, one answers at once. Held to a 20ms ceiling:

```
unavailable — the source could not be reached — no answer in 20ms
unavailable — the source could not be reached — no answer in 20ms
ready — ["Coaching"]
adapters told to stop: hang.listening
the ceiling nobody named: 10s
```

The headline is that **the test finishes**. Before 13 September this program
hangs until vitest kills it. Nothing here is a `setTimeout` standing in for a
slow integration — a `setTimeout` is a call that comes back.

The third line is the one I would not have predicted and is why the exercise has
a fast source in it at all: `quick.fine` has its answer. The ceiling is per
source because the questions are independent, so one dead integration costs one
region rather than the page — which is the same *a page's latency is the slowest
of its integrations* argument Exercise E makes, extended to the case where there
is no latency because there is no answer.

**Exercise H — the seventh reason.** Every source registered and working,
nothing in the tree malformed, and:

```
n_1: ready — ["Coaching","Advising"]
n_2: not-resolved — nothing resolved it — the answers came from resolving a different plan than this tree
```

What makes it teach is what it took to build. Every other reason in the lesson
comes out of `resolveTreeData`, the one call an ordinary caller makes. This one
needed `buildDataResolution` — the pure half underneath — and an answers map
built by hand that does not cover the plan it is handed. The lesson asks the
reader to try to produce it from Exercise C's registry first, which cannot be
done, and that failure is the evidence for everything the section then claims.

I also printed `registry, untouched: 1 source` into the transcript deliberately,
to be read against `no-such-source`'s detail in Exercise C, which is a list of
what *was* registered. Both faults produce a node with no data; nothing you do
to the registry fixes the second one.

## Found while teaching

**A bound tree rendered against `EMPTY_DATA_RESOLUTION` drops every question in
silence.** Filed for `Loom daily build`; `src/data/` is that lane's.

Writing Exercise H meant asking what *else* hands a bound tree no answers, and
there turn out to be three routes with three different amounts of noise:

| what the caller passes as `data` | the node renders | diagnostics |
| --- | --- | --- |
| nothing at all | `unbound` | 1 — `data-unresolved` |
| `EMPTY_DATA_RESOLUTION` | `unbound` | **0** |
| `buildDataResolution(plan, new Map())` | `unavailable` / `not-resolved` | 1 |

The runtime has a named diagnostic for the first and a named reason for the
third, and nothing at all for the middle one — which is the exported constant
with the obvious name, the one a host writing a composition root reaches for.
`resolution.ts` says in a comment that *a page silently missing the data it
asked for is the failure mode this whole module is arranged to prevent*, and
this route reaches that state and says nothing.

It is latent rather than live: nothing in this repository passes it. I filed it
with three shapes and picked none of them, because naming the absent case is a
design decision about what a reading owes a caller, and that belongs to the lane
that owns the seam. Exercise H is written against `buildDataResolution` and
survives any of the three.

**And one closed in passing.** The 1 September finding about lesson 09's
preamble — `formTree` was added to the fence at some point before this run, so
`run.test.ts > runs the exercises in lesson 9` is green on `main`, but the prose
at line 806 still told the reader to add an import that was already there. Fixed,
and recorded in the lesson rather than silently deleted: *a runner executes
fences and not prose* is worth a reader of this course knowing.

## What I did not do, and why

**No new review set.** The brief ties a new set to a new lesson, and this is a
repair. The two new ideas enter the rotation anyway, by the route
`review-schedule.md` describes: Self-check questions 7 and 8 are new, and a
Self-check question you miss comes back through `/lessons/review/corrections` on
the same terms as a review-set question. Set W was read for staleness — it does
not state a count, and question 7's *"there are at least four"* is still true.

**I did not take up the offer in the 5 September finding** to export the reasons
as a `DATA_UNAVAILABLE_REASONS` value so the course could derive the number. A
count in prose going stale is a prose problem, and the mechanism that catches
this class of drift already exists and is this lane's: `transcripts.test.ts`
compares every printed line in every lesson against what the program actually
prints, on every run of `pnpm verify`. What it does not check is prose *about*
the code, which is what went wrong here — and no export fixes that either.

**I did not write lesson 25.** Part V's next seam should still be chosen by
lesson 24's question, and the finding this run filed is itself an instance of it:
a system answering "nothing" where "nothing" is two facts. If that is fixed, it
is a candidate seam; if it is not, it is still a candidate, and lesson 18 now
carries the vocabulary for it.

## What is next

The obvious hand-forward is that **lesson 18's Exercise G goes stale the day
anybody changes the ceiling's default**, and unlike the count that went stale
this time, that one is caught automatically: `10s` is printed from
`describeCeiling(DEFAULT_SOURCE_CEILING_MS)` into a transcript that
`transcripts.test.ts` reads, so a change to the number turns `pnpm verify` red
in the run that made it, naming the lesson. That is what the promise about
executed exercises is supposed to feel like when it is working.

The less obvious one is a syllabus question I am leaving open. This run found
that lesson 18 was wrong in seven places and only four had been filed, and the
three nobody caught were all in prose *around* the code rather than in the code
or its output. The course has a machine that checks what a lesson says the code
prints. It has nothing that checks what a lesson says the code *is* — file
lengths, function names, "there are six of these". I do not think the answer is
another checker, and I am fairly sure the answer is not "be more careful". It
may be that a lesson should not state a count it did not print.
