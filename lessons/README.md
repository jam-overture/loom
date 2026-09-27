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

**And since 23 September a sentence can be checked too, where it is counting
something.** A lesson that says *the Gate is eight rules in a fixed order* is
making a claim about a list in `src/`, and the course now holds every such
phrase against the list that settles it — every occurrence of it, across the
lessons and this schedule, because an interleaved course repeats a count on
purpose. That check exists because lesson 09 said "six" for a week after there
were seven, and then "seven" for a week after there were eight, with every
exercise in it passing on both occasions.

**And since 24 September the `## Answers` sections are held the same way.** The
transcript check used to read a lesson's **Try it** section only; lessons 01 to
11 print their outputs under `## Answers` instead, and nothing had ever compared
those — fifty blocks across eight lessons, under a heading the reader is meant to
reach last, which is a good description of where a wrong line can sit for a long
time. Lesson 05 is what it cost, and that story is [in the lesson
itself](05-purity-at-the-seams.md#what-this-lesson-got-wrong-and-for-how-long)
rather than here, because it is the better half of what that lesson now teaches.

**And since 26 September a type printed in a lesson is held against the
declaration it claims to be.** A fence that opens `export type MarkedHolds = {`
is not making a claim about the code, it *is* the code, quoted — so the second
copy was already there and nobody had written the comparison. Each fence is held
to every member it names, and a fence that prints a declaration *whole* is held
to it staying whole, which is read off the fence rather than declared beside it.
That check was written because of lesson 11: it printed the network boundary
taking one argument for six days after [0140] gave it a second one, in the lesson
whose subject is that boundary, with every exercise in it green — because an
exercise calls the seam through a double and a double satisfies both signatures.
The paragraph that used to sit here named exactly that fault as the kind nothing
would reach.

Two things it still does not reach, said here rather than discovered later. A
count is the cheapest second copy a sentence can carry and **most of what a
lesson says carries none** — rungs numbered one too low, and an argument about
which of two places a guarantee lives in, are prose about the code and neither is
a count, a transcript or a declaration. Lesson 05's was wrong for seven weeks in
a file two other checks were passing over every day. If you find one, it will be
by reading.

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
- **The printed answers are not there.** Lessons 01–11 end with an `## Answers`
  section; the exercise half now stands under Try it and the Self-check half
  under Self-check, and neither is *in* the page — each is fetched from its own
  address when the questions above it have been attempted. Closer, and further
  away.
- **Your predictions come back at Reflect**, verbatim, carrying the confidence
  you gave them beforehand — which is what makes "which were you most
  confidently wrong about" a question with an answer rather than a memory of
  one.
- **The exercises have already run, and what they printed is not in the page.**
  Every fence in Try it that prints something takes a prediction first, one at a
  time, and every transcript appears at once when the last one is committed —
  because this section asks you to predict every output before running anything,
  and revealing them one by one would make each prediction easier than the last.
  What appears is the output of that code executed against `src/` when the page
  was built. The output the lesson prints for itself, in the fence a line under
  "predict what this prints", is held with them. The paste-into-a-checkout route
  still works and is still worth it if you want to change something and see what
  happens; what it is no longer for is finding out what the printed answer was.

**What "not in the page" means, and what it does not.** A lock that decides what
to draw is a lock on your attention, and your attention is the thing the honour
system already governs — an answer rendered and hidden is one `Ctrl-U` away, in
the same document, searchable. So the three things above are absent from the
page and fetched when they are earned. This is not secrecy and cannot be: the
addresses are guessable and every answer is in this directory, which you own.
It is the standard the review sets have always met — *nothing you have not
earned is in the document you are reading, and going to get it is a deliberate
act.* The explanation under Predict is the one thing still shipped with the page
and merely held back, because an explanation is not an answer and is a scroll
away in the markdown regardless.

**The markdown here stays the source.** The surface reads these files; a lesson
is still written, reviewed and versioned as text in this directory. Reading it
here is reading the same words with none of that enforced, which is fine — it is
the version you can read on a train, and the honour system is the cost.

**Your record is yours, and that means keeping it is yours too.** Everything the
surface computes — what is due, which questions come back, how often you were
sure and wrong — comes from one value stored in your browser and sent nowhere.
So clearing site data deletes it, and a second machine starts from zero. There is
a page for that: `/lessons/record` saves the record as a file and merges one
back in — later answers win, a lesson
keeps the earlier day you did it, re-answers add up rather than overwrite, and
importing the same file twice does nothing the second time. Save a copy the day
you have something worth losing.

**And it now says when it has no record, rather than answering as though it
had one.** An empty record used to mean four things and produce one sentence:
you are new here; your record is on your other machine; this browser will not
store anything, so nothing you do today survives the tab; or something is stored
under that key and nothing could read it. The first is a fact about you and the
other three are the page having no way to find out — which is the distinction
lessons 24 and 26 are about, one floor down from where they teach it. So the
read reports which of them it is: the queue says *nothing is scheduled* instead
of *you are up to date*, a browser that will not keep anything says so before
you spend the ten minutes rather than after, and a stored value that could not
be read is handed back to you and **not written over**, because it is the only
copy and the page is in no position to decide it is worthless.

**The queue of questions coming back now does the same thing, and it turned out
to be seven readings rather than four.** *Nothing has come back* was the answer
to a reader who had never opened the course, to a reader whose record is on
another machine, to a reader who had missed three predictions and rated every
one of them a 2 — which is the Predict section working exactly as this document
says it should — and to a reader who had taken every miss they ever made up to
three clean retrievals across a month, which is the hardest thing this course
asks for and was being reported as a blank. They are separate because what you
should do next is separate in each, which is
[0169](../decisions/0169-a-declaration-is-what-makes-a-value-a-missing-word.md)'s
rule and [lesson 24](24-silence.md)'s subject, applied to the page that teaches
it. The seventh is not a state at all: a question you missed can name something
the course no longer contains, because a set gets reworded and your record in
your browser has no way of hearing about it — and that was being dropped in
silence and counted as a clean sheet. It now says so, on the review queue as
well as here, because a fault has to appear where you already are.

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
| [05](05-purity-at-the-seams.md) | Purity at the seams | Why nothing throws, why the clock is injected, why that is what makes an audit trail real — and how to tell an obligation from a guarantee when both are written in the same sentence. |
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
| [18](18-data.md) | Data: the question the tree asks | Why an answer may never be in the tree, what a page stops being a function of, what a reviewer's approval covers once it covers a question — and what it meant that one of the seven named ways a question goes unanswered sat in the list for a month with nothing able to produce it. |
| [19](19-destinations.md) | Destinations: the address the tree never holds | Why validating a form action is the wrong shape of answer; why a binding may carry AI-authored params and a submission may not; and why moving a form's destination is held whoever asked. |
| [20](20-origins.md) | Origins: whose document runs inside your page | Why the URL stays in the tree and the origins do not; why this seam has no plan and no resolve step; and why a sandbox is reported for a frame that worked. |
| [21](21-appearance.md) | Appearance: the look a tree names and cannot check | Why a model may not write a colour and the reason has nothing to do with colour; why there is no default theme; and where a property belonging to no single party can possibly be checked. |
| [22](22-reach.md) | Reach: the fault that belongs to two nodes | Why a page can be valid node by node and broken as a whole; what a primitive is allowed to declare about itself and what it is not; and the one thing the Gate refuses for being wrong rather than for being consequential. |
| [23](23-anchors.md) | Anchors: the name a page gives a place inside itself | Why the one link a page could not make was the one pointing at itself; which of the three questions a name raises a per-node schema can answer, and why the other two decided the design; and what it costs when a check is correct, tested, and reaches nothing. |
| [24](24-silence.md) | Silence: what a system says when nobody has told it | Why the words a page shows are knowable by exactly one party; what a reading owes a caller about the primitives that have not spoken yet, what shape an answer needs in order to say it and what decides how many fields that shape has; why replacing a correct guess with an authoritative source is a regression until the authority has been told — and what it meant that the seam built to stop a missing word going silent did exactly that, in a case its own lesson printed. |
| [25](25-exhaustiveness.md) | Exhaustiveness: the one question of three a compiler answers | Why "this union is handled everywhere" is three different claims and a compiler checks one of them; where to put a list so that making it incomplete is a build failure rather than a habit; why a test that restates the value it is testing is a second copy with a tick beside it — and what was still wrong after the repository read this lesson and fixed the list. |
| [26](26-liveness.md) | Liveness: what a queue of changes cannot say about itself | Why a list assembled from one store cannot be judged without a second one, and why the field you want to add is the wrong half of the comparison; why the obvious `>` is wrong and which authority settles it; and what a third answer buys over the friendlier of the two you already have. |
| [27](27-scale.md) | Scale: the fact a sibling holds and a renderer may not reach | Why a container cannot read its own children and what the obvious way round it spends; what you inherit when you hand a computation to a different machine, and which ordinary chart features that machine's data model forbids; why the number the whole design was built to deliver is computed by nobody and is not supposed to be — and what it costs that a record's argument for authoring it is implemented as an optional prop with a default. |
| [28](28-corroboration.md) | Corroboration: the claim that exists only once | What a check actually is, and why that rules out most of what a repository writes down; the three places a second copy of a fact can come from and what each one costs; why a bare citation cannot be held to its own meaning and a linked one can — and what you take on the moment you manufacture a second copy, given that the bill goes to somebody who has never read your file. |
| [29](29-readership.md) | Readership: the declaration with more than one reader | Why the registry can hold four of a primitive's declarations against its props schema and cannot hold the schema against its own component; what property a dropped slot has that an unread prop does not, and what that rules out for any check built on watching output; how to make a read observable, and why the seven suspects that turns up include no defects and one security boundary working exactly as designed — and what it means that *does the component read this* was a question about the wrong party. |

Parts I to IV are the system, and the [review
schedule](review-schedule.md) is where those seventeen ideas become one thing you
can hold at once. Part V is what came after the system was whole: places where a
tree names something a deployment owns and holds none of it. After two lessons
the shape looked stateable — *a name in the tree, an address in a registry,
resolved before the walk* — and lesson 20 is the third instance, which breaks two
of those three clauses and keeps the middle one. That is the more useful thing to
have learned than the pattern would have been: which clause was load-bearing, and
which two were two examples agreeing.

Lesson 21 then satisfies all three clauses exactly, having been built before any
of the three seams that produced them — so the pattern has now survived being
broken once and confirmed once, which is more than four confirmations would have
told you. What lesson 21 adds is a second question the first three never raised:
where do you check a property that belongs to *no single party* — not the tree,
not the registry, not the primitive?

Lesson 22 is that question followed rather than the pattern followed, and it is
where the pattern stops being the interesting thing: there is no document in a
registry and nothing to resolve, because the property belongs to **two nodes**
and neither can state it. What the registry holds is a predicate; what it is
applied to is a pair; and the declaration that makes the pair visible is a claim
that can be false — which, as the lesson's sixth exercise finds by running two
decision records against each other, it currently is.

Lesson 23 took that instruction — find another fact that exists only between two
things — and found one where both ends are in the tree and nothing is registered
at all. What makes it a Part V seam is not a missing document but a **scope**: an
anchor has to be unique in a whole document, and the document includes a host
page the runtime cannot see. So the pattern the first four lessons agreed on is
now the minority reading, and the question to carry into a seventh seam is
lesson 23's rather than lesson 22's: *what is the scope of the thing you just
named, and is the checker allowed to see all of it?*

Lesson 24 answers that question in a way the first six could not, and it is why
Part V keeps going. The scope is one node; the reader can see all of it; and it
still cannot answer, because what is missing is not a piece of the tree but the
knowledge of what a piece of the tree *is*. That moves Part V off "a checker that
cannot see enough" and onto a second axis — a checker that sees everything and
cannot interpret it. It also moves the design question off the declaration
itself and onto **the party that has not made one yet**, which on the day a seam
ships is every party there is.

Lesson 24 then got a second half from the repository, in the same way lesson 25
did and for a sharper reason. Its exercise C printed a reading in which two rules
this lesson had just spent four sections defending — *never coerce a value the
component owns the formatting of*, and *a declaration is believed about what it
leaves out* — composed into a figure that left `words` and arrived nowhere, under
an `unread: none` that positively asserts there is nothing more to say. The one
seam in the repository whose return shape exists to stop a missing word going
silent was doing it. The lesson filed that on 13 September and
[0169](../decisions/0169-a-declaration-is-what-makes-a-value-a-missing-word.md)
closed it on 18 September with a third field, `unspoken`, having rejected the
one-line version that would have folded it into the list already there.

So the lesson now teaches something it could not have taught when it was written:
not that an answer should be able to say *I cannot tell you*, which is where it
started, but **how many ways an answer needs to be able to say it** — one field
per thing a reading can fail at, where "distinct" is settled by whether the
caller would do a different thing about it, not by whether the two failures
sound alike. The rest of the story is the part worth keeping: the seam had been
wrong since the day it shipped, its test suite was green, the test for this exact
case asserted the one field that looked right, and what found it was writing the
worked example out and reading what it printed.

Lesson 25 turns that question on the checker every one of the first seven took
for granted, which is the compiler — and finds a third axis. It sees everything,
interprets it exactly, and answers a narrower question than the one in the
reader's head: *is every member of this union handled* is checked, *is every
member listed* is not, and *can every member happen* is not checkable at all.
What makes it survive is that a question the compiler was never asked and a
question it answered yes produce the same output, which is none. So Part V's
seams are no longer only about facts somebody else owns: this one is a fact
nobody owns, and the remedy is not a declaration but a *place to put a claim
where getting it wrong is an event*.

The lesson then got its second half from the repository rather than from its
author. Written on 15 September against a list nothing checked, it was read by
the runtime lane, and the list was fixed two days later with the strongest
mechanism the lesson describes. The fault the list was found by **survived the
fix** — a level a scale cannot place still ranks beneath the bottom of it,
because the fault was never in the list. So the lesson now ends somewhere more
useful than it began: a check is bounded by the population of values that pass
through the place it runs, and *a remedy that closes the route you found the
fault by is not a remedy for the fault*.

Lesson 26 is the third kind, and it is the one the first eight make look
impossible: a fact that **two** parties own, both of them inside Loom, both
correct, both willing to answer. A hold records the revision it was judged
against; a tree records the revision it is at. Neither is missing anything, and
neither may read the other, because a store handle is a scope (0020) — so the
fact that decides whether a waiting change can still be applied lives in neither
store, and the review queue the documentation tells you to build lists dead
changes and live ones indistinguishably. Nothing needs declaring here. The remedy
is a *function*, and the design question moves to who is allowed to hold two
stores next to each other — and what they are obliged to say when they could only
reach one of them.

Lesson 27 is the one that breaks the family resemblance, and it is why Part V is
worth continuing past a system that is whole. Every seam above is a fact that
lives somewhere Loom cannot reach. This one is six numbers in one array, one
level below the node that needs them, in the same render, in front of the same
reader — and the container still cannot have it, because a render is a total pure
projection of **one node** (0008) and a container receives its children already
drawn. Nothing is missing, nothing is undeclared, nobody else owns anything. The
obstacle is a promise the system made about itself.

So the remedy is not to reach further. It is to hand the work to a **different
machine** — the browser's layout engine, which is allowed to look at more than
one box — and then to live inside that machine's data model, which carries a
scalar that every child inherits identically and therefore forbids a rank, an
index, or *draw the tallest one differently*. That is the general thing to take:
a constraint you chose is still a constraint, and the cost of keeping it gets
paid somewhere you did not pick.

And then the turn the lesson is really for. After all of that, **the number the
chart actually needed is computed by nobody**, because where an axis stops is an
argument the author is making rather than a measurement anyone can take. Deciding
*can this be worked out* and deciding *should it be* come apart here, and a
default is what you get when the second question is never asked out loud: the
record argues that stating the ceiling is a feature, the schema says `max?`, and
exercise D plots four quarters of revenue against the percentage ceiling nobody
set — four correct figures over four invisible bars, with the render, the
validator and the Gate all saying yes.

Lesson 28 is the answer to the question lesson 27 ended on, and it turns out not
to be about decision records. Every seam above is a checker that cannot reach
something: a scope it may not see, a meaning it cannot interpret, a narrower
question than the one asked, a second store, one level down. This one has no
obstacle at all. The checker holds the whole file, understands every character,
and is asked exactly the right question — *is this record true* — which has no
second operand. **A check is a comparison, and a unique thing has nothing to be
compared to.** So the remedy is never to check harder but to arrange for a second
copy to exist, and the three ways of doing that — derive it, write it twice in a
form that can disagree, register it by hand — are in that order for a reason the
lesson makes the reader work out.

Its second half is the one that goes furthest outside this repository, and the
course found it in its own exercises. **A second copy is not free and it is not
yours.** Writing one down makes a claim checkable and makes it somebody's to keep
true, and that somebody is whoever next moves the original — normally a person
with no idea the copy exists. Three of this course's lessons have been edited
from outside this lane for exactly that reason. It is why derivation wins: not
because it catches more, but because it is the only one of the three whose
obligation is discharged by a program rather than by somebody remembering.

Lesson 29 took that instruction literally — go and find a fact this repository
already writes twice and has never compared — and found one in the most ordinary
place there is. A primitive declares which props it accepts; its component reads
props out of a bag; 0009 states the invariant between them in a clause of its
Decision section, and nothing compares the two. The seam is not that nobody got
round to it. **Every promise the conformance audit can check is one whose keeping
shows up in what the component returned**, and reading a prop produces no output,
so a checker built on watching output cannot see this one however hard it looks. A
`Proxy` can, which makes the remedy a third kind: not reaching further and not
manufacturing a second copy, but instrumenting a place.

And then the part that makes it a lesson rather than a check. Run it and seven
declared props come back unread — of which six are the *population* the probe can
derive (lesson 25's rule, third instance) and the seventh is a URL its component is
forbidden to read, because 0095 gave it to the frame seam. The instrument answered
correctly and found nothing, because the question named one reader as *the* reader
and a props schema has six. So the question to carry forward is not lesson 28's
*where is the second copy* but **who is this declaration for** — and when its
audiences live in packages you cannot see, the honest deliverable is a list of
candidates for a person to classify rather than a gate.

## Pacing

One lesson per sitting, then stop. Two lessons back to back is massed practice —
it feels efficient and is the weakest way to spend the time. The gap between
sittings is doing work.
