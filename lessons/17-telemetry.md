# 17 — Telemetry: the number that grades itself, and the report that does nothing

**After this lesson you will be able to** say what a telemetry record keeps and
what it deliberately drops, and give the rule for each; say why the record was
built five days before anything read it, and what that ordering makes possible;
name the two verdicts a claim can get and the three non-answers that are kept
out of every denominator; say why a report over a live deployment cannot be read
as a statement about the model unless it is split, and what it is split by; and
give the argument for why the one number that could tune the Gate is handed to a
person instead.

**Prerequisites:** [01](01-why-a-runtime.md), [02](02-ui-as-data.md),
[03](03-change-as-data.md), [04](04-identity.md),
[05](05-purity-at-the-seams.md), [06](06-undo-as-computation.md),
[07](07-measuring-a-change.md), [08](08-two-axes.md), [09](09-the-gate.md),
[10](10-the-pipeline.md), [11](11-the-model-seam.md), [12](12-projection.md),
[13](13-refusal-and-repair.md), [14](14-rendering.md),
[15](15-primitives-and-the-registry.md), [16](16-persistence.md). The ones this
lesson leans on hardest are 07, 09, 10, 13 and 16.

You have been copying a field into exercise preambles since lesson 08 without
looking at it:

```ts
const provenance = {
  origin: "user-instruction",
  interpreter: "scripted",
  authoredBy: "model",
  confidence: 0.9,
  interpretedAt: FIXED_INSTANT,
} as const
```

`confidence: 0.9`. Lesson 09 told you two rungs of the Gate's ladder read it —
one refuses below `confidenceFloor`, one escalates below `minimumConfidence` — and
lesson 11 told you where it comes from: **the model reports its own confidence,
in its own reply, about its own work.**

So the thing being judged supplies an input to the judgement. Sixteen lessons
have gone past without anyone checking whether the number means anything. This
is the lesson where somebody checks, and the interesting part is not the
checking. It is what happens to the answer.

---

## Warm-up

Closed book, five minutes, mixed across five lessons. Write something for all
five before you look anything up.

1. Two of the Gate's rules read `confidence`, and they are two rules rather than
   one threshold. Say what each does with a number below it, and say what would
   be lost by collapsing them into one. *(09)*
2. `analyzeDelta` measures and refuses to judge. Say what that separation buys.
   Then name a second component in this course that could have decided something
   and deliberately only describes it. *(07)*
3. One repair attempt, both halves recorded. Say what "both halves" means, and
   why the second is not allowed to replace the first in the record. *(13)*
4. State the rule that decides whether a fact the log already determines gets
   stored a second time. Both halves — the half most people give is not the one
   that does the work. *(16)*
5. The pipeline can stop halfway. Name three different places it stops, then say
   what each of the three leaves behind in the revision log. The answer to the
   second half is shorter than you expect, and it is this lesson's reason to
   exist. *(10, 16)*

---

## Predict

In writing, before reading on.

> 1. Confidence is a number the model gives itself, and the Gate acts on it.
>    Design the check that finds out whether a 0.9 is really a 0.9: write down
>    the facts you would need recorded per change, and where each one comes
>    from. Then the half that matters — suppose you have run it, over a real
>    deployment, for a month. It says the model claims 0.18 more than it
>    delivers. **Write what the runtime should now do with that.** Rate your
>    confidence in the second half, not the first.
>
> 2. Two changes. The first is proposed at 0.9, accepted by the Gate, applied,
>    and then the commit fails because a database connection dropped. The second
>    is proposed at 0.9, held for a human, and nobody has answered yet. Score
>    both claims — and if you want to say something other than "right" or
>    "wrong", say exactly what, and say what it would cost to record it the other
>    way instead.
>
> 3. Somebody runs the report over a month of a live deployment and gets a gap of
>    0.4: on average the model claimed 0.4 more than it delivered. They conclude
>    the model is badly overconfident and tighten the gate. Write down two other
>    things that number could mean — neither of which is about the model — and
>    then say what the report would have to carry for anyone to tell the three
>    apart.

Predict 1 is this lesson's spine, and the trap is in the second half. Almost
everyone writes the same sentence there. Write yours down anyway; you will want
it later, and it is genuinely the reasonable answer.

---

## The problem

Go back to Warm-up 5 for a moment, because the two halves of it are the whole
setup.

The pipeline stops in a lot of places. The model declines to interpret. The Gate
refuses. The Gate holds, and a person says no. A repair is asked for and fails.
An apply succeeds and a commit falls over. Lesson 10 made the sequence stopping
halfway a normal outcome rather than an error, and lesson 13 made a refusal
something with a shape and a reason.

Now the second half. Lesson 16, Exercise B, ended on this:

> **Two refused appends left no trace whatsoever.** The head is 1, the log has
> one entry, and nothing anywhere records that a model proposed something and
> lost a race or named a node that was not there.

That is true of *every* one of those stopping points. The revision log is a
record of what happened to the tree. A change that was refused never happened to
the tree. So the entire left-hand side of the pipeline — everything the Gate
turned away, everything a person said no to, everything that was still waiting
when the request ended — is invisible in the only durable thing the system has
been shown to keep.

And that is where the confidence numbers are. A claim that survived is in the
log. **A claim that was refused is nowhere**, and the refused ones are half the
evidence: "how often was the model right" is not answerable from a store that
only kept the times it was allowed to be.

So §6 exists, and the first question is what it stores. The second question,
which turns out to be the harder one, is what anybody is allowed to do with it.

---

## The idea

### The evidence was recorded before there was a question

0007 is dated 28 July — the day after the first decision record in this
repository exists at all. It is the record that says the Gate will keep trusting
a self-graded number — no discount, no per-interpreter
multiplier, no second model grading the first — and it is blunt about why:

> Inventing a correction before there is outcome data to fit it against would be
> guessing dressed as rigour, and it would make the Gate's behaviour depend on a
> hidden model rather than on its stated rules.

Then it does the thing worth copying. Having decided not to solve the problem,
it writes down what would be needed to solve it later, as a **requirement on a
section that did not exist yet**:

> **§6 must capture, per proposal:** the reported confidence, the interpreter
> that reported it, the disposition the Gate reached, and the eventual outcome —
> applied, confirmed, reverted, or refused.

Four facts. Note the sentence after them: *"recorded here so it is a constraint
§6 inherits rather than a feature §6 might think to add."*

Calibration arrived on 2 August, five days later. For those five days the
runtime was writing down the answer to a question nothing was asking, and that
is the only order in which this works. **A claim you did not record cannot be
scored afterwards.** You can add a report to a system that has been keeping
records; you cannot add records to a month that has already gone past. The cheap
thing to have got right on day 2 was not the measurement — it was knowing which
four facts the measurement would want.

This is the general shape and it is worth taking out of Loom entirely: when you
knowingly defer a decision, the part you cannot defer is the evidence.

### The record is a narrowing, and it never narrows *membership*

§2 has been emitting a `RuntimeEvent` at every stage since lesson 10, into a sink
that did nothing. A `RuntimeEvent` is the runtime talking to itself inside one
request, so it carries whole assessments and whole inverse deltas — the next
stage needs them.

A telemetry record is what survives the request. 0023 makes it a **projection**
of that stream rather than a copy, and three rules decide what crosses:

**The delta of a proposal is kept, whole.** This is the one that looks
extravagant and is not. For a change that was refused, held and discarded, or
never applied, *this journal is the only record it ever existed.* Drop the delta
and you know something was refused but not what — which is the half of §6 that
has any value.

**Anything the log already holds is dropped.** An applied change's inverse delta
is in `loom_revisions` already, attached to the revision the telemetry record
names. `change-applied` therefore stores a proposal id and a revision number and
nothing else. Two copies of one delta are two things that can disagree, and the
disagreement would be silent because nothing would compare them — the same
argument that made the snapshot need an audit in lesson 16, applied by refusing
to create the second copy at all.

**The utterance is not kept.** `Provenance` has carried `promptHash` rather than
the prompt since §2. Telemetry is the same data with longer retention and a wider
audience, so an `intent-received` record keeps origin, scope, base revision and
the *length* of what was said. `utteranceLength: 14` distinguishes a one-word ask
from three paragraphs without storing either.

Now the rule that governs the other three, and it is the one to remember:

> The narrowing changes payloads and never membership.

Every stage the runtime narrates has a telemetry event, one for one, including
the ones whose payload shrinks to two identifiers. **A stage the runtime narrates
but telemetry silently discarded would be a stage nobody could prove ran** — and
that is a different kind of hole from a shrunken payload, because a missing
payload is visible and a missing event is not. `narrowEvent` is one total switch
over the union with an exhaustiveness guard at the bottom, so adding a
`RuntimeEvent` is a compile error here rather than an event that quietly never
reaches the journal.

One more rule, small and permanent (0045): **a field added after records exist is
optional and never defaulted.** `policyFingerprint` did not exist when the first
dispositions were written. A record from before it existed did not *decline* to
name a fingerprint — it could not — and defaulting the field would put a value in
its mouth. You will meet the consequence in Exercise E's `unfingerprinted` count.

### Writing it down is not allowed to fail the change

Lesson 05 said nothing throws at the seams, and 0042 made the runtime contain a
sink that misbehaves. 0024 goes one step further: **emission does no IO at all.**

`collectTelemetry` returns a sink that narrows the envelope and pushes it onto a
list. Nothing is written until the host calls `flush`, once, at a point it
chooses and can await. The reason is a serverless one and it cuts both ways: an
awaited write inside the pipeline would make an accepted change wait on a
database, and an un-awaited write is a promise the platform cancels the moment
the response ends.

Exercise A makes the consequence concrete and it is worth sitting with. The
change is **committed** — revision 1, in the log, done — while the journal
contains nothing at all. If the host never flushes, the change stands and the
account of it does not exist.

A journal's `record` therefore takes a **batch**, and that is not a round-trip
optimisation. It is what lets an implementation make one request's narration
atomic — and the reason it has to be is the same reason retention exists two
sections below:

> Half a request's narration is worse than none of it: an episode missing its
> disposition reads as a change that was proposed and never judged, which is a
> fault report rather than a gap.

Half a batch would not be a smaller record. It would be a record of something
that did not happen.

Two failure rules follow, both chosen against the instinct to be helpful:

- **A failed batch is dropped, not retried.** A journal that is failing will fail
  the retry, and a queue that grows while it drains has moved the outage into the
  write path.
- **The buffer has a ceiling**, and past it the collector stops buffering and
  counts. Unbounded telemetry buffers are a worse failure than lost telemetry.

And the thing that makes those tolerable: `dropped()` is a number. 0042's
containment loses an event *silently*; this collector buffers so that everything
it cannot hold or cannot write is **countable**. A system that knows how much it
lost is in a different position from one that does not.

### The fold, and the second thing it returns

A journal is a flat stream in arrival order. The question §6 was built for is
per-episode: *for this thing somebody asked for, what did the model propose, what
did the Gate decide, and what became of it.* `episodesOf` folds one into the
other.

You have met this relationship before. Episodes are computed from the journal on
demand and never stored — 0016's rule from lesson 16, applied one section over. A
stored episode table would be a second copy of the same facts, and the two would
eventually disagree silently, because nothing would be checking.

The part that is new is what the fold does when it cannot answer. A page of a
journal is a *window*, and a window can open in the middle of an episode: the
proposal was made before the page began, so a `disposition-decided` record inside
the page names a proposal the window never saw proposed. The fold does not drop
those. It returns them:

```ts
/**
 * Records that name a proposal this window never saw proposed. Returned
 * rather than discarded: a fold that quietly dropped them would report a
 * refusal rate over a denominator it had silently changed.
 */
readonly unattributed: readonly RecordedTelemetry[]
```

Exercise B does this deliberately — folds a run starting three records in — and
the output is the argument. **Zero episodes, four unattributed.** A fold that
dropped them would have reported, with total confidence, that nothing happened.

### `survived`, `rejected`, and the three that are neither

Now the scoring, and this is Predict 2.

A claim gets a verdict when something happened that the claim can be judged
against:

- **`survived`** — it reached the log.
- **`rejected`** — the Gate refused it, or a human discarded it.

Everything else yields **no verdict at all**, and the three non-answers are named
rather than merged:

- **`awaiting-answer`** — held, and nobody has said yes or no yet.
- **`failed`** — something fell over mid-flight.
- **`unsettled`** — still open when the window ended.

`failed` is the one to stop on. It is enormously tempting to count a failure as a
rejection: the change did not survive, after all. 0031 rejects it in one line —

> It makes the model look overconfident every time infrastructure has a bad day,
> and the resulting number would move for reasons that have nothing to do with
> confidence.

**A commit that fell over on the database says nothing about whether the model was
right.** Fold those into the rejections and your calibration report becomes,
partly, a graph of your database's uptime — and worse, it becomes that
*invisibly*, because the number still looks like a number about a model.

So the unjudged enter no denominator. They are counted, by reason, and reported
beside the rate. Same instinct as `unattributed`: a rate over a denominator that
quietly changed is worse than no rate.

Two smaller decisions in the same spirit:

**An empty bucket reports `null`, not `0`.** Zero out of zero is not zero, and in
an alpha most buckets are empty. 0031 is explicit that the report will mostly say
`null` and that this "is the correct output and should not be smoothed away".

**A repair is scored as its own claim** (0006, lesson 13). The refusal that
prompted the repair is *precisely* the case where the grade was wrong. Averaging
the pair together would erase the single datapoint calibration exists to collect.

### Two claims the report will not score, for two different reasons

The first you have just met: the unjudged. The second is easier to miss.

**Proposals the runtime authored are segmented out.** An undo is a proposal
(lesson 06) and every proposal carries a confidence, so the inverse behind a
revert arrives with a number on it — but nobody graded that number, the runtime
stamped it. Scoring it would measure a constant.

Here is the part that is worth your attention, because it is a trap you could
walk into with correct-looking code. In Exercise D, `verdictOf` is called on the
runtime's own proposal and cheerfully returns `survived`. `verdictOf` answers
"what became of this", which is a real question with a real answer. It is
`calibrationOf` that checks `provenance.authoredBy` and puts it in
`runtimeAuthored` instead. **A reader who wrote their own loop over `verdictOf` —
the obvious thing to do — would silently fold a constant 1.0 that always survives
into their model's score**, and the score would improve every time anyone pressed
undo.

The count is reported rather than dropped for the usual reason: a reader who
notices the undos missing should find a number, not a gap.

### The rate is not a property of the model

Predict 3, and Exercise E is its proof.

Six claims, all `0.9`, all from one scripted interpreter that does exactly the
same thing every time. Three judged by a permissive gate, three by a strict one.
Pooled, the report says the model claimed 0.4 more than it delivered. Split, it
says the model is slightly *under*confident under one gate and catastrophically
overconfident under the other — with a mean claim of exactly 0.9 in every row,
because the claim never changed at all.

**Nothing about the model moved. The number moved because survival is not
something the model does.** A proposal survives when the Gate allowed it and a
human did not veto it, so `observedRate` is a property of the model *and the
policy it was judged under*. Pool two policies and you get a number that moved
for a reason the report cannot name.

Hence `byPolicy`: the same claims again, split by the policy each disposition
named (0033, lesson 09). Three properties of that split are load-bearing:

- **It is a partition, not a sample.** Every judged proposal is in exactly one
  segment, so the segments sum to `overall` — which Exercise E checks, because a
  split that quietly lost rows would be the failure this exists to prevent.
- **The policy comes from the disposition, and from nowhere else.** The intent
  also carries a `policyId` and it is the wrong one: it is the *last* resolution
  the window saw, so for a proposal held under one policy and confirmed under a
  narrower one it names the gate that did not decide this verdict.
- **`policyId: null` is not the same as `policyId: "unattributed"`.** `null` means
  this window never saw the judgment — a gap in the *reader*. The string means the
  judgment really was made before the Gate recorded which policy made it — a gap
  in the *record*. Merging them would let a fixed record look like a short page.

And then the same error one level down. A policy name is host-declared, and hosts
are asked to rename a policy when they edit it. If two different rulesets ship
under one name, a segment is pooling gates that differ by more than what they are
called — which is exactly what the segments exist to correct. So each segment
carries the distinct **fingerprints** its judgments named, and separately the
count of judgments that named none. Kept beside the list rather than folded into
it, because "one fingerprint and twelve unfingerprinted judgments" is not a
segment shown to be constant, and a list of length one would say it was.

### Calibration is a reader, not a controller

Now go and read the second half of your Predict 1.

If you wrote *move the floor* — feed the gap back, tighten `minimumConfidence`
where the model has not earned latitude, loosen it where it has — you wrote the
reasonable answer, the one the whole apparatus seems to be building toward, and
the one 0031 refuses.

Read the refusal slowly, because the second clause is the argument:

> A runtime that reads its own record of its own judgments and adjusts its own
> gate can drift somewhere nobody chose, and **the drift is silent by
> construction: the thing that would notice is the thing that moved.**

You have met that sentence before wearing different clothes. Lesson 16: a pure
event-sourced store cannot notice that its own interpretation of the log has
drifted, because the fold *is* the read. Same shape. A gate that tunes itself
from its own outcomes has no fixed point to be measured against — every
observation it makes is downstream of every adjustment it made.

There is a second argument and it is not a fallback. Every other change in this
system is proposed to a human before it takes effect. **A policy threshold is a
change.** A runtime that quietly moved its own floor would have made the one
change in the whole system that nobody was asked about — in the component whose
entire job is to ask.

And a third, about ownership. 0031:

> Loom is a framework, and the interesting adaptive behaviour belongs to the
> applications built on it, tuned to their own tolerance for a wrong guess. What
> a framework owes them is not a built-in learner but a record complete enough to
> learn from, reachable from outside the runtime.

That last clause is a constraint on the code, not a description of it:
`calibrationOf` reads only what `@loom/runtime/telemetry` already exports. The
report is the *reference consumer* — if it needed private access, no third-party
consumer could reproduce it, and the framework would have kept the interesting
part for itself.

So the measurement exists, it is complete, it changes nothing, and 0031 says why
that order is the point:

> The measurement exists before anything can act on it, which is the order that
> lets the acting be argued about with numbers in hand rather than in advance.

Closing the loop is not forbidden forever. It is a decision that deserves its own
record, argued from data this one produces — and made by a person.

### The journal may forget, and never half an episode

One last piece, because it is the only destructive operation anywhere in Loom's
storage and it is deliberately *here* rather than in `src/store/`.

Telemetry is narrowed from a log that keeps the truth (0016, 0023), so forgetting
it loses the account of what was proposed and judged, and cannot lose a tree, a
revision, or a held proposal. That is what makes retention safe to build at all.
Two rules shape it:

**Forgetting is a prefix.** A journal drops its oldest records or none; it never
punches holes. A hole would make `seq` — an opaque increasing position, never a
count — start meaning something a reader could misread.

**An episode is never cut in half.** A window that kept a commit but forgot the
proposal it committed reads as a change nobody proposed. And the reason that is
not merely untidy is the sentence to carry out of this section:

> `episodesOf` already reports records it cannot attribute, so the damage would
> be visible — but **a journal that manufactures the exact fault its own fold
> exists to detect is not a journal anyone should trust.**

Lesson 16 said the same thing about a store that writes its log entry and then
fails before advancing the snapshot: *a store that manufactures its own alarms is
worse than one that has none, because the alarm stops meaning anything.* And the
journal's batched write is the third instance, one section back: half a
narration manufactures the same fault the fold reports.

**Three mechanisms, one rule — a mechanism must not be able to produce its own
detector's signal** — and it is worth being able to state without any of the
three instances in front of you.

Retention therefore reads the journal through the same paged contract everyone
else uses, folds it, and refuses to advance its horizon past an episode whose
resolution is `awaiting-answer` or `open`. Someone may confirm that proposal
tomorrow.

---

## In the code

**`src/telemetry/event.ts`** — the narrowing. Read the header comment first: it
states the three rules and the membership rule in about fifteen lines. Then read
`narrowEvent` for what a total function over an event union buys, and the comment
on `policy-resolved` for why a name and a digest cross while the document does
not.

**`src/telemetry/sink.ts`** — eighty-five lines, and the two best comments in it
are about failure. Note that the buffer exists to make loss *countable* rather
than to make it safe; 0042 already made it safe.

**`src/telemetry/journal.ts`** — the contract. Three operations, and the
asymmetry is argued: batched writes, paged reads, and `forget` taking a position
rather than a rule. Read the comment on `RecordedTelemetry` about `seq` and
`recordedAt` — *an age a writer can choose is an age a writer can dodge* — which
is lesson 05's injected clock arriving somewhere you would not have predicted it.

**`src/telemetry/episode.ts`** — `episodesOf`, and then `resolutionOf`, which is
where "a repaired proposal that applied is the intent being satisfied" turns into
four lines of code. `EpisodeTally` at the bottom is a second fold over the first,
for the same reason the first is not stored.

**`src/telemetry/calibration.ts`** — the whole lesson in three hundred lines, and
almost all of it is comment. Read `verdictOf` (eight lines, and the order of the
checks is the argument), then `PolicyCalibration`'s doc comment, then
`bucketIndexOf`, which counts the bounds a confidence clears rather than
multiplying it out, because `Math.floor(0.7 * 10)` is not reliably 7.

**`src/telemetry/retention.ts`** — the only destructive operation in the system,
and the header explains why it is allowed to exist.

**`decisions/0007`**, then **`0023`**, **`0024`**, then **`0031`**. In that
order: 0007 defers a problem and specifies its evidence, 0023 and 0024 build the
record, 0031 measures it and refuses to act. 0007 → 0031 is five days and is the
most instructive pair of records in the repository to read back to back.

---

## Try it

Five exercises. Put each snippet into `src/scratch.test.ts` and run

```bash
pnpm vitest run src/scratch.test.ts
```

**Predict every output in writing, then run.** Exercise D has a line most readers
do not predict and Exercise E is the one the lesson is really about.

The shared preamble for all five:

```ts
import { describe, it } from "vitest"

import { defaultGatePolicy, type GatePolicy } from "./runtime/policy.js"
import { harnessWith, proposalScript } from "./testing/episode-harness.js"
import { calibrationOf, verdictOf } from "./telemetry/calibration.js"
import { episodesOf, type EpisodeFold } from "./telemetry/episode.js"
import { commitIntent, discardHeld, revertRevision } from "./write/index.js"

const merge = (...folds: readonly EpisodeFold[]): EpisodeFold => ({
  episodes: folds.flatMap((fold) => fold.episodes),
  unattributed: folds.flatMap((fold) => fold.unattributed),
})
```

`harnessWith` is a real Gate, a real store and a real journal with only the model
scripted — which is deliberate, and the reason is in its header comment: a test
that wrote its own telemetry records would keep passing after the pipeline
stopped narrating a stage. `proposalScript(c)` proposes the same removal every
time and claims confidence `c`. Under the default policy, roughly: `0.7` and up
is accepted, below `0.7` is held for a person, below `0.3` is refused.

### Exercise A — the whole narration, and none of it written

```ts
describe("A", () => {
  it("narrates a whole change, and writes none of it until asked", async () => {
    const harness = await harnessWith({ script: proposalScript(0.9) })
    const outcome = await commitIntent(harness.path, harness.intent)

    console.log("the change:", outcome.kind)
    console.log("buffered:", harness.collector.pending().length, " dropped:", harness.collector.dropped())

    const before = await harness.journal.read()
    console.log("in the journal so far:", before.ok && before.value.records.length)

    await harness.collector.flush()

    const page = await harness.journal.read()
    if (!page.ok) return

    for (const record of page.value.records) {
      console.log(` seq ${record.seq}`, record.event.type)
    }

    const proposed = page.value.records.find((record) => record.event.type === "change-proposed")
    const applied = page.value.records.find((record) => record.event.type === "change-applied")
    const received = page.value.records.find((record) => record.event.type === "intent-received")

    console.log("intent-received:", JSON.stringify(received?.event))
    console.log("change-applied: ", JSON.stringify(applied?.event))
    console.log("change-proposed keys:", Object.keys((proposed?.event as { proposal: object }).proposal).join(","))
  })
})
```

Four predictions before you run: how many events one accepted change produces;
what is in the journal at the moment the change is committed; whether the words
`"make it better"` appear anywhere; and what `change-applied` carries besides a
proposal id.

The output:

```
the change: committed
buffered: 7  dropped: 0
in the journal so far: 0
 seq 1 intent-received
 seq 2 policy-resolved
 seq 3 change-proposed
 seq 4 change-assessed
 seq 5 disposition-decided
 seq 6 change-applied
 seq 7 change-committed
intent-received: {"type":"intent-received","intent":{"intentId":"i_h1","origin":"user-instruction","baseRevision":0,"utteranceLength":14,"observedAt":"2026-07-28T00:00:00.000Z"}}
change-applied:  {"type":"change-applied","proposalId":"p_h1","revision":1}
change-proposed keys: proposalId,intentId,delta,rationale,provenance
```

**Seven events, and the change was committed before any of them existed
anywhere.** `in the journal so far: 0` is the line to have predicted. The
pipeline ran to completion, revision 1 is in the log, and the account of it is
sitting in a list in memory that a process crash would take with it. That is the
trade 0024 made on purpose, and it is why `flush` is a thing a host has to
remember rather than something the runtime does for it.

**The utterance is a number.** `utteranceLength: 14` — "make it better" is
fourteen characters. There is no `utterance` key. Nothing downstream can
reconstruct what was typed, and a host that wants to group identical asks has
`promptHash`.

**`change-applied` is two identifiers.** No delta, no inverse, no tree. The
inverse is in `loom_revisions` attached to revision 1 already; storing it here
would be the second copy that 0016 spent a whole lesson explaining the cost of.

**And `change-proposed` keeps everything.** Delta, rationale, provenance — because
this record is the only place a refused change would ever exist. Two records in
one stream, one narrowed almost to nothing and one kept whole, and the rule that
decides between them is *does the log already have it.*

### Exercise B — the fold, and the window that opened late

```ts
describe("B", () => {
  it("folds the stream, and says what it could not attribute", async () => {
    const harness = await harnessWith({ script: proposalScript(0.9) })
    await commitIntent(harness.path, harness.intent)
    await harness.collector.flush()

    const page = await harness.journal.read()
    if (!page.ok) return
    const records = page.value.records

    const whole = episodesOf(records)
    const episode = whole.episodes[0]
    const proposal = episode?.proposals[0]
    if (!episode || !proposal) return

    console.log("episodes:", whole.episodes.length, " unattributed:", whole.unattributed.length)
    console.log("resolution:", JSON.stringify(episode.resolution))
    console.log("policyId:", episode.policyId)
    console.log(
      "claimed",
      proposal.provenance.confidence,
      "| held:",
      proposal.held,
      "| committed at:",
      proposal.committedRevision
    )

    /** The same run, read by a window that opened three records late. */
    const late = episodesOf(records.slice(3))
    console.log("late window — episodes:", late.episodes.length, " unattributed:", late.unattributed.length)
    console.log("  it lost:", late.unattributed.map((record) => record.event.type).join(", "))
    console.log("  report:", JSON.stringify(calibrationOf(late).overall))
    console.log("  report.unattributed:", calibrationOf(late).unattributed)
  })
})
```

Predict the late window's episode count before you run it, and then — separately,
because it is the actual question — predict what its report says.

The output:

```
episodes: 1  unattributed: 0
resolution: {"kind":"committed","proposalId":"p_h1","revision":1}
policyId: default
claimed 0.9 | held: false | committed at: 1
late window — episodes: 0  unattributed: 4
  it lost: change-assessed, disposition-decided, change-applied, change-committed
  report: {"judged":0,"survived":0,"observedRate":null,"meanConfidence":null,"gap":null}
  report.unattributed: 4
```

Seven flat records became one episode with a resolution, a policy, and a claim
attached to an outcome. That is the fold doing its job.

Then the second half. **Zero episodes.** A window that opened four records into a
seven-record story contains a disposition, an apply and a commit, and can attach
none of them to anything — the proposal they name was made before the page began.

Now read the report over that window and notice what it *would* have said. `judged
0`, every rate `null`, and one honest number: `unattributed: 4`. Delete that field
and the report becomes an unremarkable "quiet period, nothing to score". It is
indistinguishable, from the outside, from a window in which genuinely nothing
happened — and it happens to be the description of four events including a
committed change.

**A number that is missing and a number that is zero are different claims, and a
denominator that changed quietly is worse than no denominator.** Same instinct
three times in this lesson: `unattributed`, the unjudged breakdown, and `null` for
an empty bucket.

### Exercise C — four endings, three verdicts, one refusal to answer

```ts
describe("C", () => {
  it("scores what can be scored and names why the rest cannot", async () => {
    for (const confidence of [0.9, 0.5, 0.2]) {
      const harness = await harnessWith({ script: proposalScript(confidence) })
      const outcome = await commitIntent(harness.path, harness.intent)
      const fold = await harness.fold()
      const proposal = fold.episodes[0]?.proposals[0]

      console.log(
        confidence,
        "->",
        outcome.kind.padEnd(10),
        "resolution",
        String(fold.episodes[0]?.resolution.kind).padEnd(15),
        "verdict",
        proposal && verdictOf(proposal)
      )
    }

    const harness = await harnessWith({ script: proposalScript(0.5) })
    const held = await commitIntent(harness.path, harness.intent)
    if (held.kind === "held") {
      await discardHeld(harness.path, { proposalId: held.held.proposalId, actor: "sam" })
    }
    const fold = await harness.fold()
    const proposal = fold.episodes[0]?.proposals[0]
    console.log(
      "0.5 then a person said no  -> resolution",
      String(fold.episodes[0]?.resolution.kind).padEnd(15),
      "verdict",
      proposal && verdictOf(proposal)
    )
  })
})
```

The output:

```
0.9 -> committed  resolution committed       verdict survived
0.5 -> held       resolution awaiting-answer verdict awaiting-answer
0.2 -> refused    resolution refused         verdict rejected
0.5 then a person said no  -> resolution discarded       verdict rejected
```

The two lines to compare are the middle two, because they are **the same claim**.
`0.5` twice, the same delta, the same gate, the same disposition. The only
difference is that in one of them a person had turned up.

Held is not a verdict. It is the absence of one, and it stays out of the
denominator for as long as it takes somebody to answer — which is a
correct-but-frustrating property, and the alternative is worse: scoring an
unanswered hold as a rejection would mean the model's calibration silently got
worse every time a reviewer went on holiday.

**And then a person said no, and it became a rejection.** 0031 calls that the
highest-value signal in the journal, and it is worth seeing why it outranks the
Gate's own refusal. The Gate and the model are two components tuned against each
other; agreement between them is partly an artefact of that. A human discarding a
change the Gate was *willing to accept* is the only judgment in the whole system
made from outside it.

### Exercise D — the report, and a row that should not be in it

```ts
describe("D", () => {
  it("reports over six claims, one of which it will not count", async () => {
    const folds: EpisodeFold[] = []

    for (const confidence of [0.95, 0.85, 0.2]) {
      const harness = await harnessWith({ script: proposalScript(confidence) })
      await commitIntent(harness.path, harness.intent)
      folds.push(await harness.fold())
    }

    const discarded = await harnessWith({ script: proposalScript(0.55) })
    const held = await commitIntent(discarded.path, discarded.intent)
    if (held.kind === "held") {
      await discardHeld(discarded.path, { proposalId: held.held.proposalId, actor: "sam" })
    }
    folds.push(await discarded.fold())

    const waiting = await harnessWith({ script: proposalScript(0.65) })
    await commitIntent(waiting.path, waiting.intent)
    folds.push(await waiting.fold())

    /** An undo. Nobody graded this one. */
    const undone = await harnessWith({ script: proposalScript(0.99) })
    await commitIntent(undone.path, undone.intent)
    const reverted = await revertRevision(undone.path, {
      treeId: undone.tree.treeId,
      revision: 1,
      seed: undone.tree,
      origin: "user-instruction",
      actor: "sam",
    })
    console.log("the undo:", reverted.kind)
    folds.push(await undone.fold())

    const merged = merge(...folds)

    for (const episode of merged.episodes) {
      for (const proposal of episode.proposals) {
        console.log(
          " ",
          String(proposal.provenance.confidence).padEnd(5),
          proposal.provenance.authoredBy.padEnd(8),
          "->",
          verdictOf(proposal)
        )
      }
    }

    const report = calibrationOf(merged)
    console.log("overall:        ", JSON.stringify(report.overall))
    console.log("unjudged:       ", JSON.stringify(report.unjudged))
    console.log("runtimeAuthored:", report.runtimeAuthored, " unattributed:", report.unattributed)

    for (const bucket of report.buckets) {
      if (bucket.judged === 0) continue
      console.log(
        `  [${bucket.lower.toFixed(1)}, ${bucket.upper.toFixed(1)})  judged ${bucket.judged}  survived ${bucket.survived}  rate ${bucket.observedRate}  mean ${bucket.meanConfidence}  gap ${bucket.gap}`
      )
    }
    const empty = report.buckets[0]
    console.log("  an empty bucket:", JSON.stringify(empty))
  })
})
```

Six model claims go in: `0.95`, `0.85`, `0.2`, `0.55`, `0.65`, `0.99`. Write down,
before running, what `overall.judged` will be — and be careful, because the
answer is not six and it is not five for the reason you first think.

The output:

```
the undo: committed
  0.95  model    -> survived
  0.85  model    -> survived
  0.2   model    -> rejected
  0.55  model    -> rejected
  0.65  model    -> awaiting-answer
  0.99  model    -> survived
  1     runtime  -> survived
overall:         {"judged":5,"survived":3,"observedRate":0.6,"meanConfidence":0.708,"gap":0.10799999999999998}
unjudged:        {"awaiting-answer":1,"failed":0,"unsettled":0}
runtimeAuthored: 1  unattributed: 0
  [0.2, 0.3)  judged 1  survived 0  rate 0  mean 0.2  gap 0.2
  [0.5, 0.6)  judged 1  survived 0  rate 0  mean 0.55  gap 0.55
  [0.8, 0.9)  judged 1  survived 1  rate 1  mean 0.85  gap -0.15000000000000002
  [0.9, 1.0)  judged 2  survived 2  rate 1  mean 0.97  gap -0.030000000000000027
  an empty bucket: {"lower":0,"upper":0.1,"judged":0,"survived":0,"observedRate":null,"meanConfidence":null,"gap":null}
```

Seven rows above the report and five judged claims in it, and the two missing rows
are missing for two entirely different reasons.

**`0.65` was held and nobody answered.** No verdict, counted under
`awaiting-answer`, and out of the denominator. Notice `failed: 0` and
`unsettled: 0` are *present* — an outcome absent from that map and one that
happened zero times are different claims, and only one of them is true.

**And there is a seventh row nobody wrote.** `1  runtime  -> survived`. The undo
was a proposal, so it has provenance, so it has a confidence, and the runtime
stamped it 1. `verdictOf` scored it happily — it is answering "what became of
this", which has a perfectly good answer. `calibrationOf` did not, because it
reads `provenance.authoredBy` first.

Sit with the trap for a second, because it is the kind that survives review. Loop
over `verdictOf` yourself — the obvious way to build a dashboard — and you fold in
a claim of 1.0 that always survives, once per undo. Your model's calibration would
improve every time a reviewer pressed the undo button. The count is on the report
so that a reader who wonders where the undos went finds a number rather than a
gap.

**The gap has a sign and it is worth reading in both directions.** `+0.2` at the
bottom bucket and `−0.15` in the `[0.8, 0.9)` band: positive means the model
claimed more than it delivered; negative means it delivered more than it claimed.
Underconfidence is a real finding too, and a report that only reported one
direction would be a report with an opinion built into it.

**And an empty bucket says `null` four times.** `judged: 0, survived: 0` are real
counts. `observedRate`, `meanConfidence` and `gap` are `null`, because zero out of
zero is not zero, and a `0` there would render on a chart as a bar at the floor —
"this model is wrong every time in this band" — for a band nothing ever landed in.

One last thing, and it is not a bug: `-0.15000000000000002`. Nothing is rounded
anywhere. Rounding is a presentation decision and this is not the presentation
layer; the same instinct that made `bucketIndexOf` count bounds rather than
multiply out a float shows up here as a refusal to tidy the arithmetic on the way
out.

### Exercise E — one model, one claim, two answers

```ts
const GENEROUS: GatePolicy = { ...defaultGatePolicy, policyId: "generous" }
const STRICT: GatePolicy = {
  ...defaultGatePolicy,
  policyId: "strict",
  minimumConfidence: 0.99,
  confidenceFloor: 0.95,
}

describe("E", () => {
  it("pools two gates into one number, then takes them apart", async () => {
    const folds: EpisodeFold[] = []

    for (const policy of [GENEROUS, STRICT]) {
      for (let run = 0; run < 3; run += 1) {
        const harness = await harnessWith({ script: proposalScript(0.9), policy })
        await commitIntent(harness.path, harness.intent)
        folds.push(await harness.fold())
      }
    }

    const report = calibrationOf(merge(...folds))

    console.log("every claim in this window was 0.9, from one scripted interpreter.")
    console.log("overall:  ", JSON.stringify(report.overall))
    for (const segment of report.byPolicy) {
      console.log(
        " ",
        String(segment.policyId).padEnd(9),
        JSON.stringify(segment.overall),
        "fingerprints:",
        segment.fingerprints.length,
        " unfingerprinted:",
        segment.unfingerprinted
      )
    }
    console.log(
      "segments sum to overall?",
      report.byPolicy.reduce((total, segment) => total + segment.overall.judged, 0) ===
        report.overall.judged
    )
  })
})
```

The interpreter is the same object in all six runs and it claims `0.9` every
time. Predict `overall.gap`, then predict the two segment gaps, and hold on to
the fact that nothing about the model differs between any two rows.

The output:

```
every claim in this window was 0.9, from one scripted interpreter.
overall:   {"judged":6,"survived":3,"observedRate":0.5,"meanConfidence":0.9,"gap":0.4}
  generous  {"judged":3,"survived":3,"observedRate":1,"meanConfidence":0.9,"gap":-0.09999999999999998} fingerprints: 1  unfingerprinted: 0
  strict    {"judged":3,"survived":0,"observedRate":0,"meanConfidence":0.9,"gap":0.9} fingerprints: 1  unfingerprinted: 0
segments sum to overall? true
```

**Read the `meanConfidence` column first.** `0.9` in the pooled row and `0.9` in
both segments. The model's claim is a constant across this entire window; there
is nothing in it for a calibration report to detect.

And the gap runs from `−0.1` to `+0.9`.

Three sentences you could write from these numbers, all arithmetically correct:

- *The model claims 0.4 more than it delivers.* (the pooled row)
- *The model is slightly underconfident.* (the generous segment)
- *The model is wrong nine times out of ten.* (the strict segment)

**None of them is about the model.** `observedRate` counts what survived, and
surviving is something the Gate and the human do. A host that tightened
`minimumConfidence` last Tuesday moved every one of those numbers without the
model having changed at all — which is Predict 3, and the reason the pooled row
alone is not a finding.

`fingerprints: 1` in both rows is the check one level down: each segment's
judgments all named the same ruleset digest, so each row really is one gate. Two
fingerprints under one name would mean the host edited a policy without renaming
it, and the segment would be pooling exactly what the segmentation exists to
prevent — silently, since the name is all a disposition carries. `unfingerprinted:
0` is the other half: no judgment here predates the Gate recording what it
contained. A row reading `fingerprints: 1, unfingerprinted: 12` is not a segment
shown to be constant, however much a list of length one looks like one.

And `segments sum to overall? true` is a partition check. Every judged claim is in
exactly one segment. A split that dropped rows would be the failure mode this
lesson has now named four times, arriving one last time in the code that exists to
prevent it.

---

## It could have been otherwise

Six, from 0007, 0023, 0024 and 0031. The first three were rejected on day 2, and
the last three are the ones worth arguing with.

**Discount confidence by a per-interpreter factor.** The obvious fix in July, and
rejected because there was no data to fit the factor against. The number would
have been invented, and the Gate's behaviour would have come to depend on a table
nobody could justify — which is precisely the thing lesson 09 built a rule ladder
to avoid.

**Drop confidence from the Gate entirely** and judge on stakes and reversibility
alone. Rejected, and the reason is a nice one: an interpreter that knows it is
guessing is telling you something real, and the two-axis assessment of lesson 08
has no way to express *this might not be what was asked for at all.* The fix for
an unreliable signal is calibration, not deletion.

**Have a second model grade the first one's confidence.** Rejected for now: it
replaces one self-graded number with another, at double the cost. Worth
revisiting — but only once there is outcome data to compare a grader *against*,
which is the same ordering argument as everything else here.

**Store the whole `RuntimeEventEnvelope`, verbatim.** Lossless, trivial, and it
means telemetry never has to be revisited when a stage changes. Rejected because
records are written continuously and read months later: the shape is expensive to
reverse, and a verbatim copy makes the log's deltas exist in two places forever.

**Store one row per proposal** — provenance, disposition, outcome — which is
literally what 0007 asked for and nothing else. Rejected for what it cannot
answer afterwards: a per-proposal row cannot tell you *when* in the sequence
something happened, or that a stage ran at all. Membership is the thing you
cannot add back later.

**Let policy read the report and move its own floors.** Predict 1's second half,
and the one to argue with properly. 0031: *"this is the escalation 0007 gestured
at without authorising, and it contradicts the shape of every other change in the
system."* Not forbidden forever — but it needs its own record, argued from the
data this one produces, and decided by a person.

**Score against the Gate's disposition alone**, ignoring what the human did.
Simpler, and it would measure agreement between two components that were tuned
against each other while discarding the only judgment made from outside the
system.

---

## Explain it back

Two things to write in your own words. Do not look at the earlier sections while
you write. Then compare.

1. **Derive "calibration is a reader" from lesson 01's thesis**, without using the
   word "drift". Lesson 01 said the system exists so that change is inspectable,
   attributable, reversible and *proposed*; this lesson says the one component
   that could improve the Gate is not allowed to touch it. Write the paragraph
   that makes those the same decision. Then apply your rule to a case neither
   lesson mentions: a host wants its portal to show a **suggested** new
   `minimumConfidence`, computed from the report, with a button a person presses
   to adopt it. Is that inside the rule or outside it? Answer with the rule, and
   then say which earlier lesson's component that button is structurally the same
   as. *(01, 09, 10)*

2. **Say what the journal keeps that the log cannot, and what the log keeps that
   the journal must not.** Then derive retention's "never cut an episode in half"
   from lesson 16's insistence that `append` writes both halves atomically — they
   are the same rule, and the sentence you want is about what a mechanism is
   allowed to do to its own detector. Then apply it to a case it may or may not
   cover: `compareTrees` produces no operations and nothing accepts it as an
   input to a write. Is that the same rule or a different one? Commit to an
   answer and say what distinguishes them. *(16)*

If your answer to (1) is mostly about the model being unreliable, you have
answered a different question. The argument does not depend on the model being
bad at anything.

---

## Self-check

Six questions. For each: **rate your confidence 1–5 before you write your
answer, then check.**

1. Three rules decide what a telemetry record contains, and a fourth governs all
   of them. State the fourth, then say which of the other three it would be safe
   to break and which one would leave a hole nobody could see afterwards.
2. Give two reasons `failed` is kept apart from `rejected`. One is about what the
   number would measure; the other is about who would be able to tell. Then name
   the other place in this lesson where a count is kept out of a denominator, and
   say what the two have in common.
3. A calibration report over a live deployment says `gap: 0.4`. Give three
   different states of the world that produce that number, only one of which is
   about the model. Then say what in the report distinguishes them, and what
   distinguishes two *rulesets shipping under one name* — which the first split
   cannot catch.
4. `verdictOf` and `calibrationOf` disagree about one proposal in Exercise D. Say
   which, say why neither is wrong, and say what a consumer who used only the
   first would be measuring after a busy week of undos.
5. 0007 is dated 28 July and 0031 is dated 2 August. Say what 0007 did that made
   0031 possible, and then state the general principle in a form that has nothing
   to do with Loom. Then name the thing it would have been impossible to add
   retroactively, and why.
6. Give the argument against a runtime that tunes its own gate from its own
   outcome data — the version that does not mention the model's accuracy at all.
   Then name the earlier lesson where the same failure shape appeared under a
   different name, and say what played the part of "the thing that would notice".

Question 3 is the one worth doing in full sentences. Question 6 is the one to do
out loud, and it is the question this whole course has been building toward.

---

## Reflect

Write for two minutes, then move on.

- Go back to the second half of your Predict 1. If you wrote *feed it back*, you
  are in good company and it is what the system appears to be for. Write down, in
  one sentence, what changed your mind — or, if it did not, write the strongest
  version of the case for closing the loop, because 0031 explicitly leaves that
  door open for someone with data in hand.
- Exercise E produced three true sentences from one window, two of which are
  about the Gate and none of which is about the model. Write down what you would
  now ask for first if someone showed you a calibration number for an AI system.
  One question, not three.
- This is the last lesson in the syllabus. Look back at lesson 01's claim — that
  Loom exists because AI-written code produces changes nobody can review, gate,
  attribute or undo — and say which of those four words this lesson turned out to
  be about. Then say whether you would have predicted that in Part I.

---

## Come back to this

**Set U** in [`review-schedule.md`](review-schedule.md), two days after this
lesson. Interleaved with 05, 07, 09, 10, 13 and 16, and built around the failure
mode this lesson exists to name: **a number that is about something other than
what it appears to be about.**

**Set V**, one week after Part IV, is the course's last scheduled set and reaches
into all four parts. It is the one to do properly.

That is the syllabus. What the course does *not* yet have is a set that treats
Loom as one system rather than seventeen ideas — and the honest thing to say is
that the review schedule, done on time, is what builds that. Sets E, M, Q and V
are the four that ask you to hold more than one part in your head at once, and
they are the four most likely to be skipped.
