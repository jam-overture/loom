# Review schedule

The spacing and interleaving machinery. This is the highest-value part of the
course and the easiest to skip.

## Why this exists

Rereading a lesson produces fluency without memory. Retrieving it from memory
after you have partly forgotten it produces memory. That is the whole finding,
and it means **the gap is not wasted time — the gap is the mechanism.**

Two consequences that feel wrong and are right:

- **Some forgetting is good.** If recall is effortless, the retrieval did little.
  Struggling to remember, and then getting there, is the productive case.
- **Mixed sets beat blocked sets.** Reviewing tree questions *and* delta
  questions *and* Gate questions together performs worse in the session and
  better a month later, because you practise telling them apart rather than
  running on context.

## How to use it

For each set: closed book, written answers, then check. Ten minutes.

Rate each answer **1–5 for confidence before you check it.** Track where you were
confident and wrong — that combination, not simple ignorance, is what quietly
breaks understanding later.

If you miss something: **do not reread the lesson.** Look up only the specific
point, then re-answer that question from memory a day later.

---

## Set A — two days after lesson 01

1. Name the four questions a text diff cannot answer.
2. What single property does the rest of Loom exist to protect?
3. What does Loom trade away, and what does it buy?

## Set B — two days after lesson 02

Interleaved with 01.

1. Why is text a node rather than a prop?
2. Why is there no conditional node? Derive it from lesson 01's thesis.
3. Why was "whole replacement tree" rejected? *(01)*
4. What does an id tell you about a node's position?

## Set C — two days after lesson 03

Interleaved with 01–02.

1. The four operations, with arguments, from memory.
2. Why is a half-applied delta worse than a rejected one?
3. What does `baseRevision` protect against?
4. Why is `slot` a distinct kind? *(02)*
5. Loom cannot build a carousel unless one is registered. Bug, limitation, or the
   point? *(01)*

## Set D — two days after lesson 04

Interleaved with 01–03. Six questions from four lessons; the mixing is the
exercise, not an accident of scheduling.

1. Which of the four operations mints a node id, and why exactly that set?
2. You stored a positional address for a node. Someone inserts a sibling above
   it. What does your address resolve to now, and — the part that matters —
   what do you *observe* when it happens?
3. Why is a half-applied delta worse than a rejected one? *(03)*
4. Text is a node rather than a prop. Say what that decision and this lesson's
   have in common. *(02)*
5. Give the reason a model may not name the nodes it inserts, without using the
   word "trust".
6. What single property does the rest of the system exist to protect? *(01)*

---

## Set E — one week after Part I

The consolidation set. Do this one out loud, to a person or a recording — spoken
explanation is retrieval plus elaboration, and it exposes gaps that written
notes let you skate over.

Part I ends at lesson 04, so this set and Set F are now live rather than
aspirational: one week after you finish 04, do this one.

1. Explain Loom's thesis in four sentences, defining any jargon as you use it.
2. Derive the three node kinds from the thesis. Why not four? Why not two?
3. Derive the four operations from the thesis. Why not five?
4. A colleague proposes adding a `replaceSubtree` operation "for efficiency."
   Argue against it using only what you know, then argue *for* it as strongly as
   you can.
5. Derive stable identity from the delta's ordering guarantee — show that
   "each operation sees the last one's effect" is unwritable without it.
6. Write the fixture tree from memory, then a delta that moves the card into the
   header, then say what its inverse would have to contain — including which
   ids appear in it, and why they are the ones they are.

Question 6 reaches into lesson 06, which you have not read. Attempt it anyway —
generation before instruction is the point, and it will make lesson 06 land
harder.

---

## Set F — one month after Part I

Closed book, no notes, 20 minutes. This is the one that tells you whether it
stuck.

1. Rebuild the whole argument from scratch: problem, thesis, tree, delta,
   identity. Write it as if for a new engineer.
2. What is the weakest point in the design as you understand it? Where would you
   push?
3. Redo the "Try it" exercises in lessons 03 and 04 from memory — predict every
   output before running.

Then read your Predict answers from lesson 01. The gap between those and what
you can now write is the actual measure of the course.

---

## Set G — two days after lesson 05

Sets are listed by lesson, not by date. At a normal pace this one falls between
E and F on the calendar despite sitting after both on the page — go by the
heading, not by the order.

Interleaved with 01–04. Note that this set is not in lesson order and is not
meant to be: answering a Part II question, then a lesson 02 question, then a
question that needs both is the discrimination practice. Working through it
lesson by lesson would be easier and worth less.

1. `CompositionRuntime` has five required fields. State the property that puts
   something on that list, then name one thing the pipeline calls that fails the
   test — and say why including it anyway would cost something.
2. There is no rollback anywhere in `applyDelta`. Explain why atomicity is free,
   and name the property from *(03)* you are leaning on to say so.
3. Why is `slot` a distinct node kind? *(02)*
4. Loom throws deliberately in two places. Give the rule that distinguishes them,
   not the two places.
5. A stale reference under paths resolves; a stale reference under ids does not.
   Which is more expensive, and why is it the one that looks cheaper? *(04)*
6. A model may not name the nodes it inserts. Give that reason first, then say
   what the `IdFactory` being an injected *seam* adds that the rule alone does
   not. *(04)*

Question 6 is the one to be honest with yourself about. The two halves are
different arguments — one is about what a proposal can express, the other about
what a replay can reproduce — and running them together is the most common way
this pair gets half-learned.

---

## Set H — two days after lesson 06

Interleaved with 01–05, and deliberately front-loaded with two questions that
need material from two lessons at once. Those are the ones that tell you whether
you have a model or a pile of facts.

1. A `move` sends the first of three siblings to the end of the same parent.
   Give the index the operation carries *(03)*, then give the index its inverse
   carries. The inverse's index is found by looking the node up in a child list
   that still contains it, and then used against a list that will not. Say why
   that is nevertheless always the right number.
2. Undoing a `remove` costs something undoing an `insert` does not. Say what,
   then name the two things — and it is exactly two — that can make a change
   irreversible, and say which of them that cost is responsible for.
3. Name the property that puts a field on `CompositionRuntime`. Apply it to
   `invertDelta` and say what the answer means for re-running a Gate decision
   from last Tuesday. *(05)*
4. Undoing revision 3 produces revision 4. Give the argument, then give the
   strongest argument against it that you can.
5. Why is text a node rather than a prop? *(02)*
6. An inversion succeeded. Name something it has proved about the original
   delta, other than that the delta can be undone.
7. A node was removed and rebuilt identically, then forced onto the original's
   id. Same node? *(04)*

Question 1 is the one to be slowest on. Both numbers are correct and they are
usually not equal, and the third part is the one that separates knowing the rule
from knowing why it holds — which is the state in which people write naive
inversions.

---

## Set I — two days after lesson 07

Interleaved with 01–06. Half of these are discrimination questions — two things
that look alike and are not — because that is the shape lesson 07's material
fails in. Answer them in the order printed.

1. Give the three counting rules — insert, remove, move — and then the one
   sentence all three follow from. If you can give the rules and not the
   sentence, you have the surface.
2. `analyzeDelta` takes a tree and a delta. `assessStakes` takes an analysis and
   a policy. Neither takes both. Say what that symmetry buys a person reading a
   year of records, and name what it costs at runtime.
3. Two failures, both `Result`s, both from the assessment step: a delta naming a
   node that is not there, and a change the Gate refused. Say which is which in
   the journal and what a monthly report loses by adding them. *(05)*
4. Three functions walk a delta forwards, applying as they go. Name them, name
   the lesson-03 property that forces it, and say what each would get wrong
   walking backwards. *(03, 06)*
5. A model may not name the nodes it inserts. Give the reason without the word
   "trust". *(04)*
6. Undoing a `remove` costs something undoing an `insert` does not. Say what, and
   then say which field of `ChangeAnalysis` is the one a retention budget reads.
   *(06)*
7. Why is there no conditional node? *(02)*

Question 4 is the spacing payoff and the one to do out loud. You have met that
loop in three lessons and three files; if you can only name it in the file you
met it in most recently, the interleaving has not happened yet and this set is
the place to make it.

---

## Set J — two days after lesson 08

Interleaved with 01–07. This set is built around a single failure mode:
**assuming that two things which read the same input must be the same thing.**
Four of the seven questions are that shape in different costumes, and they are
deliberately not adjacent.

1. Give the test for whether two axes are really two, then apply it to `stakes`
   and `reversibility` and name the two `ChangeAnalysis` fields they both read.
2. A delta removes 2 nodes. Write down a policy under which its stakes are `low`
   and it is irreversible, and a second policy under which its stakes are
   `medium` and it is reversible. Actual field names and values.
3. `nodePath` is recomputed on every call and nothing caches it; lesson 07
   rejected recording the whole `ChangeAnalysis` on the disposition. State the
   one argument both of those are, then find the place in lesson 08's material
   where the system does the thing that argument forbids, and say why it is
   tolerable there. *(04, 07)*
4. Name the two irreversibility reasons and say which of the two the log's
   only-ever-growing property is relevant to. *(06)*
5. A change comes back `reversible: false`. What is in `inverse`? Then: a change
   comes back `ok: false` from `analyzeDelta`. What is in the journal, and why is
   it not a refusal? *(05, 07)*
6. Three of the four operations have small inverses and one does not. Name it,
   then name the policy knob that exists because of it, then say what unit that
   knob counts and one thing it therefore cannot see. *(06)*
7. Why is text a node rather than a prop? *(02)*

Question 3 is the one to do slowly. The two halves are five lessons apart, they
are the same argument — *a derived value stored next to what it derives from is a
second source of truth* — and if that connection is not there yet, this set is
where to build it rather than in a month.

---

## Tracking

Keep it lightweight — a note per set with the date, and any question where you
were **confident and wrong**. That list is your real study plan; everything else
you already know.

| Set | Do it on | Done | Confident-and-wrong |
| --- | --- | --- | --- |
| A | 2 days after L01 | | |
| B | 2 days after L02 | | |
| C | 2 days after L03 | | |
| D | 2 days after L04 | | |
| E | 1 week after Part I | | |
| F | 1 month after Part I | | |
| G | 2 days after L05 | | |
| H | 2 days after L06 | | |
| I | 2 days after L07 | | |
| J | 2 days after L08 | | |
