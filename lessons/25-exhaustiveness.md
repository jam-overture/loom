# 25 — Exhaustiveness: the one question of three a compiler answers

**After this lesson you will be able to** name the three different questions
people mean by "is this union handled everywhere", say which one a compiler
answers and why answering it so well makes the other two look answered; write the
signature that turns a hand-kept list into a checked claim, and say why an
annotation and a `satisfies` clause both fail at it; explain why a type and a
schema describing one shape must have one of them derived from the other, and say
which direction of drift is loud and which is silent and precisely why; read a
completeness check and judge how strong it is by asking what its second source is
— including the case where the second source is a third copy; say what it
costs a project that the strongest check in its repository and the weakest one
both look, at the call site, like a list of strings; and name the door a
completeness check closes and the two it cannot, using a fault in this runtime
that survived being fixed.

**Prerequisites:** [01](01-why-a-runtime.md), [02](02-ui-as-data.md),
[03](03-change-as-data.md), [04](04-identity.md),
[05](05-purity-at-the-seams.md), [06](06-undo-as-computation.md),
[07](07-measuring-a-change.md), [08](08-two-axes.md), [09](09-the-gate.md),
[10](10-the-pipeline.md), [11](11-the-model-seam.md), [12](12-projection.md),
[13](13-refusal-and-repair.md), [14](14-rendering.md),
[15](15-primitives-and-the-registry.md), [16](16-persistence.md),
[17](17-telemetry.md), [18](18-data.md), [19](19-destinations.md),
[20](20-origins.md), [21](21-appearance.md), [22](22-reach.md),
[23](23-anchors.md), [24](24-silence.md).

Lesson 24 ended with a question to carry into an eighth Part V seam: **when your
system cannot answer, what does it return — and who would notice if it started
returning that when it could?**

This lesson takes that question to the checker every one of the previous seven
took for granted. Every Part V lesson so far has been about something the
*runtime* could not check — a scope it could not see, a word it could not
interpret, a document in somebody else's registry. Underneath all of them sat a
checker nobody questioned, because it is the one that runs before any of this
code does and the one whose silence everybody reads as approval.

The compiler answers exactly one of the three questions you can ask about a
closed set. When it cannot answer the other two, what it returns is **nothing** —
and nothing is the same output as a pass.

---

## Warm-up

Closed book, five minutes, mixed across six lessons. Write something for all five
before you look anything up.

1. `DataUnavailable` has seven reasons and one of them sat in the union for a
   month with nothing in the runtime able to produce it for the failure it is
   named for. Name that reason, say what could and could not cause it then, and
   state exactly what `describeDataUnavailable` being exhaustive over the union
   did and did not guarantee. *(18)*
2. Nothing in the runtime throws. Say what `applyDelta` hands back instead, and
   then say why a *closed* set of error codes — rather than a message — is what
   makes an audit trail something you can query a year later. *(05, 16)*
3. The Gate is seven rules in a fixed order. Say what a rule returns when it has
   nothing to say about a change, and why the ladder stops at the first rule that
   speaks rather than collecting every rule's opinion. *(09)*
4. `copy: []` and no `copy` at all are different answers. Give the shape of the
   value that keeps them apart, and say what a consumer reading only the first
   field of it cannot tell. *(24)*
5. There are four operations in a delta and the delta is atomic. Say why four
   rather than three or five, and name the property atomicity is protecting —
   then say what the tree looks like after an operation halfway through a delta
   fails. *(03)*

Question 1 is the one to be exact about, because this lesson is that same defect
generalised, and a rough answer here will let you nod along with something you
have not retrieved.

---

## Predict

**In writing, before reading on.** Four questions, the last of them in two
halves. Question 3 is one of the two to rate your confidence on, and it is the
lesson; question 4's second half is the other, and it is what the lesson turned
out to be about once the repository read it.

1. Persistence can refuse five ways; the type is a union of five string literals.
   The documentation site has to show a host a table with a row per way. **Write
   the expression that gets the list of five out of the type.** If you conclude
   there isn't one, write down what you would do instead — and then write what
   tells you, three months later, when a sixth way lands.

2. So you write the list out by hand, next to the type, in the same file, and
   export it. **Now make it fail to compile when a member is missing.** Write the
   actual signature. Two cheap answers are worth writing down and ruling out
   first: `const CODES: readonly StoreErrorCode[] = [...]`, and
   `const CODES = [...] satisfies readonly StoreErrorCode[]`. Say what each of
   those two does check, and what it does not.

3. A policy has a Zod schema with thirteen fields and, beneath it, a hand-written
   type naming the same thirteen. The line that looks like it holds them together
   is the last one:

   ```ts
   export const defaultGatePolicy: GatePolicy = gatePolicySchema.parse({})
   ```

   Somebody adds a fourteenth field **to the schema and not to the type**, and
   type-checks the whole repository. **How many errors?** Then the mirror image:
   somebody adds a fourteenth field **to the type and not to the schema**. **How
   many errors?** Write both numbers, **rate your confidence 1–5**, and write one
   sentence saying why the two numbers are what you say they are.

4. Until 17 September 2026 a test in this repository read, in full:

   ```ts
   expect(STAKE_ORDER).toEqual(["low", "medium", "high", "critical"])
   ```

   `STAKE_ORDER` is the array the Gate ranks stakes with. **Say what that test
   protects against**, and — separately — **what it does not**. Be concrete: name
   a change to this repository that would break the test, and a change that would
   not break it and should.

   Then the half that is this lesson's second act, and the one to rate. That
   test is gone, and `STAKE_ORDER` is now checked by the strongest mechanism
   this lesson has to offer: the compiler, at the declaration, in the file the
   list is written in. **Name a value that can still reach the Gate's stake
   arithmetic carrying a level that array does not contain — or say that none
   can.** Rate your confidence 1–5.

Do not read on until all four are written, the last of them twice. Question 3's two numbers are the pair
to leave exactly as you wrote them: the interesting result is not getting one of
them wrong, it is having expected them to be the same kind of number.

---

## The problem

On 2 September the documentation lane filed the same finding twice in one
morning, against two different modules, and the second one is the one worth
reading:

> `StoreError` has five codes and no way to list them.

The page it was blocked on is the one a host reads before going to production. It
says: *here is everything persistence can refuse, and your code has to handle each
of these.* A page that makes that promise has to enumerate the taxonomy. So it
did, in its own file, in its own order:

```ts
const CODES = ["not-found", "already-exists", "revision-conflict", "delta-rejected", "unavailable"]
```

That list is a copy. It was right on the day it was written, it is in a different
package from the union it copies, and there is nothing anywhere that fails when
the two disagree. A sixth code lands, the runtime's own `switch` statements all
stop compiling until somebody handles it — which is the system working — and the
page goes on telling hosts there are five, in exactly the tone of voice of a page
that knows.

The reasonable objection is the one to take seriously, because it is what the
lane believed when it wrote the copy: *surely the type protects this.*
`StoreError` is a discriminated union. Every `switch` on `error.code` in this
repository is checked. `describeStoreError` cannot forget a case. TypeScript is
famously good at exactly this, and a developer who has spent a year being caught
by it has learned, correctly, that the compiler will not let a union get past
them.

It will not let a union get past them **in one direction**. Here is the whole of
the confusion, and it is worth slowing down for, because the three sentences
below sound like paraphrases of each other and are three different claims about
three different things:

1. *Every member of this union is handled.*
2. *Every member of this union is listed.*
3. *Every member of this union can happen.*

The compiler answers the first. It has no opinion whatsoever about the second. And
the third is not a question any tool in this repository or in most repositories
can answer — lesson 18 met it as an `unavailable` that sat in a union for a month
with nothing able to produce it, and found out by accident.

What makes the second one dangerous rather than merely unchecked is what it looks
like when it is wrong. A missing `switch` case is a build failure with a file and
a line number. A missing list entry is a page that is confidently, quietly short
by one, in a different repository, written by somebody who has left.

---

## The idea

### A type is a claim; a list is a value

The reason the compiler cannot answer question 2 is not an oversight and is not a
missing feature. It is the shape of what a type system does.

A type is a claim about values: *everything of this type is one of these five
strings.* The compiler checks claims against claims. Hand it a value and it will
tell you whether the value satisfies the claim — whether `"not-found"` is a
`StoreErrorCode`. That is membership, and it is the only direction that has an
answer, because membership is a question about one value at a time.

Completeness is a question about the *whole* of a value in relation to the whole
of a type. `["not-found", "already-exists"]` satisfies `readonly StoreErrorCode[]`
perfectly. So does `[]`. So does a list of the same code repeated forty times. An
annotation says *everything in here is a code*; it has never said, and cannot be
made to say by annotating harder, *and every code is in here*.

This is worth checking rather than believing, and it is the first thing to run.
Both of these compile clean, today, in this repository:

```ts
type Code = "a" | "b" | "c"

const annotated: readonly Code[] = ["a", "b"]
const checked = ["a", "b"] satisfies readonly Code[]
```

`satisfies` is the newer of the two and is the one people reach for when told the
annotation is not enough, because it reads like a stronger word. It is stronger in
a different direction: it checks the value against the type *without widening the
value's own type*, so `checked` keeps its literal members while `annotated` does
not. Both check membership. Neither checks completeness. Nothing in the language
checks completeness, because completeness is not a property a value can have — it
is a property of the *relationship* between a value and a type, and there is
nowhere in the syntax to write it down.

Unless you make somewhere.

### Make the declaration a call, and the check a parameter

`everyMemberOf` in [`src/closed-set.ts`](../src/closed-set.ts) is forty lines
including its prose, and the whole idea is in one parameter:

```ts
export const everyMemberOf =
  <Union extends string>() =>
  <const List extends readonly Union[]>(
    list: List,
    ..._complete: [Union] extends [List[number]] ? [] : [missing: Exclude<Union, List[number]>]
  ): List =>
    list
```

Read the rest parameter as a sentence. *If the union is contained in the list's
members, take no further arguments. Otherwise take one more argument, called
`missing`, whose type is the member that is missing.*

So a complete list is a call with one argument to a function that wants one, and
an incomplete list is a call with one argument to a function that wants two. The
error is an arity error, at the declaration, in the file that got it wrong. There
is no test to remember to write and no convention to remember to follow: writing
the list at all is now the thing that is checked.

Two details of the signature are load-bearing and neither is decoration.

**It is curried** — `everyMemberOf<Code>()([...])` rather than
`everyMemberOf<Code>([...])` — because TypeScript infers all of a call's type
arguments or none of them. Name `Union` explicitly on a single call and `List`
stops being inferred from the literal and widens, which takes the completeness
check with it. Two calls, one type argument each.

**The conditional is written `[Union] extends [List[number]]` rather than
`Union extends List[number]`.** A naked type parameter on the left of `extends`
distributes over the union: the compiler would ask the question once per member
and combine the answers, which is a different question and a wrong one. The
square brackets are what stop it distributing and make it one question about the
whole union. This is the kind of detail that looks like noise until the day the
check quietly stops checking.

And what it does at run time is nothing. `everyMemberOf` returns its argument.
That is not a limitation — it is the shape of the whole approach: the value is the
list you wrote, and the check has already happened by the time there is a program.

### What the error says, and what it knows

Here is the thing worth knowing before you go and build one of these, and it does
not appear in any record. Leave `"unavailable"` out of the list, and this is the
diagnostic, in full:

```text
src/scratch.test.ts:203:20 - error TS2554: Expected 2 arguments, but got 1.

203 const incomplete = everyMemberOf<StoreErrorCode>()([
                       ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

  src/closed-set.ts:38:5
    38     ..._complete: [Union] extends [List[number]] ? [] : [missing: Exclude<Union, List[number]>]
           ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
    Arguments for the rest parameter '_complete' were not provided.
```

It fires. It points at the right line. And it does not say **which member is
missing** — it says you are one argument short and shows you a conditional type.
A reader who has not seen this before has to work out what the mechanism is
before they can work out what the mistake is.

The compiler knows. It is holding the answer the entire time. Supply any second
argument and it will tell you what it wanted:

```text
error TS2345: Argument of type '"not-found"' is not assignable to parameter of type '"unavailable"'.
```

`"unavailable"` is the missing member, named exactly, by the same compiler that
declined to name it a moment earlier. The information was never absent; what was
absent was a place in the message where it fits. That is a general fact about
type-level checks and it is the honest cost of this technique: **the check is as
precise as you like and the diagnostic is as good as the shape you smuggled it
into.**

A misspelling, by contrast, is caught by the ordinary constraint and reads
ordinarily:

```text
error TS2322: Type '"typo"' is not assignable to type '"unavailable" | "not-found" | "already-exists" | "revision-conflict" | "delta-rejected"'.
```

Two failures, two mechanisms, two messages. Worth separating in your head: the
constraint `List extends readonly Union[]` catches a member that should not be
there, and the rest parameter catches a member that should be and is not. Only the
second one is what this lesson is about, and only the second one has no other way
to be caught.

### Where the members come from a schema, there is no problem to solve

The lists above exist because their unions carry values a schema cannot describe —
`StoreError`'s members are objects with different fields, and there is nothing to
ask for their options. Where a union *is* an enum in a schema, the list already
exists and nobody has to claim anything:

```ts
export const PALETTE_SLOTS = paletteSlotSchema.options
```

There is no second statement, so there is nothing that can drift, so there is
nothing to check. This is the strongest of all the answers and it is the one that
looks the least like a technique. Whenever you find yourself reaching for
`everyMemberOf`, the first question is whether the union has a schema — because if
it does, the right move is one property access and the check you were about to
add is a check on something that cannot be wrong.

### A type that mirrors a schema, and the direction nothing shouts about

The same asymmetry appears one level up, and this is where it costs the most,
because the shape that hides it is a line that looks like a proof.

`GatePolicy` was a hand-written type sitting under `gatePolicySchema`, both
naming the Gate's thirteen knobs, and this line beneath them:

```ts
export const defaultGatePolicy: GatePolicy = gatePolicySchema.parse({})
```

Every reader of that file — including, for a while, everyone maintaining it —
read that as the two being tied together. If they disagreed, this assignment
would fail. Wouldn't it?

It depends entirely on which way they disagree, and the reason is a rule about
assignability that has nothing to do with Zod and everything to do with what a
type promises:

- **The type names a field the schema does not produce.** The parsed value is
  missing a required property. Not assignable. Loud.
- **The schema produces a field the type does not name.** The parsed value has
  *more* than the type requires, and a value with extra properties is assignable
  to a type with fewer. Excess-property checking — the rule that catches this on a
  fresh object literal — does not apply to the result of a function call. It
  compiles.

That is not a bug in TypeScript. Assignability protects one property, which is
*the value has at least what the type promises*, and it protects it exactly.
Drift in the other direction is not an error in any sense the language recognises,
because a value having a field nobody asked about is not a violation of anything.

What it means in a repository is that `keyof GatePolicy` never heard about the new
knob, and `keyof GatePolicy` is what two documentation surfaces key their tables
off. The page that promises to describe every knob would have described thirteen
of fourteen, and the internal consumer that projects the policy into a fingerprint
would have hashed thirteen of fourteen, and neither would have said anything.

[0132](../decisions/0132-a-type-that-mirrors-a-schema-is-derived-from-it.md)
settles it in one sentence — **where a type and a schema describe the same shape,
the schema is the statement and the type is derived from it** — and the derivation
is the whole of the fix:

```ts
export type GatePolicy = Readonly<z.infer<typeof gatePolicySchema>>
```

There is now one statement. The mirror cannot drift because there is no mirror.
The rule generalises past Zod and past types: **two statements of one thing are a
defect with a delay on it**, and the delay ends on a day nothing announces.

The one caveat the record insists on, and it is the difference between deriving
and deriving carelessly: where the derived type would be *weaker* than the
hand-written one, the difference goes into the schema rather than being patched up
afterwards. Here that was exactly one thing — `z.array(...)` infers a mutable
array, and three public lists had promised `readonly` — so three schemas gained
`.readonly()`. Deriving without noticing would have narrowed a public type on the
way to fixing a private one.

### How strong is a completeness check? Ask what its second source is

Once you have seen the distinction, the useful skill is not knowing about
`everyMemberOf`. It is being able to look at any completeness check anywhere and
rank it, and there is one question that does the ranking:

> **Where does the second list come from, and could it be wrong in the same way
> and at the same moment as the first?**

A check compares two things. It is worth exactly as much as the *independence* of
the second thing. Run that question over the seven published lists in this runtime
and they fall into an order — which is exercise C, and which you should try to
predict before you run it:

| how the list is published | what actually checks it | what fails the day the union grows |
| --- | --- | --- |
| `schema.options` | nothing — there is only one statement | nothing can drift |
| `everyMemberOf<U>()([…])` | the compiler, at the declaration | `pnpm typecheck`, in the file that is wrong |
| a test against `Record<U, true>` | the compiler, in the test file | the test file's compile |
| a test against `schema.options` | a test, at run time | that test |
| a test against a second hand-written copy | **nothing** | **nothing** |
| nothing at all | **nothing** | **nothing** |

The fifth row is the one to sit with, because it is the row that looks like the
fourth. Until 17 September 2026 `stake-level.test.ts` asserted that `STAKE_ORDER`
equals `["low", "medium", "high", "critical"]` — a green test, in the right file,
named after the right thing. It compared a copy with a copy. Add a fifth level to
`stakeLevelSchema` and the test went on passing, because the test was never
looking at the schema. **A test that restates the value it is testing is not a
check; it is a second copy with a tick beside it.**

That is in the past tense because this lesson was written down and the runtime
lane read it. `STAKE_ORDER` now goes through `everyMemberOf`, and the test that
sat beside it is held against `stakeLevelSchema.options` instead of against a
third copy — so the list is in row 2 and row 4 at once, which is the strongest
pairing anything in this repository has. Bottom of the table to the top, in a
diff of four lines.

Which would be a tidy place to stop, and is the wrong place to stop, because the
thing the fifth row was an example *of* is still there. That is the next section
and it is the more useful half.

### What a completeness check closes, and what it leaves

Follow the consequence all the way down first, because it is not cosmetic.
`rankOf` is `STAKE_ORDER.indexOf(level)`, and `indexOf` answers `-1` for a level
the array does not contain. A level that is not in the list does not rank above
`critical` and does not rank below `low`: it ranks *beneath the bottom*, at -1,
and every comparison in the Gate is built on that number.
`isAtLeast(level, "critical")` is false, so `rejectAtRefusalFloor` returns `null`
and says nothing. `isAbove(level, ceiling)` is false, so `confirmAboveCeiling`
says nothing. `highestStake` folds with `isAbove` from a `"low"` seed, so a factor
at the new level is not even carried out of the analysis.

Measured end to end on this checkout on 18 September 2026, under
`defaultGatePolicy`, whose `refusalFloor` is `critical`:

| the stakes level on the assessment | what the Gate decides |
| --- | --- |
| `critical` | **rejected** — `stakes-at-refusal-floor` |
| a level the order cannot place | **accepted** — `within-policy` |

The most severe change the system can describe is applied without being
mentioned, by seven rungs each behaving exactly as written.

Now ask what the completeness check did about that.

**It closed one door.** The route the finding was written about — somebody adds a
fifth member to `stakeLevelSchema` while thinking about a feature, every `switch`
in the runtime demands to be updated and gets updated, and `STAKE_ORDER` is the
one thing that does not complain because it is a value — is now an arity error in
`stake-level.ts`, which is the file that would be wrong. That is what row 2 buys
and it is worth having.

It is also the whole of what row 2 *can* buy, and the reason is written in the
row's own description: **the compiler, at the declaration.** A check at a
declaration protects values that arrive by being declared. At least two routes do
not:

- **A cast at a seam.** `"catastrophic" as StakeLevel` compiles, today, in this
  repository, and exercise D does exactly that. A cast is not a bad habit somebody
  will grow out of; it is what gets written at the edge of a system where a value
  was checked by something other than the compiler. And it is not the only door of
  its kind: `gate` is exported from the package root, it takes a
  `ChangeAssessment`, and there is no schema for that record anywhere — so a host
  that computes its own stakes, or hands over an assessment it deserialised, meets
  `rankOf` with nothing between them. A caller writing TypeScript still has to
  cast; a caller who is not, or who parsed the thing off a queue, does not.
- **Two copies of the scale in two processes.** A disposition carries its stakes
  level and is stored to be read back a year later (lesson 16). Widen the scale,
  deploy the writer, and the reader is a process compiled against four levels
  meeting a record that names five. This door is shut, and it is worth being
  precise about what shut it: `dispositionSchema` refuses a level
  `stakeLevelSchema` does not know, so what the reader gets is not a misjudged
  change but an unreadable record — lesson 26's `unreadable`, arriving where a
  reading has to say which nothing it is. A *different* check shut it. Not this
  one, and not one in the same file.

So the fault survived being fixed. Not because the fix was wrong — it is the best
available answer to the question it was asked, and the question was *how does this
list go stale*. The fault was never in the list. It is `indexOf` answering a number
that means **not here** on a scale where every number means **how bad**, and a
completeness check has no opinion about that whatsoever.

**The general version, which is the thing to carry out of this lesson into code
that has nothing to do with Loom:** a check is bounded by the population of values
that pass through the place it runs, and that population is almost never *every
value that reaches this function*. When you add a check, write down which door you
just closed and how many doors there are — because **a remedy that closes the
route you happened to find the fault by is not a remedy for the fault.**

Closing the rest of it costs one line: `rankOf` answering `STAKE_ORDER.length`
rather than `-1`, so a level the scale cannot place ranks above every level it
can, and is refused where `critical` is refused.
[0166](../decisions/0166-a-level-the-scale-cannot-place-is-the-heaviest-one.md)
records that as **Proposed**, and the reason it is not `Accepted` is this lesson.
The course compiles every Try it section and runs it against `src/` on every
build, so a transcript here is a promise about what the runtime prints — and
exercise D used to make that promise about five numbers the fix changes, which
turned a one-line runtime fix into a red build for four surfaces. So the exercise
below has been taken off those five numbers on purpose, and says so where it does
it.

Everything this lesson says about that arithmetic is therefore dated rather than
current: the table above was measured on 18 September 2026 and the line was
`Proposed` that day. What the lesson will not do is tell you where it stands
now. **Go and read [`src/runtime/stake-level.ts`](../src/runtime/stake-level.ts)
and the block at the bottom of its test.** Thirty seconds, and it is the only
question in this lesson whose answer is not in this lesson.

### The third question, which nothing answers

Question 3 — *can every member happen?* — has no mechanism in this lesson and no
mechanism in this repository, and it is the one lesson 18 was about.

Exercise E asks the memory store to produce each of its five refusals. Four of
them fall out of ordinary use. `unavailable` does not, because it means *the
storage itself is not there*, and an in-memory map is always there. That is
entirely correct — the code is right, the union is right, the reason exists for
the Postgres driver and not for this one.

It is still the same shape as lesson 18's dead `unavailable`, which was also
correct, also documented, also rendered, and also unreachable — except that there
it was unreachable in *every* implementation, for a month, and nothing said so.
The distinction between those two situations is not visible from inside either
one. Exhaustiveness checks that you handle what the union claims; enumeration, if
you build it, checks that you can list what the union claims; and nothing checks
that the union's claims are true.

So the honest summary of what a closed set gives you is narrower than it feels:

> A union is a claim about what can happen. The compiler holds you to the claim
> in one direction — you must deal with everything it claims — and never asks
> whether the claim is true.

### What this makes of lesson 24's question

Lesson 24 asked what a system returns when it cannot answer, and whether anybody
would notice if it started returning that when it could.

A compiler's answer to *is this list complete* is no output at all. It is the same
output as a pass, produced by the same run, in the same colour. There is no
`I wasn't asked` and nowhere for one to go: a build either has diagnostics or does
not, and a question nobody put to it is indistinguishable from a question it
answered yes.

That is why this class of defect survives in mature repositories staffed by people
who know the language well. It is not that anybody believes the compiler checks
list completeness. It is that the *absence of a complaint* is the only signal
anyone gets from it, and the absence of a complaint arrives identically whether
the thing was checked or was never checkable. Every other seam in Part V is about
a checker that cannot see enough or cannot interpret what it sees. This one is
about a checker that sees everything, interprets it exactly, answers the question
it was asked — and is asked a narrower question than the one in your head.

---

## In the code

| What | Where |
| --- | --- |
| The helper, and the conditional rest parameter | [`src/closed-set.ts`](../src/closed-set.ts) |
| Five ways persistence refuses, and the list | [`src/store/errors.ts`](../src/store/errors.ts) |
| Nine ways a command refuses | [`src/cli/plan.ts`](../src/cli/plan.ts) |
| The policy's knobs, stated once and derived | [`src/runtime/policy.ts`](../src/runtime/policy.ts) |
| The ranking that `indexOf` is built on | [`src/runtime/stake-level.ts`](../src/runtime/stake-level.ts) |
| The fault pinned in the wrong direction on purpose, with a comment saying so | [`src/runtime/stake-level.test.ts`](../src/runtime/stake-level.test.ts) |
| A completeness check written as a `Record` in a test | [`src/runtime/pipeline.test.ts`](../src/runtime/pipeline.test.ts) |
| A list that is a schema's own options | [`src/theme/theme.ts`](../src/theme/theme.ts) |
| The records | [`0132`](../decisions/0132-a-type-that-mirrors-a-schema-is-derived-from-it.md), [`0166`](../decisions/0166-a-level-the-scale-cannot-place-is-the-heaviest-one.md) |

The three rules a reader of this runtime can carry away and apply on Monday:

- **If the union has a schema, publish `schema.options` and stop.**
- **If it does not, the list is a claim, and a claim goes through
  `everyMemberOf` so that making it wrong is a build failure rather than a habit.**
- **Then say out loud which values your check does not see**, because that
  sentence is the difference between having fixed the fault and having closed the
  door you came in through.

---

## Try it

Six exercises. **Predict every output in writing, then run.** Exercises C and D
are the ones this lesson is really about. C is where a confident prediction is
most likely to be confidently wrong, and it is wrong in a way the printout will
not tell you about.

Put each snippet into `src/scratch.test.ts` and run

```bash
pnpm vitest run src/scratch.test.ts
```

The shared preamble for all six:

```ts
import { describe, it } from "vitest"

import { everyMemberOf } from "./closed-set.js"
import { sequentialIdFactory, type ProposalId, type TreeId } from "./ids.js"
import { COMPOSITION_OUTCOME_KINDS } from "./runtime/pipeline.js"
import { defaultGatePolicy, gatePolicySchema } from "./runtime/policy.js"
import { STAKE_ORDER, stakeLevelSchema, type StakeLevel } from "./runtime/stake-level.js"
import {
  describeStoreError,
  memoryTreeStore,
  STORE_ERROR_CODES,
  type AppendRequest,
  type StoreError,
  type StoreErrorCode,
} from "./store/index.js"
import { FIXED_INSTANT } from "./testing/doubles.js"
import { sampleTree } from "./testing/fixtures.js"
import { UNJUDGED_REASONS } from "./telemetry/calibration.js"
import { TELEMETRY_EVENT_TYPES, telemetryEventSchema } from "./telemetry/event.js"
import { PALETTE_SLOTS, paletteSlotSchema } from "./theme/theme.js"
import {
  treeOperationSchema,
  TREE_OPERATIONS,
  type TreeDelta,
  type TreeOperation,
} from "./tree/delta.js"

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

/** A consumer written when persistence had four ways to refuse. */
const dashboardOf = (codes: readonly string[]) => {
  const buckets = new Map<string, number>(codes.map((code) => [code, 0]))

  return {
    count: (code: string): void => {
      const seen = buckets.get(code)
      if (seen === undefined) return
      buckets.set(code, seen + 1)
    },
    report: (): string => [...buckets].map(([code, seen]) => `${code}=${seen}`).join(" "),
    counted: (): number => [...buckets.values()].reduce((sum, seen) => sum + seen, 0),
  }
}
```

### Exercise A — the same union, twice

A `switch` over every code, and a consumer that keeps its own list of them. The
consumer was written when there were four. Nothing about it has changed since,
including whether it compiles. Predict all five lines, and be exact about the
fourth.

```ts
describe("A", () => {
  it("reacts to every member and walks four of five", () => {
    const refusals: readonly StoreError[] = [
      { code: "not-found", treeId: "t_9" as TreeId },
      { code: "unavailable", detail: "connection reset" },
    ]

    for (const refusal of refusals) console.log("the switch:", describeStoreError(refusal))

    const dashboard = dashboardOf([
      "not-found",
      "already-exists",
      "revision-conflict",
      "delta-rejected",
    ])

    for (const refusal of refusals) dashboard.count(refusal.code)

    console.log("the dashboard:", dashboard.report())
    console.log("refusals handed to it:", refusals.length, "- counted:", dashboard.counted())
    console.log("the published list:", JSON.stringify(STORE_ERROR_CODES))
  })
})
```

```
the switch: no tree stored under t_9
the switch: storage is unavailable: connection reset
the dashboard: not-found=1 already-exists=0 revision-conflict=0 delta-rejected=0
refusals handed to it: 2 - counted: 1
the published list: ["not-found","already-exists","revision-conflict","delta-rejected","unavailable"]
```

The `switch` handled both refusals and printed a sentence for each — it is
exhaustive and it is right. The dashboard was handed both and counted one. It did
not crash, did not warn, and reported a clean total for a period in which it was
silently blind to a fifth of everything that could happen to it.

Note what would have to be true for a *test* of the dashboard to catch this: the
test would have to be written against the published list rather than against the
dashboard's own. Which is the point — the fix and the check are the same act.

### Exercise B — what the check costs at run time

`everyMemberOf` is the strongest thing in this lesson. Predict what it does when
the program runs.

```ts
describe("B", () => {
  it("is the identity function", () => {
    const written = [
      "not-found",
      "already-exists",
      "revision-conflict",
      "delta-rejected",
      "unavailable",
    ] as const

    const checked = everyMemberOf<StoreErrorCode>()(written)

    console.log("the same array back:", checked === written)
    console.log("the body it ran:", String(everyMemberOf<StoreErrorCode>()).replace(/\s+/g, " "))
  })
})
```

```
the same array back: true
the body it ran: (list, ..._complete) => list
```

Not a copy of the array — the array. The function that guarantees a list names
every member of a union is, at run time, `list => list`, and the printed body is
the whole of it. Everything this technique does happened before there was a
program to run, which is what distinguishes it from every other row of the table
in *The idea*: it is the only check in that table with no artefact at run time and
no test to execute.

That is also its one real cost, and the thing to weigh when you reach for it. A
check with no run-time trace is a check that a different toolchain — a bundler
that strips types, a consumer in JavaScript, a generated client — does not
inherit. It protects this repository's authors and nobody downstream.

### Exercise C — how strong is each check in this runtime

Seven published lists. For each, the exercise fetches the second source where
there is one and compares. **Before running: predict which of the seven have a
second source at all**, and — harder — predict which row's answer will surprise
you by being weaker than its neighbours.

```ts
describe("C", () => {
  it("asks each published list whether anything could contradict it", () => {
    const rows: readonly (readonly [string, readonly string[], readonly string[] | undefined])[] = [
      [
        "TREE_OPERATIONS",
        TREE_OPERATIONS,
        treeOperationSchema.options.map((one) => one.shape.op.value),
      ],
      [
        "TELEMETRY_EVENT_TYPES",
        TELEMETRY_EVENT_TYPES,
        telemetryEventSchema.options.map((one) => one.shape.type.value),
      ],
      ["PALETTE_SLOTS", PALETTE_SLOTS, paletteSlotSchema.options],
      ["STAKE_ORDER", STAKE_ORDER, stakeLevelSchema.options],
      ["STORE_ERROR_CODES", STORE_ERROR_CODES, undefined],
      ["COMPOSITION_OUTCOME_KINDS", COMPOSITION_OUTCOME_KINDS, undefined],
      ["UNJUDGED_REASONS", UNJUDGED_REASONS, undefined],
    ]

    for (const [name, list, second] of rows) {
      const verdict =
        second === undefined
          ? "no schema to ask"
          : list === second
            ? "is the schema's own list"
            : JSON.stringify(list) === JSON.stringify(second)
              ? "agrees with the schema"
              : "DISAGREES with the schema"

      console.log(`${name.padEnd(26)}${String(list.length).padStart(3)}  ${verdict}`)
    }
  })
})
```

```
TREE_OPERATIONS             4  agrees with the schema
TELEMETRY_EVENT_TYPES      18  agrees with the schema
PALETTE_SLOTS              17  is the schema's own list
STAKE_ORDER                 4  agrees with the schema
STORE_ERROR_CODES           5  no schema to ask
COMPOSITION_OUTCOME_KINDS   5  no schema to ask
UNJUDGED_REASONS            3  no schema to ask
```

Read the middle column first and then throw it away: every list agrees with
everything available to contradict it, which is the least informative true
sentence in this lesson. What the exercise is actually measuring is the third
column, and the third column is about *what could go wrong tomorrow*.

Three rows say **agrees with the schema** and they are not equally safe.
`TREE_OPERATIONS` and `TELEMETRY_EVENT_TYPES` are bare literals with a real test
behind them — `delta.test.ts` and `event.test.ts` each recompute the list from
`schema.options` and assert, which is row 4. `STAKE_ORDER` prints the same line
and is not in the same row: it is checked at its declaration *and* tested against
the schema, rows 2 and 4 together.

Three rows say **no schema to ask**, and they are the ones where the answer comes
from how the list was written rather than from anything you can print. Two of
them — `STORE_ERROR_CODES` and `UNJUDGED_REASONS` — go through `everyMemberOf`,
so their check ran at compile time and left no trace here.
`COMPOSITION_OUTCOME_KINDS` is held against an exhaustive `Record` in its test
file, which is a compile-time check standing in a run-time place. Three lines,
identical in every column, two mechanisms.

That is the lesson's hardest practical point, printed: **the strength of a
completeness check is invisible in its output.**

And this exercise can now prove that rather than assert it, which is worth more
than the point itself. On 15 September, when this lesson was written, two of these
seven rows were unchecked by anything: `STAKE_ORDER` was row 5, a test against a
third hand-written copy, and `UNJUDGED_REASONS` was row 6, nothing at all. Both
were fixed on 17 September. **Neither of the two lines they print changed.** Run
the exercise on either checkout and the output is the same seven lines — before
and after a fix to two of them, with no way to tell from here which two.

### Exercise D — the rank of a level nobody listed

`STAKE_ORDER` is the array every stake comparison in the Gate is built on, and
since 17 September it is checked at its declaration. This exercise hands it a
level it does not name. Predict every line. For the last four, write down what you
think each one *should* be before you write what you think it *will* be, and
notice if those differ.

```ts
describe("D", () => {
  it("ranks a level the order does not name", () => {
    console.log("the order: ", JSON.stringify(STAKE_ORDER))
    console.log("the schema:", JSON.stringify(stakeLevelSchema.options))

    const fifth = "catastrophic" as StakeLevel

    console.log("the schema refuses the string:", !stakeLevelSchema.safeParse("catastrophic").success)
    console.log("indexOf:", STAKE_ORDER.indexOf(fifth))

    const rankOf = (level: StakeLevel): number => STAKE_ORDER.indexOf(level)
    const compare = (left: StakeLevel, right: StakeLevel): number => rankOf(left) - rankOf(right)
    const highest = (levels: readonly StakeLevel[]): StakeLevel =>
      levels.reduce<StakeLevel>((top, level) => (compare(level, top) > 0 ? level : top), "low")

    console.log("compare(fifth, critical):", compare(fifth, "critical"))
    console.log("compare(fifth, low):", compare(fifth, "low"))
    console.log("at least critical:", compare(fifth, "critical") >= 0)
    console.log("at least low:", compare(fifth, "low") >= 0)
    console.log("highest([low, fifth]):", highest(["low", fifth]))
  })
})
```

```
the order:  ["low","medium","high","critical"]
the schema: ["low","medium","high","critical"]
the schema refuses the string: true
indexOf: -1
compare(fifth, critical): -4
compare(fifth, low): -1
at least critical: false
at least low: false
highest([low, fifth]): low
```

**Those three helpers are `stake-level.ts`'s own arithmetic, copied into the
exercise rather than imported.** It is the only place in this course where a
lesson reimplements the thing it is teaching, and it is deliberate: the list they
rank against is the live one, and the runtime's copy of the arithmetic is one
line from changing. A transcript this course re-runs on every build is a promise
about a number, and these are the only numbers in the course nobody is in a
position to promise. The section above says which line, and where to go and read
whether it has been written yet.

`at least low: false` is the line to stare at. A level meant to be the most severe
the system has is, by this arithmetic, below the least severe. Trace it up lesson
09's ladder: `rejectAtRefusalFloor` asks `isAtLeast(level, refusalFloor)` and
returns `null` when the answer is false — `null` being a rung with nothing to say.
`confirmAboveCeiling` asks `isAbove` and gets the same silence. Two rungs decline,
the ladder runs out, and the change comes out `accepted / within-policy` — which
is the pair in the table two sections up, measured rather than reasoned. The one
change
nobody wanted applied without asking is applied without asking, and every rung
behaved exactly as designed while it happened.

The fold is worse in a quieter way. `highest` seeds at `"low"` and keeps a level
only when it compares *above* the incumbent, so the new level never wins and never
leaves the analysis. The verdict would not be wrong about a critical change; it
would be right about a change whose severity it was never told.

And now the cast, which is the objection to this whole exercise and is worth
answering rather than waving at. Nobody writes `"catastrophic" as StakeLevel` on
purpose. Until 17 September it did not need defending, because it stood in for
something nobody would have to write: a fifth member added to `stakeLevelSchema`
by somebody thinking about a feature, after which the type widens by itself, every
`switch` in the runtime demands to be updated and gets updated, and `STAKE_ORDER`
is the one thing that does not complain because it is a value.

That is the door `everyMemberOf` shut. What the cast stands in for now is
narrower and does not go away: a level that reached this arithmetic having been
checked by something other than the compiler, which the section above lists the
open routes to. The schema still refuses the string at the boundary — that is the
third line of the transcript, and it is why this is a lesson rather than an
incident report — but a boundary only checks what crosses it.

### Exercise E — the third question

Four ways to make the memory store refuse, and a tally of which of the five codes
were reached. Predict the tally before running, and predict which code is the odd
one out before you count.

```ts
describe("E", () => {
  it("counts which of the five this store can produce", async () => {
    const produced = new Set<string>()
    const store = memoryTreeStore()
    const { tree, ids } = sampleTree()

    const missing = await store.head("t_nothing" as TreeId)
    if (!missing.ok) produced.add(missing.error.code)

    await store.create(tree)
    const twice = await store.create(tree)
    if (!twice.ok) produced.add(twice.error.code)

    await store.append(
      tree.treeId,
      appendOf(deltaOf(tree.treeId, 0, [{ op: "remove", nodeId: ids.footer }]), "p_1")
    )

    const stale = await store.append(
      tree.treeId,
      appendOf(deltaOf(tree.treeId, 0, [{ op: "remove", nodeId: ids.card }]), "p_2")
    )
    if (!stale.ok) produced.add(stale.error.code)

    const absent = await store.append(
      tree.treeId,
      appendOf(deltaOf(tree.treeId, 1, [{ op: "remove", nodeId: "n_404" as never }]), "p_3")
    )
    if (!absent.ok) produced.add(absent.error.code)

    for (const code of STORE_ERROR_CODES) {
      console.log(`${code.padEnd(18)}${produced.has(code) ? "produced" : "never reached"}`)
    }

    console.log("reached:", produced.size, "of", STORE_ERROR_CODES.length)
  })
})
```

```
not-found         produced
already-exists    produced
revision-conflict produced
delta-rejected    produced
unavailable       never reached
reached: 4 of 5
```

Here is where the exercise has to be read carefully rather than triumphantly,
because the obvious reading of `4 of 5` is wrong. `unavailable` means *the storage
itself is not there*, and a `Map` in the same process is always there. The code is
correct. The union is correct. The reason is for the Postgres driver, and it fires
there.

What is worth having is that **this output looks exactly like lesson 18's defect
and is not it.** There, `unavailable` was unreachable in every implementation, for
a month, for the failure it was named for — and the thing that made it a defect
rather than an unused branch was invisible from any single run of any single
implementation. A tally like this one cannot tell you which of the two situations
you are in. It can only tell you that the question exists, which is more than
anything else in this lesson does for question 3.

### Exercise F — one statement, counted

The knobs, counted from the schema and from a value parsed by it.

```ts
describe("F", () => {
  it("counts the knobs from the one place that states them", () => {
    const fromSchema = Object.keys(gatePolicySchema.shape)
    const fromValue = Object.keys(defaultGatePolicy)

    console.log("knobs the schema declares:", fromSchema.length)
    console.log("keys on the parsed default:", fromValue.length)
    console.log(
      "the same names in the same order:",
      JSON.stringify(fromSchema) === JSON.stringify(fromValue)
    )
    console.log("the last three:", JSON.stringify(fromSchema.slice(-3)))
  })
})
```

```
knobs the schema declares: 13
keys on the parsed default: 13
the same names in the same order: true
the last three: ["confidenceFloor","autoApplyCeiling","refusalFloor"]
```

Thirteen, agreeing, which is what you would expect and proves less than it looks.
Both numbers come from the same schema — one from its shape and one from a value
it produced — so this pair would agree no matter how far a *type* above them had
drifted. The exercise is here to make that concrete: **this is what a passing
consistency check looks like when it is comparing something with itself.**

The measurement that does say something cannot be run by this course, because it
is not a program — it is two compilations. On this checkout, on 15 September, with
a fourteenth field added and the repository type-checked:

```text
a field added to the schema, absent from a hand-written mirror:     0 errors
a field named by the type, absent from the schema:                 73 errors, 12 files
```

Zero and seventy-three, from the same disagreement seen from its two sides. The
zero is the one that shipped for as long as the mirror existed; the seventy-three
is what people picture when they picture a type system holding two things
together.

Two notes on that pair, because a number in a lesson is a claim like any other.
It was produced by editing `src/runtime/policy.ts` on a working copy and running
`pnpm typecheck`, twice, then reverting — the course's own runner cannot execute
it, so unlike every other output in this lesson it is not recomputed when this
page is built. The `73` in particular is a fact about how many call sites happen
to construct a `GatePolicy` today and will move as tests are added. The `0` is the
one that matters and the one that is structural: it is zero for the same reason it
was zero in August, and it would be zero in a repository with ten thousand call
sites.

---

## It could have been otherwise

Four from [0132](../decisions/0132-a-type-that-mirrors-a-schema-is-derived-from-it.md)
and the module's own prose, and two that are not in any record.

**Assert in a test that the schema and the type agree.** `Object.keys(schema.shape)`
against the keys of the parsed default. Genuinely cheap, and the documentation
lane offered it. Rejected as the primary fix for a reason worth generalising: a
run-time check cannot repair what a *type* omits. The test would go green and a
consumer writing `Record<keyof GatePolicy, Knob>` would still get thirteen keys.
It is kept anyway, beside the derivation — a claim worth making is worth checking
— which is the right relationship between the two rather than a hedge.

**A mapped type over `z.infer` that makes every array `readonly`.** Closes the same
gap without touching the schema. Rejected because it recovers in a type what the
schema is the right place to say, and would have been a fourth spelling of *these
lists are readonly* in a package that already had one.

**Each consumer keeps its own copy.** What was happening, and it is worth stating
as a design rather than as an absence, because it is what every repository does by
default and it has one real virtue: each copy is in the order its own page wants.
The cost is that the number of places that can be silently wrong grows with the
number of consumers, and four surfaces now read this runtime. Four lanes had
filed it.

**A `Record<Union, true>` beside the list, and `Object.keys` in a test.** Not
rejected — it is live, in `pipeline.test.ts`, for a union with no schema. It gets
the compile-time check, which is the important half. What it does not get is the
check *at the declaration*: the record lives in the test file, so the author of a
new member is told by a file they may not open, and the order the list is written
in — argued at length in every one of these modules' doc comments — is not the
thing being asserted. A reasonable second best, and it is what you write when the
helper does not exist yet.

**Generate the lists from the source.** Not in any record. A build step that reads
the union declarations and emits the arrays, the way the API reference is
generated from the published surface. It removes the claim entirely, which is
strictly the strongest answer available, and this repository already has the
machinery. Rejected here on the grounds that a generated file is a file somebody
has to notice is stale, and the generator becomes a thing to maintain that is
harder to read than the four-line helper it replaces — but it is the right answer
at a different scale, and worth remembering as the thing to reach for when the
number of these lists is fifty rather than seven.

**Publish the list instead of the union, and derive the type from it.**
`const CODES = [...] as const; type Code = typeof CODES[number]`. Not in any
record and the one a reader is most likely to propose, because it inverts the
problem out of existence: with the list as the statement, the type cannot drift
from it. It is genuinely right for a plain enumeration, and it is what
`schema.options` already does one level up. It fails here for the reason the whole
module exists: `StoreError` is not a union of strings. Its members carry a
`treeId`, an `expected` and a `found`, a `TreeError`, a `detail`. The union is the
statement because the union is the only thing that can hold the payloads, and the
codes are a projection of it — `StoreError["code"]` — rather than its source.

---

## Explain it back

Two things to write in your own words. Do not look at the earlier sections while
you write. Then compare.

1. **Explain to a colleague why `satisfies readonly Code[]` does not do what they
   think it does.** They are not confused about much: they know it checks the
   value against the type, they know it is stricter than an annotation, and they
   have used it correctly for years. Give them the one-sentence version, then the
   reason — the reason is about what kind of question completeness is, not about a
   gap in the feature. Then answer the follow-up they will have, which is *so why
   does the language not just add it?*

2. **Derive `everyMemberOf` from lesson 05 and lesson 18 together, without looking
   at either.** Lesson 05 gave you a runtime where nothing throws and every
   failure is a member of a closed set, because a closed set is what an audit
   trail can be built on. Lesson 18 gave you a member of a closed set that nothing
   could produce. Show how those two, taken together, produce both the need for
   this helper and the limit of what it can do — and then say which of lesson 18's
   two lessons this helper does *not* address, and what would.

Predict, before writing (2): the limit is not that it only works for string
unions. If that is your answer, you have found the restriction in the signature
rather than the one in the idea.

---

## Self-check

Seven questions. For each: **rate your confidence 1–5 before you write your
answer, then check.**

1. Name the three questions you can ask about a closed set, say which one a
   compiler answers, and give a one-sentence reason why it cannot answer the
   second. Then say what the second one's failure looks like at the moment it goes
   wrong.
2. Write the signature of `everyMemberOf` from memory. Then, for each of its two
   unusual features — the currying and the square brackets in
   `[Union] extends [List[number]]` — say what breaks if you remove it, and be
   specific about *how* it breaks rather than that it does.
3. A field is added to a Zod schema and not to the hand-written type beneath it,
   and the two are joined by `const value: Type = schema.parse({})`. Say how many
   errors, say why, and then give the rule about assignability that makes the
   answer inevitable rather than surprising. Then answer the same question for the
   opposite drift.
4. You are reviewing a pull request that adds a completeness check. Give the one
   question you ask to rank it, and then rank these four from strongest to
   weakest: a test against `schema.options`; an `everyMemberOf` call; a test
   against a hand-written copy of the list; a `Record<Union, true>` in a test file.
   Say which two are closest and what separates them.
5. `STAKE_ORDER.indexOf(level)` returns `-1` for a level that is not listed. Trace
   that `-1` through `compareStakes`, `isAtLeast` and `highestStake`, and say what
   the Gate does about a change carrying that level — naming the two rungs
   involved and what each returns. Then: `STAKE_ORDER` is now checked at its
   declaration by the strongest mechanism in this lesson. Say which route to that
   `-1` the check closed, name one it did not, and say why no check of that kind
   could have.
6. Why is publishing `schema.options` stronger than any check in this lesson,
   rather than merely more convenient? Answer in terms of statements rather than
   in terms of Zod, and then say what stops `StoreErrorCode` from being published
   that way.
7. `everyMemberOf` does nothing at run time. Name the one thing this buys, the one
   thing it costs, and the class of consumer that gets none of its protection.
   Then say what this has in common with the thing lesson 24 said about `copy` and
   `role` being read by nothing in the runtime.

Question 4 is this lesson's question and question 5 is its second act — if your
answer to 5 is *the check closed it, there is no route left*, you have given the
answer the fix looked like it gave, which is the one worth having been wrong
about. Question 3 is where a half-answer reads as a full one: if yours does not distinguish *the value has more than the type
requires* from *the value has less*, you have described the outcome without saying
what produces it.

---

## Reflect

Write for two minutes, then move on.

- Predict 1 asked you for the expression that gets the list out of the type. If
  you wrote one, write down what you thought it would compile to. If you wrote
  "there isn't one" immediately, write down whether you knew that as a fact or
  had simply never needed it — the two feel identical and only one of them
  generalises.
- Predict 3 and your confidence. Most people give the same number twice, or two
  numbers that differ by a little. Write down what you would have had to already
  know to give `0` and `73` — and note that the knowledge required is not about
  Zod, or about this repository, or about any library.
- Predict 4's first half asked what the old `STAKE_ORDER` test protects against.
  If your answer was "the order of the levels", you are right and that is the
  interesting part: it protects the thing in its name and nothing about the thing
  its name implies. Write down one test you have written that is that shape.
- Predict 4's second half, and your confidence. If you answered that nothing can
  reach the arithmetic any more, write down what you were reasoning from — most
  likely *the check is at compile time, so it covers everything the compiler
  covers*, which is true and is not the same sentence. Then write down the last
  check you added to something you own, and which door it closed.
- Now go and look. Open a repository you work on and find an exported list that
  claims to be every member of something — an array of statuses, a map of
  handlers, a switch in a reducer beside a list of action names. Work out which
  row of the table in *The idea* it is in. Do not fix it; just write down which
  row, and how long it took you to be sure.
- Last, the general version, and it is not about types. This lesson is one
  instance of *a checker whose silence is indistinguishable from approval*. Name
  one from outside programming — a form, a policy, an approval step at work — and
  say what it would take to tell, from the outside, whether it had checked or had
  simply not been asked.

---

## Come back to this

Set AD in [`review-schedule.md`](review-schedule.md), two days after this lesson.
Interleaved with 03, 05, 09, 15, 16, 18 and 24 — heavy on 18, because that lesson
and this one are the same defect met from two sides, and heavy on 09, because the
consequence in exercise D is a rung of the ladder falling silent.

One thing to carry that is not in the set, because it happened to this lesson
rather than in it. It was written on 15 September against a repository where
`STAKE_ORDER` was checked by nothing at all. Writing that down was enough to get
it fixed two days later, which is why half of this lesson is in the past tense.
It is not the first time an exercise here has changed the thing it was about —
lesson 15's did, and [0090](../decisions/0090-a-probe-that-declines-says-whether-it-got-as-far-as-calling.md) moved three days after it. What is worth keeping is
not that the defect got fixed. It is what was still standing once it had been.

Part V now has eight lessons. Seven of them found a fact the runtime could not
check because it belonged to somebody else — a host's registry, a deployment's
theme, another document's anchors, a component author who had not spoken yet. This
one found a fact the runtime cannot check that belongs to nobody: not to a host,
not to a lane, not to a party who could be asked. It is unavailable because of what
a type system is.

That is worth carrying, because it changes the shape of the remedy. Every previous
seam ended with *somebody has to declare this*, and the design question was who and
what a reading owes a caller in the meantime. This one ends with *nobody can
declare it*, and the design question becomes **where do you put the claim so that
making it wrong is an event?** — which is a question about the shape of the source
file rather than about the shape of the data.

So the question for a ninth seam is neither lesson 23's nor lesson 24's. It is:
**which of the things this system relies on are claims nobody ever states, and
what would it take for stating one to be cheaper than not?**

And beside it, from the second act, one that is not about seams at all and is the
likelier of the two to be useful on Monday: **for each check you rely on, which
values pass through the place it runs — and which reach the same code without
going anywhere near it?**
