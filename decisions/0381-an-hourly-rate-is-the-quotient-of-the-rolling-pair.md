# 0381. An hourly rate is the quotient of the rolling pair

**Status:** Proposed — **ARCHITECTURAL, needs review.** It contradicts clause 9
of [0362](0362-what-readers-did-is-counted-under-the-hour-they-did-it-in-as-a-seventh-counter-the-fold-writes-for-the-three-delegated-kinds.md),
which is `Accepted` and says in as many words that the rate is taken once over
the range and **never per hour**. **Nothing on this branch implements it.**
`ActedAgainstHour` carries a count and a denominator and no quotient, and
`ActedRate` is unchanged. Nothing is marked superseded.
**Date:** 2026-11-11
**Section:** §5 (reader signals), the counters

## Context

0362 clause 9 refused a rate per hour and gave its reason: the numerator counts
what readers **did** in an hour and the denominator counts page views that
**began** in one, so a reader who arrived at 10:59 and pressed at 11:01 is in
one hour's numerator and another's denominator. Over an hour that error is the
whole of the figure, and it fails in the worst direction — *a press with no
arrival* divides by nothing and reads as an infinite rate.

Its *Alternatives considered* rejected "a rate per hour, so the chart could be
of the rate rather than the count" on exactly that clause.

[0380](0380-an-hours-denominator-is-the-page-views-of-that-hour-and-the-one-before-published-beside-the-count-and-never-summed.md)
has now built the denominator that reason was about. An hour's doings came from
readers who arrived in that hour or the one before it, so the **rolling**
denominator — the page views of both hours — puts the boundary error inside the
window rather than across its edge. The hour with five presses and no arrivals
of its own is no longer a division by nothing; it is five against the twenty
readers who arrived in the previous hour.

So the reason clause 9 gave has a remedy, and the clause as written still
forbids the figure. That is a decision record rather than a judgement inside a
pull request, and it is the maintainer's: clause 9 is `Accepted`, and this lane
does not narrow an accepted clause on its own measurement.

## Decision

**Proposed, implemented nowhere.** `ActedAgainstHour` would gain `per100`: the
hour's count per hundred page views of its rolling window, `null` on exactly the
terms `views` is already withheld on — the first hour of a range, every hour
before page views were first counted, and a window of nought page views, which
is a reader who acted with no arrival in either hour and is a measurement rather
than an infinity.

It would **partially supersede 0362 clause 9 and no other clause of it**, in the
shape 0355 and 0351 set: clause 9's reason would be recorded as answered by the
rolling window, and its other eight clauses — the counter, its grain, its
affordability, the fold that writes it, the hour being the door's instant —
would stand untouched. `ActedRate`'s single quotient over the range would also
stand: it is the exact figure, and this one is the comparable one.

Were it accepted, the work is **one line and four tests**: the division, and the
four withholdings above. Nothing in 0380 forecloses it and nothing would need
migrating — no stored column, no payload field, no browser byte.

## Consequences

- **Until it is answered, a screen that wants the rate takes it.** 0380
  publishes the numerator and the honest denominator side by side, so a surface
  can divide them itself. That is the state this record exists to make visible
  rather than to hide: the pair is the input clause 9's reason was about, and
  the division is one line a caller can write without a record.
- Accepting it would put the quotient where a reading can hold its own
  withholdings, which is the only place the four `null` cases can be guaranteed.
  Refusing it would leave the pair as the published answer, which is a defensible
  end state and the one in force today.
- Nothing reaches a reader's browser either way.

## Alternatives considered

**Publishing the quotient on this branch and marking clause 9 superseded.** It
is what the measurement supports and it is one line. Rejected because clause 9
is an accepted record's decision and this lane's standing instruction is that a
contradiction is written as a proposal and built nowhere — and because the
failure mode of being wrong here is a dashboard that recommends a deploy window
off an hour whose rate was an artefact.

**Leaving the question unwritten and letting the pair stand as the answer.**
Cheaper, and it is what is shipped. Rejected because the next run reading 0380
would find a denominator with no quotient and no record of why, and would either
add the division without noticing clause 9 or re-derive this argument from the
start.

**A third figure — the hour's count against the range's rate, as a ratio of
ratios.** It would answer *which hours are better than this deployment's
average* without any per-hour quotient, so clause 9 would not be touched.
Rejected as a different question with no screen behind it, and one that still
needs the per-hour quotient underneath to mean anything.
