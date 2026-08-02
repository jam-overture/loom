# 0029. The approval belongs on the revision, not only in the journal

**Status:** Proposed — ARCHITECTURAL, needs review. Contradicts 0027; nothing has
been built against it.
**Date:** 2026-08-02
**Section:** §5 → §6

## Context

0027 gave the portal an identity and every change an author, and answered a third
question along the way: when a held proposal is confirmed, *two* people are
involved — the one who asked and the one who allowed it — and the second is
recorded in the telemetry journal as `answeredBy` on a `hold-confirmed` event,
not on the revision the confirmation produced.

0027 records the cost as a consequence rather than burying it: "who approved this
revision" now requires the log **and** the journal, and a deployment that loses
its journal keeps the change and loses who allowed it. It also names the fix as
the leading alternative it rejected, on scope: "it is a column, a migration and a
`TreeStore` contract change, one run after 0026 changed that contract, and this
run had a portal to make safe first."

This run built `/audit` (0028), which is the first thing that reads the log
without the journal — and 0027 said in as many words that this alternative
"should be the first thing reconsidered if anything ever depends on the log
without the journal." That condition is now met, which is why this record exists.
It is `Proposed` and not `Accepted` because acting on it would contradict a
sentence in an Accepted record, and that is an escalation rather than a refactor.

## Decision (proposed, not in force)

**`StoredRevision` gains an optional `answeredBy`, set when the revision was
produced by confirming a held proposal, so the log alone answers who allowed a
change.**

- `AppendRequest` carries it; `confirmHeld` passes the `ProposalAnswer`'s actor
  through to the append it already performs.
- `loom_revisions` gains a nullable `answered_by` column. Existing rows stay
  null, which is honest: nobody knows who approved them, and 0027's consequence
  about back-filling applies unchanged.
- The journal keeps its `hold-confirmed` event. This is deliberately a
  duplication of one field and not a move — 0023 says telemetry narrows the event
  stream and never copies the log, and that direction is unaffected; what is
  proposed here is the log recording a fact about its own entry, which it happens
  to share with an event.
- `/history` shows the approver beside the asker. It currently cannot.

## Consequences if accepted

- Two stores hold the same actor string for a confirmed change, and they can
  disagree — a bug in one write would be invisible until someone compared them.
  The mitigation is that both come from the same `ProposalAnswer` in one server
  action, so there is one source and two writes rather than two sources.
- A `TreeStore` contract change lands one run after 0026 changed that contract.
  Nothing outside this repo implements `TreeStore` yet, which is the reason to do
  it now if it is going to be done at all.
- The Postgres migration is additive and nullable, so it is safe against a
  deployed database.
- 0027 would be marked `Superseded by 0029` in the part that places the approval
  in the journal only. Its identity decisions stand.

## Alternatives considered

**Leave it as 0027 decided.** Defensible: the journal is the place events live,
and a deployment that loses its journal has bigger problems than a missing
attribution. The counter is that the two stores have different durability
stories — one is the record of what the application *is*, the other is
observability — and putting an accountability fact only in the observability
store means retention policy, when it arrives, will silently be a policy about
how long approvals are remembered.

**Put the whole `ProposalAnswer` on the revision.** Rejected: the proposal id is
already reachable from the entry, so only the actor is new information.

**Derive it at read time by joining the journal.** Rejected: it makes every
history read depend on telemetry being present and correct, which inverts which
of the two is load-bearing.
