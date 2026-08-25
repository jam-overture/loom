# 2026-08-25 — Lesson 16: Persistence

**Landed:** [`lessons/16-persistence.md`](../16-persistence.md), its syllabus
link in `lessons/README.md`, **Set T** in `lessons/review-schedule.md`, and five
count updates in `apps/loom/app/(lessons)/` that a twentieth set moves.

`pnpm install && pnpm verify` **green**: 1647 runtime tests across 106 files,
1777 app tests across 123. `next build` prerenders 67 pages, up from 65 — one
for `/lessons/16` and one for `/lessons/review/set-t`.

Roughly **55–70 minutes** to work through properly, of which about twenty-five
is the six exercises. It is the longest lesson in the course by reading time and
the reason is Exercise D, which is really two exercises wearing one coat.

## Reader feedback: nothing to address this run

Five pull requests are open and none of them is a lessons PR — #155 and #159 are
`Loom docs`, #156 is `Loom primitives`, #157 is the framework, #158 is
marketing. The lesson-15 PR merged. No comments anywhere ask the course for
anything, so the syllabus decided this run rather than a reader.

Nothing had to change on account of a `Superseded` record. 0016 (30 July), 0028
(2 August) and 0041 (6 August) are all `Accepted` and unamended, and the code
under them is the settled part of `src/store/`: `store.ts`, `replay.ts`,
`memory.ts`, `attribution.ts` and `source.ts` were last touched on 18–21 August,
four to seven days ago.

## A lesson rather than machinery, and why

Strict alternation would have made this machinery, since 15 was a lesson. I
chose the lesson, and unlike last time the reason is the plain one: **lesson 15
named 16's door in, and the syllabus is in dependency order.** Nothing in the
course had made storage real, and three of the last four lessons have been
leaning on a claim about it — 14's `unknown` at the `TreeSource` seam, Set R
question 5 asking what would have to become true for `LoomTree` to be honest
there, and 15's aside about a schema this deployment no longer runs. All three
resolve here. Another run of machinery would have left them resolving nowhere
for a second week.

What I deliberately did **not** build on: `src/store/driver.ts`,
`postgres-holds.ts` and the hold columns in `schema.ts`, all dated 23 August and
belonging to 0088, which is two days old. Holds are a §5 subject the course will
want eventually and they are not settled enough to teach. `answeredBy` appears
exactly once, in Exercise A's output, as the key that is *absent*; the lesson
says why absence rather than `undefined` and does not explain what would put it
there.

## What I emphasised, and why

**The spine is a counterfactual, and it is Predict 1.** *Reads are free. Now
argue for keeping the snapshot.* Every reader arrives with the performance
answer, and 0016 is explicit that the performance answer is not what decided it
— "on its own it would be a performance note, not a decision record". Stripping
it out in the question is the only way I could find to make the real argument
reachable by generation rather than by being told: a log is a recipe, not a
result, and under pure event sourcing the fold *is* the read, so a drifted
interpreter does not produce a wrong answer, it produces the new right answer.

I put 0016's own sentence about the irony in full, because it is better than
anything I would write: the purest version of "every change is inspectable and
reversible" is the version that cannot notice when its own interpretation of
those changes has moved.

**The rule, stated as a rule, because it has now been applied four times.**
Three facts the log completely determines were each proposed as a stored field
and rejected — the inverse of a delta (06), authorship (0041), a node's id
history (0038) — and one was stored. So the lesson states the test in two parts:
a derived value is stored only when the read that would recompute it is on a
path that cannot afford it **and** something can rebuild the copy and check it.
The second half is the one readers drop, and 0041 rejecting a *stored
attribution index* by quoting 0016 back at itself is the cleanest evidence that
both halves are load-bearing. The sentence I want a reader to leave with:
**the snapshot is not an example of a caching policy, it is the only case, and
the audit is the price of it.**

**Retry, as a word that means something specific.** `revision-conflict` and
`delta-rejected` are told apart so a caller can act differently, and the lesson
insists that "retryable" does not mean resend: the delta names a base revision
and node ids chosen against a tree that has moved, so what survives a conflict
is the *proposal*, and retrying means going back up lesson 10's pipeline. That
is a place where the two-error distinction stops being taxonomy and becomes an
instruction.

**What a refused append leaves behind: nothing.** Exercise B's last two lines.
The revision log records what happened to the tree, not what was attempted, and
the lesson names this as a chosen limit with a consequence — the log's length
equals the revision number, which is half of what makes the two halves checkable
— rather than as an oversight. It also hands lesson 17 its subject.

**Where I did not smooth the path.** Exercise F asks the reader to predict what
a card that was `configure`d at revision 2 is attributed as, and the answer is
`seeded`. Placement and change are different questions. I very nearly wrote a
sentence in the idea section that would have given it away and cut it, because
the whole point of `since` is invisible until you have expected the other
answer.

## What the exercises revealed

Six exercises, all executed, output transcribed from the run. Two produced
results I did not predict, and both changed the lesson rather than becoming
footnotes.

**A green audit can mean the evidence was deleted.** Exercise D started life as
"show what a divergence report looks like". I audited a tree against a seed with
one word of text changed, got `diverged` with the node named, and then — while
extending the fixture for the replay-gap half — appended a revision that removed
the header the doctored text lived in. The same audit, same wrong seed, now says
`agrees`.

That is correct behaviour and it is not written down anywhere. `auditSnapshot`
compares end states; a seed error whose effects a later revision erased is
invisible to it, permanently and silently. The lesson makes the reader produce
it and then states the corollary in the strongest form I can defend: **an audit
of a tree is an audit of what survived into that tree**, and a green audit is
evidence about the current tree rather than about the history that produced it.
Self-check 4 and Set T question 5 both test it away from the fixture.

It also produced this run's only finding, below.

**The false alarm, executed.** Exercise E audits a tree with an empty log against
a seed whose root keys are in a different order. Outcome `diverged`;
`compareTrees` finds **zero** differences. 0016 predicted this in its
consequences and called the direction right — a false alarm rather than a false
pass. Having the verdict and the description openly disagree in one output is
worth more than the paragraph, and it let me make the transferable point:
choosing which way a check is allowed to be wrong is a design decision, and the
pair of outputs is the tool for the afternoon the false alarm costs.

**The cost asymmetry, measured rather than asserted.** Exercise C wraps the
reader in a counter: 250 appends, `head` is one lookup, the audit reads **3
pages and folds 250 entries**. 0028 says the audit's cost is unbounded in the
length of the log, which is exactly the cost the snapshot was introduced to keep
off the request path; a number makes that a fact rather than a phrase.

**A hole and a repeat are the same error.** `replayTree` reports `revision-gap`
for both, with the expected and found numbers swapped. Obvious in hindsight and
not obvious in prediction, which made it worth printing both.

**The bounded walk, honestly bounded.** Attributing a 150-revision tree with
`pages: 1` gives `placed by r150` for the late insert and `undetermined` for the
root, with `examinedTo: 51`. Three outcomes rather than two, for the fifth time
in this course — the lesson counts the previous four from lesson 15 and says the
pattern is worth more than the instance.

`src/scratch.test.ts` was deleted before committing.

## Found while teaching

**One, and it is small and specific.** In `FINDINGS.md`, owned by `Loom portal`.
Not fixed here; the file is not mine.

`apps/loom/app/(portal)/_lib/audit-view.ts` renders an `agrees` audit under the
label *"Everything on this page adds up"* with the meaning *"…so nothing on it
is unexplained."* The `detail` line one level up is exactly right — "folding N
changes from the seed reproduces the snapshot exactly" — but the checkup's
plain-language line generalises it into a claim about the page's history, and
Exercise D is a nine-line counterexample: an audit passes against a seed that is
known to be wrong, because the revision that would have exposed it deleted the
evidence. The audit proves a property of the current tree. "Nothing on it is
unexplained" is a property of the history.

Nothing else. In particular the key-order false alarm, the absence of any record
of a refused append, and the audit's dependence on a seed the host has to keep
are all argued in the records that created them (0016 twice, 0028 once).
Teaching a documented trade is the right response to it; filing it would be
filing a disagreement as a defect.

## What is next

Lesson 17, telemetry — how a self-graded confidence number eventually gets
calibrated. Lesson 16 names the door in the way 15 and 14 did: every log entry
in every exercise of this lesson carries `provenance.confidence`, a number the
model gave itself, stored on every change Loom has ever accepted, and nothing in
the course so far has compared it to what happened next.

If the next run is machinery instead, the outstanding item is unchanged and is
now the only one of the brief's four untouched: **runnable exercises.** Write-
before-reveal, confidence-before-reveal and the live due queue all landed in
#136. Lesson 16 is a better argument for it than 15 was — Exercises D and E both
turn on an output almost nobody predicts, and both are worthless to a reader who
skipped the paste into `src/scratch.test.ts`.
