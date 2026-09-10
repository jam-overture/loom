# 2026-09-10 — What the queue costs, measured

**Routine:** `Loom daily build` · **Section:** §1 (process)
**Branch:** `framework-25-where-the-face-is` (#230), nineteenth unit
**Visual:** `reports/2026-09-10-framework-what-the-queue-costs.svg`

## What was completed

Nothing has merged since 1 September. Thirty pull requests are open across seven
lanes. Every framework run since has recommended merging something, and none of
them could say what merging would actually cost — the question had never been
asked in a form that produces a number.

`pnpm queue` asks it by performing the merges. It takes a base and a list of
branches, builds a scratch worktree, and tries each branch against the tree
accumulated so far, restarting the scan after every take because taking one
changes every later answer. It reports the order that works and, for everything
left over, the files git could not reconcile and which already-landed branch
touched them.

Run against `origin/main` at `d7375ef`, oldest pull request first, in twenty
seconds:

> **7 of 30 branches merge. Twenty-two of the twenty-three blocked name
> `FINDINGS.md`, and nothing else.**

That is not seven lanes disagreeing about code. Every routine's last act is to
append an entry to the bottom of one file, so every pair of branches adds
different text at the same place, and git calls that a conflict every time. The
channel the routines use to talk to each other is what is stopping their work
from landing.

Two measured counterfactuals, run the same way against probe bases:

| base | branches that merge |
| --- | --- |
| `origin/main` today | **7** of 30 |
| `+ FINDINGS.md merge=union` | **24** of 30 |
| `+ generated files resolved by regeneration` | **28** of 30 |

So three lines in `.gitattributes` take the queue from seven to twenty-eight.
Those three lines are in this change, with
[0120](../decisions/0120-a-shared-ledger-is-union-merged-and-a-generated-file-is-regenerated.md)
for why. `union` is a built-in git merge driver and needs no configuration at
all; the `ours` driver used for the two generated files is not built in, so the
root `prepare` script sets it and `pnpm install` — step five of every routine's
procedure — configures it.

The two branches that still collide are a real content conflict on
`apps/loom/app/(marketing)/_lib/copy.ts` between the marketing and primitives
lanes. Filed for them, not fixed here.

## The half that makes union safe

Union never fails. That is the point, and it is also the hazard: where two
routines edit the *same* line — closing a finding by editing its status is
exactly that — both lines survive and nobody is told.

`pnpm findings:check` now runs inside `pnpm verify` and reads the ledger. Every
entry must name a filer, an owner and a status; a second status is allowed only
where the entry says it keeps the original, which is the convention twelve
closed findings already follow.

**It found two defects on its first run, both predating this change.** One entry
carried two contradictory `**Status:**` lines — *"Nothing is built"* above
*"built, and blocked on one decision"* — with nothing saying which was current,
and one duplicated sentence pointing at two different records. Another was a
bare heading whose body a merge had dropped, sitting immediately above the
surviving copy of the same finding. Both were this lane's own entries and both
are repaired here. Neither was introduced by union: they are what hand-resolving
this file thirty times already cost, invisible because nothing had ever read the
file except people.

## Decisions taken that were not specified

- **The check accepts two statuses, not one.** Requiring one would have been
  simpler and would have deleted the thing that makes a closed finding readable —
  what it claimed before somebody answered it. Twelve entries already do this
  correctly and the rule was written to fit them, not the other way round.
- **The check was twice too literal, and both times the data was right.** The
  first draft looked for the exact string *"Original status below"* and accused
  two well-formed entries: one wraps that sentence across a line break, the
  other says *"Original text below"*. The second draft counted a `**Status:**`
  that an entry was *quoting* to describe this very defect. Both were fixed in
  the check. A check that fails on where a paragraph happened to wrap is one
  people learn to ignore.
- **`pnpm queue` is not in `verify`.** It performs merges, it is quadratic in
  the number of branches, and its answer is about the repository this minute
  rather than about the change in front of you.
- **It has no default branch list.** On this repository `--all` is a hundred and
  forty-five branches, most of them abandoned pull requests. A tool whose default
  takes an hour is a tool nobody runs, so a run with nothing to measure prints
  the three ways to give it something.
- **Nothing here talks to GitHub.** The open set arrives on stdin or as
  arguments. The tool needs no token, and a run with the API unavailable still
  measures.

## Records

- **0120** added, `Accepted` — a shared ledger is union-merged, and a generated
  file is regenerated. Four alternatives recorded with why each was rejected,
  including one-file-per-finding, which is better on the merits and was rejected
  on coordination cost across seven lanes.
- `pnpm decisions:index` regenerated. It prints `note:` for 0106 and 0110, both
  claimed on branches that have not merged, and exits 0.

## Findings

**Closed:**

- *one file blocks 22 of the 30 open branches* — filed and closed by this run.
- *the pairings probe cannot see an ink behind an optional prop* (`Loom
  primitives`, 2 September) — **both halves were already done and neither was
  recorded on a mergeable branch.** Item 1, promoting the `accent-strong` on
  `bg-surface` row to `painted`, is in `src/theme/contrast.ts`. Item 2, deciding
  what the probe does about optional props, was answered the way the finding's
  own second option describes: refuse to guess, and state the gap —
  `RegistryPairings.unprobedProps` names every declared prop no configuration
  sets. Recorded here so a run reading a merged `main` does not rebuild them.

**Filed:**

- *the last two branches in the queue collide on one marketing file* — owned by
  `Loom marketing` and `Loom primitives`. It is the 19 August finding about
  `facts.test.ts` pinning a decision count, arriving with a measured price.

**Read and not acted on:** the three findings this lane owns that are waiting on
the maintainer rather than on engineering — whether `derivePalette`'s `clean`
should widen, whether a palette carries semantic status slots, and which of two
fixes the failing pairings get. The oldest is twenty-two days old.

## Test numbers

| | after | before |
| --- | --- | --- |
| runtime tests | **2,168** across 134 files | 2,130 across 132 files |
| application tests | **2,497** across 158 files | 2,497 across 158 files |
| findings checked | **370**, 0 malformed | not read by anything |
| prerendered pages | 73, 307 junctions, 0 run together | same |

`pnpm verify` exit 0. Thirty-eight tests added, all against doubles: the queue's
merge tree is three methods and every assertion runs on a machine with none of
those branches on it. Nothing failed and nothing was skipped.

## Open questions

- **The queue measurement is a snapshot, and it decays.** It was true at
  `d7375ef` with those thirty heads. Anyone pushing changes it. The tool is
  cheap enough to re-run rather than trust, which is the answer, but the number
  in this report should not be quoted next week.
- **Union is a floor, not a ceiling.** If `findings:check` starts finding
  doubled statuses regularly, that is the signal that the one-file ledger has
  outgrown a merge driver and wants the `findings/` directory 0120 rejected for
  now.
- **Nothing here can make anyone merge.** This run removes the reason not to and
  measures what removing it buys. Twenty-eight of thirty is the number.
