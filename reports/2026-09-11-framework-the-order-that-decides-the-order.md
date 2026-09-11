# The order that decides the order

**Date:** 11 September 2026 · **Section:** §1 (the tooling the repository owns)
· **Lane:** `Loom daily build` · **Branch:** `framework-25-where-the-face-is`
· **Pull request:** #230 (twenty-first unit)

## What this run did

`pnpm queue` said **1 of 9** open trees could be merged into `main`. It was
wrong, and this run found out why, fixed it, and measured the answer again:
**7 of 9**.

Nothing about the branches changed between those two numbers. What changed is
which branch was offered first.

## The thing that was actually wrong

`pnpm queue` is greedy in queue position: offer each branch to the tree built so
far, take the first that goes in, rescan. That is the right strategy for
branches that only change files. It is the wrong strategy when one of the
branches changes **how git merges**.

`.gitattributes` is that file. `FINDINGS.md merge=union`
([0120](../decisions/0120-a-shared-ledger-is-union-merged-and-a-generated-file-is-regenerated.md),
landed on this branch on 10 September) does not change a byte of the tree a
reader sees — it changes what git *does* when the next branch touches that path.
And git reads merge attributes from the tree being merged **into**, not from the
branch arriving. So:

- On `main` there is no `.gitattributes`.
- Every lane appends to `FINDINGS.md`.
- Therefore every pair of lanes conflicts there.
- The fix for that conflict is on #230 — **behind the conflict it fixes.**

Offered third, #230 hit the ledger conflict like everything else and the plan
gave up with one branch landed. Offered first, it goes in clean, the union
driver is in effect for every merge after it, and the ledger stops being a
conflict for anybody.

So the ordering rule this run added is not a heuristic about which branch is
nicer:

> A candidate that changes `.gitattributes` is offered before candidates that do
> not, because it is measuring a different repository from the one that will
> exist once it lands.

Among themselves such branches keep queue position, and so does everything else,
so two runs over the same branches still produce the same plan. `.gitattributes`
is matched at any depth — git reads the one in each directory it descends into —
and matched as a whole path segment, so `docs/notes.gitattributes` configures
nothing and is not promoted.

## The measurement

Before (branches in the order their pull requests were opened):

```
1 of 9 branches merge into origin/main, in this order:
  1. origin/demo-12-what-allowing-it-would-do
8 cannot be taken in this order:
  origin/framework-25-where-the-face-is — after origin/demo-12-…: FINDINGS.md
  origin/marketing-22-…                 — after origin/demo-12-…: FINDINGS.md
  origin/docs-21-…                      — after origin/demo-12-…: FINDINGS.md
  origin/portal-23-…                    — after origin/demo-12-…: FINDINGS.md
  origin/primitives-26-…                — after origin/demo-12-…: FINDINGS.md
  origin/demo-08-…                      — after origin/demo-12-…: FINDINGS.md
  origin/lessons-31-…                   — after origin/demo-12-…: FINDINGS.md
  origin/demo-13-…                      — after origin/demo-12-…: FINDINGS.md, +2
```

After:

```
7 of 9 branches merge into origin/main, in this order:
  1. origin/framework-25-where-the-face-is            (#230)
  2. origin/demo-12-what-allowing-it-would-do         (#220)
  3. origin/marketing-22-putting-it-back-is-a-change  (#242)
  4. origin/docs-21-the-code-on-the-page-compiles     (#243)
  5. origin/portal-23-four-units-one-tree             (#245)
  6. origin/demo-08-the-way-back-to-the-record        (#253)
  7. origin/lessons-31-reach                          (#254)
offered first — changes .gitattributes, so it decides how the rest merge:
  origin/framework-25-where-the-face-is
2 cannot be taken in this order:
  origin/primitives-26-… — after origin/marketing-22-…: apps/loom/app/(marketing)/_lib/copy.ts
  origin/demo-13-…       — after origin/demo-12-…, origin/demo-08-…: (demo)/demo/_components/record-card.tsx, (demo)/demo/page.tsx
```

The two that remain are genuine content collisions on one file each, and each is
filed for the lane that owns it. Neither is `FINDINGS.md`.

**Checked by hand as well as by the tool.** Before trusting the tool's new
answer I ran the same nine merges manually in a scratch worktree — `#230`, then
the other eight in turn — and got the same seven clean and the same two
conflicting, on the same paths. The tool is not being believed on its own word
about its own fix.

## The other half: thirty-seven pull requests are nine trees

Worth saying plainly because the open count is the thing that looks alarming and
is the least informative number available. `main` has not moved since
1 September and thirty-seven pull requests are open, #219 to #255.

**Twenty-eight of them are already fully contained in a newer branch of the same
lane** — measured with `git merge-base --is-ancestor` over all 37×36 pairs, not
read off the titles. Six of the seven lanes keep exactly one tree and have been
consolidating into it for a week:

| lane | tree | carries |
| --- | --- | --- |
| framework | #230 | #221, #223, #228, #236, #250 |
| primitives | #248 | #222, #229, #235, #241, #246 |
| portal | #245 | #219, #227, #234, #240 |
| docs | #243 | #225, #232, #238 |
| marketing | #242 | #224, #231, #237 |
| lessons | #254 | #226, #233, #239, #244, #247, #249, #251, #252 |
| demo | #220, #253, #255 | — |

Those twenty-eight can be closed the moment their lane's tree lands, with
nothing lost. `Loom demo` is the one lane keeping three unrelated trees, which
is also where one of the two remaining conflicts comes from; filed for that lane.

## Decisions

**No new decision record.** The rule added here is how one tool orders its
candidates — reversible in a line, and it does not define what Loom is. The
decision it serves is already written: 0120 chose the union merge on 10
September. This run is the discovery that 0120 cannot take effect until it
lands, which is context for that record rather than a new direction. The
reasoning lives in `tools/queue/plan.ts`, next to the code it governs.

Nothing superseded.

## Findings

**Filed (3):**

- *thirty-seven open pull requests are nine trees, and merging one of them first
  takes the queue from 1 to 7* — owned by `@jonathanbravecredit`. The merge
  decision, with the measurement behind it.
- *`(marketing)/_lib/copy.ts` is edited by two lanes, and that is the only thing
  keeping #248 out* — owned by `Loom primitives` and `Loom marketing`. A lane
  boundary crossed, not a merge accident.
- *the demo lane has three open trees and two of them collide* — owned by
  `Loom demo`.

**Closed (0).** This run did not close a finding. The queue defect it fixed was
found by running the tool, not by reading the ledger — and the ledger it would
have been filed in is the file that does not merge, which is the finding.

## Test numbers

`pnpm verify` on the branch head: **green**, exit 0.

| stage | result |
| --- | --- |
| `pnpm build` + `pnpm typecheck` | clean |
| `pnpm test` (runtime) | 136 files, **2,202 tests**, 0 failed |
| `pnpm findings:check` | 376 findings, **0 malformed** |
| `pnpm --filter @loom/app verify` | 158 files, **2,497 tests**, 0 failed |
| `pnpm prerender:check` | 73 prerendered pages, 307 text junctions, 0 run together |

Nothing was skipped and nothing is pending. The live-API smoke test
(`src/interpretation/anthropic.smoke.test.ts`) ran rather than skipping, so
`ANTHROPIC_API_KEY` was present in this environment.

`tools/queue` went from 22 tests to **30**. The eight added:

| test | what it pins |
| --- | --- |
| offers a branch that changes `.gitattributes` before branches that do not | the ordering itself |
| lands the whole queue that queue position would have blocked | the real defect, reduced to four branches — 1 landed becomes 4 |
| keeps queue position among branches that all change `.gitattributes` | determinism |
| counts a `.gitattributes` at any depth | git reads one per directory |
| does not promote a file that only looks like `.gitattributes` | whole-segment match |
| says which branch was offered first and why | the report line |
| says nothing about ordering when no branch changes `.gitattributes` | silence when there is nothing to explain |
| (existing five `describePlan` cases carried to the new plan shape) | — |

Nothing was skipped, weakened or quarantined. `changedFiles` is now read once
per candidate before the first merge instead of once per landed branch after the
last one; the diff is against the merge base and does not move as the tree
accumulates, so the attribution of a block to the branch that got there first is
unchanged, and its test still passes untouched.

## Open questions

1. **Merge order is now measured; merging is still not mine.** The plan above is
   a sequence somebody can run today. It ages — every push to any of the nine
   changes it — so it is worth re-running rather than trusting this file.
2. **Should `pnpm queue` be able to close the twenty-eight?** It can already
   prove containment. Reporting *"these are carried by that one"* would make the
   open count honest without anybody reading a table. Not built, because closing
   pull requests from a routine is a different kind of action from measuring
   them, and that is the maintainer's call.
3. **`FINDINGS.md` is 14,467 lines and every lane appends to it.** `merge=union`
   stops it conflicting; it does not stop it growing. A directory of one file
   per finding would do both, and would be a real migration — not proposed here,
   recorded as the question.
