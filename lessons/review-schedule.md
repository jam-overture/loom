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

That last sentence is the one this document has always been worst at getting
anybody to do, because it asks you to remember, a day later, which question you
missed — and to ask it of yourself without reading the rest of the set around
it. `/lessons/review/corrections` does it instead: a question you missed comes
back the next day, a week after you get it, and a month after that. **Three
clean retrievals retire it; missing it once sends it back to the beginning.**
Five at a time, drawn from wherever they happen to be from, which makes a
corrections sitting the most interleaved ten minutes in the course.

**Wherever** now means the lessons as well as these sets. A Warm-up or
Self-check question you got wrong inside a lesson is the same kind of event as
one you got wrong here — you had met the material, you were asked for it, and it
did not come — so it comes back on the same terms and in the same sitting, and
by the time it arrives there is nothing to tell the two apart.

A missed **Predict** question is the one exception, and only sometimes. Predict
is written to be got wrong; saying you do not know and turning out not to know
is the exercise working, and there is nothing there to relearn. But a prediction
you rated **4 or 5** and missed is not a gap — it is a belief about how the
system works, held confidently, that turned out to be false. Those are the ones
that survive being contradicted once, so those are the ones that come back.

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
7. Your event sink throws. State what happens to the change, then state what
   happens to the event, then say which of those two you would have got right
   from the `EventSink` comment alone.
8. Two of the seams can fail. One failure the runtime swallows and one it lets
   through. Give the rule that decides which — and it is not "the important one
   propagates".

Question 6 is the one to be honest with yourself about. The two halves are
different arguments — one is about what a proposal can express, the other about
what a replay can reproduce — and running them together is the most common way
this pair gets half-learned.

Question 7's middle clause is the one people drop. A change surviving is the
answer everybody gives; what the event costs is the half that makes it a trade
rather than a feature.

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
   sentence, you have the surface. Then: a move is measured a second time, by two
   other fields, under a *different* sentence. Name the fields and give that
   sentence too, and say why the two sets of numbers must not be added together.
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
   and `reversibility` and name **every** `ChangeAnalysis` field they both read —
   there are three, and one of them arrived after both axes already existed. Then
   say what the fact that it could be added without touching either axis is
   evidence for.
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

1. Name the eight Gate rules in order. Then name the pair that reads the same
   input, say where each sits, and say what that pair proves about how a rule's
   position is chosen. Then name the *other* group — rules that read different
   inputs and sit next to each other because they share an argument — say how
   many of them there are, and give that argument once, covering all of them.
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
9. Three rules sit in one band of the ladder and share one argument. Name all
   three, give the argument once so that it covers them without naming any of
   them, and then say what the third one has to report that the first two never
   have to — and why it reports it in a sentence that cannot say what changed.
10. Lesson 09 counted the ladder wrongly for a week, twice, while two decision
   records counting the same ladder were right within hours both times. Neither
   was written more carefully. Say what the difference was, in terms of copies
   rather than of care. Then name one thing that was wrong in that lesson which
   the remedy would still not have caught, and say what kind of claim it was.
   *(09, 25)*

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
5. Write the eight Gate rules in order from memory. Beside each, write the
   disposition kind it produces, and mark the two that read the same input. Then:
   three of the eight were added after the ladder was first written, all three
   into the same band, and the position each was given is the only part of those
   changes anyone had to argue about. Name the three, say what that band buys
   above and below it, and name the one neighbour the choice barely matters
   against.
6. A change is applied at revision 7 and undone at revision 8. Say what the
   disposition on revision 8 can say, what it cannot, and which of Part II's
   separations is the reason.
7. Name every place in Part II where the system does something a second time
   rather than trusting a stored answer, and give the single argument all of them
   share. Then name the one thing it deliberately does *not* redo, and say why
   the argument reverses there.
8. `EventSink`'s comment made the same promise before and after the runtime began
   keeping it, and every test passed on both days. Say what a reader would have
   had to look at to tell the two apart — then take any interface in Part II that
   promises something, and say which of the two it is. *(05)*

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
9. `complete` takes a second argument that carries an `AbortSignal`, and a client
   that never looks at it still cannot make the runtime wait. Say where the
   ceiling is enforced and why one level up rather than in the vendor adapter,
   then apply lesson 05's test — *can a stranger violate it* — and say which of
   its two readings the signal is. Then say what moving the enforcement down
   would change in the signature. *(05)*

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

8. Part III's two seams each hand something across that the runtime does not
   need honoured: the draft schema asks a model for operations without ids, and
   `ModelCallOptions` asks a client to stop when nobody is listening. Say what
   keeps each of those true when the far side does not cooperate, then say which
   of the two would be a hole rather than a courtesy if its enforcement moved one
   level, and in which direction. *(05, 11)*

Question 7 is what this set is built around, and it is the one to be least
satisfied with a short answer to. Question 3's count is deliberately given as a
floor rather than a number — finding a fifth is the exercise. Question 8 arrived
on 26 September, when a check over the course's own type fences found lesson 11
printing this seam with one argument six days after it grew a second one; the
question it raises was worth more than the correction.

---

## Set R — two days after lesson 14

Interleaved with 02, 03, 04, 05, 09, 12 and 13 — the widest mix in the course
so far, because lesson 14 is the first one that spends decisions made in every
earlier part. Several of these are answerable *only* by pairing 14 with an
older lesson; if a question feels like it is missing something, that is the
older half you are missing.

1. Give the one question that decides whether a render omits a node, degrades
   it, or merely reports. Then apply it to a fault the lesson's table does not
   spell out for you: a tree names a theme and the render was given no theme
   registry. Say which grade, and say why it is not either of the other two.
2. `applyDelta` returns a `Result` and `renderLoomTree` does not. State the rule
   that decides which shape a function gets **without using the words "error" or
   "value"** — the rule is about a party, not about a type. *(03, 05)*
3. Node ids are React keys. Say what that buys concretely, name the lesson that
   paid for it, and say what that lesson thought it was buying at the time. The
   gap between those last two is the point. *(04)*
4. One render produced a completely empty page and returned no error. Another,
   handed a document that was the wrong tree, returned an error and no page.
   Name the axis that puts those two the right way round, and say what the
   tempting axis is that puts them the wrong way round.
5. `TreeSource.load` returns `Promise<Result<unknown, …>>`. Say what the
   `unknown` is claiming about storage, and say what would have to become true
   for `LoomTree` to be an honest return type there. *(05)*
6. Why is `slot` a distinct node kind? Then say what Exercise A's rendered
   markup shows about that answer which the tree on its own does not. *(02)*
7. A primitive is handed a region and never places it. Say what the reader
   sees, what the diagnostics say, and why the render seam is not the thing
   that should be catching it.
8. Lesson 12 defined a projection in one sentence with four clauses. Rendering
   is the fourth projection in this system and the first whose consumer is a
   person. Say which clause that changes the meaning of, and how. *(12)*
9. The Gate refuses a change and the runtime will not decide what happens next.
   A render produces diagnostics and the runtime will not decide whether to
   serve the page. Say what those two hand-offs have in common about the *kind*
   of decision being handed over, name the party that receives each, and say
   what it would cost if the library made either call itself. *(09, 13)*

Question 2 is the one to be least satisfied with a short answer to, and the
constraint on it is load-bearing: "one returns an error and one does not" is
the observation, not the rule. Question 9 is the one most worth doing out loud.

---

## Set S — two days after lesson 15

Interleaved with 01, 04, 05, 07, 09, 12 and 14, and built around the failure
mode lesson 15 exists to name: **treating a declaration as though it were a
guarantee.** A declaration is a claim somebody typed; four of these ask you what
would have to happen for it to be *true*, and they are deliberately not
adjacent.

1. Name the five places a registration is acted on and the different question
   each answers. Then name the one that prevents rather than detects, and say
   what follows from the fact that it contains no enforcement anywhere.
2. `z.object({})` and no schema at all differ. Name the consumer that acts on
   the difference, then name the consumer that does not — and say which
   decision makes the second one's indifference safe rather than lucky.
3. Give the rule for what one render may prove. It is three sentences, one
   about children, one about a declared slot, one about decoration, and two of
   the three are the same sentence. Say which two, and say what the odd one out
   would hide if it were resolved like them.
4. Lesson 12 defined a projection in one sentence. Apply it to the catalogue:
   source of truth, what is thrown away, and what would break if the projection
   tried *not* to throw it away. Then say which of the four projections in this
   course the catalogue is most alike, and on which axis. *(12)*
5. The Gate reaches a verdict and applies nothing; the audit reaches a verdict
   and blocks nothing. State the single rule both follow — it is about a fact,
   not about a return type — and then find the third instance of it, which is
   in lesson 14. *(09, 14)*
6. A component throws under every configuration; another throws under one. Both
   are reported in the same list, and one field separates them. Name the field,
   say which value is the *certain* one and why the other cannot be, and then
   give the legitimate primitive that lands in the uncertain half — the reason
   it does is a fact about React rather than about Loom. Then say what a host
   that ships none of those asserts, and what a host that ships one asserts
   instead.
7. A model may not name the nodes it inserts. Give the reason without the word
   "trust", then say what the catalogue adds to that reason — the two are about
   different halves of the same proposal. *(04, 12)*
8. `analyzeDelta` takes a tree and a delta and takes no policy. `catalogueOf`
   takes a registry and takes no model. Say what those two separations have in
   common, then say which of the two would be caught by a test if you got it
   wrong and which would only be caught by someone reading a year of records.
   *(07)*

Question 3 is the slow one and the one to write in full sentences. Question 5 is
the payoff: it reaches back six lessons, and if the connection is not there yet,
this is a better place to build it than a month from now.

---

## Set T — two days after lesson 16

Interleaved with 03, 04, 06, 07, 09, 12 and 15, and built around the failure
mode lesson 16 exists to name: **trusting a check without asking what it
compares.** Three of these are about a mechanism that reports something
reassuring for a reason that has nothing to do with the thing you wanted
reassurance about, and they are deliberately not adjacent.

1. Reads are free. Give the argument for storing the current tree beside the log
   that still works. Then say what it means that the argument is about the code
   which reads the data rather than about the data.
2. Name what a store holds, and say why neither of the two things is a starting
   point for a fold. Then say what a host that cannot produce one must do, and
   why the obvious shortcut is worse than not auditing at all.
3. Undo stores nothing; the current tree is stored. Give the single test that
   admits one and excludes the other — both halves of it — and say which half a
   proposed cache is most likely to pass while failing the other. *(06)*
4. An `append` can be refused two ways. Name both, say which is worth trying
   again, and say what trying again has to mean given what a delta names. Then
   say what a refused append leaves in the log, and what that costs. *(03, 10)*
5. An audit reports `agrees`. Give two different situations in which that is true
   and something is still wrong. One of them is about what a later revision
   deleted.
6. Lesson 12 defined a projection in one sentence. `compareTrees` turns two trees
   into a list of differences and deliberately cannot be applied to anything.
   Say which clause of the projection sentence that restriction is protecting,
   and what would have entered the log without it. *(12)*
7. A bounded walk answers `placed`, `seeded` or `undetermined`. Say what
   collapsing the last two would claim, then find the four earlier places in this
   course where a two-valued answer was rejected for the same reason. *(15)*
8. `analyzeDelta` measures and does not judge; the audit reports and does not
   block; the store refuses a stale delta and does not decide what happens next.
   State what all three hand back and to whom, then say which one of the three
   would be the most tempting to get wrong and why. *(07, 09)*

Question 3 is the slow one and the one to write in full sentences. Question 5 is
the payoff: it is the question that decides whether you would believe a green
dashboard.

---

## Set U — two days after lesson 17

Interleaved with 05, 07, 09, 10, 13 and 16, and built around the failure mode
lesson 17 exists to name: **a number that is about something other than what it
appears to be about.** Question 7 is a question you were asked once already and
could not answer then.

1. Three rules decide what a telemetry record contains, and a fourth governs all
   three of them. State the fourth. Then say which of the other three could be
   broken while leaving the damage visible, and which one would leave a hole
   nobody could find afterwards.
2. `failed` is deliberately not `rejected`. Give both reasons — one about what
   the resulting number would measure, one about who could tell. Then name the
   two other places lesson 17 keeps a count out of a denominator, and say what
   all three have in common.
3. A report over a live deployment says the model claimed 0.4 more than it
   delivered. Give three states of the world that produce that number, only one
   of which is about the model. Then the harder half: a segment that carries one
   policy *name* can still be pooling two different gates. Say how that happens
   and what in the report catches it.
4. `append` writes the log entry and the snapshot in a single step; retention
   refuses to forget half an episode. State the one rule both are instances of,
   without naming either mechanism — then say what each would manufacture if it
   broke. *(16)*
5. A change is committed, the response returns, and the process dies before
   anything else runs. Say what is in the revision log and what is in the
   journal. Then name the decision that made that possible and give the argument
   for it that is specific to where this runs. *(05, 10)*
6. Lesson 07 separated measurement from judgment. Lesson 17 separated
   measurement from control. Say what the two separations have in common, and
   then say what is different about *who* each one is protecting — because it is
   not the same party. *(07, 09)*
7. Set Q asked what the whole of Part III is a bet on, what has to happen
   afterwards for the bet to pay off, who has to do it, and what the system looks
   like if nobody ever does. Answer it again now that you know. Then say whether
   the answer reassures you, and be honest. *(11, 13)*
8. Name the four facts 0007 required §6 to capture, and where each one comes
   from. Then say which of the four could not have been added retroactively, and
   state the general principle — the one that has nothing to do with Loom — in a
   single sentence. *(09, 10)*

Question 4 is the one to write in full sentences; it is the most transferable
thing in the course. Question 7 is the point of the set.

---

## Set V — one week after Part IV

Part IV ends at lesson 17, which is the end of the system, so this is the
counterpart to Sets E, M and Q and the one that closes it. Do it **out loud**,
and do not do it the same day as Set U. It reaches into all four parts on
purpose:
everything before this asked you to hold one part in your head, and the thing
worth having at the end is the system.

1. Trace one utterance from the moment somebody types it to a row in a
   calibration report, naming every artefact that gets written down and every one
   that is deliberately not. There are at least four of each, and the second list
   is the one to be least satisfied with.
2. Part IV is four lessons and one sentence: *the tree becomes pixels, only out
   of a declared vocabulary, stored so it survives, and recorded so it can be
   checked.* Say what each of the four is protecting — and for each, name the
   Part I property it is protecting it *for*.
3. This course rejected a two-valued answer at least six times in favour of a
   third case. Name five of them, say what the third value is in each, and say
   which one you would personally be most tempted to collapse — then say what
   collapsing it would claim.
4. Three times now, a mechanism has been forbidden from being able to produce its
   own detector's signal. Name the three. Then say which of the three failures
   would be hardest to notice from outside, and why.
5. Name every value in this system that the log already determines and that is
   stored a second time anyway. The list has one entry. Give the two-part rule
   that admits it, and name two facts that fail each half. *(06, 16)*
6. Lesson 01 said Loom exists because AI-written code produces change nobody can
   review, gate, attribute or undo. Take the four words one at a time: name the
   artefact that delivers each, and the lesson where it arrived. One of the four
   is delivered by two artefacts that have to agree with each other — say which,
   and what happens when they do not.
7. The whole system is a bet that a person turns up. Name every place a person is
   *required*, every place one is *offered* and may decline, and the one place a
   person is deliberately not given a button at all. Then say what this system
   becomes if nobody ever turns up — and whether that is a design flaw or the
   design.

Question 6 is the one that tells you whether the course worked. Question 7 is the
one to still be thinking about tomorrow.

---

## Set W — two days after lesson 18

Interleaved with 02, 05, 09, 12, 14, 15 and 16. Set V asked you to hold the
system; this set is the first that asks you to hold the system **against
something outside it**, which is what Part V is. Half of these questions are
about a seam and the other half are about a claim the seam made false — and the
second half is the harder one.

1. State what a binding contains and what it may never contain. Then give the
   reason twice: once as an argument about the tree, and once as an argument
   about what the Gate would find itself weighing. Say which of your two is the
   one that actually kills the alternative. *(03, 08)*
2. `renderLoomTree` is synchronous and `renderRequest` is not. Name the two
   seams that forced that, say where each one's work happens instead, and then
   give the general rule both are instances of — the one lesson 05 stated first
   about something much smaller. *(05, 14)*
3. A source declares what it answers with, and the adapter that answers is
   already typed by that declaration. Say why the answer is validated anyway.
   Then name the other place in this course where a value is re-checked at a
   boundary its own types already described, and say what the two boundaries
   have in common about who wrote what is on the far side. *(14, 16)*
4. "The page is a function of the tree alone" was true through Part IV. State
   what replaced it, exactly, and then state what a reviewer can still conclude
   from a revision because of the weaker claim. Then the harder half: name what
   a reviewer approved when they approved a bound node, and say what would have
   to be stored for them to have approved more. *(09, 10)*
5. A source with nothing to report answers `ready` with an empty list rather
   than reporting that it has nothing. Give the failure this prevents, in terms
   of what a *visitor* concludes. Then find the same argument in lesson 12 and
   in lesson 14, name the party it is protecting in each of the three, and say
   which of the three is the one you would have been most likely to get wrong on
   your own. *(12, 14)*
6. A node declares three bindings and one of them is malformed. Say what the
   other two get, then say what a page looks like under the *other* decision and
   why that is worse — the answer is about which failures a person notices, not
   about which is more correct. *(14)*
7. Name every place in this system where a name in the tree points at something
   the tree does not contain, and for each, name the party that owns the far
   side. There are at least four. Then say what all four do when the far side is
   missing, and whether they all do the same thing. *(02, 15)*
8. Loom's own code contains exactly one `try`. Say what is on the far side of it
   and why that one is the exception to lesson 05's rule rather than a hole in
   it. Then name two other places where Loom treats something as foreign that a
   less careful library would treat as its own. *(05, 15, 16)*

Question 5 is the point of the set. Question 7 is the one to write as a list and
then be unsatisfied with, because the fourth entry is the one nobody remembers.

---

## Set X — two days after lesson 19

Interleaved with 04, 07, 09, 14, 15 and 18. Set W asked you to hold the system
against something outside it. This one asks something harder and more specific:
Part V now has two seams that look almost identical, and **most of these
questions are about where they differ.** Two things that rhyme are the easiest
pair in a course to conflate, and conflating them is the failure this set exists
to catch.

1. A binding carries AI-authored `params` and a submission declaration carries
   none. Give the structural reason — the property of reads that writes do not
   have — and then say what a deployment pays for the decision, in a concrete
   number. Then the half most people skip: give the strongest argument for the
   other side, and say what would have to change about who writes a registry for
   that argument to win. *(18)*
2. A model may write a URL into an `href` and it is checked against a scheme
   allowlist. A model may not write one into a form action at all. State why the
   same check is right in one place and useless in the other, as a property of
   what the check can *see*. Then name one other value in this system where the
   danger is in the content rather than the form, and say how Loom handles that
   one. *(15)*
3. Both Part V seams resolve in three steps: a pure plan, a step that may do IO,
   and a synchronous walk. Name what the *pure* step buys in each, and then name
   one thing a host could build from a plan alone in each case — they are not the
   same thing, and the difference is the point. *(14, 18)*
4. `redirected-submission` is `high`. `nested-target` is `critical`. Give the
   property that separates them, phrased as a claim about the change rather than
   about the damage. Then explain why the `high` one still gets a Gate rule that
   ignores the origin ceiling, and say what that implies about when a stake
   *level* is the wrong tool. *(07, 09)*
5. A change moves a form's destination and then moves it back, in one delta.
   Nothing is reported. Say why measuring between two trees rather than off the
   operations is what produces that, then name the *other* analysis in this
   course that is measured the same way and the one place the two disagree about
   what counts. Then say what a reviewer loses if confirmations fire on changes
   that changed nothing. *(04, 07)*
6. Name the five reasons a form has no target. Say which one means the host's
   code ran and returned successfully; say which one could not exist if the seam
   trusted the host's own types; and say why there is no sixth reason meaning "no
   target, and that is fine." *(18)*
7. A primitive declares `interactive: { whenProps }` and `submits: true` — one
   conditional, one not. Give the case the conditional form exists for, then give
   the argument that there is no matching case for the second. Then say what the
   audit does with each declaration, and which of the two it can be wrong about
   in a way nobody notices. *(15)*
8. Both Part V lessons removed something from the tree and replaced it with a
   name pointing into a host-written registry. List every registry in this
   system, say who writes each and what a model is shown of it, and then answer
   the question the pattern raises: what makes something a candidate for this
   treatment, and what makes something *not* one? *(02, 15, 18)*

Question 1 is the point of the set — it is the one place two seams that look
identical are not. Question 8 is the one to attempt last and be least satisfied
with; if your list of registries has three entries, one is missing.

---

## Set Y — two days after lesson 20

Interleaved with 05, 07, 12, 14, 15, 18 and 19 — the widest set so far.

Set X asked you to hold two seams apart. There are now three, and that is a
different problem rather than a bigger one: with two, telling them apart is a
list of differences, and with three you have to know **which differences were
the rule and which were a coincidence.** Most of this set is that question in
various disguises.

1. Write the sentence that is true of all three Part V seams — data, submissions
   and frames — as a single rule about what goes in a registry. Then say what
   lesson 19's version of it (*a name in the tree, an address in a registry,
   resolved before the walk*) got right and what it got wrong, and name which of
   its three clauses survived. *(18, 19)*
2. Give the test that decides whether a value belongs in the tree or in a
   host-written registry, in one sentence, without using the words "dangerous"
   or "trusted". Then apply it to two cases neither lesson covered: the list of
   locales a page may be translated into, and the API key an embed provider
   wants in a query string. *(18, 19)*
3. The frame seam has no plan step and no resolve step where the two before it
   have both. Name the property that buys that, name the two things the shape
   costs, and say what the record tells a deployment to do if it wants an
   asynchronous verdict anyway. *(14, 18)*
4. `sandbox="allow-scripts allow-same-origin"` on a frame whose document comes
   from the framing page's own origin. Say what it protects the page from, then
   answer both design questions: why is it permitted rather than refused, and
   why is it reported rather than left alone? The second half is the one to
   write most carefully. *(14)*
5. `resolveFrame` given the number `42` returns a refusal rather than throwing,
   and `createFrameOriginRegistry` given `https://example.com/embed` returns an
   error rather than ignoring the path. Both are the same discipline. Name it,
   name where it was established, and then say which of the two would still be
   correct if the value came from a *host* rather than from a model — and why
   the answer is not the same for both. *(05, 14)*
6. A `frames` declaration and an `interactive: { whenProps }` declaration are
   both prop names an author writes and the registry checks. Give the property
   that makes a drifted `frames` worse. Then name the drift the registry cannot
   catch, say why it cannot, and say what kind of tool would. *(15)*
7. The endpoint catalogue is the complete list of what a model may name; the
   frame catalogue is not a complete list of anything. Explain what each is
   *for*, then say why `self` is not projected into the second — and give the
   general rule about projections that decides it. *(12, 15, 19)*
8. An AI-authored URL in an `href` is refused at the props schema and the node
   is omitted. An AI-authored URL in a frame is refused by a seam and the
   primitive renders a notice. Same mechanism, two answers. Give the reason,
   phrased as a claim about what kind of *fact* each refusal is — then say what
   would be true of a page's structure if the second worked like the first.
   *(02, 07, 14)*

Question 1 is the point of the set and Question 8 is the one most people can
feel the answer to and not state. If your answer to 2 needs a different rule for
each of the two cases, you have not found the rule yet.

---

## Set Z — two days after lesson 21

Interleaved with 04, 07, 08, 12, 15, 17, 18 and 19 — and unusually heavy on Part
II for a Part V set, which is deliberate. Set Y was about telling three seams
apart. This one is mostly not about the seam at all: lesson 21's registry half is
the pattern you already have, and the half worth retrieving is what happened when
a property turned out to belong to nobody.

1. Give the reason a model may not write a colour, as a property of the value
   space rather than as a danger. Then apply the same reasoning to two cases no
   lesson covered: the number of columns in a grid, and the alt text on an
   image. If your rule gives the same answer for both, you have not found it
   yet. *(01, 21)*
2. There is no fallback theme, and a tree that names none renders unstyled. State
   the argument, then say what it shares with lesson 18's account of a page that
   stops being a function of its tree — and then the difference that lets
   appearance refuse a trade data had to accept. *(18, 21)*
3. A change that repaints every pixel of a page comes back `low` stakes, no
   factors, reversible, accepted — identical in every column to renaming the
   page. Defend it with both axes named, then say what a deployment does if it
   wants re-themes held, and why that is a composition rather than a feature.
   *(07, 08, 09, 21)*
4. "Can a reader read this page" is answerable by no single party. Name the three
   parties and what each holds. Then name the two things that had to be
   *declared* because nothing could derive them, and give, for each, the reason
   derivation fails — one of the two is a fact about probes and the other is a
   fact about meaning. *(14, 15, 21)*
5. `analyzeDelta` measures and the Gate judges. `auditRegistry` reports and
   refuses nothing. `auditPalette` measures and imposes nothing. Write the rule
   the three share as a claim about *who owns the consequences*, then name the
   one place in the system where the same party measures and decides, and say
   what makes it different. *(07, 15, 17, 21)*
6. A pairing that cannot be measured is neither a pass nor a failure. Give the
   reason it is a third answer rather than either, name what a host wanting the
   guarantee has to assert, and name the other place in this course where a check
   answers "I could not tell you" as a first-class result. Then the sharper half:
   say what a host could have made disappear if `unmeasured` had been folded into
   "pass". *(15, 20, 21)*
7. Two colours at 1.00:1 that a reader tells apart at a glance. Explain how both
   are true, then state what a design token promises and does not — in one
   sentence, to somebody who has never heard of Loom — and derive from your
   sentence the class of bug it predicts. *(21)*
8. The theme catalogue shown to a model carries ids, names and descriptions and
   no hex. The frame catalogue carries origins and descriptions and no `self`
   flag. Give the single rule about projections that decides both omissions, then
   say which of the two catalogues is a *complete list of what may be named* and
   why the other one is not. *(12, 19, 20, 21)*

Question 4 is the point of the set. Question 5 is the one where three examples
make the rule feel obvious and stating it precisely is still hard — write the
sentence before you look at any of the three.

---

## Set AA — two days after lesson 22

The twenty-seventh set, and the letters ran out at Z — two of them from here, so
that no set you have already done gets renamed underneath you.

Interleaved with 03, 07, 08, 09, 13, 14, 15 and 21. Heavy on Part II, because
what is worth retrieving from lesson 22 is not the declaration but what the Gate
did with it; and heavy on 15, because two lessons running have now turned a
primitive's promise into a claim that can be false.

1. A tree is valid, every node passes its own schema, and the page has a control
   on it that no reader can operate. Say what the fault is a property *of*, then
   name the three seams that cannot see it and give each one's reason in the form
   *"because it only ever sees …"*. *(14, 15, 22)*
2. `interactive: { whenProps: ["href"] }` treats absent, `null` and `""` alike.
   Give the argument for the empty string in terms of a specific change the
   system must not refuse, then name the other place in this course where a check
   had to be written so that it would not refuse its own repair. *(13, 22)*
3. A `configure` operation that touches one node and no children produced a
   `critical` refusal. Explain the mechanism, then state the general rule it
   forces about what the analysis reads — and say which two of the four
   operations you would have guessed instead, and why that guess is natural.
   *(03, 07, 22)*
4. `nested-target` is a stake factor and not a rule in the ladder. Give the
   property that distinguishes it from every other factor in the system, then say
   what refusal gives a deployment that confirmation would not — and name the
   part of the pipeline that answer depends on. *(08, 09, 10, 13, 22)*
5. A proposal inherits one nesting and introduces none, and is reported as
   introducing none. Defend that, then argue the other side properly: give the
   strongest case for reporting inherited faults, and say what it would cost the
   repair loop and the person reading the assessment. *(07, 13, 22)*
6. A deployment that derives no interactive vocabulary gets no check at all, and
   this is the default — 0002 is why. State that argument, give the one-line
   change that turns the check on, and say why that line reads the registry
   instead of naming types. *(15, 22)*
7. `loom.nav` declares itself a target and renders a `<nav>`. State the claim the
   declaration makes, the claim the rule that forced it wanted to make, and the
   two different failures each protects against. Then say which you would rather
   ship — a missing declaration or a false one — and why. *(15, 22)*
8. Lesson 21 said a property can belong to no single party; lesson 22 has one
   belonging to two nodes. Write the sentence that covers both, then say what
   each seam does about it — one measures and reports, the other measures and
   refuses — and what decides which of those two a property gets. *(07, 09, 21,
   22)*

Question 7 is the point of the set, and question 4 is the one where a confident
half-answer is most likely: if yours does not mention what happens to a refused
proposal afterwards, keep going.

---

## Set AB — two days after lesson 23

Interleaved with 04, 05, 06, 08, 12, 14, 15, 19 and 22. Heavy on 04, because
lesson 23 is where the id you were told carries no position turns out to carry
the *opposite* of position; and heavy on 19, because the comparison between a
moved destination and a renamed anchor is where this lesson's argument about
stakes actually lives.

1. Naming a place inside a document raises three questions: whether the name is
   validated, whether two nodes may share one, and whether a copy carries it.
   Say which of the three a per-node props schema can answer, and for each of
   the other two give the argument it structurally cannot see. *(15, 23)*
2. An anchor is held to a grammar much narrower than an `id` attribute permits.
   State the grammar, justify two of its exclusions as failures of a *round
   trip* rather than of HTML, and then say why a value that fails it is reported
   rather than rewritten into one that passes. *(13, 14, 23)*
3. Two nodes name the same anchor and the first in document order keeps it.
   Explain what makes that ordering true of the *tree* rather than of the
   renderer's recursion, then say which of an ancestor and its descendant has the
   lower node id in a fixture that builds children first — and why the two
   orderings disagreeing is the point rather than a quirk. *(04, 23)*
4. The ledger that records who holds which anchor is created inside
   `renderLoomTree` and dies with it. Give the failure that prevents in one
   sentence, then name two other places in this course where the same argument is
   made about a different piece of state. *(05, 14, 23)*
5. A refused frame is handed to the primitive as a refusal; a refused anchor is
   not handed over at all. Both seams distinguish *nothing was asked* from
   *something was asked and refused*. Say why one keeps that distinction in the
   value and the other keeps it only in the diagnostics. *(20, 23)*
6. A renamed anchor breaks every link anybody ever shared to it, and undo
   restores it exactly. Say what the reversibility axis reports and why it is
   right by its own definition, then state precisely what it is measured over —
   and use that to explain why a deployment that cares has to reach for
   `protectedPropKeys` rather than expecting the axis to notice. *(06, 08, 23)*
7. A `loom.section` carrying `loom:anchor` renders with no `id` and no
   diagnostic, while a `loom.section` carrying an `anchor` prop renders one.
   Walk the whole path without anything being broken, then say what a model is
   told about each of the two and why that follows from what a catalogue is.
   *(12, 15, 23)*
8. Part V's first four seams answer *what the tree cannot hold* by making a host
   register it. Say why lesson 23's seam cannot use that answer, name the party
   it is unable to see, and state the general question this lesson leaves for the
   next seam — the one about scope. *(18, 19, 20, 21, 23)*

Question 7 is the point of the set. Question 6 is the one where a confident
half-answer is most likely: if yours does not say what "reversible" is measured
over, you have restated the axis rather than used it.

---

## Set AC — two days after lesson 24

Interleaved with 04, 05, 12, 14, 15, 19, 22 and 23. Heavy on 15, because this is
that lesson's registry being asked a kind of question it could not answer before;
and heavy on 23, because the two lessons found the same defect from opposite ends
and the comparison is where the general rule is.

1. A reviewer is shown *3 pieces, no words* for a proposal deleting a band that
   says six things. Say where the words are, name the rule that put them there,
   and then give the four places a consumer could look for "which props are
   words" and the reason each fails — including the one that works and the
   callers it is unavailable to. *(15, 24)*
2. `copy: []` and no `copy` at all are different answers. State what each one
   says, give the shape of the value `copyIn` returns in order to keep them
   apart, and say precisely what a consumer reading only the first field of that
   value is unable to tell. *(24)*
3. Name the other two seams in this course that answer three ways rather than
   two, and state what each one refuses to round off. Then give the rule all
   three are instances of, in one sentence that mentions neither copy nor
   contrast. *(15, 24)*
4. A declared copy prop holds the number `3400`. Say what each field of the
   reading holds, and why each of the two rules producing that outcome is
   individually correct. Then name the caller that can reach it, and say what
   those two correct rules composed into for the whole of this seam's first three
   weeks — and what kept a green test suite from saying so. *(05, 24)*
5. A primitive declares that it is a heading; only a tree can say which heading
   leads. Say why those two facts are kept in different places, name the
   consumers the separation serves, and give the argument against deriving the
   role by probing what the component renders. *(04, 14, 15, 24)*
6. An unknown `role` is refused at registration rather than read as an absence,
   and TypeScript already prevents it. Say who the runtime check is for, give the
   failure it prevents in one sentence, and name two other registry refusals with
   the same shape — then say what a *drifted* declaration has in common with a
   misspelled one. *(15, 19, 24)*
7. Swapping a hard-coded `TITLE_TYPES` for `registry.typesWithRole("heading")` is
   strictly better and one line, and what it would do to this repository is not what
   it would have done when lesson 24 was written. Say what it would have done then,
   what it does now, what changed, and what order the two edits had to land in. Then
   state the general form of that trap without mentioning headings. *(12, 24)*
8. Lesson 23 found a mechanism that is correct, tested and reaches nothing; lesson
   24 found two declarations that were correct, tested and made by nobody. One of
   those two has since been declared right across the library and the other has
   barely moved. Say what the two findings have in common, why neither could fail
   loudly, and what would have had to exist to notice either — then say what
   actually moved the first one, and whether it was something the repository could
   have relied on. *(22, 23, 24)*
9. The gap in question 4 was closed by a third field rather than by naming the
   prop in the list that already existed, which was one line shorter and named
   the node just as well. Give the test that decides between those two designs
   — in a form you could apply to a result type in a system that has nothing to
   do with copy — and then say what the one-line version would have silently
   changed for a caller that was already shipping. *(15, 24)*

Question 2 is the point of the set. Question 4 is where a confident half-answer
is most likely: if yours says the seam is wrong, reread what each rule is
protecting — the interesting version says both are right and the composition was
not. Question 9 is the one that transfers: an answer naming the two fields has
described the fix, and an answer naming what a caller *does* about each has
retrieved the rule.

---

## Set AD — two days after lesson 25

Interleaved with 03, 05, 09, 15, 16, 18 and 24. Heavy on 18, because that lesson
and this one are the same defect met from its two sides; and heavy on 09, because
the consequence the lesson's fourth exercise computes is a rung of the ladder
going silent while behaving exactly as designed.

1. Name the three questions you can ask about a closed set. Say which one a
   compiler answers, give the reason it cannot answer the second in terms of what
   a type is rather than what a compiler lacks, and then say which of the three
   lesson 18's dead `unavailable` was an instance of. *(18, 25)*
2. Write the signature of `everyMemberOf` from memory. Then say what breaks if the
   function is not curried, and what breaks if `[Union] extends [List[number]]`
   loses its square brackets — the *how* in each case, not the fact. *(25)*
3. A field is added to a Zod schema and not to the hand-written type below it,
   joined by `const value: Type = schema.parse({})`. Give the number of errors,
   then the same for the opposite drift, then the rule about assignability that
   makes both answers inevitable. *(25)*
4. You are reviewing a pull request that adds a completeness check. State the one
   question that ranks it. Then rank these four and say which two are closest and
   what separates them: a test against `schema.options`; an `everyMemberOf` call;
   a test against a second hand-written copy; a `Record<Union, true>` in a test
   file. *(25)*
5. Trace `STAKE_ORDER.indexOf(level)` returning `-1` through `compareStakes`,
   `isAtLeast` and `highestStake`, and say what that arithmetic makes of a change
   carrying such a level — naming the two rungs involved and what each returns,
   and why `null` from a rung is not the same as a rung deciding. *(09, 25)*
6. Nothing in the runtime throws, and every refusal is a member of a closed set.
   Say what that buys an audit trail, then say which of this lesson's three
   questions the audit trail depends on being true and which of them anything
   checks. *(05, 16, 25)*
7. `everyMemberOf` does nothing at run time, and nothing in the runtime reads
   `copy` or `role`. Say what each of those two facts buys, what each costs, and
   name the class of consumer that gets no protection from the first. Then say
   what the two have in common as a *kind* of guarantee. *(15, 24, 25)*
8. There are four operations in a delta, and `TREE_OPERATIONS` says so in a value.
   Say why that list exists at all given that the number is not expected to
   change, what checks it today, and what would have to be true for the check to
   be worth less than it looks. *(03, 25)*
9. `STAKE_ORDER` is now checked at its declaration, by the compiler, in the file
   it is written in — which is the strongest mechanism this lesson has. Name the
   route to that `-1` the check closed, name one route it did not, say why no
   check of that kind could have closed it, and then give the general rule in one
   sentence. *(25)*

Questions 4 and 9 are the point of the set — between them they are what
transfers to code that has nothing to do with Loom, and 9 is the one where the
tidy answer is the wrong one. Question 3 is where a confident half-answer is most
likely: an answer that gives the two numbers and not the asymmetry underneath
them has memorised the result rather than the rule.

---

## Set AE — two days after lesson 26

Interleaved with 05, 09, 10, 16, 18, 22, 24 and 25. Heavy on 10, because lesson
26 is unreadable if `confirmHeld`'s behaviour is not solid; and heavy on 24,
because the rule about what a reading owes a caller appears here in its second
form and the two are worth holding side by side.

1. Name the three answers a liveness check can give about a held change. Say
   which one most queues do not have, give the reason folding it into `live` is
   worse than it looks, and then state the general check that reason is an
   instance of — the one you would run on any remedy that has to report on
   itself. *(26)*
2. Write `holdLiveness` from memory. Say exactly what changes if the comparison
   becomes `headRevision > hold.baseRevision`, name the input that tells the two
   apart, and name the code that decides which version is correct — and how far
   away from it the comparison lives. *(26)*
3. A hold against a deleted tree is marked `unknown` and not `dead`, although
   every consequence of the two is identical. Give the argument in terms of what
   a badge *claims* rather than what it causes, and then name the rung behaviour
   in the Gate that is the same discipline. *(09, 26)*
4. Nothing in this runtime throws, and every failure is a member of a closed set
   — and yet `markHoldsFromStore` hands back no `Result` at all. Say why, state
   the rule generally in one sentence, and then say how `unknown` differs from
   the `unavailable` that sat in a union for a month with nothing able to produce
   it. *(05, 18, 26)*
5. A colleague proposes putting `headRevision` on the hold row, written when the
   change is held. Say why it does not work, without using the word "stale" — the
   version that transfers is about which of the two numbers moves, and when.
   Then say what `revision` counts and what a listing can say about a tree
   without loading it. *(10, 16, 26)*
6. A reading owes a caller the difference between *no* and *nobody has said*.
   State that rule for a primitive that has not declared the words it shows, and
   then for a store whose head could not be read — and say what is the same about
   the two, given that one is a declaration nobody made and the other is a
   computation nobody could finish. *(24, 26)*
7. Lesson 22 met a fault belonging to two nodes; lesson 26 met a fact belonging
   to two stores. Say where each remedy is allowed to live and why the second
   one cannot be where the first one is, and name the decision record that
   forbids it. *(22, 26)*
8. `HOLD_LIVENESS` is a three-member list built through `everyMemberOf`, and the
   legend beside it is a `Record` keyed by the same type. Say what each of those
   two checks, what neither checks, and exactly what goes red if a fourth answer
   is added to the union. *(25, 26)*

Question 2 is the point of the set. Question 6 is where a confident half-answer
is most likely: an answer that restates the rule in both settings without saying
what makes them the same rule has recognised it rather than retrieved it.

---

## Set AF — two days after lesson 27

Interleaved with 02, 04, 08, 14, 21, 22, 24 and 25. Heavy on 14, because lesson
27 is a story about one clause of 0008 and reads as a complaint if that clause is
fuzzy; and heavy on 25, because the lesson's fifth exercise is that lesson's
subject found somewhere it did not look.

1. Name the field on `LoomPrimitiveProps` that stops a container reading its own
   children, and say what it holds. Then say why putting the children's props
   beside it would not be a fix — the answer is about which *direction* the
   number has to travel, and it is not the direction you just fixed. *(14, 27)*
2. A colleague proposes a `values` array prop on the chart, which makes the
   maximum computable inside one render function. Name the rule that forbids it,
   list what the fifth month loses, and then state the general rule about what
   earns its own node and what stays a prop. *(02, 27)*
3. State, in one sentence and without mentioning CSS, what you take on when you
   move a computation to a different machine. Then give the data model this
   particular machine offers, and derive from it two ordinary chart features that
   cannot be built. *(27)*
4. The record's title says the browser does the arithmetic. Say which arithmetic
   it does and which arithmetic nothing does — then give the reason the second is
   not a shortfall, in terms of what kind of thing a ceiling is, and say what a
   reader loses across a page when a chart picks its own. *(27)*
5. The clamp is in a stylesheet rather than in a schema or at the Gate. Give the
   argument in terms of what each failure costs a reader, name the lesson whose
   two-axis habit that is, and say what changes when you apply that habit to a
   rendering rather than to a change. *(08, 27)*
6. Exercise D produced four correct figures, four invisible bars, and three
   instruments saying yes. Say where the defect is — it is not a bug in any of
   the files involved — and then say what a check that caught it would be bounded by,
   using the rule about the population a check actually runs over. *(25, 27)*
7. A stat whose magnitude is `0` and a stat with no magnitude render differently
   and look identical. Say where the distinction survives and where it dies,
   state what a reading owes a caller about *no* versus *nobody has said*, and
   then say which of the two this is and which it is not. *(24, 27)*
8. Six stats built before their container come out as `n_1`–`n_6`, the chart is
   `n_7` and the page is `n_8`. Say what an id tells you about position, what it
   is for instead, and what breaks if identity is derived from where a node sits.
   *(04, 27)*
9. Lesson 21 asked where to check a property belonging to no single party; lesson
   22 answered a fault belonging to two nodes with a predicate over a pair.
   Lesson 27's fact also lives between things and got neither answer. Say what is
   different about it, and give the distinction between a fact somebody has to
   **check** and a fact somebody has to **deliver** — naming one thing each needs
   that the other does not. *(21, 22, 27)*

Question 4 is the point of the set. Question 9 is where a confident half-answer
is most likely: an answer that names the difference and stops has done the easy
half, because what transfers is what *follows* from it. Question 6 is the one
where the tidy answer — *the default is wrong* — is the symptom rather than the
defect.

---

## Set AG — two days after lesson 28

Interleaved with 09, 11, 16, 17, 25, 26 and 27. Heavy on 25, because lesson 28
is that lesson's rule applied to prose rather than to a union and reads as a
list of complaints if the rule is fuzzy; and heavy on 16, because a derived copy
is the best of the three sources and lesson 16 is where deriving is actually
argued for.

1. Define a check in one sentence. Then use your definition — not an appeal to
   how hard titles are — to say why a decision record's heading *number* is
   checkable and its heading *title* is not, and name the property the two
   differ in. *(28)*
2. Name the three places a second copy of a fact can come from, in order of
   preference, and give for each what it costs and what it cannot catch. Then say
   what the third one has that the first two do not have at all, and why that is
   what puts it last. *(28)*
3. A bare `(0095)` and a linked `[0095](0095-….md)` cite the same record. Say
   what each carries and what can be held against each. Then give the reason the
   repository writes the weaker form in `src/` anyway — the answer is a rule from
   outside this lane that outranked the check — and say what would have to change
   first for the stronger form to be usable. *(28)*
4. The registry of counted sentences asserts its pattern matches **exactly** once
   rather than at least once. Say what that defends against, describe what the
   suite would report without it, and then name the *other* way such a registry
   rots — the one no assertion inside it can reach. *(25, 28)*
5. State the rule about the population a check runs over. Give two instances from
   this course, one where the population was a union's members and one where it
   was a shape in prose, and say for each what the remedy closed and what it left
   open. *(25, 28)*
6. A hold carries the revision it was judged against and a tree carries the
   revision it is at; ten decision records name what supersedes them and are
   named back. Both are one fact written twice. Say why the first got a function
   and the second got nothing, and what that tells you about when a second copy
   gets cashed in. *(26, 28)*
7. A snapshot is a view you can rebuild from the log, and a self-graded
   confidence number is worth nothing until an outcome arrives. Say what each is
   a second copy **of**, place each in the three sources from question 2, and
   then say precisely how calibration fails to fit — the misfit is the point,
   not a flaw in the scheme. *(16, 17, 28)*
8. Lesson 28's exercise D has the totals in hand and prints verdicts instead.
   Give the reason, then state the general rule about what you take on when you
   manufacture a second copy: who owes the upkeep, why it is normally not the
   person who wrote the copy, and what that implies about which of the three
   sources you should reach for first. *(28)*
9. Exercise F's hollow record — four headings, nothing under them — passes every
   check this repository has. Say which fact the check establishes and which fact
   the people writing records establish. Then say what a reading owes a caller
   about *no* versus *nobody has said*, and which of the two a present-but-empty
   section is. *(24, 28)*

Question 1 is the point of the set. Question 8 is where a confident half-answer
is most likely: an answer that says *because the numbers change* has described
the mechanism and stopped. Question 6 is the one where the tidy answer — *the
second one is only prose* — is wrong, and noticing why is worth the whole set.

---

## Set AH — two days after lesson 29

Interleaved with 12, 15, 20, 24, 25 and 28. Heavy on 25, because the population
rule arrives here for the third time and is the reason six of lesson 29's seven
rows say nothing about the library; and heavy on 12, because *what the model is
told it may write* is what turns an unread declaration from untidiness into a
fault.

1. Name the property every promise `auditRegistry` can check has in common, and
   use it to say why an unread prop is not among them. Then name one other fact
   about a component the same argument rules out, and say what instrument would
   be needed instead. *(29)*
2. A primitive's props schema has at least six readers. Name five, say for each
   what it does that no other one does, and then say which of the five a
   deployment could remove entirely without the schema becoming pointless. *(15,
   29)*
3. The registry refuses a `frames`, a `copy`, an `interactive` or a `reads`
   declaration that names a prop the schema does not declare, and the three
   refusal messages describe one drift. State the drift in a sentence. Then say
   why the component — the place where that rename is actually typed — is the one
   writing of a prop name not held to the schema. *(29)*
4. Reading a prop a schema does not declare is caught. Declaring a prop nothing
   reads is not. Say exactly what catches the first, and then say why no type
   system can catch the second — the answer is about what a type may require of a
   function *body*, not about how clever the checker is. *(29)*
5. `loom.recording` closes over exactly one choice, `shape`; the probe renders it
   once per value of `shape`; the component reads `shape` in none of those
   renders. Explain how all three are true at once, then state the rule in a form
   that would apply to a primitive you have never seen. *(29)*
6. State the rule about the population a check runs over. Give three instances
   from this course — one where the population was a union's members, one where it
   was a shape in prose, and one where it was the states a function could be
   called in — and say for each what the remedy closed and what it left open.
   *(25, 28, 29)*
7. `loom.embed`'s `src` is declared, validated, put in the catalogue, resolved
   against an allowlist, and never read by its component. Say what would break if
   the component read the prop instead of the verdict, and be specific: the answer
   is two strings that are one thing to one reader and two to another. Then say
   which earlier lesson's sentence that is an instance of. *(20, 29)*
8. A reading that cannot answer owes its caller a way to say so, and a sweep that
   finds seven candidates owes its caller something too. Say what each owes, and
   then say which of lesson 29's seven rows would be reported by a check that was
   honest about its own population — and what the report would have to say beside
   the row. *(24, 29)*
9. Lesson 28 asks *where is the second copy*. Lesson 29 has two copies, no
   obstacle, and a correct answer, and is still wrong. Say what it was wrong
   about, state the general rule in a form that mentions neither props nor
   primitives, and then apply it to one claim `decisions/` makes about itself.
   *(28, 29)*

Question 9 is the point of the set. Question 4 is where a confident half-answer
is most likely: an answer that says *TypeScript does not look at bodies* has
described the mechanism and stopped — what transfers is why a language that did
look would still be wrong to require it. Question 2 is the one where the fifth
reader is the one that matters and is the one people leave out.

---

## Set AI — two days after lesson 30

Interleaved with 09, 18, 22, 24, 28 and 29. Heavy on 28, because lesson 30 is its
three-sources rule applied until only one source was left; and on 24, because
*absence is not emptiness* is what let the declaration ship into a library where
nothing had declared.

1. A binding has three parts. Name them, say for each which party holds the other
   end of it, and then say why two of the three can be refused before anything is
   drawn and the third cannot. Your answer to the third must not use the word
   "harder". *(18, 30)*
2. A page binds a source correctly and spells the binding *name* one letter
   wrong. Say what the source does, what the reader sees, what the render
   reports, and what the Gate does with the insert — four answers, and one of
   them is the reason this seam was worth a lesson. *(09, 18, 30)*
3. `reads` has three answers and the catalogue writes only two of them out. Say
   what the third is, how a model is meant to recognise it, and why spending
   words on it would have been the wrong trade — the answer is about which
   answer is common, not about which one matters. *(12, 24, 30)*
4. An entry in `reads` may be a name or a prop that gives one. Give the two nodes
   that show a plain list of names is wrong in *both* directions, say which of the
   two errors you would rather a checker made, and then state the general rule
   about what a declaration must be when the fact it states varies per use. *(30)*
5. `bindingsReadBy` hands back an unresolved declaration and the render walk
   resolves it. Say what argument the registry would have had to accept in order
   to resolve it itself, and state the rule about seams and scopes that follows.
   Then name one earlier lesson where the same question was answered the other
   way, and say what made the difference. *(27, 30)*
6. Lesson 28 gives three places a second copy of a fact can come from. Apply all
   three to a binding name in turn, say why the first two were unavailable, and
   then name the thing the third one bought that is worth more than the check it
   made possible. *(28, 30)*
7. A primitive that has declared nothing is handed a binding no component will
   read, and the runtime says nothing at all. Defend that decision in one
   sentence, attack it in one sentence, and then say what would have to become
   true of a library for the defence to expire. *(24, 30)*
8. Two questions about the same word. A tree names a *primitive type* that does
   not exist and a tree names a *binding name* that nothing reads. Say what each
   costs, which is refused where, and then say why one of them is a reference and
   the other is an agreement — in a form that would let somebody classify a
   third case they have never seen. *(22, 30)*
9. Lesson 29 asked *who is this declaration for*. Lesson 30 has a declaration
   with two parties, both inside one page, and it still went two months
   unchecked. Say what made it uncheckable, and then find one thing in this
   repository's own writing — not its code — that has the same shape, and say who
   would find out if it stopped being true. *(28, 29, 30)*

Question 9 is the point of the set, and question 4 is where a confident
half-answer is most likely: the node a fixed list accuses wrongly comes to mind
easily, and the node it waves through is the one that matters.

---

## Set AJ — two days after lesson 31

Interleaved with 01, 14, 15, 22, 24 and 27. Heavy on 22, because the
`interactive` check is that lesson's predicate arriving from a direction it could
not have anticipated; and on 27, because *hand the work to a different machine,
then live inside that machine's data model* is what decides where a control
publishes a number.

1. A code panel needs a copy button. Name the three shapes the answer could have
   taken, and for each of the two that were rejected give a page — an actual
   page, and what a visitor sees on it — where it goes wrong. *(01, 31)*
2. "A primitive's props are JSON, and a function is not expressible in JSON."
   That reads like a fact about a serialisation format. Say what it is actually a
   consequence of, in a sentence about what a reviewer of a change has to be able
   to do. *(01, 31)*
3. A behaviour is handed to a primitive as a node with nothing left to
   configure, rather than as a component it may pass props to. Give the argument
   for that, and then say what a primitive *does* still decide. *(15, 31)*
4. A primitive that takes a copy control must declare itself `interactive`, and
   the registry refuses it otherwise. Say what that check is protecting, whose
   declaration `interactive` normally is, and why a control the primitive did not
   write changes the answer. *(22, 31)*
5. One control publishes a boolean and another publishes a number, and they
   publish them on different elements. Say where each goes and why they cannot
   swap. Your answer must contain the word "inheritance" and must not contain the
   word "CSS". *(27, 31)*
6. A deployment wires the registered primitive types into its Gate policy and
   nothing else. A model proposes setting `copyable: true` on a code panel. Give
   two answers and keep them apart: what the Gate does, and what the page does.
   Then say which of the two is the reason this seam is safe. *(09, 31)*
7. A page with a copy button on it, rendered to static markup, contains no
   button. Say what that buys, what it costs, and then say what it implies about
   *where* a behaviour can be checked at all — the last part is the one the four
   registration checks are an answer to. *(14, 31)*
8. Two controls of one primitive have to agree about one boolean and the seam
   that built them gives them no way to. Say what they use instead, what the
   rejected alternative would have guaranteed, and why a channel that fails by
   not reaching is the right kind of failure. Then compare it with lesson 30's
   answer to a very similar problem, and say what made the verdicts differ.
   *(30, 31)*
9. The behaviour vocabulary has five members and two primitives in the starter
   library declare one. Say what the healthy reading of that is and what the
   unhealthy one is, and then state the general rule about what a word like
   *closed* on a finding is worth when nothing compares it to anything. *(24, 28,
   31)*

Question 5 is the point of the set, and question 6 is where a confident
half-answer is most likely: the Gate's verdict is guessed wrongly far more often
than the page's, and the reason is that a reader expects a rule to be doing the
work.

---

## Set AK — two days after lesson 32

Interleaved with 05, 09, 14, 17, 25, 28 and 31. Heavy on 25, because *a check is
bounded by the population of values that pass through the place it runs* is this
lesson's second half arriving from the other direction; and on 17, because a
measurement that is not allowed to act on its own verdict is a shape this course
has met before and in a different lane. Question 7 reaches back to 05 for a reason
the lesson only learned after it shipped: what makes the one testable function
testable is that it is handed what it reads.

1. *Does this page overflow* is not a question about the page. Name the inputs the
   answer is a function of, say which of them anybody in Loom owns, and then say
   which one of the ones you listed a reader can change without touching anything.
   *(14, 32)*
2. A `loom.backdrop` sets `overflow: hidden` and has to. State the reason it has
   to, state what that costs the one automated visual check in this repository,
   and then say how far the cost reaches — not which primitives clip, but which
   *pages*. *(32)*
3. `scrollWidth` is the obvious way to ask how far a clipping box's content
   reaches, and it is wrong twice over. Name both things in the starter library it
   reports as defects, and then say what a false line in a report costs. Your
   answer to the last part must not be "it is inaccurate". *(32)*
4. The instrument is two functions in two files. Say what decides which side a
   piece of it goes on, give one exclusion that can live on the arithmetic side
   and one that cannot, and state the general rule about why. *(25, 32)*
5. The per-box reading deliberately does not change the exit code, and the record
   argues that folding it in would have been how the instrument got switched off
   rather than fixed. Give that argument, give the counter-argument, and then say
   what would have to be true before the decision is revisited. *(32)*
6. Compare this seam's remedy with lesson 31's. Both are about a fact that is
   invisible to a pure function of the tree, and they end up in different places.
   Say what makes a *declaration at registration* the right answer in one case and
   impossible in the other, in a sentence about who knows. *(31, 32)*
7. Of the functions this harness hands to a browser, a test in this repository can
   run one and cannot run the others. Say what decides that — the answer is about
   their signatures and not about anybody's effort — then say what the suite is left
   asserting about the ones it cannot run, and what it still cannot assert about the
   one it can. Finish on why lesson 29's remedy, instrument the place the thing
   happens, reaches none of them. *(05, 29, 32)*
8. A primitive handed twelve rows it can read eleven of says so, and a primitive
   whose heading will not fit a phone does not. Both faults are invisible from
   outside at the moment they happen. Say what distinguishes them, and make your
   answer a sentence about a *party* rather than about a mechanism. *(24, 32)*
9. Lesson 17 has a number that measures something and is not allowed to act on
   it. This lesson has a reading that names something and does not fail the build.
   Say what the two have in common, and then say what makes them different —
   because one of the two separations is permanent and the other has a shelf life.
   *(17, 28, 32)*

Question 4 is the point of the set and the one that transfers furthest outside
this repository. Question 2 is where a confident half-answer is most likely: the
reach of the blindness is the part nearly everybody understates, and it is
understated in the same way every time.

---

## Set AL — two days after lesson 33

Interleaved with 05, 14, 18, 28, 29 and 32. Heavy on 14, because *what a renderer
returns is a description and not a page* is the sentence this lesson is built on
and the one most readers have filed under something else; and on 28, because the
construction that keeps this seam honest is that lesson's cheapest second copy,
which is no second copy at all.

1. A source answers twelve rows and a primitive draws eleven. The other ways a
   binding can be wrong were reported by the walk on its own and this one was not.
   Say what makes it invisible from outside, and make your answer about *where a
   shape lives*. *(18, 33)*
2. The page says some entries could not be shown and carries no figure; the
   diagnostic carries both figures and no sentence. Give the reason for each, and
   then say who each one is addressed to. *(33)*
3. `renderLoomTree` returns an element and an array of diagnostics. Say what an
   element *is*, and then say what follows about anything a component body wanted
   to add to that array. The first half is lesson 14's and the second is this
   lesson's. *(14, 33)*
4. A component that reports its own count is wrong for three reasons. Give all
   three, and then say which one would still hold in a system with no component
   model in it at all. *(33)*
5. Eight declarations on a primitive are data and one is a function. State the
   question that decides which, and then apply it to a declaration this course has
   not discussed: how long a primitive's content takes to read. *(29, 33)*
6. The declaration is handed the node's props and the node's answers and
   deliberately nothing more. Give the reason, and say what is lost by handing it
   the resolved tree as well. Your answer must not be about performance. *(33)*
7. A declaration returns three readings and the second one is impossible. Say what
   happens to the other two, give both halves of that argument, and then say what
   happens to the page — and which promise of this course that last answer is
   keeping. *(05, 14, 33)*
8. Compare this seam's remedy with lesson 29's and lesson 32's. All three are
   about a fact a checker cannot get at, and they end in three different places.
   Say what decides which, in a sentence about *who owns the inputs* and a second
   about *when that party runs*. *(29, 32, 33)*
9. A declaration that says twelve of twelve for a component that drew eleven is
   silent and believable. Say what makes it unlikely, say why that cannot be
   enforced, and then name two other declarations on a primitive that carry the
   same exposure. *(28, 33)*

Question 8 is the point of the set and the one that transfers furthest outside
this repository. Question 3 is where a confident half-answer is most likely: most
readers can say the renderer is pure and total and have never had to say what the
thing it returns actually is.

---

## Set AM — two days after lesson 34

Interleaved with 08, 09, 16, 17, 24 and 25. Heavy on 24, because the shape of this
seam's answer is that lesson's rule applied to a record instead of a reading; and on
09, because the partition cuts a list that lesson taught you to read as one thing.

1. The Gate's stakes vocabulary has fourteen rules, cut into two kinds. Give the
   question each kind answers, and then say which kind can be re-run from a journalled
   record — making your answer about *what the rule reads* and not about what the
   record holds. *(09, 34)*
2. A telemetry record holds shape and not content. Name two things an analysis
   carries that therefore never reach a record, and then say which of the Gate's
   rules stop being answerable as a result. *(17, 34)*
3. A caller rebuilds an analysis from a record, passes six empty lists for the
   specifics it does not have, and re-runs `assessStakes`. Say what it gets right
   and what it gets wrong, and then say why *which* of the two it gets wrong is the
   whole objection. Your last sentence should be about populations. *(34)*
4. A reading hands back three fields where one list would have fitted. State the
   rule that decides how many fields an answer needs, and then apply it to a level
   computed from a record with a field missing. *(24, 34)*
5. `unreadable` is empty for one record and names a rule for another, and neither
   record changed between the two calls. Explain, and then give the sentence a
   screen has to put next to a level whose `unreadable` is not empty. *(34)*
6. Two records are missing the count that `broad-change` reads, and one of them can
   be asked about breadth anyway. Give the argument, say what makes it an argument
   rather than a lookup, and name which of the three sources of a second copy it
   is. *(28, 34)*
7. Say why the answer to *what would these stakes have been* may not be a
   `StakeAssessment`. Name the field that rules it out, and say what returning that
   type with the field left empty would cost somebody who found such a record in a
   log a year later. *(34)*
8. Stakes and reversibility are two axes, and a stakes level is one word off a
   four-rung scale. Say what that word cannot carry, and then say where the thing it
   cannot carry had to go instead. *(08, 34)*
9. Two lists in `src/` hold the two halves of the stakes vocabulary and neither is
   written out by hand. Say how each is produced, and then say what would go wrong
   the day a fifteenth rule is added if they had been written out. *(25, 34)*

Question 3 is the point of the set. Question 1 is where a confident wrong answer is
most likely: the cut is not about how severe a rule is or how often it fires, which
is why two rules at different levels sit on the same side of it.

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
| R | 2 days after L14 | | |
| S | 2 days after L15 | | |
| T | 2 days after L16 | | |
| U | 2 days after L17 | | |
| V | 1 week after Part IV | | |
| W | 2 days after L18 | | |
| X | 2 days after L19 | | |
| Y | 2 days after L20 | | |
| Z | 2 days after L21 | | |
| AA | 2 days after L22 | | |
| AB | 2 days after L23 | | |
| AC | 2 days after L24 | | |
| AD | 2 days after L25 | | |
| AE | 2 days after L26 | | |
| AF | 2 days after L27 | | |
| AG | 2 days after L28 | | |
| AH | 2 days after L29 | | |
| AI | 2 days after L30 | | |
| AJ | 2 days after L31 | | |
| AK | 2 days after L32 | | |
| AL | 2 days after L33 | | |
| AM | 2 days after L34 | | |
