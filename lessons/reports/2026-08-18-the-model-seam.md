# 2026-08-18 — Lesson 11: The model seam

**Landed:** [`lessons/11-the-model-seam.md`](../11-the-model-seam.md), the
syllabus link, Set N in `review-schedule.md`, and lesson 10's forward pointer,
which had been left as *(not yet written)*.

**No code changed.** `pnpm verify` green: 1248 runtime tests across 89 files,
522 portal across 50.

## Reader feedback: checked, and there is none

The 10 report asked that this run look first and say so loudly if it could not.
It could. `list_pull_requests` and `issue_read` both worked on the first attempt,
which confirms the 10 addendum's diagnosis — that was a transient MCP
disconnection, not a scope.

There is **no maintainer feedback anywhere**. Both comments on #86 are the
routine's own (the lesson comment and the retraction), and the only other comment
is the Vercel bot. No lessons PR is open. I filtered on the Claude Code footer and
the `@jonathanbravecredit` salutation rather than on author login, per the 10
report's note that every comment on this repo reports the maintainer as its
author.

So the syllabus decided this run, and this time by argument rather than by
default.

## Why 11 was safe to write

`src/interpretation/interpreter.ts` and `prompt.ts` last moved on 2026-08-12
(§4b's catalogue work, six days ago); `anthropic.ts` and `client.ts` on 08-06;
`draft.ts`, `materialize.ts` and `schema.ts` on 07-31. The four records the lesson
leans on — 0003, 0005, 0040, 0057 — are all `Accepted`, the newest from 08-12.

The build routine's open work (#88 nested targets, #89 form submissions) is in
`primitives/`, `render/` and `gate.ts`. Nothing near this module.

The 10 report's two cautions are both honoured. The lesson teaches
`ChangeInterpreter` and `ModelClient` and treats `anthropicModelClient` as one
implementation of the second; and it stays off projection — what the model is
*shown* — which is 12's argument. The prompt appears only as a length and a
44-character prefix, in service of "the system prompt is a constant, so it caches
and so one string answers what we were asking for".

## What I emphasised, and why

**The spine is not "put the model behind an interface".** That is the thing
everyone already does, and a lesson about it teaches an idiom. So *The problem*
breaks the naive four-line `interpret` three times, and the first two breaks are
deliberately cheap — throwing, and an error union too narrow to tell an outage
from a missing key. Both are fixed by widening a type, and both are recoverable
from lesson 05. The third break is the one that is not about failure at all:

> There is no value of `TreeDelta` the model is allowed to produce.

`TreeDelta` carries `NodeId`s, and lesson 04 established the runtime mints those.
So the return type on the obvious signature is one the far side of the boundary
**cannot inhabit**, and no amount of validating what comes back fixes it. That
reframes the whole lesson from *how do I hide a dependency* to *what may cross*,
and everything else in the module falls out of it. It also makes 11 a payoff for
lesson 04 rather than a new topic, which the course needs at the start of a part.

**Three things do not cross, and the third is the one with teeth.** Identity
(0003), exceptions (0005 and lesson 05 in its hardest location), and the
difference between "no" and "I don't know" (0040). The third gets the most space
because it is where most real designs are thin, and because 0040 contains the
single best sentence in the decision corpus for this course:

> A test parsing prose to recover a fact the type system threw away is the
> clearest evidence available that the type was wrong.

**Predict 3 is the calibration trap, and it is a better one than lesson 10's.**
"Should the failure carry a `retryable: boolean`?" reads as obviously yes — it is
the helpful thing, it is what a caller wants, and it is what most seams ship. It
is wrong for a reason that only shows up when you enumerate: the boolean is true
of one code, false of two, and *genuinely arguable* for `malformed-proposal`.
One arguable case out of five disqualifies the field, because a boolean cannot
express "it depends what you are trying to do". Being wrong here is a design
mistake rather than a recall failure, which is what 10's report identified as the
most instructive kind, and this one has the added property that the wrong answer
comes from an instinct toward helpfulness rather than from carelessness.

**Exercise A is the argument I most wanted to make executable.** The seam exists
because interpretation is the *non-deterministic step*, not because it is the
model — 0057 says so, and `revertInterpreter` and the demo preset are two shipped
proofs. So A has the reader write a third deterministic interpreter in fifteen
lines and run the entire pipeline on it, ending at `applied` with an ordinary
`within-policy` verdict. Nothing downstream can tell. That is a much stronger
claim than "the seam makes testing easier", and it is the one that makes the two
`provenance` fields (`interpreter` and `authoredBy`) mean something in Q1.

**The last section is the one that earns Part III its place.** Part II's claim was
that a decision worth auditing is one you can re-derive. This step breaks that,
permanently. The seam's answer — *it cannot make the step reproducible, so it
makes it accountable* — is what provenance is for, and framing it that way turns
`promptHash`, `servedBy` and `authoredBy` from a field list into a single
argument. Exercise F is that argument as three lines of output.

**Deliberately left thin: projection, repair, and calibration.** The prompt and
the draft schema get a length, a shape, and a pointer to 12. `ChangeRepairer` gets
one paragraph justifying why it is a *second interface* — which is lesson 10's
exercise F answered from the other side — and hands the mechanism to 13.
`confidence` gets named as a self-grade and handed to 17. This is the same
discipline 09 and 10 used, and it left room for the containment argument to be
the whole lesson.

## What the exercises revealed

All six were executed via `src/scratch.test.ts`, every line of output in the
lesson is real, and the file is deleted. Three things came out of running rather
than reading.

**A model-supplied node id is silently dropped, not refused.** Exercise C's second
row was written expecting `malformed-proposal` and returned a perfectly good
proposal with the runtime's id on the node. The draft schema has no `id` field,
Zod objects are non-strict, so the key is stripped during validation. 0003's claim
holds exactly as written — collisions are impossible by construction — but the
*mechanism* is stripping rather than refusal, which I had not expected and which
turned out to be the best thing in the exercise. It sits next to row three, where
an invented id for an *existing* node is refused loudly, and the pair makes a rule
worth having: **a field the runtime owns can be safely ignored; a field the model
owns cannot.** That question was rewritten around the run.

**Two runs with different answers carry an identical `promptHash`.** Obvious in
retrospect and not obvious in prospect, and it is what makes the hash's purpose
statable: it is a hash of the ask, so two records sharing one can establish that
they answered the same question — which is the precondition for comparing them at
all. Rewording the utterance moves it. A hash of the reply would establish
something nothing needs.

**`asked` and `interpreter` differ in the ordinary case.** The request goes out
for `claude-opus-5`; provenance records `claude-opus-5-20260601`, because
`interpreter` is `completion.servedBy`. Printing both side by side made the point
in one line that a paragraph had been making badly.

## Found while teaching

**Three items. Nothing was fixed here. One is a documentation defect in an
`Accepted` record, one is a dead link, and one is an observation about a
convention that may or may not be deliberate.**

**1. 0040's table gives the wrong actor for `refused`.** The record's decision
table reads:

| Code | Actor | What it means |
| --- | --- | --- |
| `refused` | the asker | The model would not answer this content. |

`interpretationFault` returns **`"model"`**:

```ts
case "refused":
case "malformed-proposal":
  return "model"
```

Executed, through the real interpreter with a scripted client:

```
refused        -> refused                      -> model
```

The code is right and the table is wrong, I think. `InterpretationFault`'s own doc
comment defines `asker` as "the intent: nothing failed except the asking", which
is `not-understood` and `no-change-needed` — cases where the interpreter worked
correctly. A safety refusal is a failure to get an answer, and grouping it with
`malformed-proposal` under "the answer that came back is the problem" is
coherent. The record's own prose elsewhere is fine; only the table disagrees.

*My recommendation: change the table's `refused` row to name the model, not the
asker.* This matters more than a typo because 0040's whole thesis is that the
actor is the fact a consumer should read, and the table is the artefact a host
implementer will copy. A host that switched on the table's grouping would route
content refusals to the person who asked, which is the one place naming the actor
was supposed to stop them getting it wrong.

**2. 0057 links to a decision filename that does not exist.** Line 53:

```
([0005](0005-interpretation-is-the-only-non-deterministic-step.md)), not because
```

The file is `0005-model-access-is-an-optional-adapter.md`. The link 404s, and
because the repository is private it 404s without explaining itself. The link
text and the sentence around it are both correct — it is the target that is
stale, and the ghost filename is a good description of what 0005 *argues*, so I
suspect it was written from memory of the argument rather than the file.

*My recommendation: fix the target.* Worth also checking whether anything else
links to a decision by a filename it does not have — I only checked this one,
and only because the lesson cites 0057 heavily. A cheap guard beside the existing
numbering test would catch the class.

**3. A model-supplied `id` on an inserted node is stripped in silence.** Exercise
C, above. Not a behavior bug: the emitted JSON Schema sets
`additionalProperties: false`, so a grammar-constrained model cannot produce the
key, and this is reachable only through a `ModelClient` that does not enforce the
schema — a host's own adapter, or a stub. And on the supported path the node still
gets a runtime id, so nothing wrong reaches a tree.

What is worth writing down is that it is the opposite convention from the one the
build routine chose four days ago. 0065, still on an open branch (PR #89), states its
declaration schema is strict "so `{ to, action }` is refused loudly rather than
quietly stripped", for a very similar reason — a field the host owns, volunteered
by something that may not. Here the same situation resolves the other way, and
the difference is defensible (an id is minted regardless; a form action is not)
but nowhere written.

*My recommendation: nothing in code, one sentence in `draft.ts`.* Something like:
a draft carries no `id` field, so a proposer that supplies one has it dropped
rather than refused — the runtime names the node either way, and the emitted
schema stops a constrained model from trying. The reason to write it is that
"stripped or refused" is now a question this codebase answers twice in two
directions, and the next person to add a schema will want to know which case they
are in. If a stricter parse is ever wanted here, note that it would give a model
that keeps volunteering ids the only feedback it currently gets: none.

## Needs your input

Nothing blocking. Two things worth a sentence if you have one:

**Set N is the first Part III set**, and it is eight questions like the recent
ones. Part III is three lessons rather than six, so it will reach a consolidation
set (the counterpart to E and M) quickly. Say if you would rather that one arrived
on your signal than automatically — I added M without asking and flagged it, and
you have not said either way.

**Lesson 11 runs about 55–70 minutes.** Slightly under 10, and the split is
different: less Predict, more exercise, because C, E and F all produce output that
is the argument rather than an illustration of it.

## Next

Syllabus order puts **12 — Projection** next, and 11 was written to set it up:
it establishes that a projection exists, that the reply schema is not the AST, and
that props cross as a JSON-encoded string, while deliberately arguing none of it.
12's material is 0004 (Superseded), 0014 (Accepted — supersedes 0004), and 0013,
plus `prompt.ts`, `render.ts` and `schema.ts`.

**12 is the first lesson with a superseded record in its core material, and that
is an opportunity rather than a hazard.** 0004 specified a typed prop union; the
compiled grammar came out four times over its size ceiling, so no live call ever
succeeded, and 0014 replaced it with a JSON-encoded string. A lesson whose central
idea is *the schema you hand a model is compiled into a grammar, and grammars have
a size* has, in 0004, a rejected alternative that was not merely worse in theory —
it was measured and it did not work. `draftSchemaByteSize` and
`GRAMMAR_BUDGET_BYTES` exist in `schema.ts`, which means the exercise can compute
the number rather than assert it. That is the strongest shape available for an
"it could have been otherwise" section and I would build the lesson around it.

One caution: `schema.ts` and `prompt.ts` are §4b-adjacent (the catalogue block
lands in the user message), so check both for movement before committing — 08-12
is recent enough that a §4c change could reach `renderCatalogue`.

If the two documentation items above are fixed before the next run, 12 should say
so in passing; it cites 0014 and 0004 as a supersession pair, and a reader who
follows a broken link in 0057 on the way there will not know it is unrelated.
