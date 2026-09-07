# 0115. A queue can be told which of its holds are already dead, and a head it could not read is a third answer rather than an optimistic one

**Status:** Accepted
**Date:** 2026-09-07
**Section:** §2

## Context

A proposal the Gate holds back names the revision it was judged against
([0088](0088-a-hold-is-a-row-and-a-take-is-one-statement.md)), and `confirmHeld`
compares that to head before anything else. When they differ it releases the
hold and reports `revision-conflict` — **dead rather than stale**, deliberately,
because the delta can never apply to that tree again and leaving it in custody
would invite a second attempt at something impossible.

That behaviour is right. It is also the first moment anybody finds out.

`HoldStore` has two listings and neither of them mentions a tree's head.
`forTree` answers *what is waiting on this page* and `waiting` answers *does
anything need me at all*, and both are scoped by design so that neither reads the
tree store ([0020](0020-a-store-handle-is-the-scope-and-a-listing-is-a-page.md)). So a
review queue built the documented way lists dead changes and live ones together,
oldest first, indistinguishable — and the only way to discover which is which is
to answer one. On a real queue that means a reviewer reading a change, deciding,
clicking yes, and being told it never could have worked.

Filed by `Loom docs` on 7 September, who met it writing *When something looks
wrong*, produced it rather than reasoned about it — one change held against
revision 3, one ordinary change lands, head is 4, the answer comes back
`not-written` and the queue goes to empty — and documented the behaviour on the
page because it is true.

**The information is a subtraction away.** A queue renders against heads it can
read; what was missing was anywhere for the comparison to live. Three lanes now
have the same screen: `Loom portal` owns a review queue, `Loom demo` built a card
for the state *after* it has already gone wrong, and `Loom docs` teaches it. Each
would otherwise write the same three lines, and the comparison has a direction.

## Decision

**`src/write/liveness.ts` owns the comparison, and it has three answers rather
than two.**

```ts
export type HoldLiveness = "live" | "dead" | "unknown"

holdLiveness(hold, headRevision)          // the one comparison
markHolds(holds, heads)                   // pure, against heads a caller has
treesAwaitingAnswer(holds)                // the heads a page of holds needs
markHoldsFromStore(reader, holds)         // one head read per distinct tree
```

Three things this fixes, in the order they matter:

**The direction is fixed once.** `holdLiveness` compares by inequality, not by
`head > baseRevision`, because that is what `confirmHeld` does: the write path
refuses any head that is not the exact revision judged against, so a hold naming
a revision ahead of head is refused by the same rule. A helper that called it
live would disagree with the only opinion that decides.

**`unknown` is a real answer.** A caller with no revision for a tree gets
`unknown`, never an optimistic `live`. A page of holds spans many trees, one of
them can be unavailable, and a head that could not be read is not evidence that
nothing moved.

**`markHoldsFromStore` does not fail.** It returns every hold marked plus the
`StoreError`s it collected, so one unavailable tree leaves the rest of the queue
badged and that tree's rows unbadged. It takes a `TreeReader` rather than a
`TreeStore`, because badging a queue is a read.

**`not-found` is `unknown`, not `dead`.** A hold against a tree that is not there
cannot be confirmed either — but it fails as `not-found`, not as a revision
conflict, and a badge reading *the page moved on* about a page that is gone is a
true-sounding sentence about the wrong fault. This module answers one question
and declines the neighbouring one.

Nothing about custody changes. `confirmHeld` still ends custody on a conflict,
and this cannot release, confirm or discard anything: it is a read that tells a
reviewer what they are about to find out.

## Consequences

- **A queue is one call wider and no queries deeper than it already was.** One
  head read per distinct tree, not per hold; three changes held against one page
  are three rows and one question.
- **The listings stay as 0020 drew them.** `forTree` and `waiting` still do not
  read the tree store, and this is not on `HoldStore` — a backend implementing
  the interface has nothing new to implement, and the contract suite is unchanged.
- **`HOLD_LIVENESS` is walkable**, so a legend describing all three answers, or a
  queue wanting a bucket per answer before the first row arrives, reads the list
  rather than keeping a copy of it.
- **A host that ignores this is exactly as correct as before.** Nothing is
  deprecated and no behaviour moved; the badge is additive.
- **`unknown` will appear on a healthy deployment**, on any page whose caller
  assembled heads for some trees and not others. That is the intended reading and
  the reason it is not called `live`.

## Alternatives considered

**A `staleHolds` filter returning only the dead ones**, which is the shape the
finding suggested. Rejected: a queue needs to render every row and mark some of
them, so a filter makes the caller re-join two lists by id and gives it a second
chance to get the join wrong. Marking in place keeps `compareHolds` order, which
is the order the store promised.

**Putting the comparison on `HoldStore`** — a listing that returns liveness
directly. Rejected as the thing 0020 exists to prevent: the hold store would have
to read the tree store, every backend would have to implement the join, and a
`postgresHoldStore` would be doing it in SQL across a boundary the two stores do
not share. The subtraction belongs to the caller that already reads both.

**Returning a `Result` from `markHoldsFromStore`**, failing on the first
unreadable head. This was the first shape and is wrong for the case the module
was written for: a queue over a whole deployment going blank because one tree is
unavailable puts the reviewer back in front of the undifferentiated list. It also
contradicts the module's own rule one level up — *say what you cannot say* — by
making that impossible for the caller.

**Two answers, with a missing head reading `live`.** Rejected for the same reason
`discards` is absent rather than empty ([0035](0035-discarded-work-is-a-stake-and-only-the-runtime-declares-it.md)):
absence means nobody looked, and a badge is a claim.
