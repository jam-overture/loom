# The byte figure that merged false

**12 November 2026 (evening) · `Loom signals` · branch `signals-86a-the-byte-figure-that-merged-false`**

This is the second report of this lane's 12 November. The first,
[*How long readers stay on one part*](2026-11-12-signals-how-long-readers-stay-on-one-part.md),
covers the unit. This covers one number in it that was wrong by the time it
merged, and what I did about it.

## What happened

`signals-86` was cut in the morning, when the published-names index had **148
bytes** of headroom. That number shaped the unit: `partPaceOf` wanted a silence
vocabulary of its own — `PartPaceSilence`, `PART_PACE_SILENCES`, a twenty-third
`meaningOf` and its entry in `SILENCE_VOCABULARIES` — and it publishes
`KindPaceSilence`'s four values instead. Its three names were measured at **50
bytes of the 148, leaving 98**, and that figure went into four places: §86 of
the plan, 0381's consequences, the report, and a findings entry written entirely
about it.

**#859 front-coded the names file and merged while the branch sat.** Six and a
half hours later `Loom merge` brought `main` into the branch, I remeasured,
found the figure stale, corrected all four places and pushed two commits.

**#873 had merged twenty minutes before that push.** The merge event and the
correction crossed: the pull request closed at 16:09, the correction landed on
the branch at about 16:29, and a branch whose pull request has closed corrects
nothing. `main` took the stale figure in all four places, and I reported the
correction to the maintainer as though it had landed.

## What this branch does

Remeasured on `main` at `ce27bca2`:

| | spent | cap | room | entries |
| --- | --- | --- | --- | --- |
| front-coded names file, `main` at `e20d0b41` | 27,262 | 40,000 | 12,738 | 2,113 |
| front-coded names file, with §86's three names | **27,289** | 40,000 | **12,711** | 2,116 |
| per name | 12.90 | 24 | — | — |

**27 bytes, not 50; 12,711 left, not 98.**

- **`docs/signals.md` §86** now carries the measured figures, both sides of the
  subtraction, and says the first ones were the old cap's.
- **0381's consequences bullet** says what it first said, that it was
  remeasured, and the measured figures. **The decision is unchanged** — what the
  correction changes is the stated reason the silence vocabulary is reused: not
  the bytes it saved, which were a reason of that week, but that a second name
  for each of four identical states needs a second closed set and a second
  `meaningOf` to keep in step with it. An alternatives bullet says the same in
  one line.
- **A findings entry supersedes the morning's**, which is left standing rather
  than rewritten because it merged and something may have read it.
- **The morning's report is left exactly as it stands.** A report is the record
  of a run, not a live document; its one wrong number is corrected in the
  ledger, in the plan and in the record, which is where a reader of the figures
  would go.

## Decisions I took that were not specified

- **Correcting an Accepted, merged record rather than superseding it.** The rule
  is *never edit a record to change direction*. This changes no direction: the
  decision, its five clauses and its alternatives stand, and what moved is a
  measured byte figure in a consequence. A record carrying a measurement that is
  false is worse than a record with a dated correction in it, and 0381 now shows
  both numbers and why they differ.
- **Appending a findings entry instead of rewriting the morning's.** On the
  branch this morning I rewrote it, which was right while it was unmerged and
  wrong the moment it was not. It merged, so it is superseded in place.
- **Not touching the morning's report**, per *never overwrite an existing
  report*.

## Records

None added. 0381 was corrected in place as described, and the decisions index is
unchanged by that, so `pnpm decisions:index` had nothing to regenerate.

## Findings

**Filed one, which closes its own figures and supersedes the morning's entry:**
*the entry above merged with a byte figure that was already false, and this is
what the cap cost a design while it was tight.* It carries the remeasured table,
the process half, and the one thing worth keeping — that a lane choosing its
published vocabulary by what the docs search index can afford is exactly the
failure the two entries of 10 November were filed about, and that it happened
once, here, to this lane.

**Closed: none besides that.**

## The process half

There was no signal available to this lane that #873 had merged when the
correction was pushed; the two crossed. The remedy is cheap and is written into
the finding: **read whether a pull request is still open before pushing a
correction to its branch.** Two commits' worth of true figures sat on a closed
branch for twenty minutes while `main` carried the false ones.

One other thing worth recording about this run, because it is the pattern this
lane is explicitly meant not to create: while waiting for GitHub's pull-request
API to catch up to a pushed ref, I started an `until` loop that would have
polled for half an hour. I stopped it. The ref and its deployment status were
already confirmed directly, and the cached pull-request view needed no watching.

## Test numbers, measured

`pnpm install && pnpm verify` — **EXIT=0** on the committed tree.

| | files | tests |
| --- | --- | --- |
| framework, `main` at `ce27bca2` and this branch | 286 | 6,972 |
| application, both | 484 | 7,863 |

**No test changed, because nothing executable changed.** This branch is three
prose files: the plan, the record and the ledger. Nothing was skipped and
nothing failed.

## Bytes

**Nothing reaches a reader's browser and no published name moves.** The names
index measures 27,289 of 40,000 on this branch, which is byte-for-byte what it
measures on `main`.

## Open questions

None of this branch's own. The two from the morning's unit stand unanswered and
unchanged: whether *Stays on it* ships on the since-counting-began figure
(recommended) rather than buying a part-grained hourly dwell counter, and
whether a per-page breakdown is published and ordered by the reading time
missing (recommended) rather than by the pace.
