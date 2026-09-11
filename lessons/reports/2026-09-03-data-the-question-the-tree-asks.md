# 2026-09-03 — Lesson 18: the question the tree asks

**Landed:** `lessons/18-data.md`, Part V and its one row in `lessons/README.md`,
Set W in `lessons/review-schedule.md`, and the four places in
`apps/loom/app/(lessons)/` that counted the sets and had to stop saying
twenty-two.

`pnpm install && pnpm verify`: **green in full** — 1860 runtime tests across 119
files, 2498 app tests across 158 files, `next build` prerendering **79 pages**,
two more than before (`/lessons/18` and `/lessons/review/set-w`). `main` was
green when this branch was cut, checked rather than assumed: the same command
was run on `d7375ef` first and exited 0.

Roughly **fifty to seventy minutes** to work through, which is the longest lesson
in the course after 14 and 16. Six exercises, and three of them have answers most
readers get wrong in three different directions.

## A lesson, and it meant opening Part V without an answer

The alternation is a lesson this run — [31 August](2026-08-31-the-questions-that-come-back.md)
and [2 September](2026-09-02-the-lesson-questions-come-back.md) were both
machinery, and two of the brief's four asks for the surface plus the two the
schedule asked for are all built. Rule 5 outranks the syllabus, so the first
thing this run did was look for a lesson that had gone wrong rather than a lesson
that was missing:

- Every `src/…` path cited across lessons 01–17 still exists. Eighty-two are
  named; eighty-one resolve, and the eighty-second is `src/scratch.test.ts`,
  which is gitignored and is meant not to.
- No lesson cites a record that has been superseded since it was written. The
  four partial supersessions on `main` (0027→0029, 0032→0035, 0054→0061,
  0060→0063) are all either already cited alongside the record that superseded
  them or in territory no lesson covers.
- Every Try it program in the course runs, which the suite now asserts rather
  than a routine remembering to.

So no correction was owed, and that left the thing two runs in a row have
deferred to the maintainer and had no answer to: **is there a Part V.**

I have opened one. The reasoning, so it can be overruled cheaply:

Deferring again would have been the third run in a row where the course gained
no content because a question got no reply, and silence is not an answer either
way. The syllabus lives in `lessons/README.md`, which is this lane's file and
which this lane wrote in the first place — extending it is inside the lane in a
way that, say, editing `decisions/` would not be. And the brief's own escape
hatch is rule 2 rather than rule 3: teach what is **settled**. `src/data/` is
settled by a distance — 0058 was accepted on 15 August, the module has not been
touched since 24 August, and nothing open contradicts it.

Part V is named **What the tree cannot hold**, and the README says out loud that
it has one lesson in it and that how far it runs is not a routine's decision.

## Why data, of the things not yet taught

Three candidates were actually settled: `src/data/`, `src/testing/`'s contract
suites, and the CLI scaffold. Data wins on one argument.

It is the first thing in the course that **breaks a promise an earlier lesson
made**. 0050 opened the reserved namespace saying it would keep "the page a
function of the tree alone"; a tree that asks a question does not have that
property, and 0058 records the loss in its own consequences rather than letting
somebody find it. A course that only ever adds is a course where every lesson
confirms the last one, and a reader finishes it unable to tell which claims were
load-bearing. This one takes something back and says what survives:

> The tree alone determines what is asked.

The other reason is that data is where three earlier lessons come due at once —
14's purity, 05's clock, 15's registry — which is what a Part V lesson should be
doing if Parts I–IV worked.

## What I emphasised, and what I deliberately did not

**The argument against putting the answer in props is about what the tree
becomes, not about staleness.** This is the lesson's Predict 1, and the wrong
answer is *available and reasonable*: a reader who says "the data would be
stale" has found a real cost and missed the fatal one, which is that `configure`
against a database-filled prop is a proposal against content nobody authored and
its inverse restores data rather than a decision. Predict 1 asks for the obvious
design first and then asks the reader to kill it, because the argument is the
lesson.

**The six reasons matter less than the seventh state that is not a reason.** A
source with nothing to report answers `ready` with an empty list. Exercise C
makes that a *count* — six diagnostics for seven bindings — which is harder to
skim past than a sentence.

**"Empty is not a failure" is lesson 12's rule in its third costume**, and I said
so explicitly rather than leaving it to be noticed: two failures that would
produce different downstream answers must not be one code, applied in 12 to what
a model is told, in 14 to what a page does, and here to what a visitor is told
about their own business. Different party protected each time. If two lessons
feel like unrelated facts the course has failed, so the elaboration prompts and
Set W both make the reader find the third instance themselves.

**What I did not do** is teach the shape of `loom:data`. There is one JSON
example and it is four lines. A reader who finishes should be able to derive why
a binding cannot contain an answer, not recite the key order; the API surface is
in the doc comments and they are better than anything I would paraphrase.

## What the exercises turned up

All six were executed, from the fences as published — the scratch file was
regenerated by extracting the lesson's own ```ts blocks rather than retyped, so
the transcripts are that program's output and not a transcript of a similar one.
`src/scratch.test.ts` is deleted.

**Exercise B was the one worth building the lesson around.** Four nodes ask;
the host's code is called **twice**. The interesting wrong answer is not four,
it is *three* — what you get if you dedupe by source id and ignore params, which
is a design that quietly serves one node the wrong list. Two of the four nodes
ask with `{ kind, limit }` and `{ limit, kind }`, and the printed request key is
sorted into neither node's spelling. Deduplication here is exact or it is a bug,
and seeing the canonicalised key is what makes that visible.

**Exercise D is the one I expect an argument about, which is why it is in.** A
node declaring one good binding and one misspelled source id gets `requests=0` —
the good binding is not asked. I wrote the exercise expecting to defend the
decision on principle and found a better defence in the failure it prevents: an
`about` block with a name, a photo and a misspelled bio renders as a person who
has not written a bio yet. Plausible, unbroken, and invisible. That is the same
argument lesson 14 used to reject promoting an unknown primitive's children, and
the lesson names the general form: **a failure that produces a plausible page is
worse than one that produces an obviously broken page.**

**Exercise E prints six lines and no timings.** The first draft measured elapsed
milliseconds, which would have put a number in a transcript that the build
regenerates on every deploy. Three adapters with descending delays make the same
point deterministically: every `ask` before any `answer`, and the answers in
reverse. A page's latency is the slowest of its integrations, not the sum.

**Exercise F is a deliberate rhyme with lesson 14's Exercise D.** Both produce
"the same tree, two things, two different pages"; lesson 14 told the reader to be
uncomfortable about it, and this one says it is the feature. The lesson makes the
reader state the axis: a validator changing the page means the deployment's
schema version decides what the tree describes, and a registry changing the page
means the host's data fills a named hole the tree deliberately left.

## Found while teaching

Two, both in `src/data/`, both for `Loom daily build`, both filed in
`FINDINGS.md` and neither fixed here.

1. **`no-such-source` means two different things.** `buildDataResolution`
   synthesises it for a planned binding with no answer — a caller that resolved a
   different plan than the one it is rendering — so a diagnostic reading "no
   source is registered for it" can mean "your composition root is wrong". Two
   faults, two different fixes, one code. It is lesson 12's rule broken inside
   the module whose own comments teach it, which is the only reason I noticed:
   writing that paragraph sent me back to check that the six reasons really were
   six distinct things.
2. **The diagnostic for a bad source id says `Invalid`.** Zod's default for a
   failed pattern. `describeDataRegistryError` gives the same mistake a full
   sentence — "expected dot-namespaced kebab-case, like `commerce.products`" —
   and the asymmetry is backwards: the registry error reaches somebody with the
   code open, and the diagnostic reaches somebody reading a page.

One thing that is **not** a finding, recorded so the next run does not re-file
it: `no-such-source`'s detail enumerates every registered source id. That reads
like a leak and is not one — a diagnostic is host-side, the ids are the host's
own registrations, and it is exactly what somebody debugging needs.

## What is next

The honest answer is that it depends on an answer. Part V has one lesson and a
named shape; `loom:submit` (0065) and a frame's origin (0095) are the same shape
as a binding and would make it three. If that is wrong, this lesson stands alone
perfectly well as an appendix and the README says so without needing an edit.

If it is machinery instead, the queue's own second half is still unbuilt and is
smaller than it was: lesson predictions now enter the corrections queue (#226),
but a reader's Reflect answers still go nowhere.
