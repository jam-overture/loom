# 2026-08-03 (day 29) — the index reads the records instead of repeating them

**Build order section:** none. Repository tooling — the first thing in this repo
that is not part of the framework or the portal.

**Branch:** `day-29-decisions-index`, off `main` at `59ee98c`

---

## Where this run started

The maintainer said take it, after the fourth time it was offered.

`decisions/README.md` carried a hand-maintained table of every record: number,
title, status, section. Every fact in it already existed in the record files, so
it was a second copy — and a second copy drifts.

It drifted, twice, in two days:

- **Two merge conflicts on that one table within half an hour**, both from
  unrelated branches appending a row to the same last line.
- **Two concurrent runs of this routine each wrote an `0032`.** Nothing noticed
  until the branches met, by which point both records existed, both were
  referenced by their own PRs, and one had to be renamed by hand.

The same problem 0015 solved for the primitive registry — generate from the
directory rather than maintaining a parallel list — applied to prose.

---

## What was built

`tools/` is new: repository tooling, typechecked and tested alongside `src/` but
outside the published package, because `tsconfig.build.json` only includes
`src/**`.

- **`record.ts`** — parses one file into `{ number, file, title, status, section }`.
  It accepts both heading separators, because both are in the repo: records
  0001–0015 and 0025–0026 use an em dash and the rest a full stop. Normalising
  them would mean editing sixteen records to satisfy a parser, which is the wrong
  way round.
- **`numbering.ts`** — duplicates, gaps, and statuses naming a record that does
  not exist.
- **`render.ts`** — the table, and a splice that replaces only the index section.
  The generated region runs to the *next* `## ` heading rather than to the end of
  the file, so a section added after the index survives regeneration.
- **`collect.ts` / `build-index.ts`** — the IO half, and `pnpm decisions:index`.
- **Two guard tests** run the real `decisions/` directory through the generator:
  everything parses and numbers cleanly, and the committed README already matches
  what the generator produces.

`compressSection` was the fiddly part. `§3 — Adaptive Renderer → §4 — Framework
SDK` has to become `§3 → §4`, but `§2 — Composition Runtime, binding on §6 —
Telemetry` must keep its "binding on" — the blunter rule of collecting the `§N`s
and joining them with arrows would have asserted a *sequence* where the record
described a *relationship*. It strips the prose after each marker and leaves the
punctuation between them alone.

## Proving the guard, rather than assuming it

The unit test for duplicate detection exercises `checkNumbering` on fixtures,
which proves the function and not the wiring. So the clash was staged for real: a
second file numbered `0031` was dropped into `decisions/`, and the guard failed
with

```
"31 is claimed by 0031-a-clashing-record.md and 0031-calibration-is-a-reader-not-a-controller.md"
```

then passed again once it was removed. That is the failure the next concurrent
run gets, on `pnpm verify`, before it opens a PR.

## What regenerating exposed

The generated table differs from the hand-maintained one in eighteen rows. Most
are the record being more precise than the summary somebody typed — 0006's full
title, 0014's `§2 (interpretation)` instead of `§2`, 0018's actual heading.

**One was a real fault.** The index claimed 0014 was `Accepted — supersedes
0004`. 0014's own record said plain `Accepted`. So 0004 pointed at 0014 and 0014
did not point back, and the only place the relationship was recorded was the
table nobody was checking.

Fixed in the record rather than accepted from it. That is not editing a record to
change direction — the supersession happened, was agreed, and was already
documented; the record simply never said so. Its reasoning is untouched.

## No decision record for this

Deliberate, and the README's own rule: *do not write one for implementation
detail inside an already-agreed design.* The design — numbered files with a
Status/Date/Section header — was already agreed. How the index gets built is
implementation, and it belongs in this report.

It also avoids minting a third clashing `0032` while #38 is in flight, which
would have been a fitting way to introduce a tool built to prevent exactly that.

The README's hand-written prose now says the table is generated, which is a note
to whoever writes the next record, not a decision.

---

## Verification

`pnpm verify` green: typecheck, compiled build, the full suite including 25 new
tests, Turbopack production build.

Two of those tests are guards against the repository itself rather than against
fixtures, which is what turns the rule into something `pnpm verify` can fail on.

---

## Still open

1. **The follow-up to #38** — `Provenance.authoredBy`, the calibration filter it
   protects, and the portal undo button. #38 has no `apps/portal` changes, so
   until that lands, `reversible` remains a property the runtime can prove and a
   user cannot exercise. Both pieces are already written and verified on
   `day-28-authoredby-and-portal-undo`.
2. **The `GatePolicy` seam.** A static value handed to the pipeline once, with no
   supported way for a host to vary it per proposal — the concrete hole in
   "consumers build their own adaptivity".
3. **A rate limit on sign-in**, still an open question in 0027.
