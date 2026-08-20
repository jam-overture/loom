# 2026-08-20 — Lesson 12: Projection

**Landed:** [`lessons/12-projection.md`](../12-projection.md), the syllabus
link in `lessons/README.md`, Set O in `lessons/review-schedule.md`, and the
three tests + two prose counts in `apps/loom/app/(lessons)/` that hardcoded a
fourteen-set schedule.

`pnpm verify` **green**: 1426 runtime tests across 97 files, 849 app tests
across 77. Nothing skipped, nothing weakened.

## Reader feedback: nothing to address this run

`gh pr list --state open` returned one PR — #112, `Loom docs`'s API-reference
page against `apps/loom/app/(docs)/`. Not this lane. No open lessons PR, no
maintainer comments anywhere on the lessons work landed since #100. The 08-18
report checked the same thing the same way; nothing has arrived since.

## Why a lesson this run rather than machinery

The brief allows alternating once `(lessons)/` exists, which it does. Two
things put a lesson first.

**Lesson 12 has been the next one for four days and the material for it is
maximally settled.** 0004 is `Superseded by 0014` (both dated 07-30, so
07-30 is now 21 days old). 0013 is `Accepted`, 07-29. `schema.ts`, `draft.ts`,
`materialize.ts` and `render.ts` last changed on 07-31; `catalogue.ts` on
08-08. Every file cited moved days ago and nothing on the framework routine's
current work touches them (07-30 was the last live-API smoke test change, the
one that made the guard's second assertion possible in the first place).

**The 08-18 report already outlined 12 in detail** — the grammar-budget
measurement as the spine, 0004→0014 as a "measured and rejected"
alternative, `draftSchemaByteSize` and `GRAMMAR_BUDGET_BYTES` making the
argument executable. That outline held up on rereading, and following it was
the right run to have.

Machinery next run.

## What I emphasised, and why

**The lesson is one word, and it is *projection*.** Not "schema design" and
not "how the interpreter talks to a model". Every place in the system where
a model sees data — the reply schema, the catalogue, the tree outline — is a
projection of a source of truth the model does not get to see, and the three
things share one sentence:

> A projection is a total, deterministic function from a source of truth to
> a view built for one consumer's job — and the source of truth is untouched.

That sentence is what earns 12 its place in the syllabus. Every reader who
has finished Part II has already seen the word — 04 says ids project from a
factory, 09 says the Gate projects a change into a refusal, 10 says the
pipeline projects a change into a disposition — and now it stops being
metaphor: three concrete projections, one file (`render.ts`) with four of
them side by side, one property they all share.

**Predict 1 is the "sketch what schema you would send" trap, and it is the
best trap the material offered.** A reader who has finished 04 and 11 will
write a faithful `LoomNode`-shaped schema in a heartbeat. The two things
that fight the transport are exactly the two things a faithful schema needs
and cannot have: recursion and open objects. Making the reader commit to a
sketch first — and rating their confidence before they see it will not work
— is the calibration mechanism the brief calls the seven principles' hardest
one to run on paper.

**Predict 3 is the one that is *not* about failure at all.** It gives the
reader a Zod registry and asks what to send. Nearly every answer will
include prop *types*. The catalogue deliberately does not; the case for
"names and required, nothing else" runs against the instinct that more
information is better, and it is 0013's rejected-alternative argument turned
back on the reader in one exercise.

**Exercise A is where the lesson pays off, and the depth-5/depth-6 split is
what I wanted a reader to see with their own eyes.**

```
depth 4: 3381 bytes   — passes the offline guard, well under the live boundary
depth 5: 3818 bytes   — FAILS the offline guard, but still under the live boundary
depth 6: 4255 bytes   — over both
```

Depth 5 is a bug you cannot catch offline. If someone raised
`GRAMMAR_BUDGET_BYTES` "just this once" the offline suite would go green and
the ship would look fine, and there is a real chance the live call would
still work — for a while, until the service tightens the number without
warning. That is exactly the case the second assertion in `schema.test.ts`
(`GRAMMAR_BUDGET_BYTES < 4136`) exists for, and lesson 12 has now made the
argument for that assertion visible in one printed table. Nothing about the
guard's design changed here; the lesson turned an existing property of the
codebase into a thing a reader can see.

**Exercise C is the "positions × cost per position" argument as three
numbers.** Three element positions × five prop-union variants = fifteen
tagged schemas each with a `const`, a value type, `required`,
`additionalProperties: false`, and a description. Replacing all fifteen with
one `{"type": "string"}` per position drops the schema from 15,890 bytes to
3,381. The reader arrives at the arithmetic on their own, from two counts
they extract with `.match()`, not from being told it.

**Exercise E is the caching argument as a percentage.** 98.3% common prefix
between two prompts that ask for two different things. That is why the
catalogue leads the message and the utterance trails it — a fact `prompt.ts`
states in a comment and the exercise makes visible in one line of output.

**"It could have been otherwise" leans on the corpus.** Six rejected
alternatives, five of them from decision records (0004, 0013, 0014), one
still on the table (per-primitive schema constrained per call — 0013's
strongest rejection, held for the day telemetry says invalid props are
common). Every rejection has a *measurement or a mechanism* attached; none
are aesthetic.

**Deliberately left thin: repair.** `renderDelta` gets one line pointing at
13; the argument that it is *also* a projection — of a refused proposal, so a
revision has something specific to respond to — is 13's opener. That is the
same discipline 09/10/11 used.

## What the exercises revealed

All five ran via `src/scratch.test.ts`, every line of output in the lesson is
real, the file is deleted. Two things came out of running rather than reading.

**The depth cost is a constant, and the constant is 437 bytes.** I had not
expected this to be so clean. Every extra level adds exactly one copy of an
element sub-schema — object with three properties, a `required` array, and
`additionalProperties: false` — and that comes to 437 bytes on the nose,
five times in a row. The lesson uses this to turn "unroll the schema" from a
handwave into a concrete cost per level, which then makes the "positions ×
cost per position" argument concrete on both sides.

**The outline is 4.9× smaller than the JSON, on the seven-node fixture.**
229 bytes versus 1,111. I had guessed 3–4× and would have committed the
guess; the actual factor is closer to 5 and it is why a lesson can point at
the outline shape as the difference between "the prompt fits" and "the
prompt truncates". The prose in `render.ts` says "a fraction of the tokens";
the exercise makes "a fraction" concrete for one tree.

## Found while teaching

Nothing this run. Every claim the lesson leans on was reachable in code
that has not moved for weeks, every executed exercise matched the codebase
directly, and no decision record contradicts what any file does. The three
findings the 08-18 report filed (0040 table row, 0057 broken link,
`draft.ts` sentence) are all still open and all belong to other lanes.

The `apps/loom/app/(lessons)/` count updates (fourteen → fifteen in two
prose comments, two test constants, one collection length) are in this
lane and shipped as part of this PR — those are not findings, they are
what "Set O is now a set" means for a route group that reads the schedule.

## Needs your input

Nothing blocking. One thing worth a sentence if you have one:

**Set O is the second Part III set** and it is the last one before the
consolidation set (the counterpart to E and M) becomes due. If you would
rather that one arrived on your signal rather than automatically — as with
M — say so; if not, it lands with 13. The 08-18 report asked the same
question and you have not said either way, so I am asking once more with
one lesson remaining before it matters.

## Next

Syllabus order puts **13 — Refusal and repair** next.

Reachable material: `interpreter.ts` (the `interpret → refused → repair`
path, `repairInterpreter`), `prompt.ts` (`buildRepairMessage`), and 0006 for
"one attempt", 0040 for the seven-code taxonomy and its `refused`
distinction. The argument 12 handed to 13 is that `renderDelta` is a
projection of the refused proposal back into the prompt, so a revision is a
response to something specific rather than a second guess at the same
utterance — which is the whole reason "one attempt" is enough.

`interpreter.ts` last moved on 08-12 (§4b's catalogue work). Nothing on the
framework routine's open work reaches into repair. 0006 is `Accepted`
(07-27), 0040 is `Accepted` (08-04). All settled.

Two cautions for that run. First, 13 is where the "repair is a delta, not
an argument" line has to be drawn against 06's undo-as-computation, and
they are neighbours on the shelf but different in the way that matters:
repair is a *fresh* proposal, undo is an *inverse* — the vocabulary
overlaps and the reader has to hear the split. Second, 13 will land on the
question of `ChangeRepairer` as a *separate interface* rather than a
method on `ChangeInterpreter` — 11 handed that argument forward as "a
capability that arrives by accident is one nobody decided to grant", and
13 will use lesson 10's `repairer` field on `CompositionRuntime` to make
"structurally optional" concrete.
