# 0023. Telemetry narrows the event stream and never copies the log

**Status:** Accepted
**Date:** 2026-07-31
**Section:** §6

## Context

`RuntimeEvent` has existed since §2 with a comment saying emission happens from
day one even though nothing consumes it. §6 is the day something does: a
durable journal, so that a refusal, a hold, and a discard survive the request
that produced them.

The question that had to be settled before any of it was written is what a
stored record contains, because that decision is expensive to reverse. Records
are written continuously and read months later; a shape chosen now is a shape
every future analysis has to live with, and the ones already written cannot be
re-derived if the shape turns out to have dropped something.

Three candidate shapes.

**The whole envelope, verbatim.** Serialise `RuntimeEventEnvelope` as it stands.
Lossless, trivially implemented, and it means telemetry never has to be revisited
when a stage changes what it carries.

**A per-proposal summary.** Store one row per proposal — provenance,
disposition, outcome — which is exactly what the build order asks §6 to capture,
and nothing else.

**A narrowed event stream.** Keep every event the runtime narrates, but store a
projection of each: the identifiers and decisions, without the payloads another
store already holds.

## Decision

**Telemetry stores a narrowed projection of the event stream. The narrowing
changes payloads and never membership, and it never stores content the revision
log already holds.**

Three rules decide what crosses the boundary.

**A proposal is kept whole, delta included.** For a change that was refused,
held and then discarded, or never applied, this journal is the only record it
ever existed — the log by construction holds only what was applied. Dropping the
delta would make the most valuable half of §6 unreadable: you would know that
something was refused, but not what.

**Anything the log already holds is dropped.** An applied change's inverse delta
is in `loom_revisions`, attached to the revision the telemetry record names. Two
copies of one delta are two things that can disagree, and the disagreement would
be silent because nothing would be comparing them. `change-applied` stores a
revision number and lets the log answer the rest.

**The utterance is not kept.** `Provenance` has carried `promptHash` rather than
the prompt since §2, with a comment saying provenance carries no user content.
Telemetry is the same data with a longer retention and a wider audience, so the
same rule applies: an `intent-received` record keeps origin, scope, base revision
and the *length* of what was said. A host that wants to group identical asks has
`promptHash` for it.

Membership is preserved because a stage the runtime narrates but telemetry
silently discarded is a stage nobody could prove ran. The narrowing is one total
function with an exhaustiveness guard, so adding a `RuntimeEvent` is a compile
error in `event.ts` rather than an event that quietly never lands.

Two consequences of that shape are worth stating as rules of their own.

**Episodes are folded, not stored.** "What became of that change" is computed
from the records on demand — the same relationship 0016 set between the log and
the snapshot, and for the same reason. A stored episode table would be a second
copy of facts the journal already holds, and the two would drift.

**The fold is honest about being partial.** A page that opens after a proposal
was made cannot attribute that proposal's later events, so `episodesOf` returns
them as `unattributed` rather than dropping them. A refusal rate computed over a
silently shrunk denominator is worse than no refusal rate.

## Consequences

- Failure codes are stored as opaque strings, not as a mirror of §1/§2/§5's
  error unions. Adding an error code somewhere else in the codebase must not make
  records written yesterday fail to parse today.
- A stored record is parsed with Zod on the way out, never cast. The journal is
  the boundary where data most reliably outlives the code that wrote it.
- `change-assessed` stores a summary — stakes, reversibility, the counts, the
  touched primitive types — rather than the assessment. The full assessment
  carries an inverse delta and a node-id list that grow with the tree, and the
  disposition that follows already carries the judgement.
- Telemetry cannot reconstruct a tree, and must never be asked to. It records
  what was decided, not what a page contains.
- A future consumer wanting the utterance cannot get it retroactively. That is
  the cost of the privacy rule, and it is accepted knowingly: reversing it means
  a new decision record, not a schema tweak.
- One table, `loom_telemetry`, with no derived columns for event type or
  proposal id. An index on a JSON path is available the day a query needs one; a
  duplicated column is a migration away from being wrong.

## Alternatives considered

**Store the envelope verbatim.** Rejected on two counts. It duplicates every
applied delta and its inverse into a second store, which invites divergence; and
it stores the utterance, which contradicts a privacy position §2 already took
and which nothing in §6 needs.

**Store only a per-proposal summary.** Rejected because it cannot express the
things §6 exists to notice. An intent that was never interpreted has no
proposal. A refusal that was repaired into an acceptable change is two proposals
and an ordering. A hold that was answered is one proposal with two dispositions.
A row-per-proposal shape flattens all of that into a field nobody can query
honestly — and the summary is derivable from the stream anyway, which is what
`episodesOf` does.

**Give telemetry its own event vocabulary**, decoupled from `RuntimeEvent`, so
the runtime could change without touching §6. Rejected: it sounds like loose
coupling and is really a second definition of the same thing. Two vocabularies
drift, and the drift shows up as an analysis quietly measuring something other
than what it names. The narrowing keeps one vocabulary and one place where the
mapping is stated.

**Write telemetry inside the same transaction as the append.** Rejected. It
would make an observation able to fail a change the Gate accepted, which is
precisely backwards — and it could not record anything that never reached the
store, which is most of what §6 is for.
