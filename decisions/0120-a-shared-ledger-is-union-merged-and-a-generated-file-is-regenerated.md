# 0120 — A shared ledger is union-merged, and a generated file is regenerated

**Status:** Accepted
**Date:** 2026-09-10
**Section:** §1 (process)

## Context

Nothing has merged since 1 September. Thirty pull requests are open across seven
lanes, each lane holding one tree, and no one has known whether those trees still
land — the question had never been asked in a way that produces a number.

`pnpm queue` (this run) asks it by performing the merges. Measured against
`origin/main` at `d7375ef`, oldest pull request first:

> **7 of 30 branches merge. 22 of the 23 blocked are blocked on `FINDINGS.md`,
> and on nothing else.**

That is not thirty lanes disagreeing about code. It is one file. Every routine's
last act is to append an entry to the bottom of `FINDINGS.md`, so every pair of
branches adds different text at the same place, and git calls that a conflict
every time. The channel the routines use to talk to each other is the thing
stopping their work from landing.

Two smaller classes sit behind it. `decisions/README.md` and
`app/(docs)/_lib/api/reference.generated.json` are **generated files**, and a
generated file has no meaningful hand-merge: the answer is always to take one
copy and run the generator. Between them they block four more branches.

The damage is not only to the queue. Resolving `FINDINGS.md` by hand thirty
times has already corrupted the ledger: one entry carries two contradictory
`**Status:**` lines with no indication which is current, another is a bare
heading whose body a merge dropped, and one sentence appears twice with two
different link targets. Nothing failed, because until this run nothing had ever
read the file except people.

## Decision

**`FINDINGS.md` is union-merged.** `.gitattributes` carries
`FINDINGS.md merge=union`. Both sides' lines are kept, in order, with no
conflict and no markers. This is what the file's own rule already says it is —
*"Append; do not rewrite someone else's entry"* — stated to git instead of only
to routines.

**Generated files are resolved by regeneration, not by hand.**
`decisions/README.md` and `*.generated.json` are marked `merge=ours`: the merge
takes the tree's copy, and the generator is re-run. This is safe *because both
already have a drift check* — `pnpm verify` fails on a stale decisions index, and
`extract.test.ts` fails on a stale API reference with the regeneration command in
its own message. A stale file cannot survive the gate, so the merge does not have
to be the thing that catches it.

`ours` is not a built-in gitattributes driver, unlike `union`; it needs
`merge.ours.driver` set per clone. The root `prepare` script sets it, so
`pnpm install` — step five of every routine's procedure — configures it, and a
clone that skips install merely gets today's behaviour back.

**`pnpm findings:check` runs inside `pnpm verify`.** Every entry must name a
filer, an owner and a status; a second status is allowed only where the entry
says it keeps the original, which is the convention twelve closed findings
already follow. This is the half that makes union safe. Union never fails, so
nobody is forced to look at what it produced — and a check that reads the result
is the only thing that would notice a doubled status line.

## Consequences

- Measured, on the same thirty branches: **7 → 24** with the union line alone,
  **7 → 28** with all three. The two that remain are a real content conflict on
  `apps/loom/app/(marketing)/_lib/copy.ts` between the marketing and primitives
  lanes, which is work for those lanes and not a merge setting.
- Union's failure mode is silent by construction. Where two routines edit the
  *same* status line in the same window — closing a finding is exactly that —
  both lines survive and no one is told. `pnpm findings:check` turns that into a
  red build on the next run; without it this decision would be trading a visible
  conflict for an invisible one, and would not be worth making.
- Four ledger entries were repaired in the same change. Two were merge damage
  from before this decision, and two were the check being too literal about a
  convention — the marker wraps across a line in one entry and is worded
  *"Original text below"* in another. Both were fixed in the check, not in the
  entries.
- `.gitattributes` is a file every lane's merges now read and no lane owns.
  Adding a line to it changes how other people's branches combine, so it belongs
  with the shell rather than with a surface.

## Alternatives considered

**Leave it and resolve by hand.** This is what the last nine days did, and the
measurement is the argument against it: 7 of 30. It also has a cost nobody was
counting — the ledger corruption above is entirely the product of hand-resolving
a file thirty times under time pressure.

**One file per finding, `findings/YYYY-MM-DD-slug.md`.** Strictly better on
merging: there is no shared append target at all, so two routines filing on the
same day touch different files and a status edit touches one small file. Rejected
for now rather than on the merits — it moves 368 entries, needs a generated index
to stay readable, and it changes a file every routine's brief names by path,
which is a coordination cost across seven lanes for a problem one committed line
solves today. Worth revisiting if the check starts finding doubled statuses
regularly; that would be the signal that union is not enough.

**Per-lane sections inside one file, each lane appending to its own.** Cheaper
than one-file-per-finding and it does make different lanes touch different
regions. Rejected because it depends on every routine appending in the right
place, every time, with nothing enforcing it — and the failure is the same
conflict we have now, arriving unpredictably instead of always.

**`merge=ours` on `FINDINGS.md` too.** Would silence the conflict, and would
silently drop whichever lane merged second. The ledger is the one file where
losing an entry is losing the message.

**Regenerating in a merge driver rather than after.** A custom driver that runs
`pnpm decisions:index` during the merge would leave no stale window at all.
Rejected: it makes every merge in the repository depend on the toolchain being
installed and working, to save a step the gate already forces.
