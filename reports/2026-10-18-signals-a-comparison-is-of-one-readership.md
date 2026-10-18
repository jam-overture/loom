# Reader signals — a comparison is of one readership

**Routine:** `Loom signals` · **Date:** 2026-10-18 (morning run) · **Branch:**
`signals-38-a-comparison-is-of-one-population` · **Section:** §37 of
[`docs/signals.md`](../docs/signals.md)

## What I completed

The guard yesterday's two runs both said would be needed and neither built:
**ten comparisons in this subsystem take their pair from a caller, and not one
of them could tell that the two were of two populations.**

Yesterday morning's run shipped 0290 — every *reading* of the reader counters
got the audience dimension, with `readingKeyOf` published once. Yesterday
evening's run (#668, still open) gave the four library comparisons the same
treatment for their *pairing*. Both of them filed the same thing as left over,
and the finding of 17 October asked the question in its own words: *is a
mismatched pair a silence or a refusal, and is it one decision or eight?*

### Why it mattered more than the finding's own "nothing is broken today"

Nine of the ten already refuse a pair of two **trees**; the tenth, the
readership comparison, states the same requirement in prose and cannot check it,
because a region map names no tree. The two faults are a caller making the same
kind of mistake with opposite visibility:

- **two trees make every figure absurd.** The parts census reports that the
  change removed every part of a page it was never about, and a reviewer sees it
  at a glance;
- **two forms of one page compare cleanly.** They share a tree id, so the join
  matches, the shares divide, the movements carry the right sign, the resolution
  is computed and the ranking comes out in the right order. Every figure is
  produced and every one of them is arithmetically right. What is wrong is the
  sentence printed over them — *this is what your change did* — when the
  readership was varied **by construction** and the tree may not have changed at
  all.

That is the exact confusion 0290's own *Alternatives considered* argued about
from the other direction: a before-and-after holds the readership still and
varies the tree, which is why §20's readership comparison exists to check the
assumption; an audience comparison varies the readership and holds the tree
still.

### What shipped

`crossesAudiences`, `comparedAudiencesOf`, `ComparedAudiences` and
`SideOfAudience` published from
[`src/signals/audiences.ts`](../src/signals/audiences.ts) beside `readingKeyOf`,
with:

- a `different-audiences` refusal on the **five page-scale comparisons** that
  publish a silence vocabulary — where reading stops
  ([`change.ts`](../src/signals/change.ts)), the words a change put in front of
  readers ([`copy-change.ts`](../src/signals/copy-change.ts)), whether readers
  had time for it ([`pace-change.ts`](../src/signals/pace-change.ts)), what
  readers did ([`action-change.ts`](../src/signals/action-change.ts)) and what a
  change did to the funnel
  ([`funnel-change.ts`](../src/signals/funnel-change.ts));
- a seventh `ReadershipComparability`, `different-audiences`, on the readership
  comparison ([`readership.ts`](../src/signals/readership.ts)), reported **ahead
  of its floor**;
- `audiences: { was, now }` on all six, carried under a silence and under none;
- one condition for the whole subsystem, `two-audiences` in
  [`silences.ts`](../src/signals/silences.ts), reported by all five silence
  vocabularies and held apart from `two-pages`;
- `audienceId` on `FunnelReach` and `RegionReading`, because two of the ten had
  scoped their rows to one audience and then discarded which one, so they could
  not have been guarded at all.

**Nothing was added to a payload, a browser, a column, a store or the vocabulary
of kinds.** The audience column has been on the rows since 0284; this is the
reading of it, and the twenty-seventh thing taken out of what this subsystem
already knows rather than collected. An `aud_` is a name the host chose for a
predicate Loom never sees, so refusing on it is comparing two column values a
host wrote.

## Decisions I took that were not specified

**It refuses only what it can prove.** Both sides name an audience and the two
differ. A window whose rows never carried the column names none, so a pair of
such a window and an `aud_pro` one is either an honest before-and-after across
the migration or a cross-population comparison, and nothing in the counters
tells them apart. Refusing both would withhold every comparison spanning the day
a deployment upgraded, which is the comparison it most wants. So the unprovable
case is **published rather than guessed at**: `audiences` is on every comparison
and a `null` on either side is the whole of why an unrefused pair may still be
two populations.

**A refusal rather than a silence, which is the half the finding thought would
go the other way.** The finding expected a silence might be enough, on the
grounds that `changeOf` has no concept of refusing and each side's figures are
honest about their own side. Six of the ten do leave their tree half standing
under `nothing-measured`, because what a change did to the tree is a fact about
the tree. **That reasoning does not reach here.** A page is one base tree plus
the deltas an audience earns, so the two sides are two trees wearing one tree
id — and *three bands moved and one was reworded* read across two forms is the
other form's deltas reported as the change. The census is the half that would
look most like an answer, so it is withheld exactly as it is for two trees.

**Checked after `different-trees` and before everything else.** Two unrelated
pages are not made comparable by one audience, and a caller holding two pages
wants to be told that first. Everything after it — an empty window, a dissolved
page, a floor — is a statement about a pair this check has already established is
not a pair. The readership comparison reports the audiences **before** its
floor, because two populations are not a floor fault and no floor fixes them.

**Two readings had to start saying what they already knew.** `funnelReachOf`
scopes both its row sets to the reading's audience and `regionReadingFor` filters
on the audience it was handed, and both then dropped it. Each now carries
`audienceId`. Nothing is read differently; what is added is the ability of a
comparison to refuse, which it cannot do from a reading that has forgotten.

**`regionReadingOf` names none, deliberately.** It groups whatever it is handed —
*ten views of one revision and twenty of the next are thirty views of one
country* — and a deployment's whole window is **a readership** rather than one
form's. That keeps a comparison of two such maps answerable rather than refused,
which is the common case. The honest gap it leaves is filed below.

**The four library comparisons were left out, and that was a process call rather
than a design one.** #668 is open on all four of those files. Taking them here
would have been a branch stacked on a branch, which the brief forbids and which
yesterday's own findings say is exactly where a published rule fails quietly. The
rule is published and waiting; the work is one member and one line each, and it
is filed.

## Records added

**0292** — *a comparison is of one readership, and a pair that proves two
audiences is refused*, Accepted. Eight clauses, six alternatives recorded with
the reason each was rejected. **Nothing is superseded**: 0263, 0284, 0290 and
0291 are unchanged and all right. This is the guard 0290's alternatives said
would be needed, built where it said it would be needed.

**The number may move.** Two other branches were open with a record numbered
0292 when this was written — #667 and #668, both having taken the next number
free on `main` exactly as the brief says to. Whichever of the three lands second
and third is renumbered at merge. Nothing in the record depends on its number.

## Findings filed or closed

**Closed:** the 17 October entry — *a change comparison whose two sides name
different audiences is a cross-population comparison wearing a
before-and-after's clothes*. Taken as 0292 over six comparisons rather than one,
as a refusal rather than a silence, with the census withheld.

**Filed, three:**

1. **The four library comparisons** need the same guard, owned by this lane, with
   the reason they were left out and the one thing still to settle when they are
   taken: a library window is a *set* of readings, so it should probably refuse a
   **mixed** window before it refuses a mismatched pair — a sentence the
   page-scale comparisons get for free because each side is one reading.
2. **A region map read whole over two audiences names none**, so a readership
   comparison between two such maps is unprovable and is compared. Both maps are
   sums over two populations and the comparison is of two mixes. It is a limit
   written down rather than a fault: refusing it would withhold the question
   `regionReadingOf` exists for. What would close it is a field and a sentence —
   report the audiences grouped across, as `PageReading.audiences` already does.
3. **A generated signature is truncated before its comments are cleaned**, owned
   by `Loom docs`. It fired on this branch; the detail is below under *the one
   thing that failed*.
4. **No screen reads `audiences`**, owned by `Loom portal`. Three states, and a
   surface that draws two of them hides the third: one audience named on both
   sides, two named and refused, and none named and compared. The refusal's
   remedy is a line of the surface's own code — split with `byAudience` and
   compare each form with itself — so the row should say that rather than reading
   as a fault in the data.

## Test numbers

`pnpm verify` **green, exit 0**.

- **5,372 runtime tests across 233 files** (`src/` and `tools/`)
- **5,951 app tests across 336 files** (`apps/loom/`)
- `findings:check`: 1,242 findings, 0 malformed
- `reports:check`: 1,885 visuals, 132.2MB, none over 1.1MB

**40 new tests**, across ten files: six in `change.test.ts`, five in
`readership.test.ts`, four each in the three other page-scale comparisons and
the funnel comparison, six in `audiences.test.ts`, three in `region.test.ts`,
and two each in `funnel.test.ts` and `silences.test.ts`.

Each of the six comparisons is asserted from four directions: a provable pair is
refused with every figure and the census absent; one audience's two windows
compare **identically to the same pair read whole**; an unprovable pair is
compared and names what it compared across; and two pages are reported before
two audiences.

### Six planted mutations, each caught

| mutation | caught by |
| --- | --- |
| `crossesAudiences` always false | 9 tests across 7 files |
| it treats `null` as a population, so an unprovable pair is refused | 7 tests, one in each comparison's suite and one in `audiences.test.ts` |
| the two guards swapped in the four page-scale comparisons that have a `refusing` helper | 4 tests — the ordering assertion in each |
| the readership comparison reports its floor before its audiences | 4 of its 5 new tests |
| `regionReadingFor` forgets to name the audience it filtered on | 1 test |
| `funnelReachOf` publishes `audienceId: null` | 1 test |

**The ordering mutation caught a hole in my own tests first.** The four "says two
pages before it says two audiences" assertions were written with an empty
counter list on the other-tree side, which makes that reading name **no**
audience — so the pair was unprovable, the guard was never reached, and all four
tests passed under either order. They now pass the audience as
`pageReadingOf`'s fourth argument and assert `audiences` on the result before
asserting the silence. The mutation is the only reason that was found; the four
tests read correctly and asserted nothing.

### The one thing that failed, and what I did about it

**The first `pnpm verify` of this unit failed**, in the docs app and not in this
lane:

> a decision number reached the page: expected [ "SilenceCondition's signature" ]
> to deeply equal []

The number it found was `0212`, in the comment on `no-reach-reported` — a member
this branch did not touch, written by another lane, correctly cited in
parentheses, and clean in every generation before this one.

**The cause is an ordering in the reference generator.**
`readerFacingSignature` lifts a citation out of every comment in a published
signature and drops a comment whose grammar needs the number — a good rule that
works. It runs **after** the truncation, and the truncation does not know what a
comment is: a signature cut at 6,000 characters of uncleaned source is
frequently cut mid-comment, leaving an opening `/**` with no `*/` that the
comment pattern no longer matches. Adding one member to `SilenceCondition` took
it past the cap for the first time.

**I worked around it in my own file rather than fixing it in theirs**: the new
member's doc comment is short, with its argument in 0292 where it belongs
anyway. That is a change to `src/signals/silences.ts` made for a reason that has
nothing to do with that file, and **the next member added to that union will put
it back over** — the two longest published signatures in this subsystem are now
5,732 and 5,550 characters cleaned against a 6,000 cap on the uncleaned text. It
is filed for `Loom docs` with the remedy, which is an ordering rather than a new
rule.

### Nothing was skipped and nothing was weakened

Four existing assertions moved, all of them shape assertions rather than
behaviour: two `Object.keys(...).sort()` lists gained `audiences`, and two
closed-set lengths went up by one (`COPY_CHANGE_SILENCES` to 8,
`READERSHIP_COMPARABILITIES` to 7).

`reference.generated.json` was regenerated with `pnpm docs:api` — a changed doc
comment on an exported type is a changed API reference, and two exported types
changed shape.

## Browser cost

**Nothing.** `src/signals/broadcast.ts` is byte-identical to `origin/main` (an
empty `git diff`), and nothing this unit touched is in the import graph
`browser-weight.test.ts` walks. Measured anyway, because the rule is to measure
rather than to reason: bundled and minified with esbuild it is **6,477 bytes**,
**2,941 gzipped**.

## Preview

https://loom-git-signals-38-a-compar-218fd3-jpizzolato36-6341s-projects.vercel.app

Nothing to look at on it. This unit is server-side arithmetic with no surface:
the portal screens that would read these counters are `Loom portal`'s and are
filed, which is the third of the findings above.

## Open questions

**Nothing blocking.** One for later, and it is already filed rather than waiting
on anybody: whether a library comparison should refuse a *mixed* window before
it refuses a mismatched pair. My recommendation is yes, because `audiencesIn`
already answers that question and `pageReadingOf` already reports the state.

## Beside the framework lane

`Loom daily build` has no branch open on the signal path. The open pull requests
at the start of this run were #647 (framework, 15 October), #666 (marketing),
#667 (portal) and #668 — yesterday evening's own signals unit.

**#668 is the only one that touches this lane, and this branch deliberately does
not touch any file it does.** Its diff is `audiences.ts`, `deployment-change.ts`
and the four `library-*-change.ts` files; mine is `audiences.ts` and six others.

**The overlap is one file and it is append-only.** Both branches add exports to
the end of `audiences.ts`: #668 adds `formKeyOf`, `formOf`, `PageForm` and
`inFormOrder`; this one adds `SideOfAudience`, `ComparedAudiences`,
`comparedAudiencesOf` and `crossesAudiences`. Neither changes a line the other
changes except `ReadingOfAudience`, which this branch rewrites as
`SideOfAudience & { treeId, revision }` — the same type, stated as a side plus a
page. **Whichever merges second should expect a conflict there and resolve it by
keeping both sets of exports**; nothing in either decision contradicts the other,
and 0292 says so explicitly.

Yesterday's own lesson is the reason I am writing this down: *a published key
stops two places disagreeing only once both places import it, and a branch open
across the landing of another branch is exactly where that fails quietly.* If
#668 merges before this one, the four library comparisons it touches are then
free and the first filed finding above is the next run's.

## The door this lane is keeping cheap

Per the standing instruction to say when a design choice would make the parked
per-reader identity work expensive later: **this one does not touch it.**

A side of a comparison here is an `aud_` and nothing else — a name the host chose
for a predicate Loom never sees. Nothing keys on a reader, nothing persists,
nothing new reaches a payload or a browser, and `null` stays *nothing recorded*
rather than defaulting to anything. If a consented per-reader id ever arrives
behind a gate and a record, nothing in 0292 would need unpicking: a comparison
would still be of one population, and the population would still be named by a
column the host wrote.
