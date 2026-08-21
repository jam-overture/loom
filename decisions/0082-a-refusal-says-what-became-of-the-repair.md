# 0082. A refusal says what became of the repair

**Status:** Accepted
**Date:** 2026-08-21
**Section:** §2

## Context

A runtime handed a `ChangeRepairer` gives a refused proposal exactly one more
attempt. That attempt has three endings, and until now the value `composeChange`
returned told two of them apart.

The lessons routine found it while writing lesson 13 and filed it. Three runs,
same tree, same policy, same refusal:

```
repaired, refused   -> rejected | stakes-at-refusal-floor
      what came back: p_r6 | repairOf: p_r5
repairer said no    -> rejected | stakes-at-refusal-floor
      what came back: p_r7 | repairOf: undefined
no repairer wired   -> rejected | stakes-at-refusal-floor
      what came back: p_r9 | repairOf: undefined
```

The middle row is a real event — *we asked for something smaller and the
interpreter could not find one* — and the value handed back said exactly what the
bottom row said, where nothing was asked at all. `attemptRepair` emits
`repair-failed` with the `InterpretationError` and then returns the **original**
refusal's assessment and disposition, so the proposal the caller holds carries no
`repairOf` and no trace of the attempt.

Nothing was lost from the record: the journal holds `repair-failed`,
`interpretationFault` still names the actor, and telemetry can see all of it. It
was the synchronous return value that flattened, which meant a host wanting to
tell an operator *why* a change is not happening had to fold `repair-failed` out
of the event stream to recover a fact the pipeline had in hand one function call
earlier — the shape 0040's alternatives already reject one layer up: *"a fact the
adapter has at hand should not be reconstructed downstream from a sentence."*

## Decision

**The `rejected` outcome carries an optional `repairFailure`**, present only when
a repairer was asked for a smaller change and could not produce one, holding the
`InterpretationError` it declined with.

With it, the three endings are told apart by two fields already on the outcome:

| what happened | `assessment.proposal.repairOf` | `repairFailure` |
| --- | --- | --- |
| a repair was made, and refused in its turn | set | absent |
| the repairer declined | absent | **set** |
| no repairer was wired, so nothing was asked | absent | absent |

**`WriteOutcome.refused` carries it too**, straight through from the composition
outcome. That is the outcome the surfaces actually hold — they call
`commitIntent`, not `composeChange` — so stopping at the pipeline would have left
the fact one layer short of everyone who needs it.

**`describeWriteOutcome` says it in the sentence.** A refusal with a declined
repair reads *"refused: … — asked for something smaller, and the request was not
understood: …"*. The field is the fact and the sentence is a courtesy; a caller
that wants to branch reads the field.

**The field is optional and never defaulted**, in the same spirit as 0045: absent
means nothing was asked, and no host has to construct a "no failure" value to say
so.

## Consequences

**Additive.** One optional field on each of two public types, one line in
`attemptRepair`, one conditional in the sentence. Nothing that compiles today
stops compiling, and no existing outcome changes shape — a run with no repairer
returns exactly what it returned before.

**A host can now narrate the middle row without reading the journal.** The
sentence a portal or a demo wants — *"we asked for something smaller and could
not get one"* — is available from the value the write path returns.

**Two fields rather than one.** Reading the table above needs `repairOf` as well
as `repairFailure`, which is a small tax on the caller. It buys not storing the
same fact twice: `repairOf` is already the runtime's stamp on a repaired
proposal, and a second field repeating it is a second thing that can disagree
with it.

**`ConfirmationOutcome` inherits the field and never sets it.** `confirmChange`
has no repair path — a change the Gate holds a second time applies or does not —
so the field is permanently absent there. Acceptable: `ConfirmationOutcome` is an
`Extract` of `CompositionOutcome` precisely so the two cannot drift apart, and
narrowing it by hand to drop one optional field would trade a real guarantee for
a cosmetic one.

**Not consumed by any surface in this change.** `(portal)/_lib/vocabulary.ts`
turns outcome kinds into plain language and is another lane's file; the demo's
own record panel is mine but is mid-review in #128. Both are filed in
`FINDINGS.md` rather than edited here.

## Alternatives considered

**A fourth outcome kind** — `repair-declined` beside `rejected`. Rejected, and
the finding that raised this said the same: the change *was* refused, and the
repair's failure is a detail of that refusal rather than a different ending. It
would also break every existing `switch` over `CompositionOutcome` to express
something an optional field expresses without breaking anything.

**Leave it to the event stream.** Rejected as the thing 0040 already decided
against. The journal is the record of what happened, not the only channel by
which it may be learned; a caller that must replay events to recover the return
value's own missing half is doing the adapter's reconstruction work.

**Carry the whole repair attempt** — a `repair?: { requested: true; error?: … }`
object covering all three endings in one field. Rejected as duplicating
`repairOf`. The "repaired and refused again" row is already fully recorded by the
runtime's own stamp on the proposal; a second field asserting it is a second
source of truth for one fact.

**Put the fate on the `Disposition` instead.** Rejected on ownership. A
disposition is the Gate's verdict on one proposal, reached before any repair was
asked for; hanging the interpreter's later failure on it would make the Gate's
record depend on what happened after it spoke.
