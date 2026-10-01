# 26 — Liveness: what a queue of changes cannot say about itself

**After this lesson you will be able to** say why a list assembled from one store
cannot be judged without a second one, and why that is a design decision rather
than a missing field; write the comparison that decides whether a held change can
still be applied, and say why the obvious `>` is wrong and which authority
decides that; explain why a fact spanning two stores gets a function rather than
a field, and give the one property of the comparison that settles where the
function goes; say what a third answer buys over an optimistic second one, and
name the failure an optimistic answer reintroduces one level up; explain why a
module about partial knowledge may not have a total failure mode; and say what it
means to decline the neighbouring question, using a badge that would have been
true about the wrong thing.

**Prerequisites:** [01](01-why-a-runtime.md), [02](02-ui-as-data.md),
[03](03-change-as-data.md), [04](04-identity.md),
[05](05-purity-at-the-seams.md), [06](06-undo-as-computation.md),
[07](07-measuring-a-change.md), [08](08-two-axes.md), [09](09-the-gate.md),
[10](10-the-pipeline.md), [11](11-the-model-seam.md), [12](12-projection.md),
[13](13-refusal-and-repair.md), [14](14-rendering.md),
[15](15-primitives-and-the-registry.md), [16](16-persistence.md),
[17](17-telemetry.md), [18](18-data.md), [19](19-destinations.md),
[20](20-origins.md), [21](21-appearance.md), [22](22-reach.md),
[23](23-anchors.md), [24](24-silence.md), [25](25-exhaustiveness.md).

Lesson 25 ended with a question about where to put a claim so that getting it
wrong is an event. It was asked about a *list* — a value somebody writes down and
that goes silently stale.

This lesson asks the same question about a *comparison*: something nobody writes
down at all, because it is not a value anywhere. It is true of two rows in two
different places, and the two places are built so that neither can see the other.

The queue that shows a reviewer what is waiting is assembled from exactly one of
them.

---

## Warm-up

Closed book, five minutes, mixed across five lessons. Write something for all
five before you look anything up.

1. `confirmHeld` reads the tree's head before it calls `confirmChange` at all.
   Say what it does when the head and the hold's revision differ, why the lesson
   called that *dead rather than stale*, and what would go wrong if the Gate
   simply held the change again. *(10)*
2. A primitive that has said nothing about the words it shows is not the same as
   one that has said there are none. Say what a reading owes a caller about the
   difference, and why replacing a correct guess with an authoritative source can
   be a regression. *(24)*
3. The log is the truth and the snapshot is a view you can rebuild. Say what
   `revision` counts, and what a listing is able to say about a tree without
   loading the document. *(16)*
4. Lesson 22 met a fault that belongs to two nodes rather than to either. Say
   where the predicate lives, what it is applied to, and what the declaration
   that makes the pair visible is — and why that declaration is a claim that can
   be false. *(22)*
5. The Gate is a ladder of rules in a fixed order. Say what a rung returns when
   it has nothing to say about a change, and why the ladder stops at the first
   rung that speaks. *(09)*

Question 1 is the one to be exact about. Everything in this lesson is downstream
of that behavior being correct, and a rough answer here will let you read the
rest as a bug report about something that is working.

---

## Predict

**In writing, before reading on.** Four questions. Question 3 is the one to rate
your confidence on.

1. You are building the review queue — the screen that shows a person every
   change waiting for an answer. `waiting()` hands you a page of held proposals,
   oldest first. Each one carries the proposal, the intent, the Gate's
   disposition, when it was held, and the revision it was judged against.

   **Write down the row.** Then write down how you grey out the ones that can no
   longer be applied, and be specific about one thing: **where the information
   for that second part comes from.** If your answer is "from the hold", say
   which field.

2. A hold records `baseRevision: 3`. **Write the expression** that decides
   whether answering it could still work. Then evaluate it three times: head is
   `3`, head is `4`, head is `2`.

   The third is the one to write an explicit answer for, including the case you
   think produces it. Then name the thing your expression has to agree with, and
   say how far away from it you would put the expression.

3. You badge a page of forty holds spanning eleven trees, which means eleven
   reads. One of them fails — that tree's store is unavailable right now.
   **What does that row show?** Write the *value*, not the pixel.

   Then, for each of the two answers you did not pick, write the sentence a
   reviewer would read on that row, and the thing it would be wrong about.
   **Rate your confidence 1–5.**

4. A hold against a tree that has since been deleted. The head read comes back
   `not-found`. Is that row dead, or is it unknown? Give one sentence of reason —
   and then **write the badge text your answer produces and read it out loud.**

Do not read on until all four are written. Question 2's third case is where most
people write an expression first and an answer second, and then discover the
expression has already answered for them.

---

## The problem

On 7 September the documentation lane was writing a page called *When something
looks wrong*. It did not reason about this; it produced it, at a terminal, in the
smallest number of steps the system allows:

1. A change is proposed against a page at revision 3. The Gate holds it — the
   stakes are above the ceiling, so somebody has to say yes.
2. An ordinary, unremarkable change lands on that same page. Head is now 4.
3. The reviewer opens the queue. The held change is there, where it has been.
4. They read it, decide it is fine, and click yes.
5. The answer comes back `not-written`, and the row disappears.

Nothing here is a bug. Step 5 is lesson 10's behavior and it is right:
`confirmHeld` reads head, compares it to the revision the hold recorded, and when
they differ it **releases the hold** and reports `revision-conflict` without ever
calling `confirmChange`. Dead rather than stale, deliberately — the delta was
authored against a tree that no longer exists in that state and can never apply
to it again, so leaving it in custody would only invite a second attempt at
something impossible.

That is correct, and it is **the first moment anybody finds out**.

Which raises the question this lesson is about, and it is not *why did the
confirmation fail*. It is: **why could the queue not say so beforehand?**

The reasonable first answer is that somebody forgot a field. Go and look, and the
field is not missing — there is nowhere for it to be. `HoldStore` has two
listings and neither of them mentions a tree's head:

```ts
forTree: (treeId: TreeId) => Promise<Result<readonly HeldProposal[], HoldError>>
waiting: (request?: HoldListRequest) => Promise<Result<HoldPage, HoldError>>
```

`forTree` answers *what is waiting on this page*. `waiting` answers *does
anything need me at all*. Both are scoped by design so that neither reads the
tree store, which is [0020](../decisions/0020-a-store-handle-is-the-scope-and-a-listing-is-a-page.md):
a store handle is the scope, and a listing is a page of what that handle can
already reach. A hold store that read trees would be a hold store coupled to
every tree store, and the contract suite that runs one set of tests against both
implementations would be testing a pair rather than a part.

So a review queue built exactly the way the documentation says to build it lists
dead changes and live ones together, oldest first, **indistinguishable** — and
the only way to discover which is which is to answer one.

The fact the queue needs is not in the hold store. It is not in the tree store
either: a tree knows its own revision and has never heard of a proposal waiting
somewhere else. The fact is *between* them, and a relation between two rows in
two stores is not a row anywhere.

---

## The idea

### A fact between two stores has no home, so somebody has to compute it

Lesson 22 met a fault that belonged to two nodes rather than to either one, and
the remedy was a predicate in the registry applied to a pair. That worked because
both ends of the pair were in the same document: something could see them at once.

Here neither end is where the other is, and the two places are built not to know
about each other. Lesson 23's question — *what is the scope of the thing you just
named, and is the checker allowed to see all of it?* — gets an answer neither of
the earlier seams gave. The scope is two stores. Nothing inside either of them is
allowed to see both. The only thing that can is **the caller**, which is exactly
the party that was getting it wrong.

So the remedy cannot be a declaration and cannot be a registry lookup. It has to
be a function. Which makes the interesting question the one lesson 25 ended on,
asked about a computation rather than a list: **where do you put it?**

### The property that decides where it goes is that the comparison has a direction

The comparison is one line. The argument for leaving it to each host is that one
line is not worth a module, and that argument is usually right.

It is wrong here for a reason that has nothing to do with size. Three lanes in
this repository have the same screen: the portal owns a review queue, the demo
built a card for the state *after* it has already gone wrong, and the
documentation site teaches it. Each would otherwise write the same line, and the
line **has a direction**. A queue that got it backwards would badge exactly the
wrong half — every live change greyed out, every dead one offered — and it would
look, from the outside, exactly like a queue that was working.

That is the test for whether a one-liner deserves a home. Not *how long is it*,
but **how many ways can it be wrong, and does a wrong one announce itself?** A
line whose two versions are both plausible and only one of which is correct is a
line that should exist once, next to the thing that decides which version is
correct.

So: `src/write/liveness.ts`, three exported functions and a type.

### The direction, and the authority it has to agree with

Here is the version almost everybody writes first:

```ts
const live = headRevision <= hold.baseRevision   // "the page has not moved past it"
```

It reads well. It is wrong, and the case it is wrong on is the one in Predict 2:
a hold naming a revision *ahead* of head. Under `<=` that is live. Under the
shipped version it is dead:

```ts
export const holdLiveness = (hold: HeldProposal, headRevision: number | undefined): HoldLiveness => {
  if (headRevision === undefined) return "unknown"

  return headRevision === hold.baseRevision ? "live" : "dead"
}
```

The reason is not that a hold ahead of head is common. A log cannot produce one;
a restored backup and a mistyped fixture can. The reason is **what the write path
does with it**, five lines away in `commit.ts`:

```ts
if (head.value.revision !== found.value.baseRevision) { /* release, revision-conflict */ }
```

Inequality. Not *ahead of*, not *behind* — **not equal**. The write path refuses
any head that is not the exact revision the Gate judged against, so a hold ahead
of head is refused by the same rule that refuses one behind it. A helper that
called it live would be making a promise the only authority on the subject is
about to break.

This is the transferable part, and it is not about revisions:

> **A derived predicate is correct when it agrees with the authority, not when it
> agrees with the story you would tell about the data.** "The page has moved past
> where this was judged" is a story. `!==` is what happens.

The story and the authority coincide in every case anyone will ever see, which is
why this kind of mistake survives review. The one case where they diverge is the
one nobody constructs.

### The third answer, and the failure an optimistic second one reintroduces

`holdLiveness` has three answers rather than two:

```ts
export type HoldLiveness = "live" | "dead" | "unknown"
```

`unknown` is what a caller gets when it has no head for that tree. That happens
for an ordinary reason: `waiting` is paged and spans many trees, so marking a
page means reading a head per tree, and one of those reads can fail while the
other ten succeed.

The tempting alternative is to fold `unknown` into `live`. It is the smaller
type, it needs no legend, and it is what most queues do. The module says why not,
in one sentence worth memorising:

> A queue that shows no badge is honest; one that shows *live* on a tree nobody
> could reach is the failure this module exists to remove, restated one level up.

Read that twice. The whole point of the module is that a queue was showing
answerable-looking rows that could not be answered. An optimistic `unknown` puts
that back — same wrong row, same reviewer, same wasted decision — inside the fix.

That is a check worth running on every remedy you write: **does the fix contain
the defect?** It usually does when the fix has to report on itself and you gave
it a default.

You will recognise the underlying rule from lesson 24, which said a reading owes
a caller the difference between *no* and *nobody has said*. Lesson 24 said it
about a declaration a component author had not made yet. This is the first time
in Part V the same rule is applied to a fact nobody declares at all — a fact that
is computed — and it survives the move unchanged. The reading is `unknown`, and
what has not spoken is a store.

### Declining the neighbouring question

A hold against a tree that has been deleted: the head read answers `not-found`,
and that row is marked `unknown` rather than `dead`.

This is the classification in the module most worth arguing with, and the
argument against it is good: a hold against a tree that is gone *cannot be
confirmed either*, so calling it dead is operationally correct. Every downstream
consequence is the same.

The module refuses anyway, and the reason is in the badge text — which is why
Predict 4 asked you to read yours out loud:

> A badge reading *the page moved on* about a page that is gone would be a
> true-sounding sentence about the wrong fault.

A badge is not a verdict about answerability. It is a claim about **why**, and the
why is wrong. The tree did not move on; it is not there. That fails as
`not-found`, which is a different fault with a different remedy and a different
person to go and find.

> **This predicate answers one question and declines the neighbouring one.**

Declining is the move. A predicate that quietly widened to cover the neighbouring
case would be right about the outcome and wrong about the cause, and the person
reading the badge is reading it *for* the cause. Lesson 09's ladder does the same
thing — a rung with nothing to say returns `null` rather than an opinion — and
this is that discipline applied to a two-valued question that was offered a free
third case.

### A module about partial knowledge may not have a total failure mode

`markHoldsFromStore` reads the heads itself. It returns no `Result`:

```ts
export type MarkedHolds = {
  readonly marked: readonly MarkedHold[]
  readonly unreadable: readonly StoreError[]
}
```

A `Result` was the first shape and is the wrong one, and the module says so. A
queue over every page of a deployment spans many trees, and one tree being
unavailable is not a reason for a reviewer to see nothing. Fail-fast would make
this module's own point — *say what you cannot say rather than guessing* —
unavailable to the caller **in exactly the case it was written for**.

The general form, which is the thing to carry:

> A function whose subject is incomplete knowledge cannot have a failure mode
> that throws the complete part away.

The errors are handed back rather than swallowed, so a host can log them or say
so on the page. Note what that costs: `unreadable` is a list a careless caller
can ignore, and a careless caller then has a queue with unexplained blank badges
rather than a queue with an error on it. That is the trade this shape makes, and
it is the right way round — an unexplained blank badge is a smaller lie than a
confident one.

### Two smaller decisions that only make sense if you ask what they are for

**One read per tree, in the order the rows are shown.** `treesAwaitingAnswer`
deduplicates, so three changes held against the same page are three rows and one
question. It returns them in *first-seen* order rather than sorted, which looks
arbitrary until you ask what the order is for: the reads a caller issues then
follow the order the rows appear in, so **the first row on screen is the first
one answered.** A sorted list would have the same contents and the wrong latency
for the only row anybody is looking at.

**The head is carried, not just the answer.** `MarkedHold` keeps
`headRevision` — absent exactly when the liveness is `unknown` — so a badge can
say *held against 3, the page is at 4* rather than *dead*. This is lesson 09's
rule again, one layer out: a reviewer is shown the reason rather than the verdict,
because a verdict with no reason is indistinguishable from a bug in the thing
that produced it.

---

## In the code

| What | Where |
| --- | --- |
| The comparison, the three answers, and the two markers | [`src/write/liveness.ts`](../src/write/liveness.ts) |
| What a hold records, and the two listings that do not read a tree | [`src/write/held.ts`](../src/write/held.ts) |
| The authority the comparison agrees with, at line 312 | [`src/write/commit.ts`](../src/write/commit.ts) |
| Heads, and the error a tree that is not there produces | [`src/store/memory.ts`](../src/store/memory.ts), [`src/store/errors.ts`](../src/store/errors.ts) |
| Why a handle is the scope, and a listing is a page | [`0020`](../decisions/0020-a-store-handle-is-the-scope-and-a-listing-is-a-page.md) |
| The record | [`0138`](../decisions/0138-a-queue-can-be-told-which-of-its-holds-are-already-dead.md) |

Two rules a reader of this runtime can carry away and apply on Monday:

- **A fact that spans two stores belongs in one function, next to whichever code
  already decides its direction.**
- **A reading that could not read something says so.** Not with an exception, and
  not with the friendlier of the two answers it does have.

---

## Try it

Six exercises. **Predict every output in writing, then run.** Exercise B is the
one this lesson turns on, and exercise F is where a prediction about a number is
most likely to be confidently wrong.

Put each snippet into `src/scratch.test.ts` and run

```bash
pnpm vitest run src/scratch.test.ts
```

The shared preamble for all six:

```ts
import { describe, it } from "vitest"

import { sequentialIdFactory, treeIdSchema, type TreeId } from "./ids.js"
import { ok } from "./result.js"
import type { StoreError } from "./store/errors.js"
import { memoryTreeStore } from "./store/memory.js"
import type { AppendRequest, TreeReader } from "./store/store.js"
import { buildIntent, buildProposal } from "./testing/doubles.js"
import { sampleTree } from "./testing/fixtures.js"
import type { TreeDelta } from "./tree/delta.js"
import { memoryHoldStore, type HeldProposal } from "./write/held.js"
import {
  holdLiveness,
  HOLD_LIVENESS,
  markHolds,
  markHoldsFromStore,
  treesAwaitingAnswer,
  type HoldLiveness,
  type MarkedHold,
} from "./write/liveness.js"

const ids = sequentialIdFactory("lesson26")

const tree = (name: string): TreeId => treeIdSchema.parse(name)

/**
 * A change the Gate held: the proposal, the intent behind it, what the Gate
 * said, and — the field this lesson is about — the revision it was judged
 * against.
 */
const heldAt = (revision: number, page: string, at: string): HeldProposal => {
  const treeId = tree(page)
  const { ids: nodes } = sampleTree()

  const delta: TreeDelta = {
    deltaId: ids.deltaId(),
    treeId,
    baseRevision: revision,
    operations: [{ op: "configure", nodeId: nodes.page, set: { title: "Held" }, unset: [] }],
  }

  const intent = buildIntent(ids, { treeId, baseRevision: revision })
  const proposal = buildProposal(ids, { intentId: intent.intentId, delta })

  return {
    proposalId: proposal.proposalId,
    treeId,
    baseRevision: revision,
    intent,
    proposal,
    disposition: {
      kind: "requires-confirmation",
      reason: { code: "confidence-below-minimum", detail: "0.5 is under the floor" },
      stakes: "medium",
      reversible: true,
      confidence: 0.5,
      policyId: "default",
    },
    heldAt: at,
  }
}

const row = (marked: MarkedHold): string =>
  `${marked.held.treeId} judged against ${marked.held.baseRevision}, head ${
    marked.headRevision === undefined ? "unread" : marked.headRevision
  } -> ${marked.liveness}`

const tally = (marked: readonly MarkedHold[]): string =>
  HOLD_LIVENESS.map(
    (answer) => `${answer}=${marked.filter((one) => one.liveness === answer).length}`
  ).join(" ")
```

### Exercise A — the queue, built exactly the way the documentation says

Three changes waiting, across two pages. Predict all five lines. The last one is
the exercise: predict the *field names*, and then check whether any of them is
the one you said Predict 1's grey-out would come from.

```ts
describe("A", () => {
  it("lists what is waiting and says nothing about what can still happen", async () => {
    const holds = memoryHoldStore()

    await holds.hold(heldAt(0, "t_home", "2026-09-07T09:00:00.000Z"))
    await holds.hold(heldAt(0, "t_pricing", "2026-09-07T10:00:00.000Z"))
    await holds.hold(heldAt(2, "t_home", "2026-09-07T11:00:00.000Z"))

    const page = await holds.waiting()
    if (!page.ok) throw new Error(`the hold store refused: ${page.error.code}`)

    for (const held of page.value.held) {
      console.log(`${held.treeId}, judged against revision ${held.baseRevision}, held at ${held.heldAt}`)
    }

    console.log("rows:", page.value.held.length)
    console.log("everything a row carries:", Object.keys(page.value.held[0] ?? {}).join(", "))
  })
})
```

```
t_home, judged against revision 0, held at 2026-09-07T09:00:00.000Z
t_pricing, judged against revision 0, held at 2026-09-07T10:00:00.000Z
t_home, judged against revision 2, held at 2026-09-07T11:00:00.000Z
rows: 3
everything a row carries: proposalId, treeId, baseRevision, intent, proposal, disposition, heldAt
```

Seven fields, and every one of them was true at the moment the hold was created
and is still true now. `baseRevision` is the one that looks like the answer and
is not: it is the revision the change was *judged against*, and it never moves.
The number that moves is in the other store.

This is the whole defect, printed. Three rows, oldest first, and a reviewer
picking one of them is picking at random between a change that can be applied and
two that cannot.

### Exercise B — the comparison, in the four positions that exist

Four calls. Predict all four before running — and for the third one, write down
which of the two plausible answers you expect *and* what you would have to check
to be sure.

```ts
describe("B", () => {
  it("compares in the direction the write path compares", () => {
    const judged = (revision: number): HeldProposal =>
      heldAt(revision, "t_home", "2026-09-07T09:00:00.000Z")

    console.log("head 4, judged against 4:", holdLiveness(judged(4), 4))
    console.log("head 5, judged against 4:", holdLiveness(judged(4), 5))
    console.log("head 4, judged against 5:", holdLiveness(judged(5), 4))
    console.log("no head to compare with: ", holdLiveness(judged(4), undefined))
    console.log("the answers a queue may get:", HOLD_LIVENESS.join(", "))
  })
})
```

```
head 4, judged against 4: live
head 5, judged against 4: dead
head 4, judged against 5: dead
no head to compare with:  unknown
the answers a queue may get: live, dead, unknown
```

The third line is the lesson. A hold sitting at revision 5 against a page whose
head is 4 describes a change judged against a state the store has never been in,
and the intuitive reading — *the page has not caught up yet, so it must still be
applicable* — produces `live`. The write path will refuse it. Anything that
badges it live is writing a cheque against an authority that has already said no.

The fourth line is the one people skip, and it is a whole design decision
compressed into one word: **given nothing to compare with, the function does not
guess.**

### Exercise C — a page of holds, marked against heads the caller already has

Four holds across three trees, and the caller has heads for two of them. Predict
every row's verdict, the tally, and both of the last two lines. The tally is the
easy part; the *order* is the part worth predicting explicitly.

```ts
describe("C", () => {
  it("marks a page of holds against the heads the caller already has", () => {
    const queue = [
      heldAt(0, "t_home", "2026-09-07T09:00:00.000Z"),
      heldAt(3, "t_pricing", "2026-09-07T10:00:00.000Z"),
      heldAt(0, "t_home", "2026-09-07T11:00:00.000Z"),
      heldAt(1, "t_careers", "2026-09-07T12:00:00.000Z"),
    ]

    const heads = new Map<TreeId, number>([
      [tree("t_home"), 1],
      [tree("t_pricing"), 3],
    ])

    const marked = markHolds(queue, heads)

    for (const one of marked) console.log(row(one))

    console.log("tally:", tally(marked))
    console.log("rows in, rows out:", queue.length, marked.length)
    console.log(
      "order kept:",
      marked.every((one, index) => one.held.heldAt === queue[index]?.heldAt)
    )
  })
})
```

```
t_home judged against 0, head 1 -> dead
t_pricing judged against 3, head 3 -> live
t_home judged against 0, head 1 -> dead
t_careers judged against 1, head unread -> unknown
tally: live=1 dead=2 unknown=1
rows in, rows out: 4 4
order kept: true
```

**Four in, four out**, and that is an assertion about a failure mode rather than
a triviality. A marker that dropped the rows it had no head for would produce a
queue that was correct about everything it showed and quietly shorter than the
truth — which is the same defect as the one being fixed, wearing the opposite
mask: instead of showing a change that cannot be answered, it hides one that can.

**The order is kept**, so a queue that already sorted oldest-first keeps its sort
and gains a column rather than being handed a re-ordered list it has to sort
again. Two holds against `t_home` sit at positions one and three, with a
different page's row between them, and they come back exactly there.

### Exercise D — reading the heads, including the one that is not there

This one uses a real store: two pages created, one ordinary change landing on one
of them, and a hold against a page that was never created at all. Predict all six
lines. The last two are where the lesson's third answer earns its place.

```ts
describe("D", () => {
  it("reads the heads itself, and hands back the ones it could not read", async () => {
    const store = memoryTreeStore()
    const { tree: sample } = sampleTree()

    await store.create({ ...sample, treeId: tree("t_home") })
    await store.create({ ...sample, treeId: tree("t_pricing") })

    /** One ordinary change lands on t_pricing, and its head moves to 1. */
    const landed = heldAt(0, "t_pricing", "2026-09-07T08:00:00.000Z")
    const request: AppendRequest = {
      proposalId: landed.proposalId,
      delta: landed.proposal.delta,
      provenance: landed.proposal.provenance,
      appliedAt: "2026-09-07T08:00:00.000Z",
    }

    const appended = await store.append(tree("t_pricing"), request)
    console.log("an ordinary change lands on t_pricing:", appended.ok ? "written" : "refused")

    const queue = [
      heldAt(0, "t_home", "2026-09-07T09:00:00.000Z"),
      heldAt(0, "t_pricing", "2026-09-07T10:00:00.000Z"),
      heldAt(0, "t_deleted", "2026-09-07T11:00:00.000Z"),
    ]

    const { marked, unreadable } = await markHoldsFromStore(store, queue)

    for (const one of marked) console.log(row(one))

    console.log("tally:", tally(marked))
    console.log("heads it could not read:", unreadable.map((error: StoreError) => error.code).join(", "))
  })
})
```

```
an ordinary change lands on t_pricing: written
t_home judged against 0, head 0 -> live
t_pricing judged against 0, head 1 -> dead
t_deleted judged against 0, head unread -> unknown
tally: live=1 dead=1 unknown=1
heads it could not read: not-found
```

This is the documentation lane's terminal session, in one program. One change
lands on `t_pricing` — a perfectly ordinary change, nobody did anything wrong —
and a hold that was fine a moment ago is now something a reviewer must not be
offered.

The third row is the classification worth arguing with, and now you can see both
halves of it at once: the row says `unknown`, and the last line says
`not-found`. The information about *why* is not lost — it is handed back
separately, under its own name, in the vocabulary of the store rather than the
vocabulary of the badge. A single `dead` would have collapsed the two and been
true about the wrong thing.

Note also what **did not** happen: the two readable rows are badged. One tree
being missing did not cost the reviewer the other two answers.

### Exercise E — one question per tree, not one per row

Five holds, two pages, and a reader that counts. Predict the three lines — and in
particular, predict the order of the tree ids on the first one before you look at
the queue's order.

```ts
describe("E", () => {
  it("asks one question per tree and not one per row", async () => {
    let reads = 0

    const counting: TreeReader = {
      head: (id) => {
        reads += 1

        return Promise.resolve(ok({ ...sampleTree().tree, treeId: id, revision: 0 }))
      },
      revisions: () => {
        throw new Error("a liveness check reads heads and nothing else")
      },
    }

    const queue = [
      heldAt(0, "t_home", "2026-09-07T09:00:00.000Z"),
      heldAt(0, "t_home", "2026-09-07T10:00:00.000Z"),
      heldAt(0, "t_pricing", "2026-09-07T11:00:00.000Z"),
      heldAt(0, "t_home", "2026-09-07T12:00:00.000Z"),
      heldAt(0, "t_pricing", "2026-09-07T13:00:00.000Z"),
    ]

    console.log("trees this page is waiting on:", treesAwaitingAnswer(queue).join(", "))

    const { marked } = await markHoldsFromStore(counting, queue)

    console.log("rows marked:", marked.length)
    console.log("heads read:", reads)
  })
})
```

```
trees this page is waiting on: t_home, t_pricing
rows marked: 5
heads read: 2
```

Five rows, two reads. The obvious implementation — read a head per row — would
have made this five, and the difference is not the arithmetic: it is that a queue
of forty rows on a busy deployment is forty round trips instead of eleven, and
that is the difference between a screen and a screen people stop opening.

The `throw` in `revisions` is worth a moment. It is a double that fails loudly
rather than agreeing quietly: the module is documented as reading heads and
nothing else, and if a change ever started reading history through here, this
exercise would say so rather than returning an empty page and letting the
transcript look fine.

### Exercise F — the two answers that were not taken, costed

The same three-page queue, marked, and then rendered under each of the three
possible readings of `unknown`. Predict both numbers. **This is the one to write
down before you run it**, because the interesting result is not which number is
bigger — it is what each one means.

```ts
describe("F", () => {
  it("costs a reviewer something different under each of the three readings", () => {
    const queue = [
      heldAt(0, "t_home", "2026-09-07T09:00:00.000Z"),
      heldAt(0, "t_pricing", "2026-09-07T10:00:00.000Z"),
      heldAt(0, "t_careers", "2026-09-07T11:00:00.000Z"),
    ]

    const marked = markHolds(queue, new Map<TreeId, number>([
      [tree("t_home"), 0],
      [tree("t_pricing"), 4],
    ]))

    const readAs = (unknownIs: HoldLiveness): readonly HoldLiveness[] =>
      marked.map((one) => (one.liveness === "unknown" ? unknownIs : one.liveness))

    const offered = (answers: readonly HoldLiveness[]): number =>
      answers.filter((answer) => answer === "live").length

    console.log("as built: ", tally(marked))
    console.log("unknown read as live: offers", offered(readAs("live")), "of", marked.length)
    console.log("unknown read as dead: offers", offered(readAs("dead")), "of", marked.length)

    const legend: Record<HoldLiveness, string> = {
      live: "the page has not moved since this was judged",
      dead: "the page moved on; this can never be applied",
      unknown: "nobody could say; the head was not read",
    }

    for (const answer of HOLD_LIVENESS) console.log(`${answer}: ${legend[answer]}`)
  })
})
```

```
as built:  live=1 dead=1 unknown=1
unknown read as live: offers 2 of 3
unknown read as dead: offers 1 of 3
live: the page has not moved since this was judged
dead: the page moved on; this can never be applied
unknown: nobody could say; the head was not read
```

Three rows, and the queue offers a different number of them under each reading of
one word.

**Optimistic offers two of three, and one of those two cannot be answered.** That
is the original defect, rebuilt inside the fix: a reviewer reads a change,
decides, clicks yes, and is told it never could have worked. The only thing that
has changed is that there is now a module whose stated purpose is to prevent
exactly that.

**Pessimistic offers one of three, and hides a change that may be perfectly
fine.** A smaller lie, and still a lie — and a worse one in a way the number does
not show, because a reviewer who is never shown a change has nothing to be
suspicious about. A store that has been unreachable all afternoon looks identical
to an afternoon when nothing needed reviewing.

Now read the last three lines against the first one. `tally` walks
`HOLD_LIVENESS` and the legend is keyed by the same type, so the three counts and
the three sentences cannot come apart: a fourth answer would take the legend red
at the declaration rather than quietly printing two of three. That is lesson 25's
`everyMemberOf`, doing its job on a five-line vocabulary — which is the size at
which nobody thinks it is worth it.

And the third sentence is the cost nobody counts at design time. Three answers
need three sentences, and *nobody could say* is not a sentence anyone enjoys
putting on a screen. That discomfort is why two-valued versions of this keep
getting written, and it is not a reason.

---

## It could have been otherwise

Four from [0138](../decisions/0138-a-queue-can-be-told-which-of-its-holds-are-already-dead.md)
and the module's own prose, and two that are not in any record.

**Every host writes the three lines.** What was happening, and it deserves stating
as a design rather than as an absence, because it is what a framework that
declines to have an opinion looks like. Its virtue is real: each host renders the
badge its own screen wants, and nothing has to agree about vocabulary. Its cost is
the direction — three hosts, one line, two plausible versions of it, and a wrong
one that looks right.

**Put the head on the hold row when the change is held.** The fix almost everybody
proposes first, and it is exactly backwards in a way worth sitting with. The hold
*already* records a revision: `baseRevision`, the one it was judged against. That
number is correct forever. The number the queue needs is the *other* one, and the
defining property of that number is that it moves after the hold is written. A
field written at hold time is a snapshot of a value whose whole job is to change,
which is not a fix — it is the same staleness, stored, and now with a plausible
field name on it.

**Let the hold store read the tree store.** The most direct version: `waiting`
returns rows that already carry their liveness. Rejected by 0020 rather than by
0138 — a store handle is the scope, and a hold store that reads trees is a hold
store coupled to every tree store. The contract suite that runs one set of tests
against the in-memory and the Postgres implementations would be testing a pairing
rather than a part, and the second implementation would have to reproduce the
first one's joining rather than its storage.

**Two answers, with `unknown` folded into `live`.** Rejected, and exercise F is
the reason in numbers. It reintroduces the defect one level up.

**Two answers, with `unknown` folded into `dead`.** Not in any record, and worth
more than it usually gets: it is the *safe* fold, it never offers a change that
cannot be applied, and a lot of systems would ship it. It fails on a different
axis. A reviewer who is shown nothing has nothing to be suspicious of, so a store
that has been unreachable for an hour looks exactly like an afternoon when
nothing needed reviewing. The optimistic fold wastes a decision; the pessimistic
one hides an outage. Only the third answer produces a screen that can say *we
could not tell*, and being able to say that is the entire deliverable.

**Push, rather than pull: have the write path invalidate the holds it kills.**
Not in any record and the strongest of the alternatives, because it fixes the
latency too — `append` knows exactly which tree moved, and could mark every hold
against it dead at the moment it lands. Worth understanding why it does not
change this lesson: the comparison still has to exist, and it still has to be
made by something that can see both stores, so this moves *when* the comparison
happens rather than removing it. What it adds is a write path that fails if the
hold store is down, in service of a screen. What it does not add is an answer for
a hold whose tree moved in a process that has since been replaced, which is the
case a restart produces and which a pull answers for free.

---

## Explain it back

Two things to write in your own words. Do not look at the earlier sections while
you write. Then compare.

1. **A colleague proposes adding a `headRevision` field to the hold row**, set
   when the change is held. They are not being lazy: they have noticed that the
   queue needs a number it does not have, and they are putting the number where
   the queue can reach it. Explain why this does not work — and do it without
   using the word "stale", which is the word that makes the argument sound like
   an implementation detail. The version that transfers is about **which of the
   two numbers moves**, and when.

2. **Derive `unknown` from lesson 24 and lesson 18 together, without looking at
   either.** Lesson 24 gave you the rule that a reading owes a caller the
   difference between *no* and *nobody has said*. Lesson 18 gave you a named
   state that nothing in the system could produce. Show how those two, put
   together, produce both the third answer *and* the requirement that
   `markHoldsFromStore` cannot fail — and then say which of the two lessons
   supplies which half, because they are not both doing the same work.

Predict, before writing (2): the harder half is not `unknown`. If your answer
spends most of its words on the third answer and one sentence on the missing
`Result`, you have derived the easy half twice.

---

## Self-check

Seven questions. For each: **rate your confidence 1–5 before you write your
answer, then check.**

1. Name the three answers, say which one most systems do not have, and give the
   sentence explaining why folding it into `live` is worse than it looks. Then
   say what *general* check that sentence is an instance of — the one you would
   run on any remedy that has to report on itself.
2. Write `holdLiveness` from memory. Then say precisely what changes if the
   comparison is `headRevision > hold.baseRevision`, name the input that
   distinguishes them, and say which piece of code decides which version is
   correct — and how far away from it the comparison lives.
3. A hold against a deleted tree is `unknown` and not `dead`, although every
   consequence of the two is the same. Give the argument in terms of what a badge
   *claims* rather than what it causes. Then name the earlier lesson whose ladder
   does the same thing with `null`.
4. `markHoldsFromStore` returns no `Result`. Say why, then state the rule
   generally — it is one sentence and it is not about queues. Then say what the
   chosen shape costs, and why that cost is the right way round.
5. The comparison is one line. Give the property of it that decides it belongs in
   a shared module rather than in each host, and state the test you would apply to
   the *next* one-liner you are tempted to inline. It is not about length.
6. `treesAwaitingAnswer` returns tree ids in first-seen order rather than sorted.
   Say what that is for, and what a sorted version would get wrong — being
   concrete about who notices.
7. `MarkedHold` carries `headRevision`, absent exactly when the liveness is
   `unknown`. Say what that buys on screen, name the earlier lesson it is an
   instance of, and then say what the "absent exactly when" is doing that a
   nullable field would not.

Question 2 is this lesson's question. Question 4 is where a half-answer reads as
a full one: an answer that says "so one bad tree does not break the page" has
given the consequence — the part that transfers is the observation that the
failure mode would have destroyed *the thing the module exists to provide*.

---

## Reflect

Write for two minutes, then move on.

- Predict 1 asked where the grey-out information comes from. If you named
  `baseRevision`, write down what you thought it was the revision *of*. That
  confusion is the whole lesson in one field name, and it is an easy one to have:
  the field is correct, well named, and about the other half of the comparison.
- Predict 2's third case — head behind the hold. Write down whether you answered
  it from your expression or from your picture of what is going on, and whether
  the two agreed. If you did not construct the case at all because it "cannot
  happen", write down what you think produces it, and then go and read the
  comment on `holdLiveness`.
- Predict 3 and your confidence. If you wrote `live` and rated yourself 4 or 5,
  that pair is the most useful thing in this lesson for you: it is not a gap, it
  is a belief, and it is the default almost every queue you have ever used is
  built on.
- Predict 4 asked you to read your badge text out loud. Write down whether doing
  that changed your answer. If it did, note the technique — a classification that
  survives being stated as a sentence to a person is a different test from one
  that survives being stated as a type.
- Now go and look. Open something you work on and find a list that is assembled
  from one source and *judged* by another — a list of invitations and whether the
  seats are still free, a list of jobs and whether their input still exists, a
  cart and whether anything in it is still for sale. Work out three things, and
  write them down rather than deciding them in your head: where the comparison
  currently lives, how many places make it, and whether any of those places can
  say *I could not tell*.
- Last, the general version, and it is not about software. This lesson is one
  instance of *a list that is honest about its contents and silent about whether
  they are still true*. Name one from outside programming — a printed timetable, a
  directory, a menu — and say what it would take for it to be able to admit that
  it does not know.

---

## Come back to this

Set AE in [`review-schedule.md`](review-schedule.md), two days after this lesson.
Interleaved with 05, 09, 10, 16, 18, 22, 24 and 25 — heavy on 10, because this
lesson is unreadable if `confirmHeld`'s behavior is not solid, and heavy on 24,
because the rule about what a reading owes a caller is here in its second form
and the two are worth holding side by side.

Part V now has nine lessons, and this one moves it again. The first seven found a
fact the runtime could not check because it belonged to somebody else. Lesson 25
found a fact that belongs to nobody, and could not be checked because of what a
type system is. This one found a fact that belongs to **two parties at once**,
both of them inside Loom, both of them willing to answer — and that still has no
home, because the two of them were deliberately built not to know about each
other.

That is worth carrying, because it changes what the remedy looks like for a third
time. Lessons 18 to 23 ended with *somebody has to declare this*. Lesson 24 ended
with *somebody has not declared it yet, and a reading owes you that*. Lesson 25
ended with *nobody can declare it, so put the claim where getting it wrong is an
event*. This one ends with **nothing needs declaring at all** — both facts are
already written down, correctly, in two places — and the entire design question
is *who is allowed to hold them next to each other, and what do they say when they
cannot*.

The question to carry into a tenth seam is the one exercise F prints: **when your
system gives an incomplete answer, what does the incomplete part look like on a
screen — and is there anybody whose job it is to notice that it is there?**
