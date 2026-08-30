# 2026-08-30 — the pile that could not merge

**No new lesson and no new machinery.** Four lessons pull requests were open
this morning and **two of them could not be merged at all.** Unblocking them was
the run.

**Landed:** merge commits on `lessons-17-telemetry` (#168) and
`lessons-18-the-seventh-rung` (#176), resolving one conflict each, plus this
report. No lesson text changed. Nothing in `src/`, no other lane's route group,
and — deliberately — **not one line of any file the four open pull requests
touch.**

## What the state actually was

The last merged thing in this lane is lesson 16, on **25 August**. Five runs
have happened since and none of their work has reached `main`:

| PR | What it is | Was | Now |
| --- | --- | --- | --- |
| [#168](https://github.com/jam-overture/loom/pull/168) | Lesson 17 — telemetry; **completes the syllabus** | `dirty` — unmergeable since 26 Aug | **clean** |
| [#176](https://github.com/jam-overture/loom/pull/176) | Lesson 09's seventh rung | `dirty` — unmergeable since 27 Aug | **clean** |
| [#184](https://github.com/jam-overture/loom/pull/184) | The exercise runner | clean | clean |
| [#192](https://github.com/jam-overture/loom/pull/192) | Audit; lessons 07 and 08 corrected | clean | clean |

Two of the four had been sitting in a state where the merge button does not
work, and the pull request bodies do not say so — a routine reports the state of
its branch on the day it pushed, and `dirty` happens afterwards, to a branch
nobody is watching. #168 went unmergeable **four days ago** and every run since
has opened a new pull request beside it without noticing.

## The conflicts, and why they were both the same conflict

One conflicted file in each, and it is `FINDINGS.md` both times. Not a lesson,
not a review set, not a count — **the shared findings file, conflicting on the
append point.** Both branches added a section at the end of the same run of
entries; so did four other lanes; git cannot tell whose paragraph goes first.

Resolved by keeping both sides in full, separated by the `---` the file already
uses between entries. Nothing was dropped, reworded or reordered on either side.
That is the same resolution the 23 August merge on this branch line made, and it
is recorded there as *"both sides' findings kept"*.

**The structural point is worth more than the fix.** I tested all six pairs of
the four open pull requests against each other:

```
#168 + #176 : CONFLICT -> FINDINGS.md
#168 + #184 : CONFLICT -> FINDINGS.md
#168 + #192 : clean
#176 + #184 : CONFLICT -> FINDINGS.md
#176 + #192 : clean
#184 + #192 : clean
```

**Every collision is `FINDINGS.md` and nothing else.** Not one of the four
touches the course in a way another one contradicts — four pull requests, three
of which change lesson text, and their lesson text is disjoint. The lane's own
work is clean. What serialises it is a single append-only file shared by seven
routines, where merging any one pull request re-conflicts the next.

So the pile is not evidence of runs racing each other. It is one file behaving
like a global lock, and it will do this again next week.

## Merge order

Any order works, but each merge after the first will need the same ten-second
`FINDINGS.md` resolution — keep both sides. If the order is free, this one puts
the corrections in before the thing that would otherwise enshrine them:

1. **#176** — lesson 09's seventh rung. Corrects a closed-book review question.
2. **#192** — lessons 07 and 08. Corrects a second one.
3. **#168** — lesson 17, and the syllabus is then complete.
4. **#184** — the exercise runner, which imposes a merge gate on other lanes and
   is the one worth reading slowly.

## What I measured while I was in there

Three runs in a row have reported the same failure class — **a sentence in a
lesson that counts a list in `src/`** — and recommended a check for it. Nobody
has ever counted how much of it there is. On `main` as it stands:

| Claim in the course | `main` says | The code says | Places |
| --- | --- | --- | --- |
| Gate escalation rules | six | **seven** (`ESCALATION_RULES`, `src/runtime/gate.ts`) | 10 |
| `ChangeAnalysis` fields | ten | **fourteen** (`src/runtime/analysis.ts`) | 4 |
| Stake factor codes | eight | **ten** (`StakeFactorCode`, `src/runtime/stakes.ts`) | 1 |

**Fifteen stale claims across four files.** Every executed output in those
lessons is still correct — this is entirely prose, which is why running the
exercises never caught any of it.

**Three of the fifteen are closed-book retrieval prompts**, and those are the
ones that matter rather than the tally:

- `review-schedule.md` Set K q1 — *"Name the six Gate rules in order"*
- `review-schedule.md` Set M q5 — *"Write the six Gate rules in order from memory"*
- `07-measuring-a-change.md` — *"From memory, write the ten fields of `ChangeAnalysis`"*

A wrong sentence in an explanation is read once. A wrong key on a retrieval
question is answered from memory, checked against the wrong list, and corrected
*towards* the error — by the most durable mechanism this course has. The course
is not merely stale in those three places, it is actively teaching a wrong list.

**#176 and #192 together fix all fifteen.** I merged the two branches locally and
re-ran the search: no stale count survives. Four mentions of the old numbers
remain and all four are deliberate — lesson 09 saying it *used to say* six,
0002's July record described as July's, and "ten of the fourteen", which is a
subset and correct.

That is the strongest argument for merging those two that I can make, and it is
also the argument for the check: fifteen is what accumulates in three weeks
while every exercise passes.

## The check the last three runs asked for is blocked, and it is blocked on this

The standing recommendation is a small test mapping a countable phrase in a
lesson to the length of a list in `src/`, failing when they disagree. I did not
write it, and the reason is the table above rather than a judgement about
whether it should exist:

**On `main` it would be red on arrival, in fifteen places.** It cannot be green
until #176 and #192 merge, and basing it on those branches would stack a fifth
pull request on an unreviewed pile of four. It is a one-run job the moment the
corrections land, and a job that cannot be finished before then.

I want to be plain that this is a scheduling fact, not a new question. The
question of whether the check should exist at all was put to the maintainer on
#192 and is unanswered; it stays unanswered.

## Why no lesson and no machinery

The brief asks for one lesson or one piece of course machinery per run, and I
did neither. The reasoning, so it can be overruled:

- **The syllabus is finished.** Lesson 17 is the last entry and it is written —
  it is sitting in #168, which is one of the two that could not merge.
- **A fifth pull request makes the review harder, not the course better.** Four
  are open, none has a human comment, and the newest three each begin by
  explaining their relationship to the other two. The bottleneck is review, and
  the one thing a routine can do about a review bottleneck is not add to it.
- **Two of the four were unmergeable.** Whatever else is true, work that cannot
  be merged is not work that has been done, and no new lesson would have changed
  that.

This report is a new file with a date-stamped name, so it collides with nothing.
That is the whole of this run's footprint on the course.

## Verification

`pnpm install && pnpm verify` run on **both** resolved branches.

- **#168** — 1962 passed, 133 of 134 test files. `next build` **72 pages**,
  including `/lessons/17`, `/lessons/review/set-u` and `/lessons/review/set-v`.
- **#176** — 1962 passed, 111 of 111 runtime files, 133 of 134 app files.
  `next build` **69 pages**, the same as `main`; this branch adds none.

**`main` is red and has been for days**, which is the one failure in both runs:

```
FAIL app/(marketing)/_lib/facts.test.ts > counts the decision records
  expected '94' to be '95'
```

`apps/loom/app/(marketing)/_lib/copy.ts:25` says `decisions: "94"`; there are 95
records in `decisions/`. Confirmed directly against `origin/main` rather than
inferred from the branch. It is `Loom marketing`'s file and #182, #184 and #192
have each already reported it, so it is not filed again here — but it is worth
saying once more that **the shared merge gate has been failing for every lane for
several days**, and a gate everyone has learned to describe as "red on main" is a
gate that has stopped gating.

## Found while teaching

Nothing this run — no lesson was written, so nothing was explained hard enough to
find anything. The two items this lane already has open are unchanged and stay
where they are: the `parseBlocks` raw-HTML gap (mine, #192's comment, a machinery
job) and 0002's stale "six ordered rules" (filed for `Loom daily build` in
`FINDINGS.md`).

I did not add an entry to `FINDINGS.md` for the file-as-global-lock problem
above. It is a repository-wide convention rather than a defect in any lane's
code, the fix is somebody's decision about how findings are filed, and a routine
that cannot write the governance it is bound by should not file the governance
either. It is in this report and in the pull request comment, where the
maintainer will see it.

## What is next

If nothing merges before the next run, the next run has the same problem and
should say so rather than opening a sixth pull request.

If #176 and #192 merge, the next run writes the countable-claims check — it is
specified, the drift it would catch is measured above, and it becomes a one-run
job the moment its subject is green.

If all four merge, the syllabus is complete and the two questions the last three
runs have put to the maintainer become the only thing left to decide: what this
routine does with a finished syllabus, and whether there is a Part V.
