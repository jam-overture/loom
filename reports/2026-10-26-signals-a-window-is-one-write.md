# 26 October 2026 — a window's counters are one write, and the state between two writes is gone

**Routine:** `Loom signals` · **Branch:** `signals-55-a-window-is-one-write` ·
**Section:** §55 · **Record:**
[0316](../decisions/0316-a-windows-counters-are-one-write-because-a-window-written-per-audience-has-a-state-between-the-writes.md)

## Before anything was built

**Two pull requests open, both this lane's, and no maintainer comment anywhere.**

- **#710** — §54, record `0315`, *a window answers where its readers were*. Last
  night's run. It touches `src/signals/window.ts` and `window.test.ts`, and
  nothing on this branch goes near either file.
- **#706** — `0308` as `Proposed — architectural, needs review`. Still waiting on
  one reading from the maintainer, skipped by the merge routine for exactly the
  reason it exists. Untouched here.

Every comment on both is this lane's own, which is not input, so **nothing
outranked the queue**. `Loom daily build` has no branch open, so there was
nothing to race on the signal path. This branch is cut from `origin/main` at
`1ac8c1b`; it stacks on neither open branch, which is why it is **§55** and
leaves §54 to #710.

Six open findings owned by this lane were read first. Two are the maintainer's
(the door's repeated opening batch; the sequence number on the wire) and both
stand with yesterday's recommendation unchanged. One — *the region map the new
rung leaves a caller to assemble* — was closed last night on #710 and is out of
reach from `main` until that merges.

## What I set out to do, and what I found instead

The queue said a reading, and there are thirty-nine of them with nothing drawing
any. §53 spent its run in the foundation instead, and that turned out to be the
right instinct twice over, because **the same question asked one layer down had a
second answer.**

§53 asked whether two batches in one window are the same batch — a *sender*
delivering twice. The question I asked tonight was the mirror of it: **can this
subsystem write one window twice?** It could, and nothing had ever asked.

## What I completed

**§55 / 0316 — a window's counters are one write.**

`collect.ts` opens with the invariant the whole design rests on:

> The only defence that does not need durable bookkeeping is for the set of
> batches rolled up and the set forgotten to be the same set, decided once, in
> one place.

**That was true of the fold and false of the write.** Since 0284 a window is
folded once per audience — a deployment serving two forms of a page holds two
audiences' batches interleaved — and the folds were then applied one call per
audience:

```ts
for (const { audience, rollup } of folded) {
  const applied = await store.apply(rollup, now, audience)
  if (!applied.ok) return { outcome: "unavailable", error: applied.error }
}
```

A store error on the second call left the first audience's counters **durable**,
the second's **uncounted**, and the buffer **un-forgotten** — forgetting is the
last thing the function does. So the next run read the same ripe prefix, folded
it again, and **added the first audience's window a second time**.

It is one `applyWindow` call now, atomic across the audiences: the Postgres store
spans its existing transaction across them rather than across the statements of
one, and the memory store writes them in a single pass. There is no state between
two writes because there is no second write.

## Why this was worth a run rather than a reading

**The comment above that loop named it as something it was not.** It read *"the
counters it already moved are the bounded over-count that comes with adding
distinct view counts across windows (0147)"*. 0147's over-count is one page view
whose batches straddle a window boundary, on a distinct count, bounded by how
many straddle and measured at the door since 0274. This was a **whole window
re-added**, and the damage splits exactly the way 0314's did: of a tally's nine
counters, `views`, `reached` and `engaged` are distinct counts of view keys and
move by the straddle only; `dwellMs`, `activations`, `opens`, `closes` and
`completions` are occurrences and **double**. Every rate this subsystem publishes
divides the second kind by the first — so it does not look like a wrong total. It
looks like a readership twice as interested as it was, permanently (0158), on the
figure a deployment decides with.

**And `unavailable` documented the opposite.** Its own words are *"Read or write
failed before anything became durable. Nothing was deleted."* The first clause
was false for every window of more than one audience, which is every deployment
serving two forms of a page — the case this lane has spent eight runs building
readings for.

**Why no test saw it.** `collect.test.ts` had a double whose `apply` always
failed, over a window of **one** audience. There the first call is the only call
and `unavailable` is exactly right. The fixture's convenience was load-bearing
again, which is the second run in a row that has been true.

## Decisions I took that were not specified

**Required, not optional.** `applyWindow` could have been an optional method a
caller probes for, falling back to the loop with a new outcome reporting the
half-written state. I made it required. A store that cannot be atomic over
several audiences cannot be correct here, and the fallback would have kept the
broken path alive beside the sound one — a branch nobody tests, doing the one
thing that cannot be undone. A host implementing `ReaderTallyStore` now gets a
compile error until it implements it, which is the right failure for a method
whose absence is a silent permanent over-count.

**Reporting the state was the wrong fix, and it was the first one I costed.** A
`partly-counted` outcome naming the audiences already durable, the one that
failed and the buffer position — honest, and the shape `counted-not-forgotten`
already has. I rejected it because the two are not alike:
`counted-not-forgotten` names a position an operator prunes below, and this one
has no such move. Pruning loses the uncounted audience's batches; not pruning
doubles the counted ones. **An outcome whose every branch is damage is a bug with
a label**, and one transaction removes it.

**`apply` stays, and is `applyWindow` over one entry.** Deleting it would have
been one write method rather than two, and its fifty-odd call sites include
`src/testing/reader-signal-contract.ts`, which is another lane's file. It is
*implemented* as a one-entry `applyWindow` in both stores, so the two cannot
drift on the half that matters, and every existing call site compiles untouched.
A caller composing counters by hand — a backfill, a fixture, a migration — has
one audience and no window.

**A union-typed first parameter was the other way to avoid the extra method, and
it is the worst one.** A host store handling only the old shape would compile and
silently drop every audience but one. Recorded as rejected rather than left
unsaid.

**Nothing was gathered before writing, deliberately.** My first draft folded two
entries naming one audience into one before writing, and claimed that as the
guarantee that they add rather than being refused. **The mutation survived**:
two entries are two commands in one transaction, a command's effect is visible to
the next, so they add either way. The fold was fewer statements and the same
answer — an unfalsifiable line (0231) dressed as a correctness claim. It is gone,
the guarantee is stated where it is actually kept (`foldedBy`, per command, which
is where `ON CONFLICT … DO UPDATE` refuses to touch one row twice), and the
behaviour is asserted of both stores instead of argued for.

## The one file outside this lane that had to change, and what was found at it

**A required interface method ripples, and it reached one file that is not
mine:** `apps/loom/app/_lib/app/bounded-store.ts`, which implements
`ReaderTallyStore` by hand to put a read budget on the three listings. It stopped
compiling. One forwarding line was added, because the alternatives were to make
`applyWindow` optional — the design I had just rejected for good reasons — or to
open a pull request on red.

**What was at that line is the part worth your eye.** `opened` and `apply` were
spelled `(openings, at) => store.opened(openings, at)` and
`(rollup, at) => store.apply(rollup, at)`, so **the audience argument was
dropped**. A write through that handle would have been filed under `aud_everyone`
whatever audience it named, which is two populations added into one counter —
0284's failure, and the one nothing afterwards can separate again.

**It was a trap rather than a defect**, and I checked before touching it: nothing
writes through that handle today. The door and the collector hold
`readerTalliesForWriting`; `boundedReaderTallyStore` wraps the *reading* handle
`portalReaderTallies`. All three writes forward every argument now, with one test
in `bounded-store.test.ts` that fails if any of them stops — because a line that
drops an argument looks in a diff exactly like a line that forwards one.

Filed for its owner with an explicit offer to revert the two lines that were not
strictly forced, which is the honest shape of touching another lane's file.

## Records added

- **0316** — *A window's counters are one write, because a window written per
  audience has a state between the writes.* **Accepted.** It contradicts no
  accepted record: 0284 keeps its clause that a window is folded once per
  audience, which is untouched — what changed is that the folds are written
  together. Six alternatives recorded with what each costs.

Nothing on this branch is `Proposed`, so there is nothing for `Loom merge` to
skip. **0316 was the next number free on `main`**, which holds up to 0314; 0315
is claimed by #710 and 0308 by #706, and neither claims 0316.

## Findings filed and closed

1. **Closed, in the same run it was filed:** *a window of two audiences was
   written one audience at a time, so a store error part-way through doubled the
   audiences it had already written.* Filed as an entry as well as a record so
   the shape of it is searchable from outside `decisions/`, with the three things
   worth keeping beside the record — the comment that misnamed it, the
   documentation that said the opposite, and why no test saw it.
2. **Filed, open, owned by `Loom portal` / `Loom daily build`:** the bounded
   tally store forwarded two of its three writes' audience, and a required
   interface method is why anyone looked. The `applyWindow` line had to be added
   for the file to compile; the two forwarding fixes beside it are this lane's
   reading of what *forwards the writes untouched* has to mean, offered for
   reversion if its owner would rather hold them.
3. **Filed, open, owned by `Loom daily build`:** the `applyWindow` contract suite
   sits in `src/signals/applied-window.contract.ts` rather than beside the other
   three in `src/testing/reader-signal-contract.ts`, because that file is not
   this lane's. Nothing is untested — both stores run it — and the move is one
   import, spelled out in the finding.

Nothing else closed: the two findings that are the maintainer's are still his,
and the region-map one is closed on #710 and waiting on that merge.

## Test numbers, and the mutations planted at them

`pnpm install && pnpm verify` **green, exit 0.** (Read from a file the gate wrote
as the last thing on its line, per `docs/routines.md` — and worth saying that the
rule earned its keep tonight: the harness reported *exit code 0* for both of the
two runs below that failed, because the last command on the line is the `echo`,
and the file said `EXIT=1` both times.)

**It took three runs and the first two were red.** Reported rather than
smoothed, because both failures are the gate doing its job:

1. **`src/documentation.test.ts` — the new contract file did not open with a
   paragraph about itself.** The check finds the first `/**` in every file under
   the lane and fails unless a blank line follows it, so a module docblock is a
   module docblock and not the comment on the first `const`. Mine was attached to
   a fixture. Fixed by writing the module paragraph the file was owed.
2. **The application's typecheck — `boundedReaderTallyStore` stopped
   implementing `ReaderTallyStore`.** That is the required method ripple, and it
   is the section above.

The third run is the green one, and its numbers are below.

| | |
| --- | --- |
| Root suite | 240 files, **5,764 tests**, all passing |
| App suite | 365 files, **6,482 tests**, all passing |
| `src/signals/` | 49 files, **1,633 tests** |
| `collect.test.ts` | 31 → **33** |
| `postgres.test.ts` | 84 → **93** |
| `memory.contract.test.ts` | 72 → **79** |
| `applied-window.contract.ts` | new, **7 cases × 2 stores** |
| `bounded-store.test.ts` | 8 → **9** |
| Findings ledger | 1,321 entries, 0 malformed |

**Nothing failed and nothing was skipped.** One existing test double changed —
`collect.test.ts`'s `applyFails` now fails `applyWindow` as well as `apply` —
and no assertion was weakened; the file gained two tests rather than losing any.

**Seven mutations planted, six dead, one survivor I am keeping and can account
for.**

| planted | what died |
| --- | --- |
| `collect.ts` back to the per-audience loop | both new collect tests — and the second one fails on *nothing became durable*, which is the bug reproduced |
| Postgres transaction moved inside the audience loop | *writes neither audience when the second one cannot be written* |
| memory `applyWindow` writes only the first entry | 3 contract cases |
| memory `apply` stops carrying `appearances` through | 8 contract cases |
| the default audience dropped on an entry that names none | *files an entry that names no audience under the default one* |
| the bounded wrapper's `apply` back to dropping its audience | *forwards the audience through each of the three writes it does not bound* |
| the empty-window early return removed | **nothing — survivor** |

The survivor is honest: skipping the transaction when every entry is empty is an
optimisation, exactly as the single-rollup version's early return was, and an
empty transaction writes nothing either way. It makes no claim, so there is no
assertion missing. The one mutation that mattered is the fourth row of the table
above — see *nothing was gathered before writing*.

**The atomicity is asserted against real Postgres, not against a double.**
`postgres.test.ts` runs on PGlite, so a window whose second audience carries a
`revision` past what an `integer` column holds raises on that insert, and the
first audience's rows are then absent. The rollback under test is the database's
and not a guard of ours — which matters, because a guard of ours is the thing
that was missing.

**Browser cost: nothing.** `broadcast.ts` is byte-identical — `git diff` on it is
empty — and the bundle is **6,513 bytes** minified, the same number as yesterday
and the day before. `browser-weight.test.ts` still reports no package in the
broadcaster's import graph. `collect.ts`, `tally.ts`, `memory.ts` and
`postgres.ts` are server-only and reach no browser. **No payload field, no
column, no migration, no store read and no new kind.**

## Open questions

**Nothing blocking.** The two that are the maintainer's are unchanged from
yesterday and neither is touched by tonight's work:

1. **The door's repeated *opening* batch**, whose remedy steps over a sentence of
   0146 and whose second half is about the region floor. Recommendation
   unchanged: shape 1 — nothing — until `0314`'s `redelivered` figure shows a
   deployment actually retrying. Tonight's fault was the collector writing twice,
   not a sender delivering twice, so it is no evidence either way.
2. **`0308`** on #706, still one reading of one clause, still the cheapest it
   will ever be.

And the standing one: **nothing draws any of this.** Eight runs now.
`Loom portal` is paused. The rung from a store to a reading is on `main` since
#700, and the region map that completes it is on #710.

## On keeping the parked door cheap to open

**Nothing here makes per-reader identity more expensive to add later**, and one
thing makes it marginally cheaper: the write boundary is now the window rather
than the audience, so a consent decision that had to be written durably beside a
window's counters would have one transaction to join rather than one per
audience. Nothing was built toward it and nothing stores anything per person.
