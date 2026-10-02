# The measurement that survived the merge

**Date:** 2026-10-02 · **Section:** §1 (process) · **Lane:** `Loom daily build`
**Branch:** `framework-63-nothing-can-see-a-box` → `#476`
**Records:** [0213](../decisions/0213-the-harness-reads-a-box-it-prints-the-number-and-the-judgement-stays-in-the-report.md),
renumbered from `0212` and one clause added. **None superseded.**

---

## What this run did

`#476` was opened yesterday, went green on its own branch, and went red the
moment `main` arrived. `Loom merge` stopped rather than guess, left the branch
untouched at `cd4edab`, and wrote down three options and a recommendation. **This
run took the decision, and the pull request is mergeable.**

Nothing about what `#476` decided has changed. What changed is three things that
were blocking it and one number that turned out to be worth the whole unit.

---

## The number, first, because it is the argument

The shot list `#476` committed was re-run this morning against the merged tree —
same five selectors, same page, a day of other lanes' work underneath it:

```
$ pnpm shoot reports/2026-10-02-…-the-measurement-that-survived-the-merge.shots.json --serve apps/loom

  2026-10-02-…-the-rail-wide  1280x900@2x  scrollWidth 1280 / innerWidth 1280
      aside  x 848 y 44  432x857  holding 1262 in 857
      aside h1  x 869 y 92  391x73  holding 77 in 73
      aside li (1 of 9)  x 869 y 208  87x27
      aside li (2 of 9)  x 962 y 208  101x27
      aside li (3 of 9)  x 869 y 841  391x59
      aside li (4 of 9)  x 869 y 904  391x59  ← 63 past the fold
      aside li (5 of 9)  x 869 y 967  391x59  ← 126 past the fold
      aside li (6 of 9)  x 869 y 1030  391x59  ← 189 past the fold
      aside li (7 of 9)  x 0 y 0  0x0
      aside li (8 of 9)  x 869 y 1276  391x101  ← 476 past the fold
      aside li (9 of 9)  x 869 y 1388  391x85  ← 573 past the fold
      text=Ask that page for a change  x 869 y 92  391x73  holding 77 in 73
      text=a selector that matches nothing  no match
```

![The rail those numbers are about, re-measured on the merged tree](2026-10-02-framework-the-measurement-that-survived-the-merge-the-rail-wide.png)

| | yesterday, `cd4edab` | today, merged |
| --- | --- | --- |
| the rail | **holding 1240 in 857** | **holding 1262 in 857** |
| furthest block | 551 past the fold | **573 past the fold** |
| first block below the fold | `li 4` at 41 past | `li 4` at **63** past |

**The rail grew 22 pixels overnight and nobody did it on purpose.** No lane
touched `/demo` between the two readings; the growth is the sum of a day's merges
arriving in a scroller that has no budget. Yesterday that fact was unobtainable
without writing a browser script, which is the finding `#476` closes. This
morning it is a line in a run's output, taken by a list a reviewer can read.

It is also, exactly, the thing `0213` declines to fail a build over: 22px of
drift in a rail that scrolls correctly is a copy and ordering judgement, and the
whole of the record is that the instrument states it and a person settles it. The
first week of that instrument's life has now produced its first moving number.

---

## The three things that were blocking

### 1. `measured` — a contract, settled where it belongs

`tools/specimen/capture.ts` gained a **required** `measured` on the shot result,
and `describeShot` read it unconditionally. Lesson 32, which landed four hours
earlier, hand-builds a shot result to teach what a report's line is made of — six
fields, no `measured`, because at the time there was no such field. So
`describeShot` dereferenced `undefined` and three assertions in `(lessons)` went
red. Nothing was wrong in isolation; the merge order did it.

`Loom merge` recommended making the field optional. **That is what shipped, with
the cost it named removed.** A single optional field would have had the producer
promise less than it delivers — `captureShots` *always* takes the reading, and a
measurement silently missing from a real run is a defect this harness should not
be able to have. So the two facts are separated:

```ts
export type ShotResult = {
  …
  /** One entry per selector the shot asked about, in the order it asked. */
  readonly measured: readonly MeasuredSelector[]
}

/** What `describeShot` needs, which is less than the harness produces. */
export type DescribableShot = Omit<ShotResult, "measured"> & {
  readonly measured?: readonly MeasuredSelector[]
}
```

The reader asks for less than the producer promises. Every existing caller is
untouched — `ShotResult` is assignable to `DescribableShot` — the harness keeps
its guarantee, a hand-built shot keeps working, and the one place that reads the
field is the one place the absence is handled. Two tests hold it: a result with
the field simply absent prints exactly what a result with an empty list prints,
and an absent measurement does not swallow the clipped lines above it.

**This is `tools/specimen/`, which is this lane's.** No lesson code changed.

### 2. `0212` was taken, so the record is `0213`

`#477` merged with `0212` while this branch held it. The rename, nine citations
across `tools/specimen/`, `tools/screenshot/`, `FINDINGS.md` and yesterday's
report, the index regenerated, and a dated note under the record's header saying
what moved and that nothing it decides changed. About fifteen minutes.

This is the **third** same-day collision in four days (`0205`, `0209`, `0212`).
Filed, with two shapes that would actually hold and a recommendation, because the
convention as written — *take the next free number after re-reading `main`* — is
what every routine already does and cannot work.

### 3. Lesson 32's transcript, numbers only

Exercise G reads `tools/specimen/` off disk and prints which DOM reading APIs
each file names. This branch's own new tests moved three of its lines:

| | before | now |
| --- | --- | --- |
| `getBoundingClientRect` | `false · true · false` | **`true · true · true`** |
| `querySelectorAll` | `false · true · false` | **`false · true · true`** |
| top-level functions in `playwright.ts` | 10 | **11** |

**The three numbers were corrected from this branch. The paragraph under them was
not**, and that is deliberate. The lesson's conclusion — *no DOM reading API
appears in the suite at all* — is now false, and rewriting it would be a framework
routine authoring another lane's teaching text, which is precisely what the
30 September entry objected to. Filed for `Loom lessons` with the exact sentence,
the reason it moved, and a suggested replacement that is sharper than the original
(both new `true`s are **doubles** — a stubbed rect on a cast object, and a
`querySelectorAll` named in a doc comment explaining why the reading goes through
a locator *instead* of one — so the row's point survives: the suite still cannot
read a laid-out page, and what it can now do is pin which six numbers the reading
asks for).

`main` therefore carries a lesson whose table and paragraph disagree, visibly,
until its owner takes it. That is the state this run chose and it is stated here
rather than discovered later.

---

## Decisions this run made that nothing specified

**`DescribableShot` rather than one weakened type.** Argued above and written into
`0213` as a clause under *the judgement is in Node and the reading is in the
page*, with the rejected alternative named. It is a clarification of where that
split already fell, so the record is annotated rather than superseded.

**Numbers in another lane's file, never prose.** The drift clause says a forced
cross-lane edit is allowed to keep `main` green. This run read that as: a number a
test computes, yes; a sentence a person wrote, no. A self-contradicting lesson for
a day is a better failure than curriculum written by the wrong lane.

**The re-measurement was taken rather than assumed.** The shot list is committed
beside the picture, which is the convention `#476` proposed and nobody has ruled
on yet. It is the reason the 22px is quotable.

---

## Gate

`pnpm install && pnpm verify` — **green, exit 0**, on a deleted `dist` and
`apps/loom/.next`, status captured to a file and read in a separate command.

| | `main` @ `440db17` | this branch |
| --- | --- | --- |
| `@jam-overture/loom` | 172 files / **3,462** | 172 / **3,485** |
| `@loom/app` | 356 / **6,262**, 1 skipped | 356 / **6,262**, 1 skipped |
| findings | 937 | **940**, 0 malformed |

**+23 root tests over `main`** — 21 from yesterday's unit, **2 written today** for
the absent-measurement contract. The application suite is **identical to `main`**:
this run added no app test and removed none; the only app-side change is three
recorded numbers in a transcript an existing test reads, and it passes on them.

The `main` baseline was measured, not quoted — a worktree at `440db17` with its
`dist` built, both suites run. Nothing was weakened, skipped or deleted. The one
skipped test is `(docs)`' and is on `main`.

**Red once while working, and it was the useful kind.** After the `measured` fix
the `TypeError` and its two cascades were gone and one assertion remained — the
exercise G drift above. That is the same mechanism yesterday's report described
from the other side: the file that goes red is the file that **reads**, not the
file that changed.

---

## Scope

`tools/specimen/`, `decisions/`, `reports/`, `FINDINGS.md`, and three numbers in
`lessons/32-layout.md`. `git diff origin/main...HEAD -- src/` is **empty**. No
route group, no primitive and no published code is touched.

---

## Open questions

1. **The height budget.** Unchanged from yesterday's ask and now with a reading
   behind it: the rail moved 22px in a day and nothing could have failed. The
   recommendation is still to leave it one more cycle and write the budget against
   what lanes actually record — but the case for teeth is 22px stronger than it
   was.
2. **Decision numbering.** Three collisions in four days. Filed with a
   recommendation (a band per lane); it is four lines in `docs/routines.md` and
   it is the maintainer's call.
3. **Is a committed shot list the convention?** Asked yesterday, unanswered, and
   this run leaned on it twice.
4. **Lesson 32's paragraph** belongs to `Loom lessons` and is filed for them.
