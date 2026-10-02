# 2026-10-01 — marketing: the figures that missed the merge

`#468` gave this site a copy budget. It merged **forty seconds into the work of
correcting its own numbers**, so it landed on `main` carrying measurements taken
before the copy pass that had just changed them.

The ceilings were right and the gate was green. What was stale was the comment's
record of what it had measured — which, on a branch whose whole subject is a
finding that claimed something was built when it was not, is not an irony worth
leaving in place.

![the front door as it now stands, full page at 1280 — 5,234px](2026-10-01-marketing-figures-that-missed-the-merge-front-door.png)

---

## What shipped

| file | what changed |
| --- | --- |
| `_lib/budget.test.ts` | the docstring's measurement table and its scroll figures, retaken; a paragraph on what `#469` moved |
| `FINDINGS.md` | the scroll-length entry's table corrected, and one new entry on the merge window |

**No assertion and no ceiling changed.** All six constants are the ones `#468`
landed with, every one of them still correct, and the 15 tests pass unmodified.
This unit changes comments and a ledger table.

---

## What `#469` moved, and why it is the better evidence

`Loom merge` brought five commits onto `#468`'s branch while it was open, among
them **`#469` — a copy pass over the whole marketing site.** The budget had
never seen that copy and nobody writing it was thinking about a budget, which
makes it a fairer test than the `#464` check `#468` set up deliberately.

Every ceiling held. What moved:

| | `#468` as it landed | actual | ceiling | |
| --- | --- | --- | --- | --- |
| a plain band | 101 | **99** | 120 | ↓ |
| one cell | 94 | **86** | 110 | ↓ |
| **a band of cells** | 247 | **258** | 300 | **↑ 82% → 86%** |
| a page | 1,143 | **1,151** | 1,500 | ↑ |
| the site | 2,499 | **2,512** | 3,300 | ↑ |

And the pages, re-photographed on a production build:

| page | words | height | screens at 900 |
| --- | --- | --- | --- |
| `/` | 1,151 | **5,234px** | 5.82 |
| `/how-it-works` | 862 | 4,688px | 5.21 |
| `/what-you-run` | 499 | 2,808px | 3.12 |

**A pass whose stated job was to make the site read better out loud added eleven
words to the band nearest a limit.** Two of the three band figures went *down*,
which is the honest other half of it, and the site grew by 13 words net.

Nothing was over budget and nothing needed changing. That is the point rather
than a let-off: it is the drift no reviewer sees in a diff, it happened on the
second day the budget existed, and it came from a good edit made for an
unrelated reason. The budget's job is not to stop that edit. It is to be the
only thing in the repository that can see it.

---

## The timing, because it is a filed mechanism and not bad luck

| | |
| --- | --- |
| 16:10:54 | `check_suite.completed` on the merge commit — the event that woke this lane |
| 16:11:53 | the gate re-run against `#469`'s copy: 15 of 15 green |
| **16:12:32** | **`Loom merge` merges `#468`** |
| 16:13–16:15 | pictures retaken, figures corrected, committed |
| 16:1x | pushed — to a branch whose pull request had closed |

Nothing failed and nothing warned. The push succeeded, the branch holds the
commit, `git status` is clean against its remote. **The pull request was no
longer there to carry it.**

This is the inverse of the 28 September entry on the same mechanism, which
records a push being *dropped*. Here the push lands perfectly, on a ref nothing
reads any more — and the branch then looks exactly like a branch whose work is
safe, which is the one state a routine thinks to check.

It is likely rather than unlucky, and the reason is structural: **a second push
to your own branch is nearly always a correction**, and the correction is nearly
always triggered by the merge commit that also made the branch mergeable. The
window a lane re-measures in is the window the merge routine is working in.

The remedy is one command before a second push — read the *pull request's* state
rather than the branch's — and it is filed with the timeline. What landed here
was harmless. The same timing with a fix in it would have put a known-bad
version on `main` with a green branch beside it saying otherwise.

---

## Tests

`pnpm install && pnpm verify` — status written to a file by the gate as its own
command and read separately, on a `dist` and a `.next` deleted first.

| | |
| --- | --- |
| `pnpm verify` | **exit 0** |
| framework | **3,441 tests** |
| application | **6,040 tests**, 1 skipped |
| marketing suite | 38 files, **1,006 tests** |
| `pnpm shoot` | `1280 / 1280`, `390 / 390` — no overflow |

**No test added, changed, weakened or skipped by this lane** — this unit is
comments, a ledger and a report. The skipped test is
`(docs)/_lib/signals/page.test.ts`, which came from `main` with `#466`/`#467`.

### It was red when this branch opened, and `Loom merge` answered it

The gate failed on the two `(docs)/_lib/counts.test.ts` assertions described
above, red on `main` as well as here. Within the half hour, `Loom merge` pushed
`68c61d3` — *"Merge: carry the two (docs) numbers an earlier merge moved"* —
applying both patches this branch had proposed and could not make: the census
literal to `one hundred and two`, and `entry-points.ts`'s summary produced
through `spellOut(siteCount("starter-bands").value)`. It also corrected two
comments that still asserted a library of ninety-nine.

So this branch now carries the fix for a failure it filed and did not touch, and
merging it takes `main` green again.

**The marketing figures were re-measured after that push rather than assumed
unaffected** — `99 / 86 / 258 / 1,151 / 2,512`, identical, since `68c61d3`
touches only `(docs)`. A docs edit cannot move a marketing word count, and
"cannot" is the reasoning this ledger keeps filing entries about.

**It is also the division of labour working exactly as `0067` describes it**, and
worth saying plainly because the failures in this run have had more words than
the successes: a lane found a break it was forbidden to fix, wrote down the patch
with the reasoning, and the routine whose mandate it is applied it in the lane
that owned it and said which files and why. Nobody crossed a lane boundary and
nothing waited on the maintainer.

No decision record.
