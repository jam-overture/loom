# 2026-10-01 — marketing: the ledger entry that outlived its break

`#472` merged while this lane was correcting the two claims its own merge had
made untrue. The corrections missed it — **the second time today, by the run
that filed the entry warning about the first.**

So `main` carries a ledger entry saying two `(docs)` assertions are broken and
unfixed, and a report saying `pnpm verify` exits 1, on a repository where both
are now false. This closes them, and corrects the remedy I gave this morning,
which was the right shape and the wrong size.

---

## What shipped

| file | what changed |
| --- | --- |
| `FINDINGS.md` | the red-`main` entry **closed** — verified green at `ee9c1d5`; the merge-window entry's remedy corrected, as a new entry |
| `reports/…-figures-that-missed-the-merge.md` | its Tests section, which recorded `exit 1` for a branch that merged green |

No code. No test. Nothing in `app/(marketing)/` or anywhere else.

---

## `main` is green

Verified on a clean checkout of `ee9c1d5`, `dist` and `.next` deleted first:

| | |
| --- | --- |
| `pnpm verify` | **exit 0** |
| framework | **3,441 tests** |
| application | **6,040 tests**, 1 skipped |

`Loom merge` pushed `68c61d3` onto `marketing-54` — *"carry the two (docs)
numbers an earlier merge moved"* — applying both patches this lane had proposed
and was forbidden to make: the census literal to `one hundred and two`, and
`entry-points.ts`'s summary produced through
`spellOut(siteCount("starter-bands").value)`. `#472` carried it to `main`.
**Total time red: about an hour.**

That is the division of labour in `0067` working end to end, and it is worth
saying plainly because the failures today have had more words than the
successes: a lane found a break it could not touch, wrote down the patch with
the reasoning, and the routine whose mandate it is applied it in the lane that
owned it and said which files and why. Nobody crossed a lane boundary and
nothing waited on the maintainer.

---

## The remedy I gave this morning does not work

The earlier entry ends:

> **Before pushing a second time to your own branch, read the pull request's
> state** — not the branch's.

**I did check. I checked in the same command as the push.** A check beside a push
prevents nothing, and a check just before it closes a window of seconds rather
than the one that matters. The real race is between **the whole correction** —
re-verify, re-measure, re-photograph, write, commit, ten minutes — and a merge
routine already looking at a green, mergeable branch.

The advice was the right shape and the wrong size. **A state check is not a
lock**, and nothing a lane can run makes it one.

### What holds instead

Decide where a correction goes **before making it**, from the branch's
mergeability rather than its content:

- red, conflicted, or waiting → this branch; there is time.
- **green and mergeable → assume it is about to merge**, because that is what
  `Loom merge` is for. The correction goes on the next branch, and the comment
  says so.

One judgment at the start, costing nothing, instead of a check that cannot win a
race entered too late.

**The corollary is the uncomfortable half:** a green mergeable branch of yours is
not a place to keep working. Both times today I treated one as a draft I still
held, because it had my name on it and I was mid-thought. It was a queue entry.
The two are indistinguishable from inside the lane, and `git status` reports the
same clean tree either way.

---

## What it has cost

Nothing on `main`, twice — eleven words in a docstring, then a status line and a
test table, each re-landed on the following branch.

**Three branches for one unit, two of them existing only because of this.** That
is the cost: not a wrong line shipped but a lane spending two runs chasing its
own record. The same timing around a *fix* would put a known-bad version on
`main` with a green branch beside it saying otherwise.

---

## Tests

| | |
| --- | --- |
| `pnpm verify` | **exit 0** on `ee9c1d5`, before these edits |
| `pnpm findings:check` | 929 findings, 0 malformed |

This unit is two Markdown files. No test added, changed, weakened or skipped, and
nothing here can affect one.

No decision record.
