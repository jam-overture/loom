# 0264. A report's visual is stored at the size the page was laid out at

**Status:** Accepted
**Date:** 2026-10-12
**Section:** §1 (process)

## Context

`docs/routines.md` has asked every run for "a visual alongside" since the first
routine, and [0116](0116-a-screenshot-is-taken-by-the-repository-and-playwright-is-never-a-dependency.md)
built the harness that takes it, on the finding that sixteen visual defects in
this repository were found by looking at a screen rather than at an assertion.
Neither document ever said what the picture should be *stored* as. The answer
every lane reached independently was the harness default — a full-page PNG at
`deviceScaleFactor: 2` — because that is what comes out if you do not choose.

Measured on 12 October, at 489 reports:

- `reports/` holds **1662 PNGs weighing 669MB**, and 114 SVGs weighing 0.7MB.
- Everything else this repository tracks — all of `src/`, `apps/`, `docs/`,
  `decisions/`, `tools/` and `FINDINGS.md` — comes to **30MB**.
- The pictures are therefore **95% of the repository**, and `size-pack` is
  669MB against a working tree of 987MB.
- The weight is the current snapshot rather than history: 1752 distinct PNG
  blobs exist across all reachable history and 1662 of them are live in `HEAD`.

That last line is the one that decided the shape of this record. It means the
weight is reachable by an ordinary commit, and that **no history rewrite is
needed or justified** — which matters here beyond the usual cost, because the
records in this directory cite commit SHAs as evidence (*"0259 is the highest
record on `main` at `c93995d1`"*) and a rewrite would falsify them.

It also means the cost is being paid continuously by the things that clone
shallowly, which is CI and every Vercel deployment.

## Decision

**A raster visual in `reports/` is stored as WebP, at the capture divided by its
`deviceScaleFactor`, and may not exceed 1.2MB.** `pnpm reports:shrink` performs
it; `pnpm reports:check`, inside `pnpm verify`, enforces it.

Three things follow, and each answers a measurement rather than a preference.

**The saving is the format, not the scale.** On a sample spanning four eras, the
same screenshots re-encoded as PNG at half their dimensions came back 1.4×
smaller; as WebP at the same half dimensions, 5×. Halving alone would not have
been worth touching 1662 files for. The 1662 came to 669MB and come to 133MB.

**Half the dimensions is not a compromise on the evidence.** The harness shoots
at `deviceScaleFactor: 2`, which holds four times the pixels the layout had.
That is worth having while you are hunting a half-pixel seam and is not worth
committing: what a report argues from is what the reader saw, and the stored
size *is* the size the screen showed. The clamp above it — WebP cannot encode a
side past 16383, and `2026-09-06-marketing-four-units-record.png` is 30484 tall
— is the encoder's limit rather than ours, and is applied proportionally.

**Nothing is deleted.** 387 visuals are cited by no file in the repository, and
the first draft of the check called that a fault, whose fix is `rm`. It would
have removed 139MB of evidence:

- **273 are named after a report that exists** — `2026-07-31-day-20-telemetry-journal.svg`
  beside `2026-07-31-day-20-telemetry-journal.md` — and are that report's own
  diagram, which the report simply never wrote the image line for.
- **The remaining 114 each share a date with between seven and sixteen reports**,
  any of which could be theirs.
- **81 visuals are byte-identical to another**, which looks like pure waste until
  you read the names. They are the `-before` and the `-embed-unchanged` of a
  pair, and `docs/routines.md` says in as many words that *the shots coming back
  byte-identical is what makes the third one evidence*. Git stores one copy of
  them regardless, so they were never weight in the first place.

A citation is therefore not something a check can infer, and it did not need to:
the weight was never in the count. `reports:check` prints the uncited number and
leaves the files alone.

## Alternatives considered

**Rewrite history.** The reflex, and wrong twice over. The weight is in `HEAD`,
not in history: 1662 of the 1752 PNG blobs reachable from here are live in the
tree, so an ordinary commit reaches 95% of it. And the records in this directory
cite commit SHAs as evidence — *"0259 is the highest record on `main` at
`c93995d1`"* — which a rewrite would falsify. The cost is also unmeasurable from
a session container, which clones shallow: the full history cannot be sized from
here, so the saving could not be stated honestly even if it were wanted.

**git-lfs.** Keeps every byte and shrinks the clone. It adds a client
dependency to a repository that has worked hard not to have one (0116), it is
metered on GitHub past 1GB, and it only helps a full clone after the same
history rewrite refused above.

**Stop committing screenshots; attach them to the pull request.** The cheapest
option and the one that loses the most. A report argues from a photograph; a
report whose photograph is a dead link in a closed pull request has lost the
argument. 0116 exists because taking the picture was expensive enough that it
did not get taken — making it *unciteable* is worse.

**Palette-quantized PNG at full scale.** Measured at 2.6× smaller, keeps the
format, needs no citation rewrite, and would have been the tidy answer. It is
half the saving, and it cannot help the three shots taller than 16383px, which
are the largest files in the directory.

**AVIF.** Measured at 7× — the best of the formats tried. Encoding is slow
enough to matter across 1662 files, and support in the things that read a report
is thinner than WebP's. Worth revisiting if the directory grows again.

**Delete the visuals nothing cites.** Refused, for the three reasons the
Decision gives. It was the first draft, and it would have removed 139MB of
evidence.

## Consequences

- One command after shooting, which `pnpm verify` will tell you about if you
  forget it. Both screenshot entry points print the reminder themselves.
- **The encoder is resolved at call time and is not a dependency**, for the
  reason 0116 gives about Playwright. `reports:check` only calls `stat`, so
  `pnpm verify` needs no platform binary to tell you a file is too big; only
  `reports:shrink` needs `sharp`, and it finds the copy Next.js already brought
  into the pnpm store.
- **A shallow clone gets the whole saving immediately**, which is what CI and
  Vercel take. A full `git clone` still carries the PNGs in history and will
  until someone decides a rewrite is worth falsifying the SHA citations for.
  That trade is not taken here and is not recommended.
- The harness still writes PNG. Teaching the driver in
  `tools/specimen/playwright.ts` what an image format is would make it the second
  thing that file knows, and teaching one entry point and not the other is the
  drift 0116 exists to prevent. If the extra command proves annoying, converting
  inside both entry points is the follow-up — the specimen path compares digests
  across a git ref and should not be changed without exercising that.
- 489 reports have their image citations rewritten in the same commit as the
  files they point at. A report's prose is untouched.
