# 2026-08-07 — Lesson 06: Undo as computation

**Landed:** [`lessons/06-undo-as-computation.md`](../06-undo-as-computation.md).

Also in this PR: 06 linked from the syllabus and from lesson 05's *Next*, and a
new interleaved Set H in `review-schedule.md`. No code changed.

## Why this branched off #52 rather than off `main`

A deviation from the standing procedure, stated up front.

`main` does not have lesson 05 — it is sitting in open PR #52 — and lesson 06 is
its immediate successor. Branching off `main` would have meant two collisions and
one incoherence: a syllabus table where 06 is linked and 05 is not, a
`review-schedule.md` where both PRs append a set and both call it G, and warm-up
questions that could not draw on the lesson the reader has just done. So this
branch is `lessons-05-purity` + one lesson.

The practical consequence: **merge #52 first.** After that, this PR's diff is
lesson 06 alone. If #52 is not going to merge, this one should be re-based and
re-cut rather than merged as-is.

Unchanged from the last two reports: **PR #49 is still open**, so lesson 04's last
exercise on `main` continues to claim an outcome 0038 changed. This branch does
not depend on it. Lesson 06 leans on 0038 in exercise E, but on the *rule*, which
#49 is not changing — only on its consequence for inversion.

## What I emphasised, and why

The syllabus line is "inverse deltas; why undo is a delta and not a snapshot".
Two things could have carried the lesson and only one of them is hard.

**The easy half — a snapshot is opaque.** It gets three sentences in *The
problem*, because a reader who has done lesson 01 can derive it: an undo that
replaces a document is the whole-replacement-tree that lesson 01 already rejected,
wearing a different name. Repeating that argument at length would have been
comfortable and worth nothing.

**The hard half, and the lesson's centre: the inverse of an operation depends on
the state that operation observed.** This is the one people get wrong, and they
get it wrong in a specific, confident way — invert each operation, reverse the
list, done. It is wrong because lesson 03's ordering guarantee means operation
two's coordinates were read off a tree that operation one had already changed.

I built the whole exercise sequence around making that failure *visible* rather
than asserted, and the Predict question is written to elicit the wrong answer
rather than to hint at the right one.

**The asymmetry, measured rather than described.** Three of the four inverses are
a handful of fields; `remove` → `insert` is unbounded, because the inverse must
carry the content the removal destroyed. Exercise A prints 33 bytes against 205,
and the third number on that line — 2, the node count carried — is the one that
connects to the retention budget in lesson 08. I wanted the budget to feel
*derived* when the reader gets there, not introduced.

**"The log only grows" as a consequence, not a policy.** Exercise D's round trip
comes back byte-identical at revision 2, and that pair of facts — same tree,
different revision — is the whole argument in one line of output.

I deliberately kept the revert *path* thin. 0032's contested-undo machinery and
0035's discard declaration are real and interesting and they need the Gate, which
is lesson 09. They get a forward pointer and an *Explain it back* prompt.

## What the exercises revealed

Two things, and both changed the lesson.

**1. My first draft of the answers was wrong, and the correction is now exercise
B2.** I had written that the naive inversion "is refused rather than silently
wrong" — the fixture's page has three children, the naive index is 2, the list it
lands in has 1, and `insertChild` bounds-checks. True, and I nearly shipped the
conclusion that the system catches this.

It does not. Adding one more child to the page puts the wrong index *in range*:

```
naive undo: applied
  got:       n_2,n_5,n_x2,n_6
  original:  n_2,n_5,n_6,n_x2
```

A structurally valid tree, containing exactly the right nodes, in the wrong
order, called an undo. Nothing refuses it, and nothing can — there is nothing
wrong with the tree. B was the reassuring case and I had mistaken it for the
general one. So B2 now exists, and the general form is stated: *a bug caught by a
check aimed at something else has not been caught, it has been postponed until
the arithmetic works out.*

This is the second run in a row where running the code changed what the lesson
teaches rather than merely confirming it.

**2. A comment in `inverse.ts` is no longer accurate, and finding that out became
exercise E.** See below.

## Found while teaching

**One item, for the build routine. Nothing was fixed here.**

**`invertOperations`' doc comment overstates what a successful inversion proves.**
It says:

> Fails for the same reasons applying `delta` would fail, so a successful
> inversion also proves the original delta is applicable.

Two counterexamples, both executed:

| Delta | `invertOperations` | `applyDelta` |
| --- | --- | --- |
| `remove n_4`, then `insert` a *different* node carrying id `n_4` | `ok` | `{"code":"recycled-node-id","nodeId":"n_4"}` |
| `baseRevision: 7` against a tree at revision 0 | `ok` | `{"code":"revision-mismatch","expected":7,"actual":0}` |

The second is scope and is uninteresting: `invertOperations` takes a tree and
operations, so the envelope checks were never its business.

The first is the real one, and **the code is right and the comment is stale.**
`invertOperations` walks via `applyOperation`, which starts from
`NOTHING_RETIRED`, so the 0038 recycling rule cannot fire. `applyOperation`'s own
comment says this is deliberate and gives the reason — "inverting a delta must
never be stricter than applying one" — and the reason is sound: the undo of a
`remove` *is* an id coming back, so an inversion that enforced the recycling rule
could not compute the undo of a deletion, which is the most important undo there
is.

So the recommended repair is to the sentence, not the behavior: 0038 landed
after that comment was written and made it false. Something like *"fails for the
structural reasons applying would fail; it does not check the delta's envelope,
and it deliberately does not apply the recycling rule"* would be accurate. It is
one comment and no behavior change.

Worth noting where this bites in practice, since it is not only cosmetic:
`assessReversibility` calls `invertDelta`, so a proposal containing a recycled id
is assessed as reversible and gated normally, and is refused later by
`applyDelta`. That is a correct outcome reached in a slightly surprising order —
the change fails at apply rather than at assessment — and it is worth knowing
before anyone leans on inversion as a pre-flight check.

Rather than hide this, the lesson runs it: exercise E hands the reader the
comment and asks them to break it, then asks which of the two counterexamples is
a bug. Reality was more interesting than the tidy version, again.

## Needs your input

**Nothing blocking.** Two things to decide rather than let drift:

**1. Merge order.** #52 then this one. Stated above and repeated in the PR
comment.

**2. Should lessons keep stacking on unmerged lesson PRs?** This is the second
run where the previous lesson was still open, and I expect it to be the norm
rather than the exception if lessons land faster than they are reviewed.

*My recommendation:* keep stacking. A course is sequential — 07 will need 06 the
way 06 needs 05 — and the alternative is either writing lessons that pretend
their predecessor does not exist or stopping until review catches up. The cost is
that a stack is reviewed in order or not at all. If you would rather each lesson
PR stand alone against `main`, say so and I will write them to draw warm-ups only
from merged lessons, at some cost to the interleaving.

## Verification

`pnpm verify` green on this branch: exit 0, 886 + 227 tests. No code changed.

Every snippet in the lesson was executed via `src/scratch.test.ts` and the
recorded outputs are real, including the two that corrected the draft.
`src/scratch.test.ts` deleted before committing.
