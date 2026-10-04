# 0225. A judgment is joined to a revision by a bounded lookup, and the lookup says what it did not reach

**Status:** Accepted
**Date:** 2026-10-04
**Section:** §6

> **Renumbered on 2026-10-04**, from 0224, when this branch (#505) was merged.
> `Loom signals` had written a different 0224 the same morning on #504 — *a
> before-and-after reading compares two shares* — and that one reached `main`
> first; two records sharing a number is fatal (0097). Nothing in this record
> changed but its number, and the references to it on this branch were updated
> with it.

> **Why this number.** `0221` is the highest record on `main` at `e1b33d8`. Two
> open pull requests add one each — #501 takes `0222`, #503 takes `0223` — so
> `0224` is the next free number on `main` and in every open branch. The
> procedure says to re-read `main`; on a repository where five same-day
> collisions have happened in six days, reading the open branches as well is the
> part that actually works.

> **0222 is cited nowhere in this change, deliberately.** It is the record that
> decided the join this one builds, and it lives on #501, which has not merged.
> `tools/decisions` fails the build on a citation that does not resolve — which
> is correct and caught this on the first run — so the sentences here carry the
> argument rather than the number. When #501 lands, the two records sit beside
> each other and neither needs editing.

## Context

A `StoredRevision` holds `treeId`, `revision`, `proposalId`, `delta`,
`provenance`, `appliedAt` and `answeredBy`. It does not hold what the Gate
decided, and 0016 is why: the revision log is the truth about the **page**, and
whether a change reached outside the page is not a fact about the page.

`/portal/history` is the screen this costs. It offers an undo button per row and
it has `ReversalNote` beside it, which inverts the log and says what undoing
would put back and what later work it would write over. Every word of that is
about the tree, because `planRevert` is about the tree — and a tree-level inverse
always exists, so **a change that took a payment has a perfectly clean
`Reversal`**. The row says *"If you undo this, Loom puts back: the card ‘Autumn
sign-up’"*: true, complete about the page, and silent about the charge.

The Gate computed the other half and the journal kept it. `AssessmentSummary`
carries `reversible`, the irreversibility codes, and which primitive types reach
outside the page. The fact is reachable from a revision — they share a
`proposalId` — and until this record the only way to reach it was
`TelemetryJournal.read`, which pages a journal that only grows. On a screen
showing twenty revisions that is twenty paged reads, or one scan of everything
ever narrated about the tree. `Loom portal` filed it on 3 October as the useful
half of a question about whether the log should carry the judgment at all.

## Decision

**A fourth operation on `TelemetryJournal`: `assessments`, which takes a set of
proposal ids and answers with the assessments it holds for them.**

It is the first read on the journal that is not a page, and the exception is
earned rather than granted. A page answers *where am I in the journal*; this
answers *what do you hold about these specific proposals*, which a caller is
asking because it is already holding them. A cursor would be answering a
question nobody asked.

Four things it settles, each of which could have gone the other way:

**It is bounded, by ids rather than by a limit.** Every read in Loom is bounded —
that rule is older than this record and it is why no caller can ask a store for
everything it holds. A lookup's currency is not rows but names, so the bound is
`MAX_ASSESSMENT_LOOKUP`, set at 400: deliberately above `MAX_LISTING_LIMIT`, so a
caller that paged revisions at the store's widest page and asked about every one
of them never meets it. It bounds a careless caller and not the real one.

**Going over the bound is said, not silently absorbed.** `AssessmentLookupResult`
carries `unasked` — the ids this call did not look at — and a caller chunks by
feeding it back. The two alternatives were worse. Truncating silently makes
*nothing was recorded* and *nobody looked* the same empty answer, at the one
screen whose job is to tell a person something they are about to act on. Refusing
with an error would have meant a second member on `TelemetryError`, whose whole
doc comment is an argument for why it has one — and *you asked about too many
things* is not the journal being unavailable.

**A proposal nothing was recorded about is absent from the map, not an error.**
The same reason there is no `not-found` on the journal: it makes no claim that
anything exists. A disposition with no assessment is a real history rather than a
fault — `assessment-failed` is narrated when the analysis itself fell over, and
it carries no summary to find.

**A proposal narrated twice answers with the latest.** The journal is
append-only, so two `change-assessed` records for one proposal are a history, and
the later one is what the Gate last read. In memory that is a fold in arrival
order; in Postgres it is `DISTINCT ON … ORDER BY seq DESC`, which also makes the
read bounded *by construction* — the row count is the number of ids asked about,
whatever the journal holds behind them.

**And the index the table always said it would need.** `loom_telemetry` keeps the
event as one JSON document and deliberately does not also keep its type or its
proposal id as columns, because two copies of a fact are two things that can
disagree; the comment that says so ends *"an index on a JSON path is available
the day a query needs one"*. This is that day. `TELEMETRY_DDL` gains one
additive, idempotent statement: a partial index on
`(event -> 'assessment' ->> 'proposalId')` where the event is a
`change-assessed`. Partial because the predicate is the discriminant — only that
one event type has the path at all.

## Consequences

**Every `TelemetryJournal` implementation must grow a method**, which is the real
cost and the reason this is a record. Loom ships two and a host may write a
third; the contract suite runs over all of them, so a third that gets it wrong is
a test failure rather than a surprise.

**Two consumers in the package stop depending on the whole journal.**
`applyRetention` takes `TelemetryPruner` (`read` and `forget`) and
`collectTelemetry` takes `TelemetryWriter` (`record`). The argument is
`TreeReader`'s, written down in `store.ts` months ago: depending on the whole
seam to use one half of it makes every stub of it grow a method the code under
test never calls, which is how a test starts describing the interface instead of
the behaviour. A fourth method was the event that made it worth doing — two test
doubles in this package would otherwise have gained a stub for a lookup neither
test ever performs. Every `TelemetryJournal` satisfies both, so nothing a host
built changes.

**A deployment that never re-runs the DDL keeps a correct journal and a slow
lookup.** The statement is `CREATE INDEX IF NOT EXISTS`, so running the schema
again is how it arrives, and the lookup is correct without it.

**The screen is still silent.** This is a seam and not a sentence: `(portal)`
owns what `/portal/history` says, and it now has a cheap way to find out. Nothing
on that screen changes in this unit.

**One parser outside this lane learned to read an expression index.** The
deployment page in `(docs)` generates its storage tables from the runtime's own
DDL and throws on any statement it cannot classify — correctly, and this is the
first expression index the runtime has ever written. Its grammar now reads a
nested bracket and an optional `WHERE`, refuses a predicate containing a bracket
rather than misreading one, and carries the condition through to the page, so a
partial index is not described as covering every row. The words chosen for it are
`Loom docs`'s to change.

## Alternatives considered

**Put the judgment on `StoredRevision`.** The question `Loom portal` actually
asked. Refused: it makes the log carry a fact about something other than the
page, against 0016, and it copies a fact the journal already holds — which is the
mistake the telemetry narrowing exists to avoid. A copy also has to be written at
apply time, so every host writing a revision would owe a disposition it may not
have.

**Extend `TelemetryReadRequest` with `proposalIds`.** Tempting, because paging,
cursors and clamping all come free. Refused: a page of 200 records does not
cover 200 proposals — it covers a dozen episodes — so a caller would need an
event-type filter too, and then a fold, and then its own retry when a page split
a proposal's records across a boundary. Three new fields and a fold at every
caller, to avoid one method.

**Return an array of summaries instead of a map.** Lossless, since each summary
carries its own `proposalId`. Refused because every caller would build the same
map, and the implementation has already built one to answer at all.

**A `judgments` lookup returning the disposition beside the assessment.** The
screen wants a sentence about irreversibility, and the disposition carries the
codes too. Refused as a wider surface for no new fact: a refused proposal never
becomes a revision, so a history screen reads assessments, and whoever needs
dispositions by proposal can ask for that when a screen needs it.

**Let the caller bound the lookup, as `forget` does.** `forget` documents that
`applyRetention` derived its position from a scan it capped itself, and that is
honest there because both halves are in this package. Here the ids come from a
page a *different* component produced, and an unbounded `IN` list assembled from
whatever a route handler was given is a seam with no bound at all.
