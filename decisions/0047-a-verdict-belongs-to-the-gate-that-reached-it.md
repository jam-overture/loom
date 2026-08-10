# 0047. A verdict belongs to the gate that reached it

**Status:** Accepted
**Date:** 2026-08-10
**Section:** §6 → §2

## Context

0007 made confidence self-graded on one condition: that it be calibrated. 0031
built the measurement — for each confidence band, how many claims were judged,
how many survived, and the gap between the mean claim and the observed rate — and
made it a reader that changes nothing.

It computed one report over everything in the window. That was right while there
was one gate. 0033 ended that: the policy is resolved per change and named on the
verdict, precisely so a host can run different gates over different parts of its
application, and so a host that tightens a floor can tell afterwards which
judgments were made under which rules.

Under two gates the single report is not merely coarse, it is wrong in a specific
way. `observedRate` is presented as a fact about the model, and it is not one.
A claim survives when the Gate accepted it and a human did not discard it, so the
rate is a joint measurement of the model *and* the policy that judged it. A host
running a strict gate on checkout and a loose one on marketing copy reads one
number describing neither. Worse, the number moves when the host edits a policy —
which is the moment a reader is most likely to conclude that the model got worse.

The failure is silent. Nothing about a pooled report announces that it pooled.

## Decision

The calibration report keeps its overall score and bands, and gains `byPolicy`: the
same measurement computed again over each gate's own claims.

- **A judged claim is attributed to the policy named on its disposition, and to
  nothing else.** That is the record of the gate that actually reached this
  verdict.
- **The split is a partition, not a sample.** Every judged proposal lands in
  exactly one segment, so the segments sum to `overall`. A reader can check the
  page against itself.
- **A segment is scored by the same code as the whole.** The overall report and
  each segment are one function over different claims. A segment that scored
  itself differently would be a discrepancy nobody chose and no test would think
  to look for.
- **Two unknowns stay apart.** `policyId: null` means *this window never saw the
  judgment* — the page opened after the disposition and before the commit. The
  recorded string `UNATTRIBUTED_POLICY_ID` means *the judgment was made before the
  Gate wrote down which policy made it* (0033). One is a gap in the reader and is
  fixed by widening the window; the other is a gap in the record and never will
  be. A reader's next move differs, so the report must not merge them.
- **A policy that has judged nothing opens no segment.** A held proposal carries a
  disposition and no verdict; a segment for it would put a row on the page
  claiming a rate over nothing.
- **Ordered by policy name, unrecorded last**, so two windows produce rows in the
  same order and can be read side by side.
- **Still a reader.** Nothing in the runtime consults `byPolicy`. 0031 holds
  unchanged: a per-policy gap is a sharper input to a human deciding whether to
  move a floor, and it moves no floor by itself.

## Consequences

The question "is a 0.9 actually a 0.9" becomes answerable, because it is now asked
of one gate at a time. Asked of a window spanning two, it never had an answer.

Segments are small, and in alpha most will report `null`. That is the same
honesty 0031 chose for empty bands, and it should not be smoothed away — a
per-policy split makes samples smaller, and a reader who wants the bigger
denominator still has the overall score directly above.

A host now has a reason to name its policies well. 0033 already required that a
name identify content; this is the first place a host reads those names back and
notices when two gates it thought were different share one.

The portal shows the breakdown only when more than one policy judged the window.
With a single gate the table restates the headline in smaller type, and a
breakdown that is always present is one nobody reads on the day it matters.

## Alternatives considered

**Fall back to the intent's `policyId` when the disposition is missing.** Rejected,
and it is the mistake a reasonable engineer makes first, because `IntentEpisode`
carries a `policyId` and it is right there. It is the *last* policy resolution the
window saw. A proposal held under one policy and confirmed under a narrower one
would be attributed to the gate that did not reach its verdict — a wrong
attribution presented with the same confidence as a right one. An honest `null` is
worth more than a plausible guess.

**Segment the unjudged too.** Rejected for now. Which gate is holding everything
is a real question, but it is a question about throughput rather than about
calibration, and answering it here would put proposals with no verdict into a
structure whose every other number is a verdict. It belongs in the episode tally
if it is wanted.

**Replace the overall report with the segments.** Rejected. The pooled number is
still the right first read for the common case of one gate, and dropping it would
force every consumer to re-aggregate — including the ones with a single policy,
who would be paying for a distinction they do not have.

**Make the segmentation configurable — by policy, by tree, by origin.** Rejected as
premature. Policy is not one dimension among many: it is the only one that
*changes what survival means*. Segmenting by tree partitions the claims; segmenting
by policy partitions the *measurement*. If another such dimension appears it will
deserve its own argument.

**Store the segmented report.** Rejected, for the reason 0016 gave and 0031
inherited. It is a derivation, and a stored copy would eventually disagree with
the journal it came from, silently.
