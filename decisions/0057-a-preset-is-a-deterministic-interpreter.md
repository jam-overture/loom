# 0057. A demonstrated change is a deterministic interpreter, not a script beside the runtime

**Status:** Accepted
**Date:** 2026-08-12
**Section:** §4b → §4c

## Context

The demo has to show what happens to a change, and what happens to a change is
the interesting part: assessed on two axes, judged by one named rule under one
named policy, applied or held, logged, and reversible. The model call in front of
all that is the least novel thing in the sequence.

But it is the one thing that can be absent. A deployment with no
`LOOM_ANTHROPIC_API_KEY` is a supported state, not a broken one — the portal
already says so — and a demo that could only demonstrate anything when a key was
configured would show a disabled textarea to anyone who cloned the repo. It is
also the one thing that cannot be tested: a run against a live model is not a
check a build can depend on, and unit tests must pass with no key present.

There is a third pressure arriving immediately behind this one. §4c's
documentation site puts a real, mounted `LoomTree` on every page with a
propose-a-change box on it. Dozens of examples, each of which must render and
behave the same way on every visit, is not a thing to point at a model.

## Decision

**A demonstrated change is an ordinary `ChangeInterpreter` that computes its
delta from the tree, and everything downstream is unable to tell the
difference.**

Each preset is a pure function from the current tree to a list of operations,
wrapped in an interpreter that produces a `ProposedChange` in the normal shape
and is handed to `commitIntent` in the normal way. It is assessed by
`assessChange`, judged by `gate`, held by the same `HoldStore`, appended by the
same store, and undone by `revertRevision`.

Two properties make this honest rather than a mock:

- **It re-plans against the tree it is handed**, never against the tree the
  button was drawn from. A chip clicked against a page that has since moved
  produces a delta for the page as it is now, or declines.
- **Its provenance says what it is.** `interpreter: "loom/demo-preset"`,
  `authoredBy: "runtime"`, `confidence: 1`. A computed delta is not a guess, and
  a 1 nobody graded must be segmented out of calibration rather than counted as a
  model's perfect record
  ([0031](0031-calibration-is-a-reader-not-a-controller.md)).

This is not a new idea; it is the second instance of one already accepted.
`revertInterpreter` ([0032](0032-an-undo-is-a-proposal-not-a-rewind.md)) is a
deterministic interpreter for exactly the same reason: the seam exists because
interpretation is the *non-deterministic step*
([0005](0005-interpretation-is-the-only-non-deterministic-step.md)), not because
it is always a model. This record generalises it and names it, so §4c's examples
and §4d's marketing copy have a pattern to follow instead of each inventing one.

Free text still goes to the model when one is configured. Both paths reach the
same pipeline, and the record shows which of them authored the proposal — which
is itself worth demonstrating, because the Gate does not care.

## Consequences

- The demo works on a clone with no key, no database and no account: five
  changes, all four delta operations, holds, answers and undo.
- The demo's guarantees are checkable in CI. `lib/demo/pipeline.test.ts` runs
  every preset end to end through the real write path and asserts the
  dispositions, the stake factors, the inverse and the revisions — including
  that a contested undo is held under `discards-later-work`
  ([0035](0035-discarded-work-is-a-stake-and-only-the-runtime-declares-it.md)).
  None of it needs a model.
- A preset is bounded by what it can compute, so "make this page feel calmer"
  stays a model's job. The chips are the demonstrations worth repeating, not the
  whole vocabulary.
- §4c inherits the pattern: an example that cannot render is a failing test
  rather than a stale snippet, which is only true because the example's change is
  computed rather than generated.

## Alternatives considered

**Record real model output and replay it.** Honest about provenance and shows a
real model's phrasing. Rejected because a recording is pinned to the tree it was
recorded against: the second click, on a page the first click changed, replays a
delta whose node ids may no longer mean the same thing — and the failure is a
diagnostic in front of a visitor.

**Hardcode deltas against known node ids.** Simplest of all, and the demo's ids
are deterministic, so it would work on the first click. Rejected for the same
reason and one worse: it makes the page and the demo one artefact, so editing the
copy silently breaks the buttons.

**Model-only, and disable the demo without a key.** The purist position: never
show a change nobody guessed. Rejected because it mistakes which part is being
demonstrated. The proposal is the least of it; the record beside it is the
argument, and it is exactly as true of a computed delta as of a guessed one.

**A separate "demo mode" through the pipeline** — a flag that skips
interpretation and injects a delta. Rejected as the one option that would make
the demo a lie: a bypass around the seam would mean the thing on screen was not
the thing that runs in production, which is what every other choice here exists
to avoid.

**Have the presets call the model with a fixed prompt.** Keeps a model in the
loop and reads as more impressive. Rejected: it is non-determinism bought at full
price, with a paid call on every click of a public page, and it still cannot be
tested.
