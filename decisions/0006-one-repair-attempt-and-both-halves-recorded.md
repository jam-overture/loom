# 0006 — A refused proposal gets exactly one repair attempt, and both halves are recorded

**Status:** Accepted
**Date:** 2026-07-28
**Section:** §2 — Composition Runtime

## Context

Record 0002 makes the Gate a pure function that can refuse a change. Until now a
refusal was terminal: the proposal died and the person who raised the intent got
nothing. That is often the wrong answer — "remove the whole checkout section" may
be refused while "remove the promo banner inside it" would have been fine, and
the asker cannot be expected to know where the line sits.

Feeding the refusal back to the interpreter and letting it propose something
weaker is the obvious fix. It is also the obvious place for an AI to learn to
launder a refusal into an acceptance by salami-slicing: propose the whole
removal, get refused, propose half of it, get accepted, then raise a fresh intent
for the other half. Nothing about the second proposal looks wrong in isolation.
The danger is not that the loop exists; it is that the loop could be made
invisible.

The maintainer approved a repair loop on 2026-07-28 (PR #3), on the condition
carried in the original recommendation: one attempt, with the original refusal
recorded in telemetry regardless.

## Decision

**Repair is a separate interface.** `ChangeRepairer.repair(request, tree)` is not
a method on `ChangeInterpreter`. Interpreting an utterance and revising a refused
proposal are different jobs with different inputs, and separating them means a
runtime that is handed no repairer *cannot* repair. Whether a deployment lets AI
have a second go is therefore a visible choice at the composition root, not a
property of whichever interpreter happened to be wired in.

**Exactly one attempt, structurally.** The repair path judges the repaired
proposal and returns its outcome. There is no path back into itself and no
counter that could drift. A repair that is refused again is terminal.

**Repair applies to refusals only.** Not to `requires-confirmation` — that is a
human decision, and pre-empting it with a weaker change would be answering a
question that was asked of someone else. Not to `not-applicable` — that is an
interpreter bug, and a different kind of repair.

**The runtime stamps the link.** `ProposedChange.repairOf` is set by the pipeline
from the refused proposal's id, not by the repairer. A repairer that claims a
different `repairOf`, or none, is overruled. A weaker second proposal therefore
cannot present itself as an unrelated first attempt.

**Both dispositions are emitted.** The refusal's `disposition-decided` fires
before `repair-requested`, and the repair's fires after. A change that was
refused and then repaired into something acceptable leaves both halves in the
event stream, in order. `repair-failed` records a repairer that declined.

**The repairer is told which rule fired**, not a summary — a repairer that cannot
see the objection can only guess at what would be acceptable. The model-facing
prompt states the constraint in the other direction too: a revision must be a
more conservative way to satisfy the *same* request, and if none exists the
answer is "not-understood" rather than the same change in smaller pieces.

## Consequences

- A refusal stops being a dead end for the ordinary case where the asker
  overreached slightly.
- Salami-slicing becomes a *detectable* pattern rather than a prevented one:
  `repairOf` plus two dispositions is exactly the shape telemetry needs to find
  "refused, then accepted a weaker version" and count how often it happens per
  interpreter. §6 is expected to look for it.
- The Gate is untouched. A repair is judged by the same function, against the
  same policy, as the proposal it replaces — there is no "second-chance policy"
  to keep in step with the first.
- The prompt asks a model not to work around the objection. That is guidance, not
  enforcement; the enforcement is that the Gate judges the result and telemetry
  records the pattern.
- One more model call per refusal, on a path that only runs when a change was
  already refused.

## Alternatives considered

**No repair loop; a refusal stays terminal.** The status quo before this record.
Rejected: it pushes the work onto the asker, who has to guess what the policy
would accept, and it produces worse data — a refused-and-abandoned intent tells
telemetry nothing about what *would* have been acceptable.

**Repair as an optional method on `ChangeInterpreter`.** Rejected: an optional
method makes the capability implicit in the object, so wiring in a
repair-capable interpreter would silently enable repair. The separate interface
makes enabling it a decision someone made on purpose.

**Configurable attempt count, or repair-until-accepted.** Rejected outright. Any
number above one is a search procedure for the weakest change the Gate will
accept, which is the failure mode this record exists to bound. A cap of one is a
structural property here, not a setting.

**Let the repairer declare what it is repairing.** Rejected: attribution that the
proposer controls is attribution the proposer can omit. The runtime knows which
proposal was refused and is the only party with no reason to misreport it.

**Repairing `requires-confirmation` too, to avoid bothering a human.** Rejected:
"a person should decide this" is not an objection to be routed around. Answering
it with a smaller change nobody asked about is worse than asking.

**A `GatePolicy` knob for repair.** Rejected: the Gate judges changes; it does not
decide how many chances a proposer gets. Conflating the two would put a
non-judgement setting inside the pure decision function's inputs.
