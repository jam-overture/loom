# Lessons

A course on Loom — the ideas, not the API surface.

The decision records say *what was decided*. The reports say *what happened on a
given day*. Neither is written to teach. These lessons are.

## How these are built, and why it will feel harder than it should

These lessons follow the findings in *Make It Stick* (Brown, Roediger &
McDaniel). That has real consequences for how they read, and the most important
one is this:

> **Rereading a clear explanation is the most popular study method and one of the
> least effective.** It produces fluency — the text feels familiar, so you feel
> like you know it — without producing durable memory. The feeling of ease is the
> problem, not the evidence.

So these lessons deliberately make things harder in specific ways. Each is a
*desirable difficulty*: it slows you down now and is why you still have it in six
months.

| Principle | What you'll notice | Why |
| --- | --- | --- |
| **Generation** | Every lesson asks you to answer *before* it explains | Attempting and failing first primes the explanation. Being wrong is the mechanism, not a waste of time. |
| **Retrieval practice** | Frequent recall from memory, closed-book | Retrieving strengthens memory far more than re-reading. Every act of recall reconsolidates. |
| **Spacing** | Lessons revisit older material after a delay | Some forgetting between sessions is what makes the next retrieval effortful, and effortful retrieval is what sticks. |
| **Interleaving** | Warm-ups mix topics rather than drilling one | Mixed practice is slower and feels worse, and produces better discrimination between concepts. |
| **Elaboration** | Prompts to restate in your own words and link to your own experience | Connecting new material to existing knowledge is what makes it retrievable later. |
| **Calibration** | Rate your confidence *before* revealing each answer | Your sense of what you know is unreliable. Calibrating it against feedback is the fix. |
| **Reflection** | End-of-lesson review questions | Reflection is retrieval plus elaboration; it is where the mental model consolidates. |

**Two rules that matter more than anything else here:**

1. **Write your answers down before revealing them.** Thinking "I know roughly
   what this is" is the fluency illusion talking. Writing forces actual
   retrieval.
2. **Do not reread a lesson you found hard.** Do the retrieval questions again
   instead, from memory, and only then look back at the part you missed.

## Lesson structure

| Section | What it is for |
| --- | --- |
| **Warm-up** | Closed-book recall from *earlier* lessons. Interleaved on purpose. |
| **Predict** | A question you attempt before any instruction. Expect to be wrong. |
| **The problem** | The concrete situation the idea exists to solve. |
| **The idea** | The explanation — read only after you have attempted Predict. |
| **In the code** | Where it actually lives. |
| **Try it** | Run something. Predict each output first, in writing. |
| **It could have been otherwise** | Rejected alternatives and their cost. |
| **Explain it back** | Elaboration prompts. Say it in your own words. |
| **Self-check** | Retrieval, with a confidence rating before each answer. |
| **Reflect** | What surprised you; what you'd now do differently. |
| **Come back to this** | When to revisit, per the review schedule. |

Running the exercises: put the snippet in `src/scratch.test.ts` and run

```bash
pnpm vitest run src/scratch.test.ts
```

That file is gitignored, so scribble freely.

Every exercise in these lessons was executed before it was written down. That
used to be a promise; it is now a build step. Each Try it section is compiled
and run against `src/` whenever this course is built, so a lesson whose
exercises have stopped working is a failing test naming the lesson — and the
outputs shown at `/lessons` are that run's, not a transcript somebody typed up.

## The spaced review schedule

[`review-schedule.md`](review-schedule.md) is the spacing machinery: cumulative,
interleaved retrieval sets to do at 2 days, 1 week, and 1 month after a lesson.

It is the highest-value part of this course and the easiest to skip. Ten minutes
of closed-book recall a week after a lesson will do more for you than rereading
all four parts.

## Where to actually do it: `/lessons`

The schedule above asks you to work out what is due, to keep a table of what you
have done, and to hold your confidence rating in your head until after you have
checked. That is three pieces of bookkeeping standing between you and ten
minutes of recall, and bookkeeping is what does not get done.

So the course also runs as a surface — `/lessons` in the Loom application — and
what it adds is only the part paper cannot do:

- **What is due today**, computed from the days you actually worked through each
  lesson. One sitting is offered at a time; a backlog is listed second and said
  out loud to be massed practice.
- **Rate, then write, then check.** A set runs one question at a time. The
  confidence rating is taken before anything is revealed, the answer box comes
  after it, and where to look comes only after you have written something. No
  answer is ever shown next to its question — the sets have no printed answers,
  and going to get one is another retrieval.
- **Confident and wrong**, counted. That pair is the study plan, and it is
  unmeasurable on paper because the rating is gone by the time you know.
- **The questions you missed, coming back.** Not as a list to look at — as the
  same question, asked again a day later, a week after you get it, and a month
  after that. Three clean retrievals retire one; missing it once sends it back
  to the start. This is the schedule's own instruction after a miss, which is
  the hardest thing in this document to do by hand and the easiest to drop. It
  draws on the lessons' own Warm-up and Self-check questions as well as the
  review sets, so a question you got wrong on the way through lesson 09 comes
  back beside one from Set D and does not announce which is which — and a
  prediction you were **sure** about and wrong about comes back too, because
  that is a belief rather than a gap.

The lessons themselves run there too, at `/lessons/04` and so on, and reading
one there differs from reading the file in exactly three ways — all of them
things this document asks you to do and cannot check:

- **The lesson does not exist until your predictions are written.** Everything
  below Predict is the answer to Predict, and on the page below it is one scroll
  away. There it unlocks when the last prediction is committed, one question at
  a time, with the rating taken before you have read a word of the explanation.
- **The printed answers are locked, and they have moved.** Lessons 01–11 end
  with an `## Answers` section; the exercise half now stands under Try it and
  the Self-check half under Self-check, each shut until the questions above it
  have been attempted. Closer, and further away.
- **Your predictions come back at Reflect**, verbatim, carrying the confidence
  you gave them beforehand — which is what makes "which were you most
  confidently wrong about" a question with an answer rather than a memory of
  one.
- **The exercises have already run, and you cannot see what they printed.**
  Every fence in Try it that prints something takes a prediction first, one at a
  time, and every transcript appears at once when the last one is committed —
  because this section asks you to predict every output before running anything,
  and revealing them one by one would make each prediction easier than the last.
  What appears is the output of that code executed against `src/` when the page
  was built. The paste-into-a-checkout route still works and is still worth it
  if you want to change something and see what happens; what it is no longer for
  is finding out what the printed answer was.

**The markdown here stays the source.** The surface reads these files; a lesson
is still written, reviewed and versioned as text in this directory. Reading it
here is reading the same words with none of that enforced, which is fine — it is
the version you can read on a train, and the honour system is the cost.

## The one-paragraph version

Read this *after* lesson 01, not before — it is a summary, and summaries are
for consolidating something you have already worked through.

<details>
<summary>Reveal</summary>

Loom exists because **AI that writes UI code produces changes nobody can review,
gate, attribute, or undo.** So Loom narrows what AI may produce down to a
`TreeDelta` — a short, ordered list of discrete operations against a validated
tree. Everything else in the system follows from protecting that one property.

</details>

## Syllabus

### Part I — Foundations

| # | Lesson | You'll understand |
| --- | --- | --- |
| [01](01-why-a-runtime.md) | Why a runtime, not a code generator | The thesis. What breaks when AI writes code, and what Loom trades away to fix it. |
| [02](02-ui-as-data.md) | UI as data: the tree | Why three node kinds and no more; why text is a node; why there is no `if` in the AST. |
| [03](03-change-as-data.md) | Change as data: the delta | The four operations, why exactly four, and why atomicity is not optional. |
| [04](04-identity.md) | Identity: the id that never moves | Why position is derived and identity is minted; what breaks without it. |

### Part II — Making change safe

| # | Lesson | You'll understand |
| --- | --- | --- |
| [05](05-purity-at-the-seams.md) | Purity at the seams | Why nothing throws, why the clock is injected, and why that is what makes an audit trail real. |
| [06](06-undo-as-computation.md) | Undo as computation | Inverse deltas. Why undo is a delta and not a snapshot. |
| [07](07-measuring-a-change.md) | Measuring a change | What analysis extracts, and why measurement is separated from judgment. |
| [08](08-two-axes.md) | Two axes: stakes and reversibility | The distinction that a test caught us getting wrong. |
| [09](09-the-gate.md) | The Gate | A rule ladder, not a score. Why order encodes precedence. |
| [10](10-the-pipeline.md) | The pipeline | Intent → proposal → assessment → disposition → apply — and what it means that the sequence can stop halfway. |

### Part III — Talking to a model

| # | Lesson | You'll understand |
| --- | --- | --- |
| [11](11-the-model-seam.md) | The model seam | Where non-determinism enters, and how it is contained. |
| [12](12-projection.md) | Projection | Why the model is not shown the AST, and what it is shown instead. |
| [13](13-refusal-and-repair.md) | Refusal and repair | One attempt, both halves recorded, and why that is not a loophole. |

### Part IV — Making it real

| # | Lesson | You'll understand |
| --- | --- | --- |
| [14](14-rendering.md) | Rendering | The tree as a total, pure projection — and why "total" is not the same discipline as `Result`. |
| [15](15-primitives-and-the-registry.md) | Primitives and the registry | What a primitive promises, who checks each half of it, and what the model is told it may build. |
| [16](16-persistence.md) | Persistence | The log is the truth; the snapshot is a view you can rebuild — and the audit is what it costs to keep one. |
| [17](17-telemetry.md) | Telemetry | How a self-graded confidence number eventually gets calibrated — and why the thing that measures it is not allowed to act on it. |

### Part V — What the tree cannot hold

| # | Lesson | You'll understand |
| --- | --- | --- |
| [18](18-data.md) | Data: the question the tree asks | Why an answer may never be in the tree, what a page stops being a function of, and what a reviewer's approval covers once it covers a question. |

Parts I to IV are the system, and the [review
schedule](review-schedule.md) is where those seventeen ideas become one thing you
can hold at once. Part V is what came after the system was whole: places where a
tree names something a deployment owns and holds none of it. It has one lesson in
it, and how far it runs is an open question — a submission's destination and a
frame's origin are the same shape as a binding, and whether they are lessons is a
decision for whoever is learning this, not for whoever is writing it down.

## Pacing

One lesson per sitting, then stop. Two lessons back to back is massed practice —
it feels efficient and is the weakest way to spend the time. The gap between
sittings is doing work.
