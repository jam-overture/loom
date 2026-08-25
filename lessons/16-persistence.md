# 16 — Persistence: the log is the truth, and one view is stored anyway

**After this lesson you will be able to** say which half of what a store keeps
could be deleted without losing anything, and which half could not; give the
argument for keeping a snapshot that still works on a machine where reads are
free; say why the audit's starting point is a parameter rather than something
the store holds, and what a host that cannot produce one must do; name the two
refusals an append can make, say which one a caller may retry and what retry has
to mean; state the rule that decides whether a fact the log already determines
gets stored a second time, and apply it to three facts that were not; and say
what an audit reporting `agrees` has proved and what it has not.

**Prerequisites:** [01](01-why-a-runtime.md), [02](02-ui-as-data.md),
[03](03-change-as-data.md), [04](04-identity.md),
[05](05-purity-at-the-seams.md), [06](06-undo-as-computation.md),
[07](07-measuring-a-change.md), [08](08-two-axes.md), [09](09-the-gate.md),
[10](10-the-pipeline.md), [11](11-the-model-seam.md), [12](12-projection.md),
[13](13-refusal-and-repair.md), [14](14-rendering.md),
[15](15-primitives-and-the-registry.md). The ones this lesson leans on hardest
are 03, 04, 06 and 14.

Lesson 15 said this, in passing, about the props sitting in a tree:

> they may have been written by a delta the Gate accepted months ago against a
> schema this deployment no longer runs

Nothing in Parts I–IV makes "months ago" possible. Every tree you have met came
out of a fixture, lived in one process, and vanished when the test ended. The
seam where storage was supposed to go has existed since §3 with nothing behind
it. This lesson is what goes behind it, and the reason it is not a short lesson
is that the obvious answer is wrong in a way that takes some work to see.

---

## Warm-up

Closed book, five minutes, mixed across five lessons. Write something for all
five before you look anything up.

1. Lesson 06 said Loom stores nothing at all to make undo possible. Say where
   the inverse of revision 3 comes from, then say why inversion has to walk
   *forwards* through the operations it is inverting. *(06)*
2. What does `baseRevision` protect against? Then name something it does not
   protect against, which is not a gap in it. *(03)*
3. An id is minted once and an accepted delta never re-mints it. You have been
   told what that buys a *tree*. Say what it buys a *comparison of two trees* —
   which is a different sentence. *(04)*
4. `TreeSource.load` returns `Promise<Result<unknown, …>>`. Say what the
   `unknown` is claiming about storage. Set R asked what would have to become
   true for `LoomTree` to be an honest return type there; this is the lesson
   where the storage arrives, so you will find out whether it did. *(14)*
5. Why is the clock injected rather than called? Then say which of two
   timestamps you would expect a stored change to carry — when a model produced
   it, or when the runtime applied it — and why the other one is not enough on
   its own. *(05, 07)*

---

## Predict

In writing, before reading on.

> 1. Loom keeps two things: an append-only log of every accepted delta, and the
>    current tree. Now suppose reads are free — an infinitely fast machine,
>    memory-speed storage, folding a million deltas costs nothing at all. Write
>    the argument for still keeping the current tree beside the log. If you
>    cannot find one, write that down instead, and say precisely what a
>    log-only system would lose. **Rate your confidence 1–5 before you check.**
>
> 2. A reviewer points at a heading in a rendered page and asks who put it
>    there. The design everyone reaches for first is a `provenance` field on the
>    node, stamped when it is inserted. Write down three things that costs, then
>    the one thing it buys, then your decision. Then the harder half: Loom does
>    store exactly one thing it could have derived. Give the test that admits
>    that one and excludes this one. **Rate your confidence in the test, not in
>    the decision.**
>
> 3. Two writers are holding revision 4. Both propose a change; the second is
>    refused. Name the refusal. Then say why the store checks the base revision
>    itself, given that applying the delta would fail anyway. Finally: of the two
>    ways an append can be refused, exactly one is worth trying again — say
>    which, and say what "trying again" has to mean, because it is not
>    "send the same thing".

Predict 1 is this lesson's spine, and the free-reads condition is not a trick.
It is there to strip out the answer you already have so that the other one has
room to arrive.

---

## The problem

Everything up to here has been a machine with no memory.

§1 gave you a tree and §2 a delta, and the Gate judged it. §3 rendered. §4 said
what could be built. Every one of those was demonstrated against a fixture built
three lines earlier, in the same process, by the same test. The moment a tree has
to survive a deployment — the moment anyone can ask "what did this page look
like last month, and who changed it" — something has to hold it.

Two shapes are obvious, and they are not variants of each other.

**Keep the current tree.** Overwrite it on every change. Reads are one lookup,
storage is one document per tree, and there is nothing else to get right.

**Keep every change.** Store the tree's original shape and an append-only list of
deltas after it. The tree at any revision is the fold of the log up to that
point. History, attribution and reversibility are structural rather than bolted
on.

The second is so close to this project's thesis that it hardly looks like a
choice. Lesson 01 said the whole system exists to make change inspectable,
attributable and reversible; a store that throws away what was proposed, by whom,
and what it replaced contradicts that outright, and there is no version of Loom
where the log is optional. So the snapshot-only shape goes in one line, and the
line is not about performance.

Which leaves the question 0016 says actually decided it, and it is a better
question than it looks:

> The interesting question was whether a snapshot adds anything to a log, given
> that the log already contains the answer.

The log *does* contain the answer. Every delta ever accepted is there, in order,
and folding them produces the tree. A snapshot is a copy of something you can
compute. Every instinct you have about duplicated state says do not keep it.

---

## The idea

### A log is a recipe, not a result

Here is the sentence the rest of this lesson unpacks.

**A stored delta is not a description of a tree. It is a description of an
operation that some code will later perform.** Whether the log still means what
it meant depends on that code, and that code is not in the log.

You have already met the specific instance, in lesson 03, and it probably
registered as a detail. A `move` is detach-then-insert, so its `index` counts the
child list *after* the node has been removed from wherever it was. That is a
convention. It could have gone the other way. Every delta that has ever been
written to a Loom log is written in that dialect, and none of them says so.

Now change the dialect. Fix a bug, clarify an edge case, make an optimisation
that reorders how children are spliced. `applyDelta` is a little different than
it was. What happens to the log?

Under a pure log-only design: nothing happens, visibly, ever. **The fold is the
read.** There is no other account of what the tree is, so a fold that has drifted
does not produce a wrong answer — it produces the new right answer. Users' pages
change shape. No event fires, no error is raised, no alert goes off, and there is
nothing to diff the result against, because the thing you would diff it against
is the thing that just changed.

That is Predict 1. **A second copy of the tree turns replay from a dependency
into a check.** `auditSnapshot` folds the log from a known starting point and
compares the result with the stored snapshot; disagreement becomes a failing
test or a job alert instead of a silent rewrite of history. And the argument does
not mention speed once, which is why it still stands on the infinitely fast
machine.

0016 states the irony plainly, and it is worth reading twice:

> the purest version of "every change is inspectable and reversible" is the
> version that cannot notice when its own interpretation of those changes has
> moved.

### Read cost is the reason you probably gave, and it would not have been enough

It is a real cost. §3 renders per request on an edge runtime; a log-only store
makes every page view a fold over the entire history of the tree, and no cache
fixes it, because the fold *is* the read. A tree edited a thousand times pays a
thousand `applyDelta` calls to answer one page view.

But notice what kind of argument that is. It is a performance note. It has an
ordinary fix — snapshot the fold — and if it were the whole story there would be
no decision record, just a cache. The reason it is worth separating the two
arguments is that they justify *different amounts of machinery*: read cost
justifies a cache, and a cache is something you are allowed to be casual about.
Drift immunity justifies an audit, and an audit is a thing somebody has to run.

Exercise C measures both halves of the cost on one tree: `head` is a single
lookup; the audit of the same tree read three pages and folded 250 entries.

### One write, or the failure the audit was built to catch

`append` is the only writer. Nothing else advances a revision, so nothing can
change a tree without leaving a record of why — and `append` has to write the log
entry and the snapshot **atomically**.

In the memory store that is one `Map.set`, which looks like a triviality until
you read the comment beside it. In Postgres it is a transaction. A store that
writes the log entry and then fails before advancing the snapshot has produced
exactly the disagreement the audit exists to detect — and a store that
manufactures its own alarms is worse than one that has none, because the alarm
stops meaning anything.

### Two refusals, and only one of them is worth trying again

An `append` that does not happen fails in one of two ways, and the design goes
out of its way to keep them apart.

**`revision-conflict`.** The delta names a base revision that is not the current
head. Somebody else wrote first. The error carries both numbers.

**`delta-rejected`.** The delta does not apply to the tree — it names a node that
is not there, or moves a node inside itself, or any of the tree errors from
lesson 03.

Here is the part worth stopping on. The base-revision check runs **before** the
apply, and it does not have to: `applyDelta` checks `baseRevision` too, so a
stale delta would be refused anyway. Doing it twice looks like belt and braces.

It is not. It is about what the caller is told. A stale delta refused by
`applyDelta` comes back as a *tree error*, and "your delta is malformed" and
"someone else wrote first" are acted on completely differently:

- **A conflict is retryable, and retry does not mean resend.** The delta names a
  `baseRevision` and node ids chosen against a tree that has moved. Sending the
  same bytes again just loses the race again. Retrying means going back up the
  pipeline (10) and re-interpreting the intent against the new head — the
  proposal is what survives a conflict, not the delta.
- **A rejection is not retryable at all.** The same delta against the same tree
  fails the same way forever. Something has to change, and it is not the store.

A refusal of either kind leaves nothing behind. Exercise B checks this: after a
conflict and a rejection, the head is where it was and the log is the length it
was. There is no record that somebody tried. **That is deliberate and it is a
real limit** — "what did the model attempt and fail to do" is not a question the
revision log answers, and it is not supposed to. It is answered by telemetry,
which is lesson 17.

### The audit needs a starting point, and the store does not have one

To fold a log you need the tree the first delta applied to. Look at what a store
holds and notice that neither thing is it:

- the snapshot is the tree *now*, not the tree at the beginning;
- the log is every delta *after* revision 0.

Revision 0 is nowhere. So `auditSnapshot` takes the seed as a **parameter**, and
`replay.ts` says why in a sentence worth memorising:

> a caller that cannot supply one cannot audit — which is a real limitation, and
> a better one than an audit that quietly starts from the answer it is trying to
> check.

Read the rejected shortcut again, because it is the whole point. Folding from the
snapshot when you have no seed compares the tree with itself. It agrees every
time, on every tree, forever. It is not a weaker audit; it is a green tick that
means nothing, which is how an unchecked claim gets believed.

0028 turned that limitation into something a host must handle. The portal keeps
`seedFor(treeId)` — a registry of trees whose starting shape this deployment can
prove, re-derived from the builder **in source** rather than read back from
storage. That is what makes it evidence: a stored copy that was wrong, missing or
overwritten cannot make the audit agree. And a tree whose seed is unknown is
listed on the audit page and marked unauditable, with the reason, rather than
hidden — because a page showing only trees that pass is indistinguishable from a
deployment where everything is fine.

### What `agrees` proves, and the two things it does not

The audit has three outcomes and they answer different questions: `agrees`,
`diverged` (with both trees), and `unreplayable` (the log itself would not fold —
a gap, a repeat, or an entry that no longer applies).

Something rides along with all of it. The fold produces every intermediate state,
so the id history (0038, lesson 04) is tracked on the way past and reported on
both replayable outcomes. It is deliberately *not* folded into the verdict,
because it is a different question: "agrees" is about whether the snapshot still
matches the log, and a returned id is about whether the log can be read by id at
all. A tree can pass the first and fail the second, and an audit that merged them
would have to call one of those things by the other's name.

Now the two limits, both of which you are about to produce yourself.

**The audit compares end states, not histories.** Exercise D audits a tree with a
seed that is subtly wrong — one word of text differs from the real revision 0 —
and gets `diverged`, with both trees and a list naming the node. Then one more
revision is appended, and that revision happens to delete the part of the tree the
seed was wrong about. Same seed, same audit, and now it says `agrees`. Nothing
was fixed. The evidence was removed. An audit of a tree can only ever be an audit
of what survived into the tree.

**The audit compares by serialisation, so key order counts.** `JSON.stringify` on
both sides. That is sound — a tree is JSON by construction — and it means a seed
whose keys are written in a different order diverges from a tree that is
structurally identical to it. Exercise E produces exactly that: outcome
`diverged`, and `compareTrees` finds zero differences between the two trees.

Sit with how strange that output is, and then notice it is the good failure. 0016
names the direction on purpose: *a false alarm rather than a false pass.* An
audit that cries wolf costs somebody an afternoon. An audit that stays quiet when
the log has stopped meaning what it meant costs the thing the audit was for.
**Choosing which way a check is allowed to be wrong is a design decision, and it
is one you should expect to make explicitly rather than discover afterwards.**

One more property of the `diverged` case, and it is the same instinct as
`attributeTree` later: it carries the stored tree as well as the replayed one,
rather than telling the caller to go and read the head. The audit read that head
to reach its verdict. A caller re-reading it might get one that has moved since,
and would then describe a divergence nobody ever observed.

### `compareTrees` describes; it cannot be applied

The pair of trees becomes a list of differences: in the snapshot but not produced
by the log, produced by the log but not in the snapshot, or present in both and
different — in kind, primitive, props, text, parent, or position. Node ids are
the join key, which is what makes it worth having: because ids are minted once
and never re-minted (lesson 04), a card that moved is *one node whose position
changed*, not a subtree removed and an identical subtree added. That is Warm-up 3.

And `compareTrees` deliberately does not resemble a `TreeDelta`. It produces no
operations, and nothing in the system accepts it as an input to a write. 0028 is
firmer about this rejection than about any other:

> A second shape that describes change would eventually be applied by somebody,
> and the log would gain entries no proposal ever produced.

Reconciling drift is a decision a person makes. If it is ever automated, it goes
through the same gate as everything else.

### One derived value is stored. Everything else the log determines is computed.

This is the part to carry out of the lesson, because it is a rule rather than a
fact, and you have already seen it applied twice without it being named.

Three facts that the log completely determines, and for each one somebody
reasonable proposed storing it:

| Fact | Proposed as | Actually |
| --- | --- | --- |
| the current tree | a snapshot column | **stored**, and audited |
| the inverse of a delta | an `inverse` column on the revision | computed by replay (06) |
| who placed a node | a `provenance` field on `LoomNode` | derived by a backwards walk (0041) |
| a node's id history | a second pass over the log | rides along with the fold (0038) |

Lesson 06 already told you the second one: *Loom stores nothing to make undo
possible.* The inverse of every applied delta exists at assessment time and is
thrown away, and `revert.ts` says exactly why it is not kept, in a sentence that
names this lesson's rule from the other side —

> 0016's argument for the snapshot, applied to a place it does not earn its
> keep: an inverse is needed rarely, a snapshot on every render.

The third is Predict 2, and 0041 is where the argument is made in full. A
`provenance` field on the node reads instantly, needs no log, and is what a
reasonable engineer reaches for first. Against it: it changes the tree schema, so
every stored tree and every fixture migrates; it answers only for nodes inserted
after the field existed, leaving every tree built so far permanently anonymous;
it is per-node storage for a per-revision fact, so a card and its twelve
descendants carry thirteen identical copies of one record. And the one that
belongs to this lesson specifically — **a replay that produced a differently
stamped node would be a divergence in something that is not really data.** The
field would make the audit fire over a fact about bookkeeping.

So, the test. A fact the log determines is stored a second time only when
**both** of these hold:

1. **The read that would recompute it is on a path that cannot afford it.** The
   snapshot is read on every request; attribution is read on a review pane by a
   person who clicked something.
2. **Something can rebuild the copy and check it.** The snapshot has
   `auditSnapshot`. That is not a bonus feature; it is the licence.

Watch both halves do work. The strongest alternative to deriving attribution was
a *stored index* from node id to the revision that placed it, maintained on
append — and 0041 rejects it by quoting 0016 back at itself: a materialised view
is only safe when the thing it summarises can rebuild it, and this one would add
a second write to the one path that must not grow more ways to fail. The snapshot
earns that cost because §3 renders per request. A review pane does not.

**The snapshot is not an example of a policy about caching derived state. It is
the only case, and the audit is the price of it.**

### A bounded walk, and "I cannot tell you" for the fifth time

Attribution is derived, which raises the obvious objection: does asking who
placed a node cost a fold of the whole history? No, and the reason is a nice
piece of thinking.

**The walk goes backwards and stops.** For a node that is in the tree *now*, the
first insert carrying it that a backwards walk meets is the one that put it
there — anything that removed it afterwards would have needed a later insert to
bring it back, and that later insert is the one the walk would have met first. So
a recently placed node is answered by one page. 0041 makes the sharp point: the
backwards walk is not an optimisation of the fold, it terminates on a property
the fold cannot exploit.

The walk is still bounded, because every read in Loom is bounded. Which forces a
third outcome, and by now you should be able to predict its shape before you read
it:

- **`placed`** — the walk found the insert.
- **`seeded`** — the walk reached the start of the log and found none, so the node
  was there from the beginning.
- **`undetermined`** — the walk ran out of budget first.

Collapsing the last two would credit the seed with work somebody did, on the
basis that we stopped looking. Lesson 15 counted four seams where a two-valued
answer was rejected — `props: undefined`, `PropsVerdict.undeclared`, a binding's
`unavailable`, `not-probeable`. This is the fifth, and if you did not see it
coming, the pattern is worth another minute than the instance.

One more distinction the touch carries. An insert brings a whole subtree, so
every node in it was placed by that revision — but only the subtree's root was
*asked for*. "The model added a card" and "the model added the heading inside a
card it added" are different sentences, and a reviewer deserves the one that is
true.

### The snapshot reaches the renderer as `unknown`

Warm-up 4, and lesson 15's sentence about a schema this deployment no longer
runs, both land here.

`treeSourceFromStore` is the join between the part of Loom that keeps trees and
the part that draws them, and it is one function. It hands the renderer the
snapshot typed as `unknown`, so the render path parses it like anything else.

It could trivially have returned `LoomTree`. The store's snapshot *is* a
`LoomTree`; the type would check; the parse would be skipped. And that is the
whole argument against it — **a store is precisely where a tree that was valid
under an older schema comes back from.** A fixture cannot go stale. A database
row written eight months ago can. The seam that would be most convenient to trust
is the one seam that has a reason to lie, and the `unknown` is that reason, in the
type.

Set R asked what would have to become true for `LoomTree` to be an honest return
type there. Now you know the answer is "nothing that is going to happen", and
why.

---

## In the code

**`src/store/store.ts`** — the contract. Three reads and two writes, and the doc
comment says what each one is *for*, which is the right way to read an interface.
Two things to look at specifically: `RevisionStart`, where a cursor and a
revision are mutually exclusive **in the type** rather than by a precedence rule
("a request that quietly ignores half of what it was asked is the failure mode
this contract avoids everywhere else"); and `TreeListing`, which carries no
timestamp because a `LoomTree` carries none and a listing that invented one would
be a field only some implementations could fill honestly.

**`src/store/memory.ts`** — the reference implementation, and read the header
comment on why it is that rather than a test double. `append` is thirty lines and
contains this lesson's two most important comments: the one on the base-revision
check, and the one-line `/** One write, so the log and the snapshot cannot be
seen disagreeing. */`.

**`src/store/replay.ts`** — `replayTree`, `foldLog`, `auditSnapshot`. Small, and
almost entirely argument. `foldLog` is where a paged read becomes a fold: "a page
boundary is not a semantic boundary, it is just where the read stopped."

**`src/store/errors.ts`** — five refusals and `describeStoreError`. Read the
messages: `t_1 moved on: the delta applies to revision 0, but head is 1` is
written for a person deciding what to do next.

**`src/store/attribution.ts`** — the backwards walk. The header comment is the
best short statement in the repository of why a derived fact stays derived.

**`src/store/revert.ts`** — reads the log forward from a seed exactly as the
audit does, and for the same reason: the tree a delta observed is only
recoverable by replaying the entries before it. Note what it produces — operations
and obstacles, not a verdict.

**`src/store/source.ts`** — twenty lines, one function, and the `unknown`.

**`src/store/postgres.ts`** and **`src/store/schema.ts`** — the same contract
against SQL. Worth a skim for one thing only: how little of the reasoning above
is different when the storage is real.

**`decisions/0016`**, **`0028`**, **`0041`** — in that order. 0016 decides, 0028
finds out what the decision costs when somebody tries to use it, and 0041 applies
0016's rule to a fact 0016 never considered.

---

## Try it

Six exercises. Put each snippet into `src/scratch.test.ts` and run

```bash
pnpm vitest run src/scratch.test.ts
```

**Predict every output in writing, then run.** Exercises D and E are the two
whose answers most readers do not write down, and they are the two the lesson is
really about.

The shared preamble for all six:

```ts
import { describe, it } from "vitest"

import { sequentialIdFactory, type NodeId, type ProposalId, type TreeId } from "./ids.js"
import {
  attributeTree,
  auditSnapshot,
  describeStoreError,
  memoryTreeStore,
  replayTree,
  treeSourceFromStore,
  type AppendRequest,
  type RevisionReadRequest,
  type TreeReader,
} from "./store/index.js"
import { FIXED_INSTANT } from "./testing/doubles.js"
import { sampleTree } from "./testing/fixtures.js"
import { buildText } from "./tree/builders.js"
import { compareTrees } from "./tree/compare.js"
import type { TreeDelta, TreeOperation } from "./tree/delta.js"

const provenance = {
  origin: "user-instruction",
  interpreter: "scripted",
  authoredBy: "model",
  confidence: 0.9,
  interpretedAt: FIXED_INSTANT,
} as const

const deltaOf = (
  treeId: TreeId,
  baseRevision: number,
  operations: readonly TreeOperation[]
): TreeDelta => ({
  deltaId: sequentialIdFactory("d").deltaId(),
  treeId,
  baseRevision,
  operations,
})

const appendOf = (delta: TreeDelta, proposalId: string): AppendRequest => ({
  proposalId: proposalId as ProposalId,
  delta,
  provenance,
  appliedAt: FIXED_INSTANT,
})
```

### Exercise A — the two halves, advancing together

```ts
describe("A", () => {
  it("advances the log and the snapshot in one step", async () => {
    const { tree, ids } = sampleTree()
    const store = memoryTreeStore()
    await store.create(tree)

    console.log("at creation, revision:", tree.revision)

    const first = await store.append(
      tree.treeId,
      appendOf(deltaOf(tree.treeId, 0, [{ op: "remove", nodeId: ids.footer }]), "p_1")
    )
    const second = await store.append(
      tree.treeId,
      appendOf(
        deltaOf(tree.treeId, 1, [
          { op: "configure", nodeId: ids.card, set: { variant: "filled" }, unset: [] },
        ]),
        "p_2"
      )
    )

    console.log("append returned revision:", first.ok && first.value.revision, second.ok && second.value.revision)

    const log = await store.revisions(tree.treeId)
    const listing = await store.list()
    if (!log.ok || !listing.ok) return

    for (const entry of log.value.revisions) {
      console.log(
        ` r${entry.revision}`,
        entry.proposalId,
        entry.delta.operations.map((op) => op.op).join(","),
        "base",
        entry.delta.baseRevision,
        "by",
        entry.provenance.authoredBy,
        "answeredBy" in entry ? "approved" : "(nobody had to approve it)"
      )
    }

    console.log("listing:", JSON.stringify(listing.value.trees))
    console.log("log entries:", log.value.revisions.length)
  })
})
```

The output:

```
at creation, revision: 0
append returned revision: 1 2
 r1 p_1 remove base 0 by model (nobody had to approve it)
 r2 p_2 configure base 1 by model (nobody had to approve it)
listing: [{"treeId":"t_1","revision":2}]
log entries: 2
```

Three things worth naming.

**`append` returns the new tree, not a receipt.** The caller that wrote is the
caller that renders next, and making it re-read would be an invitation to render
a revision that is not the one it just produced.

**The listing is one number, and one number is the whole summary.** Revision
starts at 0 and increments once per accepted delta, so it is also the length of
the log. Nothing in it is a timestamp, because a `LoomTree` carries none — §1
kept time out of the document, and a listing cannot honestly invent what the
document does not have.

**`answeredBy` is absent, not `undefined`.** Nobody had to approve either of
these, so the key is not there at all — which is the shape a Postgres row with a
null column parses back to. Two implementations, one contract; the memory store
goes out of its way to be indistinguishable from the real one in a place nobody
would have noticed.

### Exercise B — the two refusals, and what they leave behind

This is Predict 3.

```ts
describe("B", () => {
  it("tells a race apart from a bad delta", async () => {
    const { tree, ids } = sampleTree()
    const store = memoryTreeStore()
    await store.create(tree)

    const mine = deltaOf(tree.treeId, 0, [{ op: "remove", nodeId: ids.footer }])
    const yours = deltaOf(tree.treeId, 0, [{ op: "remove", nodeId: ids.header }])

    const winner = await store.append(tree.treeId, appendOf(mine, "p_1"))
    const loser = await store.append(tree.treeId, appendOf(yours, "p_2"))

    console.log("first writer ok?", winner.ok)
    console.log("second writer ok?", loser.ok)
    if (!loser.ok) console.log(" ", loser.error.code, "—", describeStoreError(loser.error))

    const ghost = deltaOf(tree.treeId, 1, [{ op: "remove", nodeId: "n_999" as NodeId }])
    const rejected = await store.append(tree.treeId, appendOf(ghost, "p_3"))

    console.log("delta naming a node that is not there ok?", rejected.ok)
    if (!rejected.ok) console.log(" ", rejected.error.code, "—", describeStoreError(rejected.error))

    const head = await store.head(tree.treeId)
    const log = await store.revisions(tree.treeId)
    console.log("head revision:", head.ok && head.value.revision)
    console.log("log entries:", log.ok && log.value.revisions.length)
  })
})
```

The output:

```
first writer ok? true
second writer ok? false
  revision-conflict — t_1 moved on: the delta applies to revision 0, but head is 1
delta naming a node that is not there ok? false
  delta-rejected — the delta did not apply to t_1: node-not-found
head revision: 1
log entries: 1
```

Both deltas in the race were perfectly valid. The second one is refused for a
reason that has nothing to do with it, and the message says so in the words a
person would use: *t_1 moved on.*

Now the last two lines, which are the ones to have predicted. **Two refused
appends left no trace whatsoever.** The head is 1, the log has one entry, and
nothing anywhere records that a model proposed something and lost a race or
named a node that was not there. The revision log is a record of what *happened
to the tree* — not of what was attempted. That is a real limit and it is chosen:
lesson 17's telemetry is where attempts live, and putting them here would mean a
log whose length no longer equals the tree's revision, which is half of what
makes the two halves checkable against each other.

### Exercise C — what an audit costs, measured

```ts
describe("C", () => {
  it("audits a long log, and counts what the audit read", async () => {
    const { tree, ids } = sampleTree()
    const store = memoryTreeStore()
    await store.create(tree)

    for (let revision = 0; revision < 250; revision += 1) {
      await store.append(
        tree.treeId,
        appendOf(
          deltaOf(tree.treeId, revision, [
            { op: "configure", nodeId: ids.card, set: { elevation: revision }, unset: [] },
          ]),
          `p_${revision + 1}`
        )
      )
    }

    let pages = 0
    let entries = 0
    const counted: TreeReader = {
      head: store.head,
      revisions: async (treeId: TreeId, request?: RevisionReadRequest) => {
        pages += 1
        const page = await store.revisions(treeId, request)
        if (page.ok) entries += page.value.revisions.length

        return page
      },
    }

    const head = await store.head(tree.treeId)
    console.log("head revision:", head.ok && head.value.revision)

    const audit = await auditSnapshot(counted, tree.treeId, tree)
    if (!audit.ok) return

    console.log("outcome:", audit.value.outcome)
    console.log("pages read:", pages, " entries folded:", entries)
    if (audit.value.outcome !== "unreplayable") {
      console.log("idReturns:", JSON.stringify(audit.value.idReturns))
    }
  })
})
```

Predict the page count before you run — the revision page's default limit is
in `store.ts` and the arithmetic is not a trick.

The output:

```
head revision: 250
outcome: agrees
pages read: 3  entries folded: 250
idReturns: []
```

**One read against three-hundred-and-fifty-one.** Serving this page costs a
lookup of one document; proving that document is what the log says costs the
whole history, in bounded pages, and gets more expensive every time anyone edits
the tree.

That asymmetry is the entire design in one measurement. It is also why 0028 keeps
the audit on demand — a reviewer names a tree and the fold happens; nothing runs
it as a side effect of opening a page. And read the honest bit in that record's
consequences: nothing schedules it yet, so a drift appearing at 3am is found by
the next person who looks.

`idReturns` is empty here, and would not be for a tree where a removed id came
back (lesson 04). It is on the audit's result because the fold walks every
consecutive pair of states and nothing else in the system does.

### Exercise D — the alarm, and then the alarm going quiet

```ts
describe("D", () => {
  it("reports a divergence with both sides, and a hole as neither", async () => {
    const { tree, ids } = sampleTree()
    const store = memoryTreeStore()
    await store.create(tree)
    await store.append(
      tree.treeId,
      appendOf(deltaOf(tree.treeId, 0, [{ op: "remove", nodeId: ids.footer }]), "p_1")
    )

    /** A seed that is *almost* revision 0 of this tree: one text differs. */
    const wrong = JSON.parse(JSON.stringify(tree)) as typeof tree
    ;(wrong.root as unknown as { children: { children: { value: string }[] }[] }).children[0]!
      .children[0]!.value = "Welcome back"

    const audit = await auditSnapshot(store, tree.treeId, wrong)
    if (!audit.ok) return

    console.log("outcome:", audit.value.outcome)
    if (audit.value.outcome === "diverged") {
      console.log("at revision:", audit.value.revision)
      for (const difference of compareTrees(audit.value.stored, audit.value.replayed)) {
        console.log(
          " ",
          difference.code,
          difference.nodeId,
          `"${difference.label}"`,
          "facets" in difference ? difference.facets.join(",") : ""
        )
      }
    }

    /** Now remove the header — which is where the doctored text lived. */
    await store.append(
      tree.treeId,
      appendOf(deltaOf(tree.treeId, 1, [{ op: "remove", nodeId: ids.header }]), "p_2")
    )

    const again = await auditSnapshot(store, tree.treeId, wrong)
    console.log("same seed, one revision later:", again.ok && again.value.outcome)

    const log = await store.revisions(tree.treeId)
    if (!log.ok) return

    const hole = replayTree(tree, [log.value.revisions[1]!])
    console.log("second entry alone:", hole.ok ? "ok" : JSON.stringify(hole.error))

    const twice = replayTree(tree, [log.value.revisions[0]!, log.value.revisions[0]!])
    console.log("first entry twice: ", twice.ok ? "ok" : JSON.stringify(twice.error))
  })
})
```

Write down four predictions: the first outcome, what `compareTrees` says about
it, the outcome after the header is removed, and the two replay errors.

The output:

```
outcome: diverged
at revision: 1
  changed n_1 "text" text
same seed, one revision later: agrees
second entry alone: {"code":"revision-gap","expected":1,"found":2}
first entry twice:  {"code":"revision-gap","expected":2,"found":1}
```

**The alarm works.** One node, named by id, with the facet that differs — and
`n_1` is the text node, because in this fixture leaves are built before their
parents. The stored tree and the replayed tree both come back on the verdict, so
the operator reading this never has to re-read a head that may have moved.

**Then the alarm goes quiet, and nothing was fixed.** Revision 2 removed the
header, and the doctored text lived inside the header. The seed is exactly as
wrong as it was; the evidence is gone. **An audit of a tree is an audit of what
survived into that tree** — and the corollary is uncomfortable and worth writing
on something: a green audit is evidence about the current tree, not about the
history that produced it.

**And the two replay errors are the same code with the numbers swapped.** A hole
in the log and a repeated entry are both `revision-gap`, because both are the
same fact: revisions must be dense and consecutive from the seed, so the only
thing to report is which one was expected and which one turned up. Try to write
the third failure mode — an entry that is in order and still does not apply — and
then check `ReplayMismatch` to see what it is called.

### Exercise E — the false alarm, and why it is the good one

```ts
describe("E", () => {
  it("compares by serialisation, key order and all", async () => {
    const { tree } = sampleTree()
    const store = memoryTreeStore()
    await store.create(tree)

    const reordered = JSON.parse(JSON.stringify(tree)) as Record<string, unknown>
    const root = reordered["root"] as Record<string, unknown>
    reordered["root"] = Object.fromEntries(Object.entries(root).reverse())

    console.log("stored root keys:", Object.keys(tree.root).join(","))
    console.log("seed root keys:  ", Object.keys(reordered["root"] as object).join(","))

    const audit = await auditSnapshot(store, tree.treeId, reordered as never)
    if (!audit.ok) return

    console.log("outcome:", audit.value.outcome)
    if (audit.value.outcome === "diverged") {
      console.log("compareTrees differences:", compareTrees(audit.value.stored, audit.value.replayed).length)
    }
  })
})
```

There are no deltas at all here. The log is empty, the fold is the identity, and
the only difference between the seed and the snapshot is the order the root
node's keys were written in. Predict the outcome and the difference count.

The output:

```
stored root keys: kind,id,type,props,children
seed root keys:   children,props,type,id,kind
outcome: diverged
compareTrees differences: 0
```

**A verdict of `diverged` and a comparison that finds nothing to report.** That
is not a bug being discovered; it is the consequence 0016 wrote down in advance,
happening:

> If any future code path builds a tree with keys in a different order, the audit
> will report divergence where there is none — a false alarm rather than a false
> pass, which is the right direction for this to fail in.

Two things to take from it.

**A check that is cheap and slightly paranoid beats a check that is exact and
occasionally silent** — in this position. `JSON.stringify` is three words of code
and its failure wastes an afternoon. A structural comparison would be right more
often and would have to decide, itself, which differences do not count; every one
of those decisions is a chance to accidentally decide that the real drift does
not count either.

**And the pair of outputs is the tool for the afternoon it costs.** `diverged`
tells you to look; `compareTrees` finding nothing tells you what kind of
divergence you have. The verdict and the description disagreeing is information,
which is only possible because they were computed by different code.

### Exercise F — derived on demand, and honest about its budget

```ts
describe("F", () => {
  it("derives who put a node here, and says when it cannot", async () => {
    const { tree, ids } = sampleTree()
    const store = memoryTreeStore()
    await store.create(tree)

    const inserted = buildText(sequentialIdFactory("x"), "More")
    await store.append(
      tree.treeId,
      appendOf(
        deltaOf(tree.treeId, 0, [{ op: "insert", parentId: ids.card, index: 1, node: inserted }]),
        "p_1"
      )
    )
    await store.append(
      tree.treeId,
      appendOf(
        deltaOf(tree.treeId, 1, [
          { op: "configure", nodeId: ids.card, set: { variant: "filled" }, unset: [] },
        ]),
        "p_2"
      )
    )

    const head = await store.head(tree.treeId)
    if (!head.ok) return

    const attributed = await attributeTree(store, head.value)
    if (!attributed.ok) return

    for (const nodeId of [ids.page, ids.card, inserted.id]) {
      const found = attributed.value.nodes.get(nodeId)
      if (found === undefined) continue

      console.log(
        nodeId,
        "->",
        found.outcome,
        found.outcome === "placed" ? `by r${found.placed.entry.revision}, named=${found.placed.named}` : "",
        `since=[${found.since.map((touch) => `r${touch.entry.revision}:${touch.effect}`).join(" ")}]`
      )
    }
    console.log("examinedTo:", attributed.value.examinedTo, " reachedStart:", attributed.value.reachedStart)

    const source = treeSourceFromStore(store)
    const loaded = await source.load({ treeId: tree.treeId } as never)
    console.log("source.load:", loaded.ok ? `ok, an ${typeof loaded.value}` : loaded.error.code)
    const missing = await source.load({ treeId: "t_nope" as TreeId } as never)
    console.log("missing tree:", missing.ok ? "ok" : JSON.stringify(missing.error))
  })

  it("runs out of budget rather than guessing", async () => {
    const { tree, ids } = sampleTree()
    const store = memoryTreeStore()
    await store.create(tree)

    const late = buildText(sequentialIdFactory("x"), "Late")
    for (let revision = 0; revision < 150; revision += 1) {
      await store.append(
        tree.treeId,
        appendOf(
          deltaOf(tree.treeId, revision, [
            revision === 149
              ? { op: "insert", parentId: ids.card, index: 1, node: late }
              : { op: "configure", nodeId: ids.card, set: { elevation: revision }, unset: [] },
          ]),
          `p_${revision + 1}`
        )
      )
    }

    const head = await store.head(tree.treeId)
    if (!head.ok) return

    const bounded = await attributeTree(store, head.value, { pages: 1 })
    if (!bounded.ok) return

    for (const nodeId of [late.id, ids.page]) {
      const found = bounded.value.nodes.get(nodeId)
      console.log(
        nodeId,
        "->",
        found?.outcome,
        found?.outcome === "placed" ? `by r${found.placed.entry.revision}` : ""
      )
    }
    console.log("examinedTo:", bounded.value.examinedTo, " reachedStart:", bounded.value.reachedStart)
  })
})
```

Two predictions to write before you run. First: the card `n_4` was `configure`d
at revision 2 — say which of the three outcomes it gets, and be specific, because
this is the one most readers get wrong. Second: one page of log is a hundred
revisions and the second tree has a hundred and fifty, so say what each of its
two nodes gets.

The first block's output:

```
n_7 -> seeded  since=[]
n_4 -> seeded  since=[r2:configured]
n_x1 -> placed by r1, named=true since=[]
examinedTo: 1  reachedStart: true
source.load: ok, an object
missing tree: {"code":"not-found","detail":"no tree stored under t_nope"}
```

And the second's:

```
n_x1 -> placed by r150
n_7 -> undetermined
examinedTo: 51  reachedStart: false
```

**The card was `configure`d at revision 2 and is still `seeded`.** Placement and
change are different questions and the answer keeps them apart: `n_4` was there
from the beginning, and something has happened to it since. A design that had
answered "who last touched this" would have said revision 2 and been useless to a
reviewer asking who put a card on the page.

**`named=true` on the inserted text**, because the delta named that node. Insert
a card containing a heading and the heading is placed by the same revision with
`named=false` — same event, two true sentences, and the reviewer gets the one
that is true of *that node*.

**The bounded run answers one node and refuses to answer the other.** The walk
read one page — revisions 150 down to 51, which is what `examinedTo: 51` says —
found the late insert immediately, and never reached the start, so `reachedStart`
is false and the root is `undetermined` rather than `seeded`. Change `pages` to 2
and it resolves. The answer never silently degrades into a wrong one; it degrades
into "I did not look far enough", with the number you need to know how far that
was.

**And `source.load` returns an `object`.** Not a `LoomTree` — a thing the renderer
is about to parse, from the one seam in this system with a reason to hand back
something stale.

---

## It could have been otherwise

Seven, from 0016, 0028 and 0041. Two of them are among the most instructive
rejections in the repository.

**Pure event sourcing, no snapshot.** Rejected for drift, not for speed. It is
the purest expression of the thesis and the version that cannot notice when its
own interpretation of the log has moved.

**Snapshot only, no log.** Rejected in a line: a runtime whose premise is that
change is proposed, attributable and reversible cannot throw away what was
proposed, by whom, and what it replaced.

**Snapshot plus a log kept only for display.** One line of reasoning away from
what was built, and the line matters: if the log is decorative, nothing checks
it, and an append that fails to write its entry is a bug nobody finds. Declaring
the log authoritative is what makes the audit mean anything.

**Periodic snapshots every N revisions, replaying the remainder.** The textbook
event-sourcing compromise. Rejected as premature — it adds a tuning parameter and
a partial-replay path on the *request* seam, to save storage that is not scarce.

**Derive the audit from inverse deltas**: apply the log forward, then unapply it
back to the seed, and check you land where you started. Elegant, needs no
snapshot at all, and rejected because of what it actually tests — `applyDelta`
against `invertDelta`. It would pass happily while both drifted together in the
same direction, which is the most likely way for them to drift, since the same
person changes both in the same afternoon. **A check whose two sides can fail
together is not a check.**

**Keep revision 0 in the store** — a seed column, or the initial tree as log
entry 0. 0028's strongest alternative, rejected on scope rather than merit, and
the counter-argument is the interesting part: a stored seed is data, and the
audit exists to catch the case where the code that interprets stored data has
drifted. A seed re-derived from source is checked by a slightly different route
than a seed read back from the same store being audited.

**A `provenance` field on `LoomNode`, stamped at insert.** Predict 2, and the one
worth arguing with, because it is genuinely more convenient. Rejected: a schema
bump and a migration of every stored tree; permanent anonymity for every tree
built before it existed; thirteen copies of one record for a card with twelve
descendants; and a replay that stamped differently would show up as a divergence
in something that is not really data.

---

## Explain it back

Two things to write in your own words. Do not look at the earlier sections while
you write. Then compare.

1. **Derive this lesson's snapshot from lesson 06's refusal to store anything.**
   Lesson 06 said Loom stores nothing to make undo possible; this lesson says
   Loom stores the one derived value it cannot afford to recompute. Write the
   paragraph that makes those the same decision rather than two decisions that
   happen to disagree — and make it turn on what has to be *true of the copy*,
   not on how often each one is read; the read-frequency answer is half the rule
   and stops being enough the moment somebody proposes a cache with no audit.
   Then apply your rule to a case neither lesson mentions: a portal wants "the
   trees changed this week", and `store.ts` says listings are ordered by
   `treeId` because recency is "a view over data the store does not hold".
   Should that view be stored? Answer with the rule. *(06)*

2. **Say what the audit buys and what it costs**, with the cost as concrete as
   the benefit — Exercise C gives you the numbers. Then answer the question the
   cost raises. 0028 records that nothing schedules the audit, so drift arriving
   at 3am is found by the next person who looks. Say what makes scheduling it a
   *different decision* from building the page, name the party the decision
   belongs to, and then say which earlier lesson's rule settles whether the
   library may make that call itself. *(09, 12)*

If your answer to (1) contains the phrase "because it would be slow", you have
written the reason that would have produced a cache. The rule this lesson is
about produced an audit, and the difference between those two artefacts is the
thing to explain.

---

## Self-check

Six questions. For each: **rate your confidence 1–5 before you write your
answer, then check.**

1. Give the argument for the snapshot that survives on a machine where reads are
   free. Then say what it means that the argument is about the *code that reads
   the data* rather than about the data — and name one other place in this
   course where a design defends against its own future self rather than against
   a user.
2. The seed is a parameter. Say what a store holds that is *not* a seed and why
   neither of the two things qualifies; say what a host that cannot produce one
   must do; and say why the obvious shortcut is worse than doing no audit at all.
3. Name the two refusals `append` can make. Say which one is worth retrying and
   what retrying has to mean. Then say what both leave in the log, and why the
   answer is the same as what makes the log's length equal to the revision
   number.
4. `agrees` is not the same claim as "the history is intact". Give two different
   situations where the audit agrees and something is nevertheless wrong. One is
   Exercise D; the other you have to find, and it is in this lesson.
5. State the rule that decides whether a fact the log determines may be stored a
   second time. Apply it to the snapshot and to authorship. Then name the half of
   the rule that the *stored attribution index* fails, and say which is worse:
   failing that half or failing the other one.
6. The audit will report a false alarm when key order differs and can never
   report a false pass for that reason. Say why that direction was chosen. Then
   name one other decision in this course where somebody picked which way a
   check is allowed to be wrong, and say what the two directions were.

Question 4 is the one to be least satisfied with a short answer to. Question 5 is
the one most worth doing out loud.

---

## Reflect

Write for two minutes, then move on.

- Which prediction were you most confidently wrong about? If it was Predict 1,
  go back and find the moment you decided read cost was the answer — the free-
  reads condition was in the question, so something made it easy to answer a
  question that had been ruled out. That habit is worth catching in general.
- Exercise D produced a green audit over a seed that was definitely wrong, one
  revision after the same audit caught it. Write down, in one sentence, what you
  would now say to somebody who told you their nightly audit has been green for
  six months. Then say what you would want them to check instead.
- Warm-up 4 has been asking about `unknown` at the storage seam since lesson 14,
  and you have now met the storage. Say whether the answer you had been giving
  turned out to be the shape of an answer or an answer — and if it changed, say
  what changed it.

---

## Come back to this

Set T in [`review-schedule.md`](review-schedule.md), two days after this lesson.
Interleaved with 03, 04, 06, 07, 09, 12 and 15, and built around the failure mode
this lesson exists to name: **trusting a check without asking what it compares.**

**Where lesson 17 goes next.** Telemetry — how a self-graded confidence number
eventually gets calibrated. The door in from here is a field you have been
copying into every exercise in this lesson without looking at it: every log entry
carries `provenance.confidence`, a number the model gave itself, stored on every
change Loom has ever accepted, and nothing in Parts I–IV or in this lesson has
ever compared it to what happened next.
