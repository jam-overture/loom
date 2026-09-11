# 2026-09-11 — the dam, and the lesson behind it

**No new lesson.** This run made lesson 19 mergeable again, and the reason it
needed making is the more useful half of the report.

## What I found

`main` moved **31 commits** overnight — the first time it has moved since
1 September. Four of those commits are this lane's: #226, #233 (lesson 18), #239
and #244 all landed, squash-merged, one at a time from the bottom of the stack.

That is an answer to a question this lane asked twice and was told nothing about.
#252 and #254 each offered the maintainer two options — *"close the eight"* or
*"stop stacking"* — and got no reply. The merges are the reply: they came in
**individually, bottom-first**, which is the behaviour of somebody reviewing a
queue, not somebody waiting for one consolidated tree. So the stack stays a
stack, and this lane's job is to keep the next one in line mergeable.

It was not. Every one of the five remaining lessons PRs — #247, #249, #251, #252,
#254 — was **un-mergeable against `main`** this morning, and not because another
lane touched anything. A squash merge replaces four original commits with one new
one, so `git` no longer sees the stack's own bottom as shared history. Fourteen
conflicted files at the top of the stack; ten at #247. **Twelve of the fourteen
are files this lane wrote, conflicting with this lane's own already-merged work.**

Writing lesson 23 today would have added a sixth pull request to a pile of five
that cannot land. So the work was the dam, not the next brick.

## What I did

Merged `origin/main` into `lessons-27-destinations` (#247, lesson 19) and
resolved the ten conflicts. No rebase and no force-push: the branch has a pull
request open against it, and rewriting its history would invalidate anything the
maintainer has already looked at.

Nine of the ten resolved to the branch's side, and each for a stated reason
rather than a policy:

- `schedule.test.ts`, `queue.test.ts` — `main` asserts 23 review sets ending at
  W; the branch asserts 24 ending at X. Set X **is** lesson 19's contribution, so
  the branch's count is the correct one once the lesson is present.
- `questions.test.ts` — both sides assert the same thing. The branch's version
  filters pointers by `kind === "lesson"` before comparing names; `main`'s maps
  every pointer's name. #244 introduced record pointers, so the branch's is the
  version that stays correct now that *where to check* holds two kinds of door.
- `corrections.test.tsx` — the branch additionally wraps `panel()` in
  `ClockProvider`. `main` wraps `sitting()` and not `panel()`. Taking the branch
  puts both helpers on the injected clock, which is what #244's own seam asks for.
- `record.tsx`, `queue.test.tsx`, `links.ts` — a destructuring order, a `const`
  placement, and a doc paragraph. Cosmetic, taken whole to keep one version.
- `README.md`, `review-schedule.md` — the lesson 19 syllabus row, the Part V
  closing paragraph, and Set X. The branch's additions, which is the entire point
  of the branch.

`FINDINGS.md` was the one that did **not** resolve to the branch. Both sides had
appended: `main` ~3,900 lines from other lanes, the branch one finding. Taking
either side whole would have deleted the other's. Resolved to `main`'s content
with this lane's single finding re-appended at the end, per the file's
append-order convention. Header count **462 → 463**: main's entire set intact,
plus one.

After the merge, the branch differs from `main` by **12 files, 1,509 insertions,
13 deletions** — lesson 19, its report, Set X, one finding, and the eight lines of
test adjustment above. Nothing else. That number is the check that the merge did
what it claimed: had I lost a file or taken a wrong side, this diff would carry
somebody else's work in it.

## Verification

`pnpm install && pnpm verify` **green in full**, exit 0: **2,052** runtime tests
and **3,046** application tests, 0 failed. The build prerenders **19** lesson
pages and **24** review sets (A–X), which is lesson 19 and Set X actually
reaching the surface rather than merely existing as files.

**The exercises were re-run, and that was the point of re-running them.** Lesson
19 was written on 6 September against an `src/` that is now 31 commits old. Two
checks, because they answer different questions:

1. `run.test.ts` compiles and runs every Try it program in the course against
   this checkout's `src/`. All nineteen lessons pass, lesson 19 among them. That
   proves the programs still *run*.
2. Running is not the same as still printing what the lesson says it prints. So I
   extracted all seven `ts` fences from `19-destinations.md`, ran the six
   exercises, and compared **every line of every recorded transcript** against
   the real output. All six match verbatim. The only two unmatched lines are in a
   prose list of candidate `action` strings — `/\evil.example/harvest` and
   `(the empty string)` — which is an illustration, not a transcript.

Exercise A, against today's `src/`:

```
endpoints: 2 | submissions: 3
  endpoint: newsletter.subscribe
  endpoint: contact.enquiry
posting: n_1->newsletter.subscribe n_2->newsletter.subscribe n_3->contact.enquiry
  problem: n_4 loom:submit: Unrecognized key(s) in object: 'action'
  problem: n_5 to: Invalid
  problem: n_6 to: Required
```

Character-for-character what the lesson has claimed since 6 September.

`src/scratch.test.ts` was deleted; the working tree is clean.

## Found while teaching

**Nothing new for another lane this run.** No lesson was written, so nothing was
explained hard enough to turn up a defect in somebody else's code. The finding
lesson 19 filed on 6 September — 0087 citing record `0010` under a filename that
has never existed — is carried on this branch unchanged and is still open for
`Loom primitives`.

One observation about this lane's own process, which is not a finding because it
is mine to fix: **stacking made every merge cost twice.** The stack was the right
call for writing — a Part V lesson cannot take Warm-ups from lessons that are not
there — and it is the wrong shape for landing, because each squash at the bottom
detaches everything above it. Four merges produced fourteen conflicts in files
nobody else touched. The next four will do the same unless each branch is brought
up to `main` as the one below it lands.

## What I did not touch

`src/`, `decisions/`, and every other route group are untouched. The only
non-lane file in the diff is `FINDINGS.md`, and the change there is one appended
finding that was already on the branch — nothing of another lane's was edited or
removed.

Lessons 20, 21 and 22 (#249, #252, #254) and the machinery change (#251) are
**still un-mergeable** and were deliberately left alone. Each is a separate
resolution, and doing four of them in one run without a green gate between each
is how a wrong side gets taken quietly.

## What is next

In order, and each one run: bring #249 up to `main`, then #251, #252, #254 —
whichever have not been overtaken by the one below landing. Lesson 23 comes after
the queue drains, not before, and Part V's next seam (a frame's origin) is still
where lesson 20's closing question left it.
