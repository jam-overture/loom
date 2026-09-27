# 0198. The portal may place a lever beside the evidence, and a model may never pull one

**Status:** Proposed
**Date:** 2026-09-27
**Section:** §5

## Context

The maintainer, in an interactive session on 27 September, on being shown that
`/portal/trust` can name a class of change the AI keeps misjudging and offers no
way to act on it:

> *"We need to give the user some ways to move levers and controls to fine tune
> what they are delivering to users to help optimize results. I feel that we can
> use existing methods to set up test cases/runs to then analyze results to
> determine modifications that will improve the user experience."*

The portal routine's first reading of that was that it collides with
[0031](0031-calibration-is-a-reader-not-a-controller.md). **That reading was
wrong and this record exists partly to say so**, because the same mistake is
available to every future run: 0031 is a rule about what *the runtime* may
consume, and its own consequences invite the opposite of what it was taken to
forbid.

0031's decision is that calibration *"returns a report. Nothing consumes it."*
The thing it refuses is a control loop inside Loom — a floor that moves itself
because a band under-delivered. What it says about people is the reverse, and
`/portal/trust`'s own module comment has been quoting it correctly all along:

> Moving a gate floor on the strength of what is here is a decision for a human
> with this page in front of them — which is why the verdict names a next move
> and never takes one.

So a screen that shows a reader the evidence and then makes them go and find the
control is not honouring 0031. It is honouring half of it and failing the half
0031 actually asked for, which is that **a human be able to act**. `/portal/rules`
has been a read-only display of the policy since it was written, on the one
surface whose entire premise is that a person is the missing input to a decision
the Gate deliberately did not make alone ([0019](0019-the-portal-is-a-review-queue-not-a-design-tool.md)).

The distinction the original reading blurred is between two different things
wearing one phrase, *results feeding into decisions*:

| | who decides | 0031 |
| --- | --- | --- |
| a person reads a rate and moves a floor | a person | **this is what 0031 asks for** |
| a rate moves a floor | the runtime | **this is what 0031 refuses** |

## Decision

**The portal may put a control next to the measurement that argues for it. The
control is always pulled by a person, the measurement never pulls it, and the
portal says which of the two just happened.**

Four things follow, and the fourth is what keeps the first three from becoming
the loop 0031 refuses.

1. **A lever is reachable from its evidence.** Where a screen reports a number a
   policy setting would change — a confidence floor, a stakes ceiling, a
   reversibility rule — the screen offers the way to change it, with the current
   value and what the number would have been under a different one where that is
   derivable from the window already read. The evidence and the control are one
   screen because they are one decision.

2. **A change to policy is a change a person made, recorded as one.** It carries
   who, when, and what it was before — the same standard every other change in
   this system is held to. A policy that can be edited and leaves no trace would
   be the one mutable thing in a repository built on the premise that the log is
   the truth ([0016](0016-the-log-is-the-truth-and-the-snapshot-is-a-view.md)).

3. **A test case is a run a person sets up, names and reads.** The maintainer's
   *"existing methods to set up test cases/runs"* is exactly that: the portal may
   offer to hold a change, a policy and a window together as a named thing a
   person can come back to and read the result of. It is a saved question, not a
   scheduled job, and nothing about it runs on its own.

4. **No measurement in this system may write a policy, a delta or an intent.**
   This is 0031 restated at the width of the whole surface rather than at the
   width of calibration, and it is the clause that has to be quoted at anything
   that later looks like automation. A reader signal may not become a
   `system-signal` proposal (`docs/signals.md`, *still not in scope*); a
   calibration gap may not move a floor; an A/B result may not promote a variant.
   **Every one of those is a button.**

**What is deliberately left open.** Whether Loom should ever close that loop — a
model that reads its own results and proposes its own policy — is a real question
and the maintainer has not been asked it. This record does not answer it. It
draws the line at today's answer so that the work in `docs/portal.md` can proceed
without anybody having to guess, and so that the day somebody wants the loop, it
is a record superseding this one rather than a pull request nobody noticed.

## Consequences

- `/portal/rules` stops being a display and becomes the place a policy is
  changed. That is a write surface in a route group that has had exactly one
  (the hold confirmation), and it inherits that one's custody requirements.
- Policy needs a history. The portal cannot invent one: **a policy is the
  framework's object**, and a record of policy changes is a framework gap this
  record creates rather than fills. Filed for `Loom daily build`.
- The phrase *feeding into the model* is now ambiguous in exactly one place —
  where a person, having read a result, changes what the model is judged by. That
  is a person's act with a durable record, and the portal says so in those words
  rather than in the passive voice.

## Alternatives considered

**Read 0031 as forbidding this, and leave `/portal/rules` read-only.** This was
the portal routine's first answer and the maintainer rejected it. It is wrong on
the text: 0031's subject is what the runtime consumes, and its consequences ask
for a human to act on the report. Keeping the control a screen away from the
evidence does not make the system safer — it makes the evidence useless, which is
the failure the whole 18 August redirection is about.

**Let the loop close, with a switch.** A floor that moves itself when a band
under-delivers, off by default. Rejected because a default is not a boundary: the
moment it exists, the interesting deployments are the ones that turned it on, and
0031's argument — that a self-grading system which also acts on its own grades has
no outside check left — applies to them exactly as written. If that is ever
wanted it supersedes 0031 rather than hiding under it.

**Let a person edit policy without a record of it.** Rejected on 0016. A system
whose entire premise is that changes to a page are logged, judged and reversible
cannot have the thing that does the judging be the one object anybody can change
silently.

**Say nothing and decide it per pull request.** Rejected because the ambiguity is
in the maintainer's own phrase — *results feeding into decisions* — and it reads
two ways, one of which 0031 refuses. A phrase two people can read oppositely is
the thing a record is for.
