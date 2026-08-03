# 0031. Calibration is a reader, not a controller

**Status:** Accepted
**Date:** 2026-08-02
**Section:** §6 → §2

## Context

0007 made confidence self-graded and trusted on purpose, on one condition: that
it be calibrated. Nothing has calibrated it. Until now the word appeared in three
comments and no functions, while §6 quietly accumulated everything the
measurement would need — the model's claim on every `change-proposed` record, the
Gate's disposition, the human's answer, and the fold that ties them to one
intent.

The obvious next move is the wrong one. A runtime that reads its own record of
its own judgments and adjusts its own gate can drift somewhere nobody chose, and
the drift is silent by construction: the thing that would notice is the thing
that moved. Every other change in this system is proposed to a human before it
takes effect, and a policy threshold is a change.

There is also a question of whose adaptation this is. Loom is a framework, and
the interesting adaptive behaviour belongs to the applications built on it, tuned
to their own tolerance for a wrong guess. What a framework owes them is not a
built-in learner but a record complete enough to learn from, reachable from
outside the runtime.

## Decision

Calibration is a pure fold over the episode fold. It computes, per confidence
bucket, how many claims were judged, how many survived, and the gap between the
mean claim and the observed rate. It returns a report. Nothing consumes it.

Specifically:

- **A verdict is `survived` or `rejected`, and most things are neither.** A
  proposal survived if it reached the log. It was rejected if the Gate refused it
  or a human discarded it. Everything else — awaiting an answer, failed
  mid-flight, still open when the window ended — yields no verdict and enters no
  denominator. A commit that fell over on the database says nothing about whether
  the model was right.
- **The unjudged are counted and named, not dropped.** The report carries the
  breakdown and the fold's `unattributed` count, for the same reason the fold
  returns them: a rate over a denominator that quietly changed is worse than no
  rate.
- **An empty bucket reports `null`, not `0`.** Zero out of zero is not zero.
- **A repair (0006) is scored as its own claim.** The refusal that prompted it is
  precisely the case where the grade was wrong, and averaging the pair together
  would erase the datapoint calibration exists to collect.
- **It reads only what `@loom/runtime/telemetry` already exports.** That is a
  constraint on the implementation, not an accident of it: the report is the
  reference consumer, and if it needed private access then no third-party
  consumer could reproduce it.

## Consequences

The measurement exists before anything can act on it, which is the order that
lets the acting be argued about with numbers in hand rather than in advance.

The report is honest about small samples, which in alpha means it will mostly say
`null`. That is the correct output and it should not be smoothed away.

Anyone can now ask "is a 0.9 actually a 0.9" from the public exports. A consumer
who wants their UI to adapt — loosening the gate where the model has earned it,
tightening it where it has not — has the input to do that, and owns the decision.

The bucket count is fixed at ten and is not configurable. A different resolution
is a change with a reason behind it, not a knob.

Nothing here closes the loop. Loom remains a system where change is proposed and
a human answers; that is the claim it makes and this record does not weaken it.

## Alternatives considered

**Let policy read the report and move its own floors.** Rejected. This is the
escalation 0007 gestured at without authorising, and it contradicts the shape of
every other change in the system. If it is ever taken it deserves its own record,
argued from data this one produces.

**Score against the Gate's disposition alone.** Simpler, and wrong. It would
measure agreement between the model and the Gate — two components tuned against
each other — while ignoring the only judgment made by someone outside the system.
A human discarding a change the Gate was willing to accept is the highest-value
signal in the journal.

**Treat failures as rejections.** Rejected. It makes the model look
overconfident every time infrastructure has a bad day, and the resulting number
would move for reasons that have nothing to do with confidence.

**Store the report.** Rejected, for the reason 0016 gave and the episode fold
inherited: it is a derivation, and a stored copy would eventually disagree with
the log it came from, silently.
