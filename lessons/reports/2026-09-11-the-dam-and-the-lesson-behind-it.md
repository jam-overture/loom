# 2026-09-11 — the dam, and what was behind it

**No new lesson.** This run brought lesson 22 up to `main` and corrected a
transcript that had stopped being true. The reason it needed doing is the more
useful half of the report.

## What I found

`main` moved **31 commits** overnight — the first time since 1 September — and
kept moving *during this run*. Four of this lane's pull requests (#226, #233,
#239, #244) had landed before I started; #247, #249, #251 and #252 landed at
15:28 while I was working on them.

That answers a question this lane asked twice and was told nothing about. #252
and #254 each offered the maintainer *"close the eight"* or *"stop stacking"* and
got no reply. The merges are the reply: they came in **individually, bottom-first**,
which is somebody working a queue rather than waiting for one consolidated tree.
So the stack stays a stack, and this lane's job is to keep the next one in line
mergeable.

None of them were. Every remaining lessons PR was **un-mergeable against `main`**,
and not because another lane touched anything. A squash merge replaces the
stack's own bottom commits with one new commit, so `git` stops seeing that
history as shared. Fourteen conflicted files at the top of the stack; ten at
#247. **Twelve of the fourteen were files this lane wrote, conflicting with this
lane's own already-merged work.**

I resolved #247 first and pushed it — and by then the maintainer had already
merged it and deleted the branch, so that push recreated a dead branch. That is
my error and it is noted under *What needs cleaning up* below. The work that
survives is #254, which is the only lessons PR still open.

## What I did

Merged `origin/main` into `lessons-31-reach` (#254, lesson 22) and resolved the
eight conflicts. No rebase and no force-push: the branch has an open pull
request, and rewriting its history invalidates anything already looked at.

Seven of eight resolved to the branch, each for a stated reason:

- `queue.test.ts`, `schedule.test.ts`, `syllabus.ts` — `main` asserts 26 sets
  ending at Z; the branch asserts 27 ending at `AA`. Set AA **is** lesson 22's
  contribution, so the branch's count is the correct one once the lesson exists.
- `slugs.ts` — `setSlug` and `compareSetLetters`, which is the two-letter parser
  fix. `main` has neither; without them `## Set AA` is not a heading at all but a
  line inside Set Z, and eight questions get filed under lesson 21 in silence.
- `README.md`, `review-schedule.md` — the lesson 22 syllabus row, Set AA, and the
  Part V closing paragraph. The conflict here was worth reading rather than
  resolving mechanically: `main`'s side held **three** versions of that paragraph
  concatenated, one from each of lessons 19, 20 and 21 rewriting it in turn. The
  branch's version is the one that continues them, and the resolved section reads
  as one argument accumulating across four lessons.
- `queue.test.tsx` — a `const` placement. Cosmetic.

`FINDINGS.md` was the one that did **not** resolve to the branch. Both sides had
appended: `main` ~3,960 lines from other lanes, the branch one finding. Taking
either side whole deletes the other's. Resolved to `main`'s content with this
lane's `loom.nav` finding re-appended per the file's append-order convention.
Header count **468 → 469**: main's entire set intact, plus one.

After the merge the branch differs from `main` by **15 files, 1,437 insertions** —
lesson 22, its report and screenshots, Set AA, the parser fix, one finding.
Nothing else. That number is the check on the merge: had I taken a wrong side,
somebody else's work would be in this diff.

## The transcript that had stopped being true

This is the part worth the report.

`run.test.ts` compiles and runs every Try it program against this checkout's
`src/`, and it was green — all twenty-two lessons. But **running is not the same
as still printing what the lesson says it prints**, and only the first of those
is checked anywhere.

So I ran lesson 22's exercises through the course's own `runExercises` and
compared **every line of every recorded transcript** against the real output.
Exercise A had drifted:

| the lesson said | today |
| --- | --- |
| `primitives registered: 70` | `primitives registered: 91` |
| `of those, declaring a target: 10` | `of those, declaring a target: 12` |

`loom.book` and `loom.recording` now declare `{"whenProps":["href"]}`. The
primitives lane shipped twenty-one primitives in the day between the lesson being
written and today. The prose read *"Ten of seventy"*.

Replaced with the exact bytes of the real run rather than retyped, and the prose
with it. Every other line of all seven blocks already matched.

**The lesson page was never lying** — it renders that run's output, not a
transcript. What was wrong is the markdown, which is the source and the version
you read on a train.

## Found while teaching

**One for `Loom primitives`**, carried unchanged from the branch and still open:
`loom.nav` declares `interactive: "always"`, so every `loom.link` in every
navigation bar is a nested target and a proposal to add a menu item comes back
`critical`, `rejected`. The library's own chrome fixture holds six such pairs.

**Two for this lane, found by the check above and not yet fixed.** Both are
lessons already on `main`, so by rule 5 they outrank a new lesson, and neither is
on this branch because a merge-fix PR should not also carry them:

- **Lesson 15** records the registry audit refusing a component that throws:
  `could not be probed (calling it outside a renderer threw: boom)` and
  `throwsOnDeclaredProps: []`. Today it prints `threw under every configuration
  probed: {} (boom), {"tone":"calm"} (boom), {"tone":"loud"} (boom)`, and
  `throwsOnDeclaredProps` carries a populated entry with `everyConfiguration:
  true`. The audit now probes configurations; the lesson describes a version that
  probed once. Two blocks affected.
- **Lesson 18** records a request key as `catalogue.services {"limit":6}`. Today
  the key has no space: `catalogue.services{"limit":6}`. One character, three
  lines, and still an output the code does not produce.

**And the gap that let both through**, which is this lane's machinery and my
problem rather than a finding: nothing asserts that a transcript printed in the
markdown matches the run. `run.test.ts` proves the program still *compiles and
runs*; it does not compare a single character of output. Every lesson in the
course is one primitive registration away from the drift above, silently. The
check I wrote to find these was twenty lines against `runExercises`, and it
belongs in the suite rather than in a scratch file I delete.

## Verification

`pnpm install && pnpm verify` **green in full**, exit 0: **2,052** runtime tests
and **3,066** application tests, 0 failed. The exercise suite runs all
twenty-two lessons, lesson 22 among them.

`src/scratch.test.ts` and the scratch checker were both deleted; the working tree
is clean.

## What needs cleaning up

**`lessons-27-destinations` exists on the remote again and should not.** #247 was
merged and its branch deleted; my push recreated it at `4517ed0`, a merge commit
of already-merged work plus a report. Three attempts to delete it failed — the
git proxy disconnects on a delete push (`send-pack: unexpected disconnect`, then
`Everything up-to-date`). It is inert, but it is litter and I put it there. It
can be deleted from the branches page.

## What I did not touch

`src/`, `decisions/` and every other route group are untouched. The only non-lane
file in the diff is `FINDINGS.md`, and the change there is one appended finding
already on the branch.

## What is next

The two drifted lessons above, and the check that would have caught them, on a
branch off `main` — that is one coherent run: fix what is wrong, then make the
class of wrongness impossible. Lesson 23 comes after, and Part V's next seam is
still where lesson 20's closing question left it.
