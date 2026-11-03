# 0339 — The `reports/` commands read one set of files, and it includes what a run has just written

**Status:** Accepted

**Date:** 3 November 2026

**Section:** §4 (the framework's own tooling)

## Context

Two commands govern the pictures in `reports/`. `pnpm reports:check` is the
gate, inside `pnpm verify`; `pnpm reports:shrink` is how a run satisfies it,
turning the PNGs the screenshot harness wrote into the WebP the gate accepts
([0264](0264-a-report-s-visual-is-stored-at-the-size-the-page-was-laid-out-at.md)).

Each asked git for its files, and the two asked different questions:

| | invocation | sees a picture a run has just written |
| --- | --- | --- |
| `reports:check` | `ls-files --cached --others --exclude-standard` | **yes** |
| `reports:shrink` | `ls-files` | no |

The gate's call already carried the reason in a comment beside it: *a 5MB PNG
written a moment ago and not yet added is invisible to `ls-files` alone — and
that is exactly the state a run is in when it has just taken its screenshots.*
The shrinker was the call that never got that fix.

**The cost is a closed loop, not a missing feature.** Capture, shrink, verify —
the order `docs/routines.md` gives, and the only order that makes sense —
produced this, reproduced on `main` at `eb591ce` with one 8×8 PNG in `reports/`:

```
$ pnpm reports:shrink
nothing to shrink — no raster images under reports/
$ pnpm reports:check
reports/<shot>.png is not .webp or .svg — run `pnpm reports:shrink`
```

The gate's advice is advice the other command cannot take. The way out —
`git add` the pictures before shrinking them — is written nowhere, and a run
that reads *nothing to shrink* as *there was nothing to do* carries PNGs into
the gate and goes red two commands later for a reason naming neither the
capture nor the shrink. `Loom docs` filed it on 30 October, having lost a cycle
to it, and noted that it compounds with the 29 October entry one step earlier in
the sequence — a different defect of the same shape, which is not closed here.

**A second defect sat in the same line**, found while fixing the first and not
filed by anyone: the shrinker rewrites the citations that point at a name it
converted, and it looked for them in the tracked files only. A report written
*this run* is itself untracked. So a run that found the `git add` workaround and
applied it to its pictures but not to its report got the pictures converted and
the report's citation left pointing at the `.png` that had just been deleted —
which is precisely the 404 the command's own doc comment says its two jobs move
together to prevent.

## Decision

**The set is defined once, in `tools/reports/governed.ts`, and both commands
read it.** It is the gate's set: tracked, plus untracked-but-not-ignored.

`governedFiles(root)` performs the one invocation and returns a
`Result<readonly string[], GovernedError>`; `parseGovernedFiles` is the pure
half. `survey.ts` lost its private `tracked()` and `shrink.ts` its private
`ls-files`, and `SurveyError` is now an alias of `GovernedError` so the gate's
reporting is unchanged.

**An untracked raster under `reports/` is not a file to protect.** That was the
open question — whether the narrower set was deliberate, shielding a scratch PNG
somebody meant to keep out of the way — and the repository answers it: the gate
*fails* on exactly that file. There is no state in which such a file is
tolerated and therefore none in which the shrinker should decline to store it.
That is what settled which of the two sets to keep rather than taste.

**The property is checked, not the two call sites.**
`tools/reports/governed.test.ts` sweeps the directory and fails if any module
but `governed.ts` names `ls-files`, so the third command added here cannot
quietly pick a third set. The sweep was confirmed to fail on a planted second
mention rather than assumed to.

## Consequences

- `pnpm reports:shrink` now stores the pictures a run has just taken, with no
  `git add` first, which is what `docs/routines.md` has described all along —
  the documentation was right and the tool was wrong, so **nothing in
  `routines.md` changes.** The two findings asking for a sentence there are
  answered by the code instead.
- The citation pass now reaches a report written this run.
- Both commands widen together or not at all, which is the point.
- `--exclude-standard` is kept, so `node_modules` and build output stay out. The
  set is larger than it was by exactly the files a run creates.
- Every switch involved predates the 2.15 floor
  ([`tools/git/portability.ts`](../tools/git/portability.ts)) by a decade, so
  nothing here is newer than the maintainer's git.

## Alternatives considered

**Leave the two calls alone; have the shrinker print a line about the files it
is declining to touch** — *"3 untracked rasters under `reports/` were not shrunk
— `git add` them first"* — plus a sentence in `docs/routines.md`. This is what
the 30 October finding recommended, and it was **rejected after the doubt behind
it was resolved.** It recommended the narrower fix because the reason for
`ls-files` was not stated and *may be deliberate*; it is not — the sibling
module in the same directory had already made the opposite choice for this exact
case and written down why. The shape turns a silent no-op into an instruction
but leaves two commands disagreeing about which files exist, leaves the extra
step in the run, and leaves a third command free to pick a third set.

**Have the shrinker read the `reports/` directory instead of asking git.** The
documentation's own description, and it would fix the first defect. Rejected
because it fixes one of the two and re-opens the question: a directory walk has
no idea what `.gitignore` says, so the answer drifts from the gate's again the
moment anything under `reports/` is ignored, and the citation pass still needs a
repository-wide file list that a walk of one directory cannot give it.

**Move the file listing into `src/`** so anything could use it. Rejected as
scope: `src/` is the published framework and this is the repository's own
tooling. `tools/reports/` is where both callers are.
