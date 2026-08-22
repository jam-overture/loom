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

Interleaved with 01–03. Eight questions from four lessons; the mixing is the
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
7. A delta removes a card and then inserts something at the card's id. Give the
   two cases and what happens in each. Then say what "the same node" has to
   mean for that rule to be checkable at all.
8. The same two operations, split across two deltas, are accepted. Say why —
   and name what a `LoomTree` would have to carry for them not to be. Is that
   a gap or a trade? Argue the side you did *not* land on first. *(03 for why
   the delta boundary is the unit that matters)*

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
7. Loom does not have the rule "an id, once retired, may never appear again."
   Say what it would break, and derive that breakage from question 6's answer
   rather than from memory of lesson 04.

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

## Set K — two days after lesson 09

Interleaved with 01–08, and built around a failure mode that only appears once a
system starts keeping records: **mistaking what was decided for what was true.**
A verdict names one reason; several were true at the moment it was reached, and
four of these questions are about the gap between those two things.

1. Name the six Gate rules in order. Then name the pair that reads the same
   input, say where each sits, and say what that pair proves about how a rule's
   position is chosen.
2. A change is irreversible *and* above its origin's ceiling. Give the reason
   recorded on the disposition. Then say what a count of that reason code across
   a month of records is actually a count of, and name the one thing that would
   change the number without the interpreter changing at all.
3. Give the test for whether two axes are really two *(08)*, then give the
   version of it that applies to a ladder. Name one policy — actual field names
   and values — under which a rung can never fire.
4. Undoing a `remove` costs something undoing an `insert` does not. Say what,
   name the policy knob that exists because of it, and then say which rung of
   the ladder that knob reaches and which rung sits above it. *(06, 08)*
5. `discards-later-work` is `high` rather than `critical`, and it also has a
   rule of its own above the ceiling. Those are two separate decisions. Give
   both arguments, and say what would go wrong if you made either choice
   differently. *(08)*
6. A model may not name the nodes it inserts. Give the reason without using the
   word "trust". *(04)*
7. Why is a half-applied delta worse than a rejected one? *(03)*
8. A disposition carries a policy *name* and a policy *fingerprint*. Say what
   each answers that the other cannot, then say what a rename does to the pair
   and what an edit does — and which of those two the contract in 0033 asks a
   host to do.

Question 2 is the slow one, and it is the same shape as Set J's question 3 in a
new costume: something derived is being read as though it were measured. If you
answered J3 well and this one badly, that is worth knowing — it means the idea is
attached to the example you met it in rather than to the shape.

---

## Set L — two days after lesson 10

Interleaved with 01–09, and built around the failure mode lesson 10 exists to
name: **assuming that something decided once does not need deciding again.** It
is the natural way to think about a sequence of steps, it is right about four of
Loom's stages and wrong about three, and telling those apart is most of what
Part II was for.

1. Name the five outcomes of `composeChange`. Two of them carry no disposition —
   name those two, say what they have in common, and give a question a monthly
   report would get wrong if the type let them carry one.
2. A held change is confirmed and the Gate returns `requires-confirmation` a
   second time. Say what happens, then say what the disposition recorded on the
   applied change reads. Then: somebody counts that kind in the journal to find
   changes waiting on a human. Say what they actually get, and name the lesson-09
   finding this is a second costume of. *(09)*
3. The policy is resolved once across a refusal and its repair, and again across
   a confirmation. State the one rule that produces both numbers — it is not
   "once per call" and not "once per proposal". Then apply it to a case neither
   lesson mentions: two intents raised a second apart against the same tree.
4. `PolicyContext` is the tree and the intent, and cannot see the proposal.
   Describe the failure that omission prevents, in terms of a number that would
   look healthy while measuring nothing — then name the lesson-07 separation this
   is the same instinct as, and say which one is about honesty and which is about
   being able to read a year of records. *(07)*
5. A confirmation reuses the stored proposal rather than re-interpreting the
   utterance. That proposal's delta names node ids that were minted, or will
   mint, an hour ago. Say what lesson 04 has to be true for the reuse to be safe
   at all — and then say what would go wrong if Loom had chosen positional
   addresses instead, being specific about *when* the reviewer would find out.
   *(04)*
6. Two checks stop a stale confirmation and they are one layer apart. Name both,
   say which fires first in a supported deployment, and say what the later one is
   for. Then give the general statement of what `baseRevision` protects against.
   *(03)*
7. Text is a node rather than a prop, and `slot` is a node kind rather than a
   prop on its parent. Say what those two decisions have in common, in one
   sentence about what a delta has to be able to address. *(02)*
8. Name the property that puts a field on `CompositionRuntime`. Apply it to
   `policySource`, which was not on that list when lesson 05 was written, and say
   what its being a *seam* rather than a value makes possible — the thing lesson
   09's last exercise demonstrated. *(05, 09)*

Question 3 is the slow one and the one to write out in full sentences rather than
a number. Question 5 is the payoff of the whole course so far: it reaches back
across five lessons to Part I, and if the connection is not there yet, this is a
better place to build it than a month from now.

---

## Set M — one week after Part II

Part II ends at lesson 10, so this is its consolidation set, and it is the
counterpart to Set E. Do it **out loud**, to a person or a recording. Spoken
explanation is retrieval plus elaboration at once, and it catches the gaps that
written notes let you skate over — you cannot silently mean the right thing.

1. Trace one change from an utterance to a row in the log, naming every stage and
   what each one is forbidden to do. Then do it again for a change that a person
   had to allow, and say which stages ran twice.
2. Part II is five lessons and one sentence: *a change is measured, then judged,
   then applied, and the three are kept apart.* Name what each separation buys,
   and find the one place in the material where something crosses a line you
   just drew and say why it is allowed to.
3. Derive the inverse delta from the delta's ordering guarantee, then say why the
   inverse is computed at assessment time rather than at apply time — and what
   that means for a change the Gate holds and nobody ever answers.
4. Somebody proposes a `GatePolicy` knob for how many repair attempts a refusal
   gets. Argue against it using only what is in Part II, then argue for it as
   strongly as you can, then say which argument would have to be answered first.
5. Write the six Gate rules in order from memory. Beside each, write the
   disposition kind it produces, and mark the two that read the same input.
6. A change is applied at revision 7 and undone at revision 8. Say what the
   disposition on revision 8 can say, what it cannot, and which of Part II's
   separations is the reason.
7. Name every place in Part II where the system does something a second time
   rather than trusting a stored answer, and give the single argument all of them
   share. Then name the one thing it deliberately does *not* redo, and say why
   the argument reverses there.

Question 7 is the one this set is built around, and the one to be least satisfied
with a short answer to. Question 3's last clause reaches into Part IV, which you
have not read — attempt it anyway.

---

## Set N — two days after lesson 11

Interleaved with 01–10, and built around the failure mode Part III opens on:
**treating a boundary as a place to hide something, rather than as a place where
you decide what may cross.** Three of these ask you what a boundary *refuses*,
and they are deliberately spread apart so you cannot answer the second from the
shape of the first.

1. `ChangeInterpreter` returns a `ProposedChange` and not a `TreeDelta`. Give
   both reasons — one is about identity, one is about what else a proposal
   carries — then say which of the two would still hold if a model were somehow
   trustworthy about ids.
2. Name the five actors a failure can name. Then give the rule for which one an
   unrecognised HTTP status falls to, and argue the *other* direction as strongly
   as you can before saying why it loses.
3. A model may not name the nodes it inserts. Give the reason without the word
   "trust" *(04)*, then say what the `IdFactory` being an injected seam adds that
   the rule alone does not, and then say which of those two exercise C's second
   row is a test of. *(05)*
4. `ModelClient` returns text. `PolicyContext` is the tree and the intent and
   cannot see the proposal *(10)*. Both are decisions about what does not cross a
   boundary, and they are not the same kind of decision. Say what each one is
   protecting, and which of the two would be caught by a test if you got it
   wrong.
5. Two proposals carry the same `promptHash` and different deltas. Say what that
   pair establishes and what it does not — then say which other provenance field
   a calibration report must read before it may count either of them, and why the
   obvious alternative field goes stale. *(07 for why measurement and judgment
   are kept apart)*
6. A revert produces a delta with `confidence: 1`. A model produces one with
   `confidence: 0.41`. Say what makes only one of those a claim that can be
   wrong, and name the lesson-06 fact about inverses that makes the other one
   arithmetic. *(06)*
7. Two of the five composition outcomes carry no disposition. Name them, then say
   which of the seven interpretation codes produce the first of the two — all of
   them, or some. *(10)*
8. Why is a half-applied delta worse than a rejected one? *(03)*

Question 4 is the slow one and the reason this set exists. Both answers are
"something upstream must not see something downstream", and they diverge on
*why*: one is about a metric that would look healthy while measuring nothing, the
other is about a test suite that would assert your fake agrees with your fake.
If those feel like the same answer, that is the thing to fix here rather than in
a month.

---

## Set O — two days after lesson 12

Interleaved with 01, 04, 05, 07, 10, 11. Six of the eight ask you to compare
two projections or to derive one — because the argument that lands in a month
is "these are the same shape", not "each of them is well-designed".

1. Give the sentence *The idea* uses to define a projection, without looking
   it up. Then apply it to one of the three projections lesson 12 named — say
   what the source of truth is, what the projection throws away, and what
   would break if the projection tried to *not* throw it away. *(12)*
2. The reply schema and the catalogue are both projections. Name three
   properties they share, and one property one of them has that the other
   deliberately does not. The last part is the interesting one and it is not
   "size". *(12)*
3. `interpretationReplyJsonSchema` is a pure function of a depth argument.
   Say what stops being true — of provenance, and of caching — if it were
   allowed to read the current registry. Give both. *(05, 07 for provenance,
   11 for the caching argument)*
4. A schema whose keys cannot be enumerated projects `props: undefined` and
   renders `not declared`. Give the concrete downstream action that differs
   when a model reads that versus reading `props: none`. Then say why picking
   the same word for both would fail a rule you first met in a different
   lesson. *(12, 09 for the rule)*
5. Depth was not what consumed the grammar budget. Name what did, and give
   the argument as "positions × cost per position". Then say why depth felt
   like the answer — the failure mode of estimating cost by depth alone is
   worth naming, because it comes back on any schema that unrolls. *(12)*
6. Two prompts differ by four characters at the very end. Give the reason
   the difference is where it is, and name the property of `buildUserMessage`
   that puts it there. Then answer: `promptHash` returns two different
   hashes for those two prompts. Is that a feature or a limitation, and for
   which consumer of provenance? *(11, 07)*
7. A model may not name the nodes it inserts. Lesson 04 gave the argument;
   lesson 11 turned it into a type; lesson 12 turned it into a shape. Say
   what the shape is, and say which of the three projections lesson 12 named
   was the one that carried the rule. *(04, 11, 12)*
8. Why is a half-applied delta worse than a rejected one? *(03)*

Question 2's last part is the one to be least satisfied with a short answer
to. Both are projections, both are deterministic, both are lossy — the axis
where they diverge is what the *consumer* is going to do with what they
receive, and the answer sits on that axis.

---

## Set P — two days after lesson 13

Interleaved with 03, 05, 06, 09, 10, 11 and 12, and built around one failure
mode: **assuming that because two things end the same way, the same thing
happened.** Four of these eight are that shape wearing different clothes, and
they are deliberately not adjacent.

1. "Exactly one repair attempt" is structural rather than a counter set to one.
   Give the counter's failure mode concretely — who changes it, when, and what
   the system becomes. Then name the property of the Gate that makes it safe to
   ask the same question twice and get the same answer. *(09)*
2. Two runs both come back `rejected` with the same reason code. In one a
   repairer declined; in the other none was wired in. Say what in the event
   stream separates them and what in the returned outcome does not, then name
   the lesson-11 idea that gap is an instance of. *(11)*
3. An inverse delta and a repair are both a delta produced in response to a
   delta. Say what each one can be *wrong* about, what `authoredBy` reads on
   each, and what `confidence` means on each. One of those three is the answer
   and the other two are how you get there. *(06, 11)*
4. `renderDelta` prints a `configure`'s prop keys without their values, and
   prints an inserted node's props in full. Give the argument for the first,
   then name the lesson-12 sentence you would use to decide whether the
   asymmetry between them is a defect. *(12)*
5. A repair is judged under the same policy as the proposal it replaced. Say
   where in `composeChange` that is arranged, what would break if the policy
   were resolved a second time, and which field in the stored record proves it
   was not. *(10)*
6. A change was refused, then repaired into something smaller that committed.
   Give both honest answers to "how often does this system refuse changes",
   name the field each comes from, and give the question each one answers.
7. Why is a half-applied delta worse than a rejected one? *(03)*
8. Nothing at the seams throws. Say what an interpreter that threw would cost
   an audit trail, then name the one thing the runtime *does* let disappear
   silently and say why that is not the same concession. *(05)*

Question 3 is the one to do slowly and out loud. The tempting distinction —
"one is computed and one is generated" — is a restatement rather than a
distinction, and if that is where your answer stops, this set is the place to
push past it rather than in a month.

---

## Set Q — one week after Part III

Part III ends at lesson 13, so this is its consolidation set, and it is the
counterpart to Sets E and M. Do it **out loud**, to a person or a recording.
Three lessons that only make sense together: what may not cross the seam, what
does and in what shape, and what happens when the answer comes back and the
Gate says no.

1. Trace one utterance from the seam to a committed revision, naming what
   crosses each boundary and in what shape. Then trace one that was refused and
   repaired, and say which of the three projections is sent twice, which is
   sent once, and which never leaves the process.
2. Part III is three lessons and one sentence: *the model is shown a view, may
   answer in one shape, and gets one revision.* Say what each of the three is
   protecting. Then say which one is enforced by a type, which by a grammar,
   and which by a call graph — and which of the three is the weakest, and why
   it is still worth having.
3. Name every place in Part III where a value is written by someone other than
   the party it describes. For each, say what would go wrong if the described
   party wrote it instead. There are at least four.
4. Set M asked you to argue both sides of a `GatePolicy` knob for repair
   attempts. Answer it now: say why the knob is the wrong *shape* rather than
   the wrong *value*, and say what would have to become true about the Gate
   before any number above one could be safe.
5. Three things in this system are called "refused". Name all three, say whose
   problem each one is, and give the concrete case where two of them happen one
   after the other in a single episode.
6. Something crosses the seam and comes back wrong in a way no schema can
   catch. Give a concrete example, say which stage catches it, what it is
   reported as, and which of the five actors it names.
7. The whole of Part III is a bet on one property of the record. Name the
   property, name what has to happen afterwards for the bet to pay off, and
   name who has to do it. Then say what this system looks like if nobody ever
   does.

Question 7 is what this set is built around, and it is the one to be least
satisfied with a short answer to. Question 3's count is deliberately given as a
floor rather than a number — finding a fifth is the exercise.

---

## Tracking

Keep it lightweight — a note per set with the date, and any question where you
were **confident and wrong**. That list is your real study plan; everything else
you already know.

If you would rather not keep it by hand, `/lessons/review` keeps exactly this
table: it reads the sets below, works out which is due from the days you worked
through each lesson, and records the confidence you gave *before* each reveal
alongside how it actually went. The questions are these questions — that page
renders this file rather than restating it.

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
| K | 2 days after L09 | | |
| L | 2 days after L10 | | |
| M | 1 week after Part II | | |
| N | 2 days after L11 | | |
| O | 2 days after L12 | | |
| P | 2 days after L13 | | |
| Q | 1 week after Part III | | |
