# 2026-08-02 (day 27) — the runtime can now be asked whether its confidence was worth anything

**Build order section:** §6 — Telemetry, reading back into §2's territory without
touching it.

**Branch:** `day-27-calibration`, off `main` at `efdc3f0`

**Third run of the day.** Day 25's compile step merged as #36 and the maintainer
closed the Supabase/Vercel chore list (#26) — password rotated, RLS enabled on all
three tables, persistence confirmed live.

---

## Where this run started

Not with a unit. The maintainer asked for a sense check: *"This framework is
designed to be the future of web development in the AI space. A true AI powered
adaptive runtime. I want a quick sense check that we are still building towards
that."*

So the run began by auditing the thesis against `src/` rather than against the
plan. The thesis is a runtime where **the UI is data, change is proposed rather
than written, and every proposal is inspectable, gateable, attributable, and
reversible.**

Five of those hold up, with code behind each:

| Clause | Where it lives |
| --- | --- |
| UI is data | `src/tree/` — a validated AST, stored whole as JSON |
| Proposed, not written | `src/runtime/` — the Gate, stakes, dispositions, held proposals |
| Inspectable | the portal's outline, preview, `/history`, `/activity`, `/audit` |
| Gateable | the Gate plus custody plus answer-by-id |
| Attributable | `Provenance.actor`, portal auth, `answered_by` on the revision |

Two did not, and naming them was the useful part of the exercise.

**"Reversible" is proven but not offered.** `assessReversibility` computes the
inverse delta up front and carries it through the pipeline, so the runtime can
*say* whether a change is undoable. Nothing applies it: `invertDelta` has exactly
one caller and that caller is the assessor. There is no revert in the write path
and none in the portal. Of the five adjectives it is the only one with no
user-reachable path. **Still open after this run.**

**"Adaptive" was not earned.** 0007 has been Accepted since day 2 and says
confidence is self-graded, trusted on purpose, and *must be calibrated*. Nothing
calibrated it. The word appeared in three comments and zero functions, while §6
quietly accumulated every input the measurement needs.

## The maintainer reframed it, and the reframing changed the unit

> *"I think adaptation offered by us is going to be much later. But if the
> foundation is there to offer it later that is a win... given that the telemetry
> is there, more sophisticated consumers of the framework could hook up their own
> models to make them dynamic to their own preference."*

That is a better position than the one this run started from, and it moves what
the work has to prove. If adaptation belongs to consumers, the deliverable is not
our learner — it is evidence that the journal is **legible enough for someone
else to build one**. Calibration became the reference consumer: the first thing
outside §6 to read the record back and answer a question nobody stored the answer
to.

That constraint is now written into 0031 and enforced by where the code sits.
The portal page reads `@loom/runtime/telemetry` and nothing else. If it had
needed private access, no third party could reproduce it.

---

## What was built

**`calibrationOf` — a pure fold from the episode fold to a calibration report.**

It buckets every judged proposal by the confidence the model gave itself, and per
bucket reports how many were judged, how many survived, the mean claim, and the
gap between the two. Ten buckets, fixed.

The definitions are the substance, and each one is a decision that could have
gone the other way:

- **A verdict is `survived` or `rejected`, and most things are neither.** Survived
  means it reached the log. Rejected means the Gate refused it or a human
  discarded it. Awaiting an answer, broke mid-flight, or unfinished when the
  window ended — none of those enter a denominator. **A commit that fell over on
  the database says nothing about whether the model was right**, and counting it
  as a rejection would make the runtime look overconfident every time
  infrastructure had a bad day.
- **The unjudged are counted and named.** The report carries the breakdown and the
  fold's `unattributed` count, for the reason the fold returns them at all: a rate
  over a denominator that quietly changed is worse than no rate.
- **An empty bucket reports `null`, not `0`.** Zero out of zero is not zero, and
  in an alpha most buckets will be empty. That is the correct output.
- **A repair is scored as its own claim.** The refusal that prompted it is
  precisely the case where the grade was wrong; averaging the pair would erase the
  datapoint the whole exercise exists to collect.

**`/calibration` in the portal** — the headline reading, then a band-by-band
table where the bar is the observed survival rate and a tick marks where the mean
claim sat. A band the model read correctly has its tick at the end of its bar.

Recorded as **0031 — Calibration is a reader, not a controller.**

## The part that is deliberately missing

Nothing consumes the report. No threshold moves.

A runtime that reads its own record of its own judgments and adjusts its own gate
can drift somewhere nobody chose, and the drift is silent by construction — the
thing that would notice is the thing that moved. Every other change in this
system is proposed to a human first, and a policy floor is a change. Letting
policy read this deserves its own record, argued from data this one produces.

---

## Two things this run got wrong, and what they cost

**Added a field that already existed.** `ProposalEpisode` was given a top-level
`confidence`, wired through the draft and the materialiser — before checking that
confidence lives on `Provenance`, which `ProposalEpisode` already carries. Four
edits to `episode.ts`, all reverted. Caught while writing the test that would have
used it, which is early, but reading `proposal.ts` first would have been earlier.

**Nearly shipped a floating-point bug.** The first bucket index was
`Math.floor(confidence * CALIBRATION_BUCKET_COUNT)`. `0.7 * 10` is not reliably
`7` in binary floating point, and the failure mode is a claim filed under a band
whose own printed bounds exclude it — wrong in the one way nobody thinks to check,
and invisible in a passing test suite that happened to pick friendly numbers. It
now counts how many lower bounds a confidence clears, comparing against the exact
values each bucket publishes, which makes the mismatch unrepresentable rather than
unlikely.

## One refactor, taken because the alternative was duplication

`episode.test.ts` built its write path — real Gate, real store, real journal, only
the model scripted — in a 55-line local harness. The calibration tests need the
same thing for the same reason: a test that asserts its own dispositions keeps
passing after the Gate stops producing them.

Moved to `src/testing/episode-harness.ts`, which is excluded from the published
build. `episode.test.ts` lost 90 lines and still passes its 17 tests unchanged.

---

## Verification

`pnpm verify` green: **680 runtime tests / 66 files, 135 portal tests / 18 files**,
typecheck, compiled build, Turbopack production build.

Every calibration fixture is a real run through the Gate — `commitIntent` against
a memory store with a scripted interpreter — rather than a hand-assembled record.
The two cases a real run cannot produce (a failed commit, an unattributed record)
are built by overriding one field on a real episode, so even those start from
something the pipeline actually emitted.

---

## What is next, in the order I would take it

1. **A revert path.** The inverse delta is already computed and already carried.
   Applying it is a write like any other — it should propose, be gated, and be
   attributed, not bypass the pipeline. This closes the last of the five
   adjectives and is a genuinely small unit given the groundwork.
2. **Generating `decisions/README.md` from the record files.** Offered twice and
   still unanswered. Two merge conflicts landed on that one hand-maintained table
   inside half an hour, and a numbering clash between concurrent runs produced two
   `0028`s. It is the same move 0015 made for the primitive registry.
3. **A rate limit on sign-in**, still named as an open question in 0027.
