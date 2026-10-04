# 0222. A structured reason travels with the judgment, and the prose is for readers only

**Status:** Accepted
**Date:** 2026-10-03
**Section:** §2 — Composition Runtime

## Context

`assessReversibility` has always computed *why* a change cannot be taken back,
and the answer is a two-member union whose members ask opposite things of the
person reading them:

| code | what it means | what a reader should do |
| --- | --- | --- |
| `out-of-tree-effect` | the page is fully recoverable and *reality* is not — the change configures a part that takes a payment or sends something | go and look at whatever that part is wired to, before saying yes |
| `retention-budget-exceeded` | reality is fine and the *page* is not fully recoverable — undoing it would hold more removed content than the policy allows | decide whether the content is worth keeping, because the rest of it will not come back |

Three consumers read that answer at three fidelities, and the one with the least
is the one that has to ask somebody:

| what it holds | what a screen can say |
| --- | --- |
| `ChangeAssessment.reversibility.reasons` | everything, types and budget included |
| `AssessmentSummary.irreversibilityReasons` (journal) | the codes, as `readonly string[]` |
| `Disposition` (what a hold carries) | `reversible: boolean`, and the codes **joined into prose** |

`confirmIrreversible` had already run
`reasons.map((reason) => reason.code).join("; ")` into a sentence beginning
*"cannot be undone cleanly: "*, and a `HeldProposal` carries a `Disposition` and
nothing else about the assessment. So the screen rendering **Apply this change**
and **No thanks** was the one place in this repository where the reason existed
and could not be read as data. `Loom portal` filed that on 3 October, shipped
its answer on `/portal/activity` — which reads the journal — and left the review
queue saying *"This one can't be undone afterwards."* and stopping there.

The workaround was available and correctly declined. Mining the two code tokens
back out of `reason.detail` works today, because the codes are a published union
and the sentence is derived from them. It breaks silently the first time anybody
rewords a detail line, which is prose written for a reader and documented as
such: `DispositionReason.detail` is `z.string()`, beside a `code` that is an
enum. A consumer that gets a derived reading slightly wrong fails in a way that
looks exactly like success.

The second half is smaller and the same shape. For
`retention-budget-exceeded` the code is almost lossless, because
`retainedNodeCount` is journalled beside it and a screen can say *this one takes
nine parts off the page*. For `out-of-tree-effect` the reason's own
`primitiveTypes` — the exact subset of what the change touched that this
deployment declared reaches outside the tree — was dropped on the way into the
journal, so the sentence had to end on *the kind of thing*. The reader was sent
to check something and not told what. `touchedPrimitiveTypes` is on the summary
and is not an answer: it is a superset, and naming one of its members as the
offender would be a guess on the screen where a guess is most expensive.

## Decision

**The structured reason travels with the judgment.** `Disposition` gains

```ts
readonly irreversibilityReasons?: readonly IrreversibilityReason[]
```

stamped by `gate`'s `decide` from the assessment it already holds, on every
disposition rather than only the one `confirmIrreversible` produced. Which rung
fired and why a change cannot be taken back are separate facts — a change can be
held for discarding later work *and* be irreversible — and a reader who inferred
the second from `reason.code` would conclude a charge was fine to undo.

Absent and never defaulted (0045), and **omitted rather than empty** when
nothing fired. `reversible` is what disambiguates the absence, which leaves
three states readable and the fourth impossible:

| `reversible` | the field | what it means |
| --- | --- | --- |
| `true` | absent | nothing fired, which is what `true` already said |
| `false` | present | these are the reasons |
| `false` | absent | judged before this field existed |
| `true` | present | never written, and asserted so |

**The journal keeps the types, not just the code.** `AssessmentSummary` gains
`outOfTreeEffectTypes?: readonly PrimitiveType[]`, set from the reason when it
fires and absent when it does not. Non-identifying for the reason
`removedPrimitiveTypes` is: a type name is vocabulary the deployment registered,
not content a visitor typed.

**The reason's shape moves to its own leaf module**, `runtime/irreversibility`.
The reason is *computed* in `reversibility.ts`, against a tree, a policy and an
inverse delta; it is now also *stored* by `disposition.ts`, which §6 reads back
out of a holds table and validates at that boundary. A leaf holding nothing but
the shape lets the second import it without pulling the tree engine in behind
it, and keeps the direction of the dependency honest: the stored shape does not
know how it was derived. `IrreversibilityReason` is still published from
`reversibility.ts`, where it always was; the schema and the narrowing helper
beside it are **not** published, because a published door has to be documented
on a page a reader can find, and that is the right bar for a name a host needs
and the wrong one for a seam between two modules of this package.

## Consequences

The portal's review queue can say *why* on `/portal` and
`/portal/pages/[treeId]` from the table it already has
(`IRREVERSIBILITY_PLAIN`), and `app/(portal)/_lib/undoing.ts` already takes an
`AssessmentSummary` — so the day a hold carries the reasons it is one call and
no new words. That work is `Loom portal`'s and is not done here.

A disposition is now slightly larger in storage, by a field that is absent on
every reversible judgment — which is most of them.

Two fields were added to records that outlive the process that wrote them, and
both follow 0045 rather than inventing a value for the unknown. A judgment
restored from a holds table written before today parses, and reads as the
unknown it is.

The `change-assessed` row is one field wider, so the surface of what §6 may be
asked to group by grows. Nothing aggregates it yet.

## Alternatives considered

**Mine the codes out of `reason.detail`.** No framework change at all, and it
works today. Rejected above: it makes a consumer depend on wording documented as
wording, and it fails as a wrong answer rather than as a missing one.

**Put the whole `ChangeAssessment` on `HeldProposal`.** It answers more
questions than the two fields do, including ones nobody has asked. Rejected
because it is a much bigger row and it gives §6 a second copy of a record the
journal already keeps, with no rule saying which copy wins when they disagree.

**Put the disposition on `StoredRevision`.** `Loom portal` raised this on the
same day, about `/portal/history`: a tree-level inverse always exists (0016), so
a change that took a payment has a perfectly clean `Reversal` and the screen
offers the undo button with no notice at all. Rejected here, and deliberately
left open as a question rather than settled: 0016 makes the revision log the
truth about the *page*, and whether a change reached outside the page is not a
fact about the page. That argues for joining the judgment to the revision rather
than copying it in. What such a join needs is a way to fetch one
`AssessmentSummary` by `proposalId` without paging the whole journal, which this
record does not add and which is the open question it leaves behind.

**Always write the field, empty when nothing fired.** Then an absence means only
"predates the field". Rejected because it stores an empty array on every
accepted disposition to express something `reversible: true` already says, and
the four-way table above recovers the same information from what is already
there.

**Keep the schema in `reversibility.ts` and import it from `disposition.ts`.**
Fewer files. Rejected because it would make every importer of a stored shape — a
holds table among them — pull the tree engine in behind it, and because that
module's exports are published, which would have put an internal seam through
the documentation gate.
