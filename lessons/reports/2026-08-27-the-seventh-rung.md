# 2026-08-27 — Lesson 09 was wrong, and the correction is a section

**Landed:** a correction and an extension to
[`lessons/09-the-gate.md`](../09-the-gate.md), one sentence in
[`lessons/08-two-axes.md`](../08-two-axes.md), and amendments to **Set K
question 1** and **Set M question 5** in
[`lessons/review-schedule.md`](../review-schedule.md). One finding in
`FINDINGS.md` for `Loom daily build`. No new lesson, and no new review set.

`pnpm install && pnpm verify` **green**: 1695 runtime tests across 108 files,
1880 app tests across 132. `next build` prerenders the same 16 lessons and 20
review sets as before — nothing here adds a page.

Lesson 09 is now roughly **65–80 minutes** to work through, up from about 55. The
new material is one Predict question, two sections, one exercise and its answer,
and everything else is arithmetic.

## Not a new lesson, and not a choice

The syllabus said lesson 17 and the last run's report said lesson 17; #168 has
been open with it since yesterday afternoon and has no comments on it. The brief's
rule 5 decides this run instead: **an existing lesson that is now wrong outranks a
new one.** Lesson 09 said the Gate has six rules and it has had seven since
19 August.

The previous run found it while writing lesson 17's opening sentence, filed it,
and said explicitly that it was the next run's first job. It was right to leave
it: correcting a number is four minutes and does not deserve a paragraph, but the
number was not the whole of it.

## What was actually wrong, and how much

`confirmRedirectedSubmission` was inserted at position five of
`ESCALATION_RULES` on 19 August (`d541bea`, #102) under
[0071](../../decisions/0071-moving-a-forms-destination-is-a-stake-of-its-own.md).
Lesson 09 merged the same day, in the PR before it.

Three separate kinds of wrong, and only the first is the one that got filed:

1. **The count.** Eleven occurrences in lesson 09, one more in lesson 08.
2. **Every rung number below position five.** Ten references, each naming a rule
   one place higher than it sits — including both printed answers about
   unreachable rungs, where the confidence pair deletes rung 7 and the answer
   said 6, and the stakes pair deletes rung 6 and the answer said 5.
3. **Two closed-book review questions.** Set K question 1 and Set M question 5
   asked the reader to write the Gate rules in order from memory, and then
   checked their recall against a list with a rung missing. That is the one that
   matters, because retrieval practice with a wrong key does not merely fail to
   teach — it teaches the wrong thing and does it by the most durable mechanism
   the course has.

Also stale and fixed while here: lesson 09's *Deeper* still said "Next: 10 — The
pipeline *(not yet written)*", eleven days after 10 was written.

## Why this became a section rather than a find-and-replace

Because the correction has better material in it than most new lessons do, and
because the lesson's central claim is about what an ordered list buys you when a
new input arrives. That claim had never been tested in front of the reader. It
has now been tested twice.

**The ladder's bill came due and it was cheap.** 0002 wrote down what adding a
rule would cost — *"adding a rule means choosing its position in the precedence
order, which is a visible decision rather than a weight nudge"* — and the lesson
now shows what was actually paid on 19 August: a new module, a factor, a reason
code, one function, and **one line in the middle of an array**. No existing rule
changed and no existing verdict changed except for changes that move a form.
Against *The problem*'s decision table, which was at 192 rows and would now be at
384. The lesson's opening argument stops being a thought experiment.

**Rungs 4 and 5 are the same argument, and that is the point of having two.** The
old lesson called rung 4 "the rule with the sharpest argument of the six" and
gave it a section. With a second instance the section changes shape: the argument
is stated once, in a form that covers both, and the reader is asked in *Explain it
back* to invent a third fact that would qualify. One instance is a special case;
two is a shape, and the shape is the transferable thing:

> **When the thing that must not happen is *silently*, a level cannot say so and
> a rule above the ceiling can.**

**Predict 4 is a question with a wrong answer almost everybody reaches.** One
prop, one node, reversible, 99% confident, developer origin — and it moves where
a form posts. The instrument that comes to mind is `protectedPropKeys`, which is
what the maintainers reached for first and put down for three reasons 0071 names.
Those three are now an entry in *It could have been otherwise*, and the general
form is worth more than the case: **a knob that can be made to produce the right
outcome is not the same as one that produces the right sentence.** On a system
whose whole claim is reviewability, the sentence is half the feature.

**And the part I did not expect to be teaching.** The lesson now says out loud
that it was wrong, and uses it:

> **An executed example proves what it reached. It says nothing about what it did
> not reach, and the second kind of claim is the one prose likes to make.**

Every printed output in lesson 09 was correct for the entire week it was wrong.
The exercises run against `sampleTree`, which contains no form, so
`redirectedSubmissionsBetween` finds no destinations before the change, returns
an empty list on every row, and `confirmRedirectedSubmission` returns `null`
without ever being noticed. Exercise B claimed to walk the whole ladder from
outside — and it does walk it, and it walked past a rung without printing a
single wrong line.

Running every exercise is the discipline this course leans on hardest, and this
is the class of error it cannot catch. Saying so inside the lesson that got
caught seemed better than saying it in a report the reader will not read.

## The new exercise

**G — the rung the ladder walk never reached.** Six rows on `formTree`, the one
fixture with somewhere to post. Executed; the output in the answer is
transcribed from the run, and I re-extracted the code block from the finished
markdown and ran *that* to be sure the printed listing and the printed output
belong to each other.

Three of the six earn their place:

- **Row 2** is the rule earning its position: every origin's ceiling set to
  `critical` — the widest the type permits — and the change is still held. That
  is rung 4's argument, arriving a second time, as two lines of output.
- **Rows 1 and 4 have the same `detail` and different codes.** A redirect held at
  rung 5 and the same redirect refused at rung 2 under `refusalFloor: "high"`
  carry the identical sentence, because neither rule wrote it — `assessStakes`
  did, when it built the factor. I had not noticed that before running it, and it
  makes a point the lesson wanted anyway: **a reason code says which rule spoke;
  the detail says what was found**, and they vary independently.
- **Row 6 moves the destination and moves it back**, in one delta, and nothing is
  escalated — because the factor is measured between the two trees rather than off
  the operations. Q7 asks what the delta would have to look like for the answer to
  change, and the honest answer is that no delta can: if the tree after the change
  named a different endpoint it would not be row 6. Reading the operations instead
  would catch it and would also escalate every no-op.

**Row 3 is the tie being broken.** A change that both discards later work and
moves a form is held either way; which sentence the person is shown is decided by
one line's position in an array and by nothing else. That is the cleanest
demonstration in the lesson of what "the order is the decision" means, and it
only exists because there are now two adjacent rules with the same kind.

`src/scratch.test.ts` was deleted before committing.

## What the corrections cost the reader

Set K question 1 and Set M question 5 both now ask for seven, and both gained a
second half rather than a corrected number — K asks for the *other* pair (two
rules that read different inputs and sit together because they share an
argument), M asks which of the seven arrived a month after the rest and what its
position buys above and below it. A reader who did Set K last week learned a
six-item list. The amended question makes them notice the difference rather than
silently overwrite it, which is the more useful failure.

Nothing was added to the schedule. This run wrote no new lesson, so there is no
new set to interleave, and #168 already adds Sets U and V.

## Found while teaching

**One, filed for `Loom daily build`.**
[0002](../../decisions/0002-gate-is-a-pure-function-of-two-axes.md) states the
decision as *"six ordered rules, first match wins"*. It has seven. 0071 is an
extension rather than a reversal, so nothing is superseded and the design is not
in doubt — but the record is the entry point a reader takes the Gate from, and
this lane wrote a lesson from it. 0035 did the same thing on 4 August and left
the same sentence alone, so the count in 0002 has now been wrong for longer than
it was right.

The remedy is theirs to choose and the two obvious ones differ in what they
promise: a dated amendment note fixes today, and making 0002 name the ladder
without counting it would end the class. `decisions/README.md` has rules for
superseding and none for a record that is still right about the decision and
stale about the shape.

The wider version belongs to nobody in particular and is in the finding: **nothing
connects a list in `src/` to a sentence that counts it** — not in a record, a
lesson, a docs page or a marketing claim — and `pnpm verify` cannot notice. Four
surfaces now describe this runtime in prose.

Nothing else. In particular, `gate.ts`, `redirection.ts` and `stakes.ts` are
correct, well commented, and say why; the lesson's argument with them is nil.

## What is next

Unchanged from the last run's proposal, minus the item this run did:
**runnable exercises**, the last of the brief's four pieces of course machinery
and the only one still untouched. This run is an argument for it. Exercise G is
worthless to a reader who does not paste it into `src/scratch.test.ts`, and rows
1 and 4 in particular are a result nobody predicts and nobody who skipped the
paste will ever see.

The two questions #168 put to the maintainer are still open and still his: what
the next run does now that the syllabus is finished, and whether there is a
Part V.
