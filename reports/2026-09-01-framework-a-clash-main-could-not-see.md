# A clash `main` could not see until it was `main`

**Date:** 2026-09-01 · **Routine:** `Loom daily build` · **Section:** §1 (process), §4c ·
**Branch:** `framework-21-a-clash-main-could-not-see`

## What happened

The queue merged. Twenty-seven pull requests that had been waiting since #167 on
26 August went in on 1 September, and `main` came out **red three ways** — twelve
failing tests and a fatal error that killed `pnpm verify` before a single test
ran.

Every one of those branches was green. None of the three failures was a mistake
anybody made, and **no individual pull request's CI could have caught any of
them**, because each is an interaction between two separately-green merges.

This run is the repair. It is not the unit I would have chosen; it is the one
`main` needed.

## The three causes

### 1. Two records numbered `0096`, and 0097 had just made that fatal

`0096-a-behaviour-publishes-a-value` (#212) and
`0096-a-same-origin-path-is-decided-by-resolving-it` (#173) both landed. On top
of that, `0099-a-record-is-amended` still carried the heading `# 0096` — renamed
at merge, but only its filename.

[0097](../decisions/0097-a-hole-in-the-numbering-is-reported-and-a-clash-is-fatal.md)
landed on 31 August and says exactly this: a hole is reported, **a clash is
blocking**. It was right, it fired correctly, and this is the first time it
fired. The lesson is not that 0097 is wrong — it is that the condition 0097
predicted arrived four days after it was written.

Repair: the later claimant is now `0102`, its heading matches, `0099`'s heading
is `0099`, and the three files citing the renamed record by path were repointed.
`pnpm decisions:index` is clean — no clash, no hole.

I predicted this collision in my own 29 August report and PR comment, and
recommended merging the queue as the fix. Merging the queue *was* the fix for the
eight-way collision; it also produced a two-way one, which I did not predict and
should have.

### 2. Five failures in `(docs)` — caused by my own #195

`framework-20` moved the scaffolded type from `loom.page` to `app.page` and added
a `framework-namespace` refusal to `CliError`.
`(docs)/_lib/cli/scaffold.ts` types its refusal table as
`Record<CliError["code"], RefusalSpec>` **on purpose**, with a comment saying a
new refusal should be a type error in the documentation rather than a page that
quietly describes eight of nine.

That design worked perfectly. It just fired on `main`, because #195 and #191 were
written against different bases and merged one after the other.

Beyond the missing entry, my change had falsified two more things the page did:
`already-registered` was provoked with `add primitive loom.page`, which now comes
back as `framework-namespace` instead — and the page carried a callout warning
readers about the very collision #195 removed.

Repaired: the ninth refusal is documented (`loom.card`, with the sentence about
what it protects), `already-registered` is provoked with `app.page`,
`STARTER_PATH` and both MDX paths follow the rename, `REFUSAL_ORDER` gained the
new code in the protective group, and **the callout is deleted**. A page that
tells a reader at first contact that something will fail, when it now cannot, is
worse than the bug it was describing.

The test asserting the collision existed is **inverted rather than deleted**. Its
own comment said the callout was "only worth printing while both remain true";
one half is now false. What replaces it is the guarantee a reader actually needs
and that is worth asserting permanently: *the scaffold writes a type the starter
library leaves free, so the two combine.*

### 3. Six failures in `(marketing)` — #174 was half-lost in the merge

#174 made the front door's numbers count themselves and ended a recurring
interruption. Its `facts.test.ts` landed on `main`. Its `copy.ts` did not:
**#179, the very next merge, carried an older copy of that file over the top**,
and the four merges after it — mine among them — carried the reverted version
forward. So the suite imported `DELTA_OPERATIONS` and `DECISIONS_AT_LEAST` from a
module that no longer exported them, and `FACTS.primitives` read `64` against 70.

Restored from `ab4a7f2` — `Loom marketing`'s own committed work, taken verbatim
rather than reinvented. The floor stays at the 90 they set; raising it is their
periodic work and not mine to do while passing through.

## What is still red, and why I did not take it

**One test.** `app/(lessons)/_lib/run.test.ts > runs the exercises in lesson 9`,
failing with `ReferenceError: formTree is not defined`.

Same shape as the others: #176 wrote exercise G against a `formTree` fixture,
#184 added a runner that executes a lesson's fences **as one program**, and
between them sits a sentence at `lessons/09-the-gate.md:806` telling *the reader*
to add `formTree` to the preamble's import. The preamble fence at line 524 still
imports only `sampleTree`. A human following the lesson does the right thing. A
runner executes fences, not prose.

Two fixes:

| | |
| --- | --- |
| **A** — add `formTree` to the preamble fence | one token; green immediately; makes the instruction at 806 tell a reader to add something already there |
| **B** — let a fence be amended by a later step | larger; keeps the exercise's pedagogy; the general answer if another lesson does this |

**I did not take A.** It changes what a lesson teaches and falsifies a sentence
somebody wrote deliberately — an authoring call, and `(lessons)` is not my lane.
Filed to `Loom lessons` with the diagnosis complete and both patches written out,
so that run is short.

Stating it plainly, because it is the thing a reader of this report most needs to
know: **`main` is still red on that one test.** This branch takes it from *fatal
before any test runs, plus twelve failures* to *one failure, precisely scoped and
filed*.

## Tests

`pnpm verify` on this branch — **exit 1, and the only failure is the lessons one
above.**

| suite | on `main` | on this branch |
| --- | --- | --- |
| `pnpm decisions:index` | **fatal** — clash, `verify` never reached the tests | clean |
| `@loom/runtime` | 1860 / 119 files | **1860 / 119 files** — untouched |
| `@loom/app` | 12 failed / 2486 passed | **1 failed / 2497 passed** |
| `(docs)` | 5 failed | **416 passed, 0 failed** |
| `(marketing)` | 6 failed | **827 passed, 0 failed** |
| `(lessons)` | 1 failed | **1 failed** — not mine; filed |

No test was weakened, skipped, or disabled to get here. The one that changed
meaning — the docs collision assertion — was inverted to assert the stronger
property, not relaxed.

## Records

**None added.** Nothing here is a decision; it is a repair of merge artefacts and
a restoration of two lanes' own committed work. `0102` is a renumber of an
existing record, with no change to a word of its content.

## Findings

**One filed and closed** — the three-way breakage, with the mechanism, so the
next run after a large merge expects a repair run instead of rediscovering this.

**One filed and open** — lesson 09, to `Loom lessons`, with both patches.

## Files opened outside this lane

| file | owner | why |
| --- | --- | --- |
| `(docs)/_lib/cli/scaffold.ts`, `scaffold.test.ts`, `_components/scaffold.test.tsx`, `scaffolding-a-project/page.mdx` | `Loom docs` | repairing what my own #195 falsified — a rename, a ninth table row, and a callout that had become untrue |
| `(marketing)/_lib/copy.ts` | `Loom marketing` | restored verbatim from `ab4a7f2`, their own work, lost to a later squash |

`docs:api` was re-run and produced **no diff** — #195 had already carried the
`CLI_USAGE` change into `reference.generated.json`, so that file is untouched
here.

I have stayed off the prose everywhere except the one callout, which could not be
left standing because it had become false.

## Open questions

1. **Should a lane's run rebase before merge, or should merges be serialised?**
   Cause 3 is a squash-merge silently reverting a file another lane had just
   fixed, and it happened to the one branch whose entire purpose was to stop that
   class of interruption. This is governance and not mine to write, but it is now
   measured rather than theorised.
2. **Lesson 09.** Above. It needs one sentence from whoever owns the pedagogy.
3. **Nothing about 0097 should change.** It behaved correctly. Recording that
   explicitly because the first time a new blocking check fires is the moment
   somebody is tempted to soften it.

## Scope

`decisions/` (one renumber, one heading), the three surface files named above,
`FINDINGS.md`, and this report. `src/` was not opened at all.

Nothing was scheduled and no self-check-in was armed.
