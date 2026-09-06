# 2026-09-06 — The address the tree never holds, and four branches in one tree

Two things this run, in this order, and the order is the argument: the four open
branches this lane had left behind were merged into one green tree first, and
lesson 19 was written on top of it.

## Why the consolidation came first

Four lessons pull requests were open — #226, #233, #239 and #244 — between two
and four days old, none merged. #244's own report said #226 conflicted with it
in six files and offered to rebase whichever lost. Nothing merged, so nothing
lost, so the rebase never happened and a fifth parallel branch would have made
it a three-way problem.

Other lanes have already converged on the answer this week: #230, #242 and #243
are each one lane's open pull requests merged into a single reviewable tree. This
is that, for this lane.

The conflicts were orthogonal in substance and the resolution is the union —
#226's course-wide question list and its `questionKeys` filtering, with #244's
injected clock and its record doors in *where to check*. No lesson text changed
in the merge.

**Three things broke only once the four were in one tree**, which is the whole
case for doing it here rather than one at a time and leaving the third to a
reader:

- `record.tsx` (#239) imported `today` from the store, which #244 had turned into
  a provider. It reads the day off `useProgress()` now, like everything else on
  the surface — so the export page is fixed under `TZ=Pacific/Kiritimati` too,
  which was the class of bug #244 was written to close and which #239 had
  reintroduced without either branch being able to see it.
- `questions.ts` (#226) typed `checkIn` as `LessonPointer[]`; #244 had widened a
  review question's pointers to `CheckPointer`, which is a lesson *or* a record.
  `lessonQuestionPointers` returns the wider type now, so a question asked inside
  its lesson and the same question asked back days later as a correction arrive
  in one shape.
- `questions.test.ts` asserted on `pointer.number`, a field only a lesson pointer
  has.

None of the four branches was wrong. Each was right against `main` and two of
them were wrong against each other, which is the failure mode a queue of
long-lived branches produces and the reason not to add a fifth.

## The lesson: 19 — Destinations

**Roughly 60–75 minutes**, at the density of 18. Six exercises, and two of them
are the point.

Part V now has two lessons and they rhyme on purpose: 18 is a question the tree
asks, 19 is a sentence the tree is not allowed to finish. Teaching them as a
matched pair was the main compositional decision, and the risk that comes with it
is the one the review set is built to catch — **two things that rhyme are the
easiest pair in a course to conflate.**

### What I emphasised, and why

**The reframe, not the mechanism.** The natural way to teach 0065 is "here is
`loom:submit`, here is the registry". That teaches the API. The lesson instead
spends its first section establishing that a scheme allowlist — which lesson 15
already taught the reader to reach for — is *useless* here, because
`https://collect.example.com/harvest` passes it. Predict 1 asks the reader to
design the URL prop and its validation themselves, so that the sentence "the
question is not how do we validate an action a model wrote, it is how does a form
get an action a model never wrote" lands against something they built rather than
arriving as an assertion.

**The place the data seam is deliberately *not* copied.** This is the
intellectual centre and the reason 19 is not a re-run of 18. A binding carries
AI-authored params because *a read genuinely varies*; a write does not vary that
way, so twenty mailing lists means twenty registrations. Predict 2 asks the
reader to reason from symmetry, which produces the wrong answer, which is the
point. Self-check 2 and Set X question 1 both come back to it, and Set X says out
loud that it is the one place two nearly identical seams differ.

**Warm-up 1 disagrees with the lesson on purpose.** It asks the reader to state
why AI-authored params were acceptable in 18 — the argument the lesson is about
to bound. Getting the earlier lesson's reasoning written down first is what makes
the boundary visible rather than the lesson simply asserting a different rule.

**0065's own open questions, before their answers.** 0065 shipped naming two
things it had not done, and 0071 and 0087 closed both. The lesson presents the
open questions first and the closures second, which makes Predict 4 answerable
from lesson 09 alone — and wrong in an instructive way, because a per-origin
ceiling is exactly what lesson 09 taught and is the wrong axis for this one fact.
Reflect asks what that says about writing down what a decision does not cover.

### What the exercises revealed

All six were executed. The Try it section's fences were extracted from the
published markdown and run as one program, so the transcripts are this commit's
behaviour rather than mine.

**Exercise C is the best thing in the lesson and I did not plan it.** I wrote it
expecting to demonstrate that a `javascript:` action is refused. What it actually
demonstrates is this:

```
  "//evil.example/harvest"     -> https://evil.example/harvest
  "/\\evil.example/harvest"    -> https://evil.example/harvest
```

Two strings that begin with a slash, resolved from a page on
`https://site.example/pricing`, land on another origin. `startsWith("/")` — the
check almost everybody writes for "is this a same-origin path" — accepts both.
Printing the schema's verdict beside `new URL()`'s resolution is what makes it a
lesson rather than a rule to memorise, and it is why the exercise now carries the
instruction to predict the resolved URLs too and not only accept/refuse.

**Exercise A's fourth card was the other surprise.** A declaration reading
`{ to: "contact.enquiry", action: "https://collect.example.com/harvest" }` names a
registered endpoint and carries an address, and I expected the address to be
stripped and the form to work. It does not post at all:

```
  problem: n_4 loom:submit: Unrecognized key(s) in object: 'action'
```

That is `.strict()`, and running it turned a design note into the lesson's
cleanest general principle: *strip what you do not understand, except where the
thing you do not understand is the thing you exist to exclude.*

**Exercise E cost two wrong attempts before it was right**, both mine and both
worth recording. `configure` takes `set` and `unset`, not `props` — and
`applyDelta` answers with a `LoomTree`, not a wrapper carrying one. Neither is in
the lesson; both are why the rule about running things exists.

**The node ids are the cards, not the page.** `n_1` is the first card and the page
is `n_7`, because the fixture builds children before parents. That is the same
correction that produced lesson 04's hook in August, arriving unprompted in a
lesson written thirteen lessons later, and Exercise A now says so.

## Found while teaching

**One, filed for `Loom primitives`.**
[0087](../../decisions/0087-a-primitive-that-posts-declares-it-and-the-audit-checks.md)
cites `[0010](0010-conformance-is-probed-not-proven.md)` for the principle that
nothing is refused at registration. That principle is **0012**. **0010** is "Edit
mode decorates; it never invents DOM" — a real, Accepted record about something
else — and the filename in the link has never existed.

The expensive half is not the dead filename. It is that the *number* resolves to
a coherent record with nothing to do with the sentence citing it, so a reader who
follows it is misled rather than stopped. Filed in `FINDINGS.md`; the lesson
cites 0012 and does not reproduce the error. 0097 made a hole in the decision
numbering fatal, and nothing yet checks that a link *inside* a record resolves to
a file that exists — which is the cheap fix if somebody wants one.

Nothing else. `src/`, `decisions/` and the other route groups are untouched.

## Something about this lane's own machinery, not a finding

While checking that lesson 19 does not print an answer beside its question, I
confirmed what the gating actually is: every transcript is in the page's RSC
payload and held back **client-side** until the last prediction is committed.
That is true of all nineteen lessons and is not new here, but it is worth
writing down once rather than discovering later — the lock is honest for a reader
and transparent to devtools. Whether that matters is a judgement about who the
surface is for, and I have not made it unilaterally.

## Verification

`pnpm verify` green in full on the merged tree plus the lesson: **1860 runtime
tests, 2562 app tests, 82 pages** — `/lessons/19` and `/lessons/review/set-x`
among them, which also proves the exercises compiled and ran against `src/` at
build time.

Three assertions were updated because a new set exists: the schedule parser's
`A…X`, its last-set letter, and the queue's count of 24. They pin the file
deliberately, so a set the parser cannot read fails the build.

`src/scratch.test.ts` was deleted.
