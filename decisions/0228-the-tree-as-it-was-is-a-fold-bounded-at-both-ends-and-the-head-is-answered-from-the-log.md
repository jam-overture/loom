# 0228. The tree as it was is a fold bounded at both ends, and the head is answered from the log

**Status:** Accepted
**Date:** 2026-10-05
**Section:** §2

> **Why this number.** `0225` is the highest record on `main` at `f79e1d9`.
> Three open pull requests add one each and two of them claim the same number —
> #515 and #516 both write `0226`, and #517 writes `0227` — so `0228` is the
> next number free on `main` and in every open branch. The procedure says to
> re-read `main`, and 0225's own header records five collisions in six days from
> doing exactly that; two open branches claiming `0226` this morning is the next
> one, visible for the first time *before* either of them merges. Reading the
> open branches as well is the part that works.

## Context

A store holds a snapshot and an append-only log beside it (0016). The snapshot
is the head, because §3 renders per request on an edge runtime and a fold per
render is not affordable. **Every revision before the head is in the log and
nowhere else.**

Three findings in five days asked for the same thing, from three lanes:

- 1 October, `Loom signals`: reader counters are keyed by tree **and** revision
  deliberately (0147), so interpreting them needs the tree **of that revision** —
  the registry alone cannot say which parts existed when the counters were
  collected. Filed as not urgent, because no surface compared two revisions yet.
- 2 October, `Loom portal`: one is built. `/portal/readers` answers *which parts
  of this page did nobody get to*, which needs the page as well as its counters,
  and it can answer only for the version being served. The version being served
  is not the counted one for as long as an hour after every change — which is
  exactly when somebody comes to look. One of two sections on each card is a
  notice instead of a reading.
- 4 October, `Loom portal` again: `readingChangeOf` compares two readings and
  needs a tree per side, and a consumer holding a `TreeReader` can obtain one.

The machinery already existed and was reachable only by writing the walk
yourself. `auditSnapshot` folds the whole log from a seed; `planRevert` folds it
to a named revision and inverts there. Both of them are the same walk with a
different stopping condition, and both are private to their module. A consumer
that wrote the third copy and got the stopping condition slightly wrong would lay
one revision's counters over another revision's tree — **the one failure this
reading can have that looks exactly like success**, because every number stays
plausible and most parts read *nobody got there*.

## Decision

**`treeAt(reader, { treeId, revision, seed })` answers with the tree as the log
says it was at that revision, and `treesAt` answers for several from one walk.**
One fold, bounded at both ends: it opens at the seed's own position and closes at
the last revision anybody asked for.

Five things it settles.

**The head is answered from the log, like every other revision.** Returning the
snapshot for `revision === head.revision` is one map lookup and it was the
tempting shape. Refused, and this is the clause the record is named for: a
before-and-after reading compares two revisions, so a head answered from the
snapshot beside a predecessor answered from the log compares **two sources of
truth that this repository already knows can disagree** — `auditSnapshot` exists
because they can, and 0016 calls the log the truth and the snapshot a
materialised view of it. A comparison whose two sides come from two places is the
class of defect the findings were about. A caller that wants the snapshot has
`head()` and has always had it.

**The seed is a parameter, with the consequence `auditSnapshot` already carries.**
The honest seed is revision 0 and a compacted store may no longer have it, so a
caller that cannot supply one cannot read a past revision — a real limitation, and
a better one than a read that quietly starts from the answer. Unlike a revert,
`earliest` is the seed's **own** revision rather than one past it: the tree at the
seed is the seed, and that answer costs no read of the log at all.

**The walk opens at the seed rather than at the oldest entry.** `RevisionStart`
already has an inclusive `at` anchor, so `seedRevision + 1` is the first entry the
seed has not applied, and density (0026) means nothing can hide between the two.
This is not a saving — it is a correctness fix, below.

**It stops where it was asked to stop.** A fold to revision 1 of a log with 250
entries reads one page. A batch reads the shared prefix once: two revisions is the
case it exists for, and asking twice would fold that prefix twice and read the
head twice, against a log that is still being appended to. Each answer is exactly
what the singular call would have produced — the batch changes what it costs to
ask, never what the answer is, which is `planReverts`' claim and is asserted the
same way.

**The id history comes back with the tree.** `ReplayedTree` already carries it,
the fold already produces it, and a consumer reading reader counters **by node
id** needs it: an id that returned between the two revisions names two different
nodes either side of the comparison (0038). Handing back the tree alone would
make every by-id comparison silently unsound at exactly the moment a page was
rebuilt.

**And the defect the seed anchor fixes.** `auditSnapshot` has accepted a
checkpoint seed since 0028 said a host may supply one, and has never been able to
use it: the fold read from the oldest page, met an entry the seed already
contained, and reported `unreplayable` with a `revision-gap`. For a seed at
revision 1 of a two-entry log it said *expected 2, found 1* — a true sentence
about a walk that should never have started there. `revert.ts` got this right in
its own words: *"a walk that refused them would make the seed parameter useless
for anything but revision 0."* Confirmed against the memory store before it was
fixed, and it is now one walk rather than two conventions.

## Consequences

**No implementation changes and no contract changes.** `treeAt` is built from
`head` and `revisions`, so it works on `TreeReader` and on every store a host has
already written. Nothing new is stored, nothing is added to `TreeStore`, and no
migration follows.

**`auditSnapshot` from a checkpoint seed now works**, which no deployment can
have been relying on, because before this it returned `unreplayable` for every
such seed.

**A read of a past revision costs the log up to that revision.** Bounded and
public: revisions are dense, so a fold to revision N reads `ceil(N / limit)`
pages, and the caller knows N before it asks. A read near a 10,000-entry log's
head is a hundred pages, which is affordable in a scheduled job and is not a
request path. **A host that wants it cheap checkpoints**, which is what the seed
parameter has always been for — and the span the checkpoint cannot reach is
`out-of-range` rather than silently wrong.

**Two consumers are unblocked and neither is in this unit.** `/portal/readers`
can answer its skipping section for the counted version rather than drawing a
notice, and `readingChangeOf` can be handed a tree per side. Both are their own
lanes' (0018), and the words on those screens are not the framework's to write.

**A fractional revision is out of range rather than folded for.** Revisions are
dense integers, so 1.5 is not a position the log has; seeking it would read every
page and then report the shape of corruption, which is a true sentence about the
wrong thing.

**`describeTreeAt` is published beside the answer**, as `describeRevertPlan` is,
so a surface reporting that a revision could not be reached has the same sentence
available to it that an operator's log does.

## Alternatives considered

**Fold backwards from the head, and need no seed at all.** The shape that would
have beaten this one, and it is unavailable rather than rejected:
`invertOperations(tree, delta)` inverts against the tree the delta **applied to**,
not the one it produced — the inverse of a removal is an insert carrying the whole
subtree, which only the pre-state holds. Walking back from the head would need
the tree at revision N to compute the tree at revision N, so the seed is not a
design choice here. It is the only direction a fold runs.

**Write the inverse onto each revision as it is appended**, making backwards
folding possible. Refused for 0016's reason, which `revert.ts` already makes: it
puts a derived value in the log beside the value it derives from, where the two
can disagree and nothing is checking — and every host appending a revision would
owe an inverse it has no reason to compute.

**Materialise a snapshot per revision.** Turns the read into a lookup and the
write into a tree copy per change, on a log that only grows. The snapshot exists
because a fold per render is unaffordable; a snapshot per revision makes the
*write* unaffordable instead, and the read it buys is wanted by a portal screen
and a scheduled comparison rather than by a renderer.

**`treeAt(reader, treeId, revision)` with no seed**, as both findings suggested
it. Refused because the seed cannot be dropped without the store keeping revision
0 forever, and 0028 settled that it may not have it.

**Return `LoomTree` rather than `ReplayedTree`.** Narrower and friendlier.
Refused: the id history is the half that makes a by-id comparison sound, the fold
has already paid for it, and a caller that had to ask for it separately would read
the log twice to learn something the first read went past.

**Give `treeAt` the whole span — `treeBetween(from, to)` — since a comparison
wants two.** Refused as the wrong generalisation: the two revisions a comparison
holds are not usually adjacent and a span would hand back everything between them.
`treesAt` names exactly the revisions wanted and walks the log once, which is the
same economy without the shape.

**Let the obstacles be `StoreError`s.** Refused for `planRevert`'s reason: *that
revision is before the checkpoint you handed me* is a fact about the span, not a
failure to read. A `StoreError` means the log could not be read, and conflating
the two would make a caller unable to tell a missing database from a question
about a revision that never existed.
