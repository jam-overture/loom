# The pair the change dissolved

**Routine:** `Loom signals` · **Date:** 6 October 2026 (evening run) ·
**Branch:** `signals-11-the-pair-the-change-dissolved` · **Section:** §15

## What I did

A funnel pair is two node ids a deployment writes down in advance. A revision is
a tree a proposal changed. Until this branch nothing held those two facts against
each other, so **a pair whose end a change moved out, renamed or removed answered
`reached 0, converted 0`** — and §13 turned that into `entry.share` of nought,
`lostBefore` of 1 and `worse: "before"`, which reads as *every reader who arrived
failed to reach the start of this funnel.*

That is byte-identical to a pricing band at the bottom of a page nobody scrolls,
and the two remedies are opposite: one is a page to fix, the other is a question
to re-point. A deployment acting on the first reading rewrites a page that is
fine.

`funnelReachOf` now takes the `PageReading` §6 already produces, looks each end
up in it, and gives it an `EndStanding` of `present` or `absent`. It is the
**eighth** thing taken out of the server-side join rather than off the wire.
Nothing was added to a payload, a browser, a column, a store or the vocabulary of
kinds.

This closes the 5 October finding that called itself the most useful thing left
in this lane's queue, and the 6 October finding that said why it had to wait —
`funnelReachOf` was on #527, which landed as part of this morning's merges, so
the unit was available this evening exactly as that entry predicted.

## Decisions I took that the step did not specify

**The reading replaces the revision, rather than being added beside it.** The
finding said *giving it a tree is a different signature* and left the shape open.
A `PageReading` carries `treeId` and `revision`, so handing one in keeps 0231's
property — the revision is handed in rather than inferred, both row sets filtered
to it, the drops reported — and closes the gap it left: a caller can no longer
name one revision while holding another revision's tree.

I considered an optional fourth parameter, which would have kept any existing
call working. There are none — `funnelReachOf` landed this morning and the portal
has not drawn a funnel yet — and an optional tree leaves the ambiguous answer as
the default, which is the defect. 0231 is **extended, not superseded**: every
property it records still holds.

**What is withheld is per figure, not per pair.** The obvious shape nulls every
figure of a stale pair. That throws away a true measurement: where only the `to`
is gone, the readers who reached the first end did reach it, so `entry` and
`lostBefore` still stand and they are exactly what somebody deciding whether to
re-point the question needs. An absent `from` withholds all of them, `lostBefore`
included, because its nought reads as *every reader failed to reach it*.

**`rate` is withheld on a stale end although it needs no denominator.** It
survives a silence, because two counts off one row divide into each other without
arrivals. A silence is *no denominator*; a stale end is *no question*, and only
the first is a thing to publish a ratio under.

**§10's five fates are not the vocabulary, against what the finding proposed.**
`absent`, `moved`, `reordered`, `separated` and `unanchorable` describe a pair
compared across *two* readings. A funnel is asked of one revision at a time, so
four of the five have nothing to be relative to and reusing the set would have
meant three members that can never be returned.

**`reordered` is refused outright, and the tree makes it available.** With the
tree in hand, *the `to` now precedes the `from` in reading order* is a fault
anybody would be tempted to report. A pair has no path and no ordering beyond its
two ends (0146): it asks which page views did both things, not in which order, and
a reader who scrolls back up satisfies it honestly. Reporting document order as a
fault would invent a rule the counter does not apply. There is a test that asserts
the silence.

**The standing has two members and not three.** *The node is there and cannot
satisfy this kind* is the case a pair asking for `activated` on a band falls into,
and nothing in the tree can say so — `role` declares one member today and it is
not *a control*. So `present` means the question still names something and no
more, and its doc comment says that rather than implying a guarantee it cannot
keep. Filed for `Loom primitives`.

## Records

**Added [0236](../decisions/0236-a-funnel-end-the-revision-no-longer-has-is-a-standing-and-what-is-withheld-is-per-figure.md)**
— *A funnel end the revision no longer has is a standing, and what is withheld is
per figure.* Nothing superseded.

## Findings

**Closed two**, both this lane's own:

- 5 October — *a funnel pair can name a node its revision no longer has.* Closed
  with two corrections against its own proposal, recorded in the entry: the five
  fates are not the vocabulary, and the withholding is per figure rather than per
  pair.
- 6 October — *the stale funnel pair cannot be taken from `main`.* Closed: #527
  landed and the hand-off worked as written. The run that read it needed a
  `git fetch` and no re-derivation.

**Filed two:**

- For `Loom portal` — the signature change, with no consumer to break, and
  `stalePairs` as the figure a reader screen leads with after a change lands. It
  names what a stale pair must not be drawn as, because drawing a withheld figure
  as nought is the exact reading this unit exists to stop.
- For `Loom primitives` — nothing lets a primitive say which reader-signal kinds
  its render can produce, so a pair asking `activated` of a band is
  indistinguishable from a button nobody pressed. The same shape as `copy` (0122)
  and `role` (0114), and deliberately not a sixth `role` member.

## Test numbers, and what they were held to

`pnpm install && pnpm verify` is **green: 398 test files, 7087 tests passed, 0
failed, 0 skipped.** Also green: `pnpm findings:check` (1038 findings, 0
malformed), `pnpm prerender:check` (126 pages), `pnpm decisions:index`.

- `src/signals/funnel.test.ts`: **48 passed**, up from 33. The 33 that 0231
  shipped pass **untouched** against a reading whose tree holds every node they
  name, which is the regression guarantee: every figure is unchanged where both
  ends are present.
- `src/signals/`: **595 tests across 23 files, all passed.**

**Five planted defects, five caught.** The suite was checked by breaking the code
rather than by reading it:

| the defect | what went red |
| --- | --- |
| the lookup always answers `present` (the state on `main`) | 12 failed |
| a blanket withholding, so an absent `to` nulls `entry` too | 1 failed |
| the orphan alarm ignores the second end | 1 failed |
| `stalePairs` counted before the pairs are deduplicated | 1 failed |
| `rate` survives a stale end | 3 failed |

The fourth is the double-count case this lane holds every counter to (0158):
`stalePairs` and `orphanedPairs` are counted off the deduplicated pairs, and a
window read twice reports 1 rather than 2.

## Browser cost

**None, and the broadcaster was not touched.** Nothing in this branch runs in a
reader's browser: `funnel.ts` is a pure server-side reading and is not reachable
from `broadcast.ts`. `src/signals/browser-weight.test.ts` passes (2 tests), so the
broadcaster's import graph still reaches no package and its weight is unchanged at
the 4.8 KB 0136 records.

## Two things worth knowing that are not defects

**I reformatted two files with `prettier` and undid it.** The repository has no
prettier config, so the default print width reflowed pre-existing lines in
`funnel.ts` and `funnel.test.ts` — 611 changed lines in the test file against 246
for the actual work. Both files were restored and the edits reapplied by hand. A
future run should not reach for `prettier` here; nothing in `pnpm verify` checks
formatting and the repository's own style is wider than the default.

**`pnpm verify` failed twice before it passed, both times in the docs app and
both times correctly.** Publishing `END_STANDINGS` and `describeEndStanding` from
`@jam-overture/loom/signals` tripped `offered.test.ts` — *something is published
that a reader has no way to find* — and `extract.test.ts`. Both are satisfied by
regenerating `reference.generated.json` with `pnpm --filter @loom/app docs:api`,
which is a generated file and the only thing in another lane's directory this
branch changes.

## Open questions

**Nothing is blocking.** One thing that is not mine to decide is still open and is
not new: the 1 October finding on a form that posts with `fetch`, which asks the
maintainer for a reading of rule 3 before `completed(node)` on the broadcast handle
can be built. The recommendation in that entry stands and I have not acted on it.

**On the parked door.** Nothing in this branch makes per-reader identity more
expensive to add later. The standing is a fact about the tree joined at read time;
it touches no payload, no store and no browser, and it would read identically for
an identified batch as for an anonymous one.
