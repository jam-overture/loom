# 2026-09-11 — the transcript that changed the system

**Not a new lesson.** Two lessons on `main` were saying things the code does not
do, one of them in its explanation rather than only its output, and nothing in
the course could have noticed. This run fixed both and built the check.

## How the run started, and what it turned into

I opened with the intention of bringing this lane's stalled pull requests up to
`main`. That was the right read of the morning and the wrong read of the day.

`main` had not moved since 1 September; overnight it took 31 commits, four of
them this lane's (#226, #233, #239, #244). Every remaining lessons PR was
un-mergeable as a result — a squash merge replaces the stack's own bottom
commits, so `git` stops seeing that history as shared, and twelve of the fourteen
conflicted files were this lane's own work conflicting with this lane's own
already-merged work.

I resolved #247 and pushed it. The maintainer had merged it eleven minutes
earlier. I resolved #254 and pushed that. He merged it while `pnpm verify` was
running. **He drained the entire stack himself during this run** — 19, 20, 21, 22
and the machinery change are all on `main`.

So the merge work was redundant, twice over, and it cost two recreated branches
(see *What needs cleaning up*). What was **not** redundant is the thing I only
found because I was checking lesson 22 before pushing it: the lesson was lying.

## What was wrong

The course has promised since lesson 01 that *every exercise was executed before
it was written down*, and since August that promise has had a build step —
`run.test.ts` compiles every Try it program and runs it against `src/`.

**That is a weaker promise than it reads as.** It proves the programs still run.
It does not compare one character of what they print. So:

**Lesson 22** recorded `primitives registered: 70` and `of those, declaring a
target: 10`. The library is now 91 and 12 — `loom.book` and `loom.recording`
gained `{"whenProps":["href"]}` in the day between the lesson being written and
today. The prose read *"Ten of seventy"*.

**Lesson 15 was the serious one**, because what had drifted was the teaching and
not the numbers. It told the reader, as the thing *"most readers get wrong"*,
that a component throwing under every configuration lands in `notProbeable` and
**not** in `throwsOnDeclaredProps`. That was true on 24 August. Today the
component is in both, carrying `everyConfiguration: true`.

And the reason it changed is the best thing this run turned up.
[0090](../../decisions/0090-a-probe-that-declines-says-whether-it-got-as-far-as-calling.md)
opens by quoting **this lesson's own exercise** as the finding that prompted it:

> On 24 August the lessons routine registered a component that throws
> unconditionally, audited it, and filed what came back. **The most extreme
> instance of the fault was missing from the list that names the fault.**

The lesson ran its exercise, the exercise exposed a real gap, the gap became an
Accepted record three days later — and the lesson then sat on `main` for
eighteen days teaching the behaviour that record had removed. The course
generated a correction to the system and did not receive it back.

## What I changed

**Lesson 15.** The Exercise C transcript replaced with the real run's bytes, and
the paragraph after it rewritten. It now asks the reader what the
`everyConfiguration` flag must be *for* before explaining it, gives the certain
and uncertain halves with the React reason a hook-using primitive lands in the
uncertain one, and then tells the story above — that this paragraph used to teach
the opposite, and why. That is a better lesson than the one it replaces: the
original taught a rule, and this teaches a rule plus the evidence that changed
it. Exercise E's transcript also gained the flag, and its prose one clause tying
it back to the certain half.

**Lesson 22.** Transcript and prose to 91 and 12.

**Self-check 4 and Set S question 6** both asked for the old answer in so many
words, so both were rewritten rather than left to contradict the lesson above
them. Self-check 4 now ends by asking what the old reporting was and what was
wrong with it — the correction is worth more as a question than as a note.

**And the check that would have caught all of it**, in
`_lib/transcripts.test.ts`: for every written lesson, the plain fences in Try it
are compared line by line against what that lesson's program actually printed.
Twenty-two lessons, **66 transcript blocks**, green.

Two details in it are worth the report:

- **Telling a transcript from an illustration.** Try it sections also hold ASCII
  trees and lists of candidate URLs that print nowhere. A fence counts as a
  transcript when at least one line matches; then every line must. An
  illustration shares no line and is left alone. The failure mode of that
  heuristic — a transcript whose every line drifted looks like an illustration
  and is skipped silently — is covered by pinning the recognised count at 66.
- **Lesson 18 was a false positive, and finding out why was the useful part.** It
  prints a request key as `catalogue.services {"limit":6}`. The real key is
  `catalogue.services\0{"limit":6}` — `plan.ts` joins source and params with a
  **NUL**, chosen because it is a byte that occurs in neither a source id nor
  JSON, so two questions cannot collide on one key. A markdown file cannot hold
  that byte. I "corrected" the lesson before I understood this and made it wrong;
  the edit is reverted, and the checker now normalises control characters on both
  sides, with the reason written down where the next person will hit it.

## Verification

`pnpm install && pnpm verify` **green in full**, exit 0: **2,052** runtime tests
and **3,686** application tests. The new suite is 23 of those — 22 lessons plus
the pin.

Every transcript correction was taken from the exact bytes of a real run through
the course's own `runExercises`, not retyped. The scratch files used to dump
those runs were deleted; the tree is clean.

## Found while teaching

**Nothing new for another lane.** The `loom.nav` finding filed with lesson 22 —
`interactive: "always"` making every menu item a nested target, so a proposal
adding one comes back `critical`, `rejected` — landed with #254 and is open for
`Loom primitives`. I did not re-file it.

**One observation this lane owns and has now fixed**, stated plainly because it
went unnoticed for eighteen days: a routine that writes lessons and files
findings has no path by which the resolution of its own finding reaches the
lesson that raised it. 0090 closed the 24 August finding and nothing re-opened
lesson 15. The new suite closes this particular case — the transcript would have
gone red the day 0090 merged — but only where a behaviour change shows up in
printed output. A record that changes what a lesson *says* without changing what
it *prints* is still invisible, and I do not have a mechanical answer to that.

## What needs cleaning up

**Two merged branches exist on the remote again and should not:**
`lessons-27-destinations` and `lessons-31-reach`. Both PRs merged and both
branches were deleted; my pushes recreated them. Deleting them from here fails —
the git proxy disconnects on a delete push (`send-pack: unexpected disconnect`,
then `Everything up-to-date`) — so they need deleting from the branches page.
They are inert, and they are my litter.

The lesson from it, which I would rather record than repeat: **a merged pull
request is finished**, and this lane should re-check a PR's state immediately
before pushing to it, not only when the run starts.

## What I did not touch

`src/`, `decisions/` and every other route group are untouched. No new lesson, so
no new interleaved set is owed; the only edit to `review-schedule.md` is the one
question whose answer the system changed.

## What is next

Lesson 23, from a `main` that now carries all of Part V. The next seam is still
where lesson 20's closing question left it, and lesson 22 closed on a live
disagreement between 0068 and 0086 that will either be settled or still open by
then — the lesson is written so that settling it makes the lesson more
interesting rather than wrong.
