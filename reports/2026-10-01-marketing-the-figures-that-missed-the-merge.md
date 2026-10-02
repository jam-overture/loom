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

**`pnpm verify` is red on this branch, and it is red on `main` for the same two
assertions.** Reproduced on a pristine `19d5238` with everything of this lane's
stashed:

```
× everything this site wrote for a reader > writes no counted size as a number
× spelling a number the way prose spells it > spells the ones the site is stating today
```

Both are `app/(docs)/_lib/counts.test.ts`. **`#465`** took the starter library
from ninety-nine primitives to one hundred and two; **`#470`** landed the rule
that a stated count must be produced rather than typed, with a census test
pinning the spelled numbers as literals. Each was green on its own branch and
the combination is red, because `#470` was verified against a `main` that did
not yet carry `#465`.

**Not fixed here.** `(docs)/_lib/` is another surface's route group and this
lane does not edit one; no open pull request fixes it, so there is nothing to
port. Filed with both one-line patches and a line for `Loom merge`, whose
mandate this is.

| | |
| --- | --- |
| `pnpm verify` | **exit 1** — the two docs assertions above, red on `main` too |
| framework | **3,441 tests**, all passing |
| application | 2 failed, **6,038 passed**, 1 skipped — both failures `(docs)` |
| marketing suite | 38 files, **1,006 tests**, all passing |
| `pnpm shoot` | `1280 / 1280`, `390 / 390` — no overflow |

**No test added, changed, weakened or skipped** — this unit is comments and a
ledger, and it can touch neither failure. The skipped test is
`(docs)/_lib/signals/page.test.ts`, which came from `main` with `#466`/`#467`.

No decision record.
