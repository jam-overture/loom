# Lessons

A course on Loom — the ideas, not the API surface.

The decision records say *what was decided*. The reports say *what happened on a
given day*. Neither is written to teach. These lessons are: each one starts from
a problem you could hit yourself, shows why the obvious solution fails, and only
then shows what Loom does instead.

## How to use this

Read in order. Each lesson assumes the ones before it and nothing else.

Every lesson has the same shape:

| Section | What it is for |
| --- | --- |
| **The problem** | A concrete situation. Read this even if you skim the rest. |
| **The idea** | The concept in plain language, before any code. |
| **In the code** | Where it actually lives, with file paths. |
| **Try it** | Something to run. Predict the output *before* you run it. |
| **It could have been otherwise** | The rejected alternatives, and what they cost. This is where the real understanding is. |
| **Check yourself** | Questions. Answers at the bottom — cover them first. |
| **Deeper** | The decision records and source to read next. |

**The exercises matter more than the prose.** Loom is a system of constraints,
and constraints only become intuitive when you try to violate one and watch the
type checker or a test stop you.

To run an exercise, put the snippet in `src/scratch.test.ts` and run:

```bash
pnpm vitest run src/scratch.test.ts
```

That file is gitignored, so scribble freely.

## The one-paragraph version

If you read nothing else: Loom exists because **AI that writes UI code produces
changes nobody can review, gate, attribute, or undo.** So Loom narrows what AI is
allowed to produce down to a `TreeDelta` — a short, ordered list of discrete
operations against a validated tree. Everything else in the system follows from
protecting that one property.

## Syllabus

### Part I — Foundations

Why the system exists and what its two data structures are.

| # | Lesson | You'll understand |
| --- | --- | --- |
| [01](01-why-a-runtime.md) | Why a runtime, not a code generator | The thesis. What breaks when AI writes code, and what Loom trades away to fix it. |
| [02](02-ui-as-data.md) | UI as data: the tree | Why three node kinds and no more; why text is a node; why there is no `if` in the AST. |
| [03](03-change-as-data.md) | Change as data: the delta | The four operations, why exactly four, and why atomicity is not optional. |
| 04 | Identity: the id that never moves | Why position is derived and identity is minted; what breaks without it. |

### Part II — Making change safe

The machinery that turns "a change was proposed" into "a change was allowed".

| # | Lesson | You'll understand |
| --- | --- | --- |
| 05 | Purity at the seams | Why nothing throws, why the clock is injected, and why that is what makes an audit trail real. |
| 06 | Undo as computation | Inverse deltas. Why undo is a delta and not a snapshot. |
| 07 | Measuring a change | What analysis extracts, and why measurement is separated from judgment. |
| 08 | Two axes: stakes and reversibility | The distinction that a test caught us getting wrong. |
| 09 | The Gate | A rule ladder, not a score. Why order encodes precedence. |
| 10 | The pipeline | Intent → proposal → assessment → disposition → apply, and what each stage may not do. |

### Part III — Talking to a model

| # | Lesson | You'll understand |
| --- | --- | --- |
| 11 | The model seam | Where non-determinism is allowed to enter, and how it is contained. |
| 12 | Projection | Why the model is not shown the AST, and what it is shown instead. |
| 13 | Refusal and repair | One attempt, both halves recorded, and why that is not a loophole. |

### Part IV — Making it real

| # | Lesson | You'll understand |
| --- | --- | --- |
| 14 | Rendering | The tree as a total, pure projection. Why edit mode decorates and never restructures. |
| 15 | Primitives and the registry | What a primitive promises, and what the registry tells the model it may build. |
| 16 | Persistence | The log is the truth; the snapshot is a view you can rebuild. |
| 17 | Telemetry | Closing the loop: how a self-graded confidence number eventually gets calibrated. |

Lessons without links are not written yet. They arrive as the routine covers
them — one lesson per unit of work, alongside the report and the decision
records.

## If you only have twenty minutes

Read [01](01-why-a-runtime.md), then do the exercise in
[03](03-change-as-data.md). Those two together are most of the thesis.
