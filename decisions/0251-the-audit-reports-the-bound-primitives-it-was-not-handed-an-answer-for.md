# 0251 — The audit reports the bound primitives it was not handed an answer for, and being answered under the wrong name is the same report

**Status:** Accepted
**Date:** 2026-10-10
**Section:** §4 — the SDK and the harness, not the library

> **Why this number.** `0250` is claimed by #566, open and unmerged, and `0245`
> by #548; `0251` is the next free one on `main` and on both branches. This
> record adds a reporting field to an existing instrument and supersedes
> nothing.

## Context

[0185](0185-a-probe-is-handed-answers-the-way-it-is-handed-props.md)
gave `auditRegistry` a second argument: the answer states a caller declares a
bound primitive can be probed in. It also discharged a restriction
([0180](0180-a-primitive-that-draws-an-answer-declares-the-shape-it-can-draw.md))
that had been forced by not having one — *a bound primitive may declare only the
regions it places without an answer* — and so **widened what a bound primitive
is allowed to say about itself**.

That permission sat for sixteen days with no caller, and `Loom primitives` wrote
down why on 9 October, in the sharpest sentence in the ledger on this subject:

> what changed in September was a **permission**, and a permission is the one
> kind of change a suite cannot notice.

The mechanics are exact. `unplacedSlots` is a `some` negated: it reports a
declaration no probed configuration drew, so it can report a declaration with no
rendering and never a rendering with no declaration. A primitive declaring fewer
regions than it is now allowed to is therefore invisible to every instrument in
the repository. The audit of the real library went on passing **honestly**,
because nothing ever handed it `answers`.

What made the instance catchable was something taking the permission up: once
four primitives declared a failure region
([0246](0246-a-bound-primitives-failure-region-is-a-slot-over-its-declared-sentence.md)),
`library.test.ts` could assert the converse. That does not generalise. The next
permission sits exactly as long.

And one thing in the filing is the whole argument for this record: the audit
**already knows**. It is handed the registry, so it knows which primitives
declared `reads`; it is handed the options, so it knows which of them it holds
answers for. Nothing had to be measured. The two halves had never been put
beside each other and named.

## Decision

**`RegistryAudit` grows `notAnswered`: the bound primitives this call was never
put in a position to see answered.** It reports, it does not fail, which is the
line [0012](0012-conformance-is-probed-and-reported-not-enforced.md) draws
for this instrument generally — a host auditing the library it ships asserts it
empty, exactly as it does `notDecorated`.

Three properties, and each is a choice:

**It is a fact about the call, not about the component.** Every other list on
this audit is something a probe observed. An entry here says the probe was never
told what it needed, which is why it is worth a field at all: without it, the
other lists describe a bound primitive's unanswered branch and wear the
primitive's name, and nothing in the output says a reader is looking at the
audit's own blind spot rather than at a defect. It is therefore derived from the
registration and the options alone — no probe outcome reaches the computation,
because a probe result cannot make "I was not told" true or false.

**Being answered under a name it does not read is the same report, with a
different reason.** `notAnswered` is one list with a two-member `reason`:
`no-answers` for a type the call held nothing for, `names-not-answered` for one
it held answers for, none of which carried a name the primitive resolves to.
The second cause exists *because* of the first. A host told to make `notAnswered`
empty can satisfy it by handing an answer keyed wrong, and would then get the
identical wrong picture — every region reported dropped — with a clean instrument
telling it the library is at fault. Reporting only the first cause would have
built the blind spot one layer up.

**The quantifier is the total miss.** A primitive reading two bindings and
answered on one has been *seen* answered and is not reported. The alternative
makes this a list a host cannot assert empty, which is the fault
`ThrowingConfigurations.everyConfiguration` exists to undo elsewhere on this
same type.

The entry carries `reads` as the registrant declared it, unchanged, because what
a reader of this does about it is supply an answer and the declaration is what
says under which name. `describeRegistryAudit` says it in words on the
primitive's own line, last, after the clauses it may be contradicting.

Resolving a prop-named declaration is **the walk's own rule** and not a second
copy of it: `namesRead` is now exported from `src/render/reads.ts`, where
`unreadBindings` already used it, and the probe asks it of a state's props as the
walk asks it of a node's.

## Consequences

A permission widening what a bound primitive may declare is now visible from the
day it lands, with no caller having to remember: the audit says it was not told
something it knows it needs. `library.test.ts` asserts by hand what the audit can
now say for itself — *"probes every bound primitive with an answer"* — and
whether to let that assertion go is `Loom primitives`' call, not this lane's.

What this does **not** do is check that an answer reaches the branch a caller
hoped it would. The audit knows a name was answered; what the primitive draws
under that answer is `unplacedSlots`' business, and a caller who hands `ready`
with an empty list where the primitive needs rows gets a correct audit of a state
it did not mean to probe. That limit is stated and not closed.

Two lists on this type now have a `reason` or a flag rather than being bare
arrays of types. That is a shape worth watching: a third would be the point at
which an audit entry wants a common form rather than three bespoke ones.

## Alternatives considered

**A field on `RegistryAudit` naming the types alone, with no `reads` and no
reason.** Cheapest, and it is what the filing literally asked for: *"bound
primitives probed with no answer"*. Rejected on the second cause. A list that
counts whether answers arrived is satisfiable without any of them landing, and
the instrument would then be at its most confident in exactly the case it was
built to catch.

**Two fields, one per cause.** Honest, and rejected because the remedy is one
thing — hand the audit an answer for that type — and a reader choosing which of
two empty lists to assert is being asked to understand a distinction that does
not change what they do. The `reason` is there for whoever is debugging, in the
same place `everyConfiguration` is.

**Fail rather than report.** Rejected on 0012's charter. Whether an unanswered
bound primitive matters depends on the deployment: a host auditing a registry it
assembled from somebody else's package may have no business knowing what that
primitive reads, and an audit that threw would make the instrument unusable to
the caller with the least information.

**Generate an answer from the declared shape, so the probe needs no caller at
all.** This is 0185's own deferred alternative and it is a larger question:
`reads` names a binding, not a shape, so the probe would be inventing a value
and then measuring its guess. Its five-primitive threshold is now past and it is
still not this. Left where 0185 left it.

**Put the check in `library.test.ts` and leave the audit alone.** It is already
there, which is the filing's point — and it is a copy of something the
instrument could say, in one lane's suite, where the next lane to audit a
registry will not find it.
