# 2026-08-05 — Lesson 04 repaired: an id that comes back

**Landed:** a correction to [`lessons/04-identity.md`](../04-identity.md), not a
new lesson. Lesson 05 was next in the syllabus and is deferred one run.

**Why this outranked lesson 05.** The build routine shipped
[0038](../../decisions/0038-an-id-names-one-node-and-a-return-is-not-a-reuse.md)
at 09:07 this morning, and it changed the answer to lesson 04's last exercise
from *accepted* to *refused*. The lesson stated the old result as fact, in a
fenced output block, twice. A lesson that lies about what the code does is worse
than no lesson, so the run went to the repair. Nothing was superseded — 0028
stands and 0038 is what makes 0028's assertion checkable — but the effect on the
course is the same as a supersession, and the rule in the brief applies.

## What actually went stale, and what did not

Every exercise in lesson 04 was re-executed against `main` at `489fd98`, not just
the suspect one. **Exactly one of ten outputs changed.** Paths, positional
addressing, the `duplicate-node-id` refusal, and both `compareTrees` comparisons
are all still exactly as written. Lesson 03 has no delta that removes and inserts
the same id, so it is untouched.

That is the useful finding for future runs: the blast radius of a behaviour
change on a written lesson is usually one exercise, and the only way to know
which one is to run all of them. Re-running the whole lesson cost about four
minutes.

## What I chose to emphasise

**The rule that was rejected, before the rule that was taken.** The obvious fix
for id recycling is "an id, once retired, may never appear again" — one line,
cheap to check, and wrong, because the inverse of a `remove` re-inserts the exact
node and that rule would make removal the one change nobody can undo. The lesson
now leads with the wrong rule and lets the reader feel it break. Leading with the
right one teaches a fact; leading with the wrong one teaches why the question is
hard.

**"Did it come back as the node that left."** This is the sentence worth
retaining, and it reframes identity from *an address is unique* to *an address
names one thing over time*, which is the version that survives contact with a
log. Restoration versus recycling falls straight out of it.

**Who decides — a definition, not a policy.** The Predict section already asked,
from the first version of this lesson, whether a deleted-and-recreated card is
the same node and *who gets to decide that*. It now has a literal answer:
`nodeFingerprint`, about fifteen lines. I added a Reflect bullet pointing back at
it, because a prediction written a week ago and answered by a named function is
the cheapest elaboration hook in the course, and it was already there by luck.

**The enforcement boundary, stated as a trade rather than a gap.** Enforced
within a delta, only reported across deltas. I resisted writing this as
unfinished work: closing it means a tree carrying every id it has ever retired,
unbounded in the length of the log, against a collision the runtime's own minting
cannot produce. The lesson says the boundary is the part most likely to move and
tells the reader to hold that section more loosely than the rest — which is
honest, since the day-35 report leaves it open as an architectural question for
the maintainer.

## What the exercises revealed

All ten snippets were extracted mechanically from the rendered markdown into
`src/scratch.test.ts` and run, so the code in the lesson is the code that was
executed rather than a tidied version of it. `src/scratch.test.ts` is deleted.

**The look-alike is the best new exercise.** A card rebuilt with identical type,
props and text, forced onto the original's id, is **refused** — because its child
was minted `n_z1` where the original's was `n_3`, and ids are inside
`nodeFingerprint`. It renders identically and a reviewer could not tell them
apart on the page. Most readers will predict "accepted", which is exactly the
productive failure the section wanted, and it justifies the one design choice in
0038 a reader would otherwise skim past.

**An undo of one card produces two restorations.** Removing the card retires
`n_4` *and* `n_3`, the body text inside it, so putting it back reports both. The
exercise asks the reader to count before running, and counting the operation
instead of the tree is the natural mistake. It also explains, without my having
to assert it, why the audit page counts restorations rather than listing them.

**The split-across-two-deltas exercise carries the limit.** Same two operations,
same order, same tree — accepted, `n_4` is a card at revision 1 and a text node
at revision 2, and `idReturnsIn` reports it as `recycled` with both revisions
named. Placing it directly after the refusal makes the difference between a rule
and a report concrete instead of abstract.

## Found while teaching

**Nothing this run.** No code was touched and no new defect surfaced — which is
itself worth recording, because the last three items I found are all still open
in the build routine's list, and this run adds nothing to that queue.

One observation rather than a defect: 0038's own Context section credits the
lesson-04 exercise as where the gap was found. The loop from *teaching it* to
*running it* to *a decision record* to *the lesson being wrong and needing
repair* closed in one day. That is the process working, but it does mean lessons
written against actively-built subsystems will need re-running rather than just
re-reading, and there is currently nothing that would tell me a lesson had gone
stale except doing what this run did by hand.

## Needs your input

**Nothing blocking.** One judgement call worth flagging: I taught 0038 despite it
being hours old, which cuts against the brief's "teach only what is settled". The
alternative was leaving a known-false output in the lesson, or deleting the
exercise. I judged a correct account of one-day-old code better than either, and
confined it to what the exercises actually demonstrate — the within-delta rule,
which is enforced and tested — while marking the across-log half as open. If you
would rather the course lag the build by a fixed number of days even at the cost
of a stale exercise, say so and I will apply that instead.

## Next

**05 — Purity at the seams**, unchanged from last run's plan. `result.ts` and the
`IdFactory`/clock seams have been stable since 2026-07-27, lessons 04 and 03 both
leave forward pointers to it, and today's work did not touch that ground.
