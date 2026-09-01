# 0097. A hole in the decision numbering is reported, and a clash is fatal

**Status:** Accepted
**Date:** 2026-08-31
**Section:** §1 (process)

## Context

`checkNumbering` has failed `pnpm verify` on any missing number since it was
written, on reasoning that was correct at the time: a decision that no longer
holds is superseded and left standing, never deleted, so a hole in the sequence
means a record was deleted or never committed, and both are worth stopping for.

That reasoning describes one way to arrive at a hole. It is no longer the
common one.

Six lanes now branch off `main`, as their briefs instruct. Every one of them
reads the same directory and computes the same next free number, and none of
them can see another branch. A run that somehow learns its number is taken
elsewhere and steps over it to the next one **fails its own index build** — so
the rule left exactly two moves: take the number and collide, or do not write
the record. The second is worse, because the record is the artefact and the
number is bookkeeping.

The result is measured rather than predicted. On 30 August, with nothing merged
since #167, `Loom primitives` filed that three unmerged branches each claimed
`0096`; by the following evening it was **nine**. The framework routine measured
the same queue independently and found nine branches numbering one record. Every
one of those is a rename at merge time, plus every citation of the renamed file
in every record and primitive that points at it.

A clash and a hole are not the same kind of problem, and the tool had one
response for both.

- A **clash** is unrecoverable without a rename, and the rename invalidates
  links other files already carry. It is exactly what the checker was built for:
  two concurrent runs each wrote an `0032`, and nothing noticed until the
  branches met.
- A **hole** costs a line in a table. Nothing links to a number that has no
  record, so nothing breaks.

Forbidding the cheap one manufactures the expensive one.

## Decision

`checkNumbering` reports every problem it always did. Each now carries a
severity, and only a gap is `reported` rather than `blocking`:

| Problem | Severity |
| --- | --- |
| Two records claim one number | **blocking** |
| A status names a record that does not exist | **blocking** |
| A record file does not parse | **blocking** |
| A number below the highest has no record | **reported** |

`pnpm verify` fails on a blocking problem and passes with a hole.
`pnpm decisions:index` prints a hole as `note:` and writes the index either way,
which it already did.

**The hole does not become invisible — it moves into the index.** `renderIndex`
writes a row for every number nothing claims:

```
| 0096 | *No record on this branch* | — | — |
```

An exit code is seen once by whoever runs the command. A row is in the file, in
every review of it, permanently, and it is what a merge resolves: whichever
branch holding that number lands first replaces the line on the next
`pnpm decisions:index`.

This record is `0097`, and `0096` is a hole on this branch. That is the change
demonstrating itself rather than describing itself, and it means this branch is
not the tenth claimant on a number nine others are already fighting over.

## Consequences

**A run that has reason to skip a number may skip it.** That is the whole
point, and it is what makes a per-lane reservation possible at all. The
convention itself — ranges per lane, dates instead of sequence, or nothing —
is governance and belongs to whoever writes `docs/routines.md`. This record
does not choose one. It removes the tool as the reason a routine cannot follow
one.

**A deleted record is caught later and more cheaply than before, and it is
still caught.** Three things now have to happen at once for a deletion to pass
unnoticed: nothing may supersede or reference the deleted record (a dangling
reference is still blocking), the reviewer must not notice a row in the index
saying a number has no record, and nobody must miss the `note:` on stderr. That
is a real weakening, and it buys a hole costing a row instead of a clash costing
a rename. Deletion is forbidden by a process people follow; collision was being
forced on them by a tool.

**A hole makes the index churn once and settle.** Adding one writes a row;
filling it replaces the row. Both are `pnpm decisions:index`, which every run
already executes.

**Duplicate rows are kept.** When two records do claim one number, the index
renders both rather than collapsing them, so the table shows the clash the exit
code is complaining about.

## Alternatives considered

**Leave the check alone and merge more often.** This is the true fix and it is
not a routine's to apply — the queue is 42 pull requests deep and none of them
merges itself. It is also not exclusive with this: the collision rate scales
with the depth of the queue, and this makes the depth cost one problem less.

**Drop the gap check entirely.** Two lines shorter and it discards the deletion
signal for nothing. The signal is worth keeping; only its severity was wrong.

**Allocate by date rather than by sequence** — `2026-08-31-a-hole-in-the-…`.
Cannot collide at all, and it is the only option here that solves the problem
outright rather than permitting a solution. Rejected as not a routine's call:
every record filename, every index link, and every citation inside every
existing record and primitive names a four-digit number, and 95 records and the
prose around them assume it. It stays available and it is `docs/routines.md`'s
to take.

**Reserve a range per lane in the tool** — teach `checkNumbering` that `0200`–
`0299` is the primitives lane. Rejected because the tool would then be enforcing
a governance rule nobody has written, and encoding a lane list in `tools/`
duplicates the one in `docs/routines.md` that lanes are actually defined by.
The severity change is enough: with it, the convention can be written down and
followed with no further code.

**Let a run reserve a number with a placeholder file.** A committed stub fills
the hole and satisfies the old check. Rejected — a record that says nothing is
still a record, it appears in the index as one, and the process has no way to
tell a placeholder from an abandoned draft.
