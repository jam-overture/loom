# 2026-08-23 — Lesson 14: Rendering

**Landed:** [`lessons/14-rendering.md`](../14-rendering.md), its syllabus link
in `lessons/README.md`, **Set R** in `lessons/review-schedule.md`, and the four
count updates in `apps/loom/app/(lessons)/` that a seventeen-set schedule had
hardcoded.

`pnpm install && pnpm verify` **green**: 1504 runtime tests across 101 files,
1125 app tests across 92. Nothing skipped, nothing weakened. `next build`
prerenders eighteen review sets, so Set R is live in the queue.

Part IV opens. Lesson 13 closed by naming this one exactly — *"the tree as a
total, pure projection — the fourth projection in a course that has now used
the word in three lessons, and the first one whose consumer is a person rather
than a model"* — and the lesson is built on that sentence.

## Reader feedback: nothing to address this run

**#136** (this lane, the lesson pages) is open and has no maintainer comment.
The other eleven open pull requests are other lanes. The two questions #136 put
to the maintainer — whether the whole-body Predict gate is too strict, and
whether `renderDelta`'s prop asymmetry is a defect — are both still unanswered,
and both are restated in this run's PR comment rather than re-asked in a new
place.

Nothing this run had to change on account of a `Superseded` record: 0008 is
`Accepted` and has not been superseded or amended.

## A lesson rather than machinery, and why

The alternation says either is fine once `(lessons)/` exists. The last run was
machinery (#136), so this run is a lesson, and Part IV had been waiting for one
since 13 landed on 08-21.

**The material is as settled as anything in the repository.** 0008 is
`Accepted`, dated 2026-07-29 — 25 days. `src/render/render.ts` last changed on
08-18 and `request.ts` on the same day, both for the submission seam, which is
an addition at the edges rather than a change to the walk. The four properties
the lesson is actually about — purity, totality, ids-as-keys, parse-at-the-
boundary — are all in the original record and none of them has moved.

The one file I deliberately did **not** build the lesson on is
`diagnostics.ts`'s `describeRenderDiagnostic`, which landed 08-21 and is two
days old. It appears in the exercises because it makes the output readable, and
no argument in the lesson depends on it existing.

## What I emphasised, and why

**The spine is a distinction, not a mechanism: `Result` versus a diagnostic.**
Lesson 05 spent itself on "nothing throws, failures are values, the caller
decides", and then the central function of §3 returns no `Result` at all. A
reader who files that under "an exception to lesson 05" has learnt a rule with
a hole in it. So Predict 2 asks them to argue *both* sides before anything is
explained, and the resolution is stated as one line:

> `Result` is for a failure that replaces the answer; a diagnostic is for a
> failure the answer survives.

Everything else in the lesson hangs off that, including the reason
`renderRequest` *does* return a `Result` — the boundary can fail, the
projection cannot.

**The three grades of failure are the part I most want to survive a month.**
Thirteen diagnostic codes, three behaviors — omit, degrade, report — and one
question that assigns them: *would rendering this node hand a primitive
something its own types say cannot occur?* That question is derivable rather
than arbitrary, and the lesson says which earlier argument it is a restatement
of (0013's "two failures that would produce different downstream answers must
not be one code", applied to actions rather than to codes). Self-check 1 makes
the reader apply the rule to a fault the table does not list.

**Lesson 04 gets its bill paid here, and I made that explicit.** Ids as React
keys is the payoff of an argument made three lessons earlier, in a different
subsystem, in a vocabulary lesson 04 never used. The Reflect prompt asks the
reader to find one more instance of that shape in Parts I–III, because "you
keep finding you already paid for things" is what a good foundational decision
looks like from the inside and it is not visible from any single lesson.

**Predict 3 is the one I expect most readers to get wrong**, and it is the only
prediction with an exact numeric answer: how many times has `renderLoomTree`
called your components when it returns? The answer is zero, and it makes the
purity claim much stronger than it first reads — the walk does not execute
anybody's code at all, so there is nothing in it that *could* do IO. Purity
here is a consequence of what the renderer produces, not a discipline it
maintains.

## What the exercises revealed

Six exercises, all executed in `src/scratch.test.ts` against `main` at
`a51c6bd`, every output in the lesson copied from a real run, and the file
deleted before committing. Four of the six produced something I had not
predicted correctly myself.

**Exercise B: four unrendered nodes, one diagnostic.** `sampleTree` with an
empty resolver reports exactly one `unknown-primitive` — for the root. The
other three are inside the omitted subtree and are never reached, resolved or
reported. I had written "four" in my own notes before running it. That makes a
sentence worth having in the lesson: **diagnostic count is not fault count**,
and anyone using diagnostic volume as a health signal is measuring where the
walk stopped rather than what is broken. A deployment that lost its entire
primitive library reports one diagnostic per page.

**Exercise B, second half: `element` is `null`.** `isValidElement` is `false`
and the markup is `""`. 0008 says rendering "always returns an element", and
the honest reading is that it always *returns* — no failure case, nothing
thrown — with `null` being a legal `ReactNode` that renders as nothing. A
completely empty page and a completely fine page come back through the same
channel with the same type, and only `diagnostics` tells them apart. I left the
discomfort in rather than smoothing it: it is the trade stated at its sharpest,
and it is what the host's obligation to read `diagnostics` is built out of.

**Exercise F: three calls, not four.** The counting primitive I wrote ignores
`loom.slots`, so the card inside the `main` slot is never placed and its
component never runs — not omitted, not diagnosed, simply never asked for. That
is 0051's rule with its consequence attached, and it is **the one failure in
the whole lesson that produces no diagnostic at all.** It became the lesson's
bridge to 15: the render seam did its entire job and has nothing to report,
which is exactly why `auditRegistry` has to exist somewhere else.

**Exercise A: the card renders after the footer.** The tree is
`page → [header, main(slot → card), footer]` and the markup is `header, footer,
article`. Not the renderer reordering anything — the test primitive in
`testing/primitives.ts` places its regions after its children, and where a
region goes is the primitive's decision. It is the third-best demonstration in
the course of why `slot` is a distinct kind, and it is free, so the lesson asks
the reader to predict the order and then explains it.

**Exercise C, incidentally:** the walk prints `n_5` for the slot and `n_4` for
the card, which is the ordering the 08-05 identity-recycling correction had to
fix in lessons 01–03. It is now a callback rather than an erratum, and the
lesson says so — falling into that trap twice is worth more than being warned
about it once.

## Found while teaching

Nothing filed in `FINDINGS.md` this run. Two observations that did not reach
the bar, recorded here so the next run does not spend time rediscovering them
and deciding again:

**A node that is about to be omitted still reports its reserved-prop faults.**
In Exercise D a card with a misplaced `loom:theme`, an unrecognised
`loom:nonsense` and props that fail validation produces three diagnostics, and
then the node is not on the page. `reportUnreadReservedProps` runs before
`validateProps`, so two of the three describe consequences nobody will ever
see. I did not file it, for three reasons: it is cheap, the checks are
genuinely independent and suppressing a finding because a later finding turned
out to be fatal is its own kind of dishonesty, and the only concrete cost —
that counting diagnostics is a poor proxy for counting broken nodes — is
already true for the much larger reason Exercise B found. It is in the lesson
as an observation about ordering rather than as a defect.

**0008's "it always returns an element" is loose about `null`.** The type is
`ReactNode`, the value in the empty case is `null`, and the record's phrasing
reads as a promise of an element. Not filed: the record is `Accepted`, the
claim it is making (totality) is true and is what the sentence means in
context, and `decisions/` is not this lane. Noted here because it is the kind
of thing a reader checks the record against and briefly doubts themselves over.

## Needs the maintainer

Both carried from #136, neither re-asked in a new place:

1. **Is the whole-body Predict gate on the lesson pages too strict?** Reading a
   lesson on the surface means writing every prediction first, with no skim
   path. I still think that is right, and you are the reader.
2. **Is `renderDelta` showing a `configure`'s prop keys without values, and an
   inserted node's props in full, a defect?** It sits in lesson 13 as a
   judgement call for the reader rather than as a finding against the
   framework.

## Where 15 goes

Primitives and the registry. Lesson 14 leaned on the resolver as one lookup and
deliberately left everything behind it alone, so 15 has a clean door in — and
Exercise F left a loose end pointing straight at it: a primitive that silently
drops a region it was handed produces no diagnostic, and something has to catch
that. `auditRegistry`, `definePrimitive`, declared props, declared strings and
the `interactive` declaration are all settled and have been for a week or more.

If the run after this is machinery rather than a lesson, the piece I would pick
is the one #136 could not do: **the review queue and the lesson pages sharing
one record of what a reader has actually done**, so working through lesson 14
on the surface is what makes Set R come due, without the reader telling the
page twice.
