# 2026-08-29 — Lesson 07 was wrong, and it was wrong about its own finding

**No new lesson.** [`lessons/07-measuring-a-change.md`](../07-measuring-a-change.md)
has been describing pre-0044 behavior for three weeks, and the correction
outranks the syllabus — which is finished anyway, and whose last two entries are
open PRs nobody has read.

Landed: a rewritten section of lesson 07's *The idea*, a changed exercise D with
its executed output, a rewritten Q4 and Self-check 4, three corrected counts, the
`It could have been otherwise` alternatives replaced with the ones actually
weighed; four corrected claims in lesson 08; amended Set I question 1 and Set J
question 1 in `review-schedule.md`; and four stale *(not yet written)* markers in
07, 08, 09 and 11 turned into links to lessons that have existed for weeks.

`pnpm install && pnpm verify` is green except for one test that is **red on
`main` before this branch exists**: `(marketing)/_lib/facts.test.ts` expects 95
decision records and the site's copy says 94. Confirmed by stashing this diff and
running it on a clean tree. #182 and #184 both already say so. Otherwise 1962
tests pass across 133 files.

Working through the changed parts of 07 takes about **25 minutes** if you have
already done the lesson — Predict 2 is worth re-attempting cold, and exercise D
is worth re-running rather than reading, because it prints six numbers now and
two of them are not the ones the agreement is about.

## What decided this run: an audit, not a hunch

Nothing in the syllabus was left to write. Lesson 17 is #168, lesson 09's seventh
rung is #176, the exercise runner is #184; all three are open, unmerged, and
carry unanswered questions to the maintainer. So this run went looking for drift
instead, on the theory #176 established: the course makes prose claims about
lists in `src/`, and nothing checks them.

The method was blunt and cheap. Extract every `ts` fence from every lesson's
*Try it* section, concatenate them in order, write them to `src/scratch.test.ts`,
run, and compare the transcript against the outputs the lesson prints — with ANSI
stripped, because vitest colors numbers and a naive diff reports every one of
them.

The result, lesson by lesson:

| Lesson | Fences run | Verdict |
| --- | --- | --- |
| 05 | 4 | clean |
| 06 | 7 | **does not compile** — `buildElement` missing from the preamble. Already found and fixed by #184; not touched here. |
| 07 | 6 | **drifted** — three exercises, four prose claims. This run. |
| 08 | 7 | outputs clean, **four prose claims stale**. This run. |
| 09 | — | **wrong** — six rules against seven. #176. Not touched here. |
| 10–16 | 39 | clean |

So: two of the sixteen lessons were factually wrong on `main` this morning, a
third does not run as printed, and the other thirteen are exactly right. That
ratio is worth recording, because it is the first time anyone has measured it.

## What drifted, and why it is the best possible thing to have found

Lesson 07's exercise D asks the reader to predict the stakes of three deltas
under a policy that protects `loom.card`: remove the slot, move the slot, move
the card. When the lesson was written on 8 August it printed **critical, medium,
high** — and the whole of Q4 was built on the middle row, where moving the slot
that contains a protected card reported `touchedPrimitiveTypes: []` and came out
a whole level below the same relocation named differently.

The lesson called that an open question, laid out three defensible answers, and
recommended the cheapest: document the field better and change nothing.

**It was filed as a finding, and the framework routine disagreed and fixed it.**
[0044](../../decisions/0044-a-move-relocates-a-subtree-and-the-analysis-measures-the-subtree.md)
names this lesson in its *Context*, quotes exercise D's table, and its
*Alternatives considered* opens by rejecting this lesson's own recommendation:

> The lessons routine reached its recommendation from the field's *name*, and
> this record reaches a different one from the *verdict*, which is the thing that
> has to be defensible.

Today the three rows print **critical, high, high**. `touchedPrimitiveTypes`
means created, destroyed or reconfigured and a move contributes nothing to it;
`relocatedPrimitiveTypes` and `relocatedNodeCount` carry what travelled; and
`protected-type-relocated` fires at `high` for both spellings.

The lesson has been teaching the defect, as a live question, for three weeks
after it was answered. It has also been telling readers to hold two readings at
once for a design that no longer exists.

## What I emphasised, and why

**The generalisation, not the incident.** It would have been easy to patch three
outputs and move on. The reason 0044 is worth a section rather than a
find-and-replace is that it is a rule about a whole class of system: *a
measurement whose input is authored by something with freedom of expression must
be invariant under that freedom.* A framework a person types into can tolerate a
verdict that shifts with phrasing, because the person picks one phrasing and is
also the party being gated. Loom cannot, because the thing being gated is the
author. Self-check 4 now asks for exactly that distinction and gives the level
away for free, because the level was never the hard half.

**Agreement is not sameness, and the exercise now proves it.** I extended D's
report to print `relocated`, `moved`, `relocatedNodes` and `affected`, and the
output earns its extra width: the two relocations agree on level and disagree on
almost everything else. `relocatedNodes` is **3** for the slot-move and **2** for
the card-move, `affectedNodeIds` holds a different single id in each, and the
slot-move carries a second factor the card-move does not. So Q4's second half now
asks the reader to sort three differences into *fact about the change* and
*artefact of the wording*, and all three turn out to be facts. That is a much
better question than "spot the surprise", and it is only available because the
surprise was fixed.

The point it lets the lesson make: phrasing-independence is a property of **the
fields the rules read**, not of the record. Everything else may differ freely.
A reader who thinks 0044 made the two deltas identical has learned the wrong
thing, and the printed `3` and `2` are there to stop them.

**The correction is stated out loud, in the Answers, after the exercise.** It is
a subsection titled *What this lesson used to say here*, and it says two things:
that running the exercise found a real defect while the lesson describing it
stayed wrong for three weeks afterwards, and that a resolved question is a real
loss to a course. Before 0044, Q4 asked you to hold two honest readings at once,
which is better than anything a settled design can offer. That is the right trade
and it is still a loss, and saying so seemed better than pretending the lesson
had always said this.

This follows #176's precedent, and #176's question 3 to the maintainer — *should
the course be told when it has been wrong?* — is still unanswered. If the answer
is no, that subsection and #176's equivalent both come out.

**The late fields, and the shape they arrived in.** Lesson 07 used to say seven
of ten analysis fields cross into telemetry, and invited the reader to work out
which of the three that do not they would defend. One of the three,
`removedPrimitiveTypes`, now does cross — the same pass that produced 0044 found
its omission. So the lesson's open invitation was answered by the system, and the
answer came with
[0045](../../decisions/0045-a-telemetry-field-added-later-is-optional-forever.md)
attached: a telemetry field added after records exist is optional and never
defaulted, because `.default([])` puts *no types were relocated* in the mouth of
a record that could not have named one. The lesson now carries that paragraph,
because "the record stays honest about what it was in a position to say" is the
same argument as *The problem*, one layer down.

Correct counts now: **fourteen** analysis fields, **ten** of which reach
telemetry; four do not — `affectedNodeIds`, `configuredPropKeys`, `nestedTargets`
and `redirectedSubmissions`.

**Lesson 08 gained a third row, and it is the useful one.** The table of
`ChangeAnalysis` fields that feed both axes said two and now says three, because
`relocatedPrimitiveTypes` is read by `protected-type-relocated` on one axis and
against `outOfTreeEffectTypes` on the other. That row is worth more than a
correction: it arrived *after* both axes existed and both picked it up
independently, neither having to know what the other did with it. A design where
a shared input coupled the axes could not have absorbed a new one that way — so
the lesson's central claim now has evidence from a field that postdates the
claim. Also corrected: ten stake factor codes, not eight.

## What the exercises revealed

Six of lesson 07's fences were executed against `main` at `3a57feb` and every
number in this diff is transcribed from that run. `src/scratch.test.ts` was
deleted before committing.

**Exercise A, B, C and E were all still exactly right in their *interesting*
parts** — and B and E were wrong anyway, because both print a whole
`ChangeAnalysis` and four fields have been added to it since. That pair is worth
holding next to each other: the outputs a lesson *reasons about* survived three
weeks of runtime change untouched, and the outputs it merely *transcribed* went
stale silently. A full `JSON.stringify` of a runtime type is a hostage to
fortune in a document nothing runs.

**The `relocatedNodes: 3` versus `2` result is the one I did not predict.** I
expected 0044 to have made the two relocations identical, because that is how its
*Decision* reads — *the analysis answers the same for the same physical change*.
It has not, and it should not have: moving the slot really does relocate one more
node than moving the card, because the slot itself travels. The two deltas are
not two spellings of one change; they are two changes that agree about the one
thing the policy asked. Getting that wrong in my own head is why exercise D now
prints the number.

**`move main` keeps `shallow-structural-change` and `move card` does not**, so
the two rows reach `high` by different routes. Equal levels, unequal assessments.
That went into the answer as the third difference.

## Found while teaching

**One, and it is mine, so it is not in `FINDINGS.md`.**

`apps/loom/app/(lessons)/_lib/markdown.ts` opens with a promise it does not keep:

> a lesson that needs something else will fail loudly at build time rather than
> render as punctuation the reader has to ignore.

I wrote the *What this lesson used to say here* section as a `<details>` block
first, ran `pnpm verify`, and it passed. Raw HTML is not one of the constructs the
parser supports; it is not rejected either. It falls through to `paragraph`, so
`/lessons/07` would have rendered the literal string `<details>` on its own line
and the summary as body text — the exact failure mode the comment says cannot
happen. I rewrote the section as an ordinary `###` heading rather than grow the
parser inside a lesson-content PR, so nothing is broken on the page today.

The fix is small and belongs to a machinery run: `parseBlocks` should refuse a
line that starts with `<` and is not inside a fence. Filed here rather than in
`FINDINGS.md` because `(lessons)/` is this lane's.

**Nothing for another routine this run.** In particular the `(marketing)` facts
test failing on `main` is #182's, already reported twice, and 0002's stale "six
ordered rules" is #176's — both already filed by the runs that found them.

## What is next

The audit above is the argument for the thing #184 built and #176 asked for, and
it is now stronger than either of them made it. Executed fences catch outputs;
they caught nothing here, because lesson 07's *prose* was what drifted and its
exercises kept printing correct values for a design that had changed underneath
them. Three of the four things wrong with lesson 07 were sentences that count
something in `src/` — fourteen fields, ten crossing, ten factor codes — and that
is now the third run in a row to find that class.

So the proposal for the next machinery run is a check on the *countable* claims,
not the executed ones: a small table in the lessons suite mapping a phrase in a
lesson to the length of a list in `src/`, failing when they disagree. It is the
half of #184's argument that #184 could not reach, and #176, #184 and this run
are three independent pieces of evidence that it is where the errors are.

If the next run is a lesson instead, there is no syllabus entry left and the
question of a Part V has now been open across three PRs.
