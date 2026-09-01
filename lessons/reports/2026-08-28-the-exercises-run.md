# 2026-08-28 — Machinery: the exercises run

**Landed:** the exercise runner —
`apps/loom/app/(lessons)/_lib/exercises.ts`, `_lib/run.ts`, `_lib/run.test.ts`,
a rebuilt Try it section in `_components/lesson-reader.tsx` and
`lessons/[lesson]/page.tsx`, two sentences in `lessons/README.md`, and one fix
to `lessons/06-undo-as-computation.md` that the runner found on its first pass.

`pnpm verify` is green on everything this lane owns: 1741 runtime tests across
111 files, 1991 of 1992 app tests across 135, `next build` prerenders the same
67 pages. **The one failure is on `main` and was red before this branch
existed** —
`(marketing)/_lib/facts.test.ts` expects 95 decision records and counts 94.
Marketing owns that file, `Loom daily build` owns `decisions/`, and #182's title
says main was already known to be red. Not touched.

## Machinery rather than a lesson, and why there was no choice

**The syllabus is finished.** Lesson 17 is the last one in it and it is written
— on #168, open since Tuesday. #176, open since yesterday, is lesson 09's
seventh rung. Both are unmerged and neither has a word of reader feedback on it,
and the two questions those runs put to the maintainer — what the next run does
now the syllabus is done, and whether there is a Part V — are still open. There
is no lesson this run can write that is not either a duplicate of #168 or an
answer to a question that was asked of somebody else.

That leaves the machinery, and the machinery had exactly one item left.
Write-before-reveal, confidence-before-reveal and the live due queue all landed
in #136. **Runnable exercises** is the fourth thing the brief asked for and the
only one never started, and the last two runs both proposed it as the next
thing to do. This is that.

**This branch is deliberately disjoint from both open lessons PRs.** It does not
touch `review-schedule.md`, lesson 08, 09 or 17, or the syllabus table — the
only overlap with #168 is `lessons/README.md`, in a different section. All three
can merge in any order.

## What it does

Each Try it section is a program. That is not a new claim — the fences
concatenate, the first one declares the imports and `spare` and `deltaOf`, and
the reader is told to paste the lot into `src/scratch.test.ts` — but nothing had
ever treated it as one. Now something does: the section is compiled with the
TypeScript compiler, its `./tree/apply.js`-style specifiers are resolved against
the `src/` in this checkout, and it is executed, when the page is built.

Across the sixteen written lessons that is **89 fences, 88 of which are the
program, 85 tests and 379 printed lines, in just under four seconds.**

On the page, under each fence that prints something:

- **A prediction, taken first.** Rating, then writing, then commit — the same
  control Predict and the review sets use.
- **Every transcript at once, when the last prediction lands.** Not one at a
  time. Try it says "predict every output in writing before you run anything",
  and releasing each transcript on its own prediction would make exercise 6 a
  measurably easier question than exercise 1. Seventy-seven of the eighty-eight
  fences take a prediction; the other eleven are preambles that print nothing,
  and asking a reader to predict the output of a list of imports is asking a
  question with no answer.
- **The printed answers behind the same gate**, which is a tightening. It used
  to be one summary of everything you predicted; it is now every prediction,
  one fence at a time, and the answers explain output you have already been
  shown rather than output you are about to guess at.

## What I emphasised, and why

**The line the transcript is on the page to make true.** `lessons/README.md`
has said since lesson 01 that every exercise in this course was executed before
it was written down. That was a promise about a routine's discipline, made in
prose and checked by nobody — and two of the first three lessons shipped with a
wrong output anyway, which is in the correction report from 5 August. It is now
a test. `run.test.ts` runs all sixteen lessons and names the one that broke.

**Which means this is a merge gate for the whole repository, on purpose.**
Rename an export in `src/` and the lessons suite goes red in the run that did
the renaming, with the lesson number and the error. That is a cost I am
imposing on three other lanes and it should be said plainly rather than
discovered. The alternative is the course going quietly wrong, which is what
both of the last two runs filed against themselves: #168 found the Gate had
grown a rung a week earlier, #176 found that every executed output in lesson 09
had stayed correct the whole time it was wrong. Executed outputs are the half
of the course that *can* be checked mechanically. Now they are.

**Nothing was made easier.** The transcript is closer than the checkout and
further away than the Answers section it replaces — you cannot reach it by
scrolling, and there is no order of operations that gets it in front of you
before you have committed to something. A reader who wants to change a line and
see what happens still has the paste-into-a-checkout route, and that is now the
only thing that route is for.

**The distinction the code had to learn.** A fence is part of the program if it
imports something or registers a test; otherwise it is an illustration. There is
exactly one illustration in the whole course — lesson 03's list of four
operation literals, which is a `ReferenceError` on line one if you concatenate
it — and the rule exists for it. It is stated in one regular expression in
`exercises.ts` and both readings of it are the obvious one, which was the test I
held it to: an author should not have to remember a convention to have their
fence run.

## What the exercises revealed

**Lesson 06's Try it did not run as pasted, and had not since it was written on
7 August.** The shared preamble imports `buildText` and not `buildElement`, and
the section uses `buildElement` twice and `childrenOf` three times. A sentence
after exercise B's fence says where they come from — "`buildElement` and
`childrenOf` come from `./tree/builders.js` and `./tree/node.js`" — so the
information was there and the file was not. Every reader who followed the
lesson's own instruction hit a `ReferenceError` before seeing a single output.

Fixed here: both imports moved into the preamble, and the sentence deleted
because it now says nothing the fence above it does not. Three weeks, unnoticed,
in the one lesson whose exercises are the argument.

It is worth being exact about what this says. The outputs in lesson 06 were
almost certainly executed when it was written — you cannot invent
`invertOperations` output — and were executed from a file that had the import
in it. What shipped was the *fence*, and nobody re-pasted the fences. The
discipline was real and the artefact was still broken, which is a fair summary
of why the check should not be a discipline.

**Everything else ran.** Fifteen of the sixteen lessons were clean on the first
attempt, which is a better result than I expected and is the reason this run
produced one fix rather than a list.

## Found while teaching

**One, filed for `Loom daily build`: the runner cannot run in the reader's
browser, and the reason is not in this lane.**

The brief's wording is "running it on the page". This runs at build and shows
the reader the output; it does not let them edit a line and re-run. Doing that
means executing in the browser, and three facts prevent it — `src/testing/**`
is excluded from `tsconfig.build.json`, so `dist/testing/` does not exist;
`@loom/runtime` has no `./testing` export; and `zod` is a dependency of the
runtime and not of the application. The first decides it on its own:
`./testing/fixtures.js` is the most-imported specifier in the entire course,
seventeen fences, ahead of `./ids.js`, because `sampleTree()` is the tree every
lesson reasons about.

What I did not do about it is the part worth recording. Reimplementing
`sampleTree` inside `app/(lessons)/` would have made the browser version work
this afternoon and would produce output that agrees with the lesson and
disagrees with Loom — the exact failure the whole exercise discipline exists to
prevent. Adding `zod` to `apps/loom/package.json` is one line and a lockfile
change, which with fifteen open pull requests is a conflict in all fifteen, and
it is not my file. The finding asks the question rather than demanding the
change: whether the runtime should publish its test fixtures is a real decision
with a defensible answer either way, and the build-time runner is worth having
regardless of how it goes.

Nothing else. In particular `loom.code` clips long lines in the screenshot and
does not need filing — it sets `overflowX: "auto"` and scrolls.

## What is next

Unchanged and still not mine to decide: the syllabus is finished, #168 and #176
are waiting, and the two questions in them are the two questions. If the answer
is a Part V, §5 has enough settled material for one — holds landed under 0088 on
23 August and are now five days old. If the answer is more machinery, the
browser runner is the obvious next thing and is blocked on the finding above.

If nobody answers before the next run, the honest default is the lesson-09
correction on #176 — that PR is a week's worth of two review sets teaching a
list with a rung missing, and it is the only thing outstanding that is a defect
rather than a preference.
