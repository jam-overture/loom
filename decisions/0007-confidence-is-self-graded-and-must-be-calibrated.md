# 0007 — Confidence is self-graded, trusted on purpose, and must be calibrated

**Status:** Accepted
**Date:** 2026-07-28
**Section:** §2 — Composition Runtime, binding on §6 — Telemetry

> **Amended 2026-08-28**, under [0099](0099-a-record-is-amended-when-only-the-count-moved.md).
> The ladder's rule count below read *six* and has been seven since 19 August.
> Two rules still read confidence; only the size of the list they sit in moved.
> Held against `ESCALATION_LADDER` by `src/record-claims.test.ts` from now on.

## Context

Two of the Gate's seven rules read `provenance.confidence`: one refuses a change
below the floor, one escalates a change below the minimum. That number is
supplied by the proposer — since 2026-07-28, by a real model, which reports its
own confidence in its own reply.

So the component being judged supplies one of the inputs to the judgement. A
model that is *confidently wrong* gets the most latitude the policy allows,
precisely when it deserves the least. Nothing in the runtime currently notices.

This was raised as an open question on day 2 and again on day 3, and the
maintainer confirmed the recommendation on 2026-07-28 (PR #3): keep trusting the
number for now, and make sure the data needed to calibrate it is captured from
the start rather than reconstructed later.

## Decision

**The Gate keeps trusting proposer-reported confidence, for now.** No
recalibration, no discounting, no per-interpreter multiplier. Inventing a
correction before there is outcome data to fit it against would be guessing
dressed as rigour, and it would make the Gate's behaviour depend on a hidden
model rather than on its stated rules.

**Confidence is recorded as a claim, not a fact.** It lives in `Provenance`,
alongside *who claimed it* — the `interpreter` field records the model that
actually served the request, not the one that was asked for. A claim whose
claimant is unknown cannot be calibrated.

**§6 must capture, per proposal:** the reported confidence, the interpreter that
reported it, the disposition the Gate reached, and the eventual outcome —
applied, confirmed, reverted, or refused. Those four together are the minimum
needed to answer "when this interpreter said 0.9, how often was it right?" This
is a requirement on the telemetry pipeline, recorded here so it is a constraint
§6 inherits rather than a feature §6 might think to add.

**Until that data exists, confidence thresholds are policy, not truth.**
`confidenceFloor` and `minimumConfidence` are host-supplied knobs whose right
values are unknown. They should be documented as such rather than defended.

## Consequences

- The Gate stays explainable: it applies its stated rules to its stated inputs,
  and the weakness is in an input rather than hidden in the decision.
- The events already emitted carry what calibration needs — `change-assessed`
  carries the assessment (and through it the provenance), `disposition-decided`
  carries the decision. What is missing is the *outcome* leg, which §6 has to
  add: a change that was applied and then immediately undone is the strongest
  evidence that a confidence claim was wrong.
- A repaired proposal reports its own confidence too, so the pattern "refused for
  low confidence, then repaired with a higher number" is visible. That is a
  specific thing worth watching for (see 0006).
- Until calibration exists, a compromised or badly-tuned interpreter can widen
  its own latitude by inflating one number. That is accepted, knowingly, and it
  is the reason this record exists rather than a comment in the code.

## Alternatives considered

**Discount confidence by a per-interpreter factor now.** Rejected: there is no
data to fit the factor against, so the number would be invented. It would also
make the Gate's behaviour depend on a table nobody can justify.

**Drop confidence from the Gate entirely and judge only stakes and
reversibility.** Rejected: an interpreter that knows it is guessing is telling
the runtime something real and useful, and the two-axis assessment in 0002 has no
way to express "this might not be what was asked for at all". The fix is
calibration, not deletion.

**Have a second model grade the first one's confidence.** Rejected for now: it
replaces one self-graded number with another, at double the cost, and it is not
obviously better than measuring outcomes. Worth revisiting once there is outcome
data to compare a grader against.

**Require the host to supply confidence out of band.** Rejected: hosts do not
know either, and it would move a modelling problem into integration code.
