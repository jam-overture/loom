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

---

## Set D — one week after Part I

The consolidation set. Do this one out loud, to a person or a recording — spoken
explanation is retrieval plus elaboration, and it exposes gaps that written
notes let you skate over.

1. Explain Loom's thesis in four sentences, defining any jargon as you use it.
2. Derive the three node kinds from the thesis. Why not four? Why not two?
3. Derive the four operations from the thesis. Why not five?
4. A colleague proposes adding a `replaceSubtree` operation "for efficiency."
   Argue against it using only what you know, then argue *for* it as strongly as
   you can.
5. Write the fixture tree from memory, then a delta that moves the card into the
   header, then say what its inverse would have to contain.

Question 5 reaches into lesson 06, which you have not read. Attempt it anyway —
generation before instruction is the point, and it will make lesson 06 land
harder.

---

## Set E — one month after Part I

Closed book, no notes, 20 minutes. This is the one that tells you whether it
stuck.

1. Rebuild the whole argument from scratch: problem, thesis, tree, delta. Write
   it as if for a new engineer.
2. What is the weakest point in the design as you understand it? Where would you
   push?
3. Redo the "Do it" exercises in lesson 03 from memory — predict every output
   before running.

Then read your Predict answers from lesson 01. The gap between those and what
you can now write is the actual measure of the course.

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
| D | 1 week after Part I | | |
| E | 1 month after Part I | | |
