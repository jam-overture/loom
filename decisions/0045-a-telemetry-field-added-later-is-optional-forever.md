# 0045. A telemetry field added later is optional, and never defaulted

**Status:** Accepted
**Date:** 2026-08-08
**Section:** §6

## Context

A telemetry record is stored as JSON and **parsed on the way back out**:
`telemetryPostgres` runs every page it reads through `telemetryRecordSchema`, and
a record that does not parse is not skipped — the whole page fails as
`unavailable`. So the read schema is a compatibility contract with every record
already written, and it was not being treated as one.

0044 needed three new fields on `assessmentSummarySchema`. Added the ordinary
way — required, or `.default([])` — they would have made every `change-assessed`
record written before today either unreadable or silently re-described. There is
no migration available: the journal may forget an episode (0037) but it does not
rewrite one, and a record is what the runtime said at the time.

`telemetryFailureSchema` already carries half of this reasoning in a comment:
`code` is an open string rather than a mirror of the error taxonomies, so that
adding an error code elsewhere cannot make yesterday's records fail to parse
today. That was written for one field. This is the general rule.

## Decision

**A field added to a telemetry schema after records exist is optional, and is
never given a default.** New records always write it; old records read as
`undefined`.

`undefined` and `[]` are different claims. A record written before
`relocatedPrimitiveTypes` existed did not decline to name a relocated type — it
could not name one, and `.default([])` puts "no types were relocated" in its
mouth. A consumer that cannot tell "recorded as none" from "not recorded" will
compute a rate over a corpus whose older half silently reads as zero, and 0031
already made calibration a reader of that corpus.

This is the fourth narrowing rule, and it now sits with the other three at the
top of `event.ts`.

## Consequences

- Every consumer of a late-added field handles `undefined`. That is the cost, and
  it is the honest shape: the absence is a fact about when the record was
  written.
- Old records stay readable indefinitely. The journal's retention policy (0037)
  is the only thing that removes them, which is where that decision belongs.
- A field that genuinely must be present for a record to mean anything is not a
  late addition — it is a new event type, where membership is the thing being
  changed rather than a payload (0023).
- This rule is about **reading**. It does not license a summary that omits a fact
  the runtime knew; the writer fills every field it has.

## Alternatives considered

**`.default([])` and `.default(0)`.** One character shorter per field and the
reason this record exists. Rejected: it makes an unanswerable question look
answered, and the corpus is exactly where that lie compounds.

**Version the record and branch the parse.** A `schemaVersion` on each row with a
parser per version. Correct for a format that changes shape; overbuilt for one
that only ever gains fields, and it puts a second thing to remember beside every
addition. Optionality already encodes "written before this existed" without a
number to keep in step.

**Parse leniently and drop unreadable rows.** Rejected outright: a journal that
quietly returns fewer records than it holds is worse than one that fails loudly,
and every reading built on it would be a silent undercount.
