# 0185. A probe is handed answers the way it is handed props, and a specimen declares the reply rather than the source

**Status:** Accepted
**Date:** 2026-09-23
**Section:** §4 — the SDK and the harness, not the library

> **Why this number.** `0184` is the highest on `main` and neither open pull
> request (#376, #377) adds a record, so `0185` is the next free one everywhere.
>
> **Why `Accepted`.** It changes no schema, adds no node kind and supersedes
> nothing. It discharges a limit
> [0180](0180-a-primitive-that-draws-an-answer-declares-the-shape-it-can-draw.md)
> named as the framework's — *"Filed as a finding, because the probe is the
> framework's"* — rather than reversing anything that record decided.

## Context

Two instruments in this repository run a primitive outside a page. The
conformance probe calls it, looks at what came back and reports what it
declared and did not place. The specimen harness renders it into a document a
browser is pointed at, so a lane can look at it.

Neither could supply an answer, and until 22 September nothing needed one:
ninety-six of ninety-eight registered primitives read no binding. Then
`loom.feed` and `loom.tally` shipped, and `Loom primitives` filed two findings
on the same day whose shapes turned out to be one absence.

**The probe's.** `auditRegistry` probes each primitive under every
configuration its schema closes over and reports any slot nothing ever placed.
A bound primitive draws a different region for each of three answers — rows,
none, and a source that did not answer — and probed with no answer at all it
takes the third branch every time. So two thirds of a correct primitive read as
dropped content, and `library.test.ts` asserts that list empty. 0180 wrote the
consequence down as a rule about the library:

> **A bound primitive may therefore declare only the regions it places without
> an answer**, and everything else it says is declared text.

That rule is the probe's limit wearing the library's clothes. `loom.feed` has
one slot and two declared sentences, and the record says so in as many words:
*"That is a defensible design on its own and it was not chosen: it is what the
probe permits."*

**The specimen's.** `tools/specimen/render.ts` renders with `resolver`,
`validator`, `themes` and `submissions`, and no data. So the four states that
matter — rows, an answer of none, a source that did not answer, and an answer
of a shape the primitive cannot draw — are all unphotographable, and the lane
that shipped both primitives took its pictures with a private script instead.
That is the ninth such script this repository's lanes have written, and the
harness exists so there is no tenth.

The same gap has been closed once before, for the other seam that resolves
before the walk. `Specimen.endpoints` exists because a `loom.form` with no
destination *correctly* draws a greyed fieldset, and a photograph of a form
being right is useless as a photograph of the field inside it.

## Decision

### 1. A probe's configuration is props **and** answers

`ProbeConfiguration` is `{ props, data }`. Every probe in `conformance.ts`
takes a list of them, and `unasked(props)` builds the one with `NO_DATA` that
every configuration was before this record.

The answers are **supplied, not derived**. A probe that invented a value would
be measuring its own guess: an invented answer is either one the primitive
happens to be able to draw, in which case the probe is reporting on the
invention, or one it cannot, in which case every bound primitive reports its
failure region as the only one it places. Whoever registered the primitive
knows what it reads. The probe does not, and
[0184](0184-a-primitive-may-read-under-whichever-name-a-prop-gives.md)'s
`reads` cannot help: it gives the *name*, which was never the hard half.

### 2. Answers are summed into the configurations by a second function

`probeConfigurations(choices)` is untouched: it still returns the prop
configurations a schema closes over, and it is still the four lines
[0075](0075-a-primitive-is-audited-under-every-shape-its-schema-closes-over.md)
is about. `probeStates(configurations, answers)` composes them into the states
the probes run.

Two functions rather than one argument on the first, and the split is the
argument. What a schema closes over is **derived** and cannot be wrong. What a
primitive can be answered with is **supplied**, by whoever registered it. One
name over both would put a machine's enumeration and a person's declaration
behind one call, and the day they disagree nobody could say which half was
wrong.

Summed rather than crossed, for the reason 0075 sums the choices, and it costs
less here: what a bound primitive draws turns on the answer, and the state that
reaches an unplaced region is the answer under the props that name it. So an
answer carries its own optional props, because on both bound primitives in the
library the binding name comes from a prop.

### 3. `auditRegistry` takes the answers keyed by type

A second argument, `{ answers }`, a `ReadonlyMap` from primitive type to answer
states. Absent for a primitive that reads nothing, which is every primitive
registered before 22 September; those audit byte-for-byte as they did, and a
test asserts it.

A map rather than an object, because a lookup on an object literal is a lookup
on `Object.prototype` for any name that happens to be on it — the reason
`NodeData` is null-prototyped, one layer up.

### 4. A specimen declares the **answer**, never the source

`Specimen.answers` is a `Record<SourceId, SpecimenAnswer>`, where an answer is
a `JsonValue` or a `SourceFailure`. Each becomes a source through
`defineSource`, so a specimen naming an invalid id is refused exactly as a
host's registration would be, and the params a tree asks with are validated
before the answer comes back.

**Never an adapter.** The seam takes a `SourceEntry` whose adapter is an async
call that may query a database. An adapter free to do IO is free to be slow, to
fail on a bad afternoon, and to make two runs of the same specimen produce
different pictures. This is the same sentence `endpoints` already makes about
targets, and it is the property that makes a specimen shot evidence.

**The source's schema accepts any JSON**, deliberately. Three of the four
states are an answer, and the fourth — *a shape this primitive cannot draw* —
is only reachable if the answer gets past the source. A specimen that had to
declare an answer schema could photograph only its own strictness.

### 5. A specimen always resolves, even when it declares nothing

An empty registry rather than no registry, matching `endpoints`. A tree that
binds a source the specimen did not declare now renders the failure it would
render on a deployment that had not registered it, and says `data-unavailable`
in the diagnostics — rather than `data-unresolved`, which means the caller
resolved a different tree's plan and was not true of any specimen.

## Consequences

- **0180's restriction on what a bound primitive may declare no longer binds.**
  The clause in its decision 3 is discharged, not reversed: its reason was the
  probe, and the probe has changed. Nothing in the library changes today —
  `loom.feed` keeps its one slot and its two declared sentences — and whether a
  failure region becomes a slot is `Loom primitives`' call, made on the design
  rather than on what the instrument permits. 0180 is **not** superseded: every
  other thing it decided stands, and this is the finding it filed coming back
  answered.
- **A bound primitive can be photographed in all four of its states**, with no
  private script and no network. The tests in `tools/specimen/specimen.test.ts`
  take all four off `loom.feed`, which is the first time any of them has been
  asserted from outside the primitive's own file.
- **`ProbeFailure` carries the binding names it was answering.** Without it two
  throws at the same default props print as the same line twice, and the one
  that matters — *it renders until you answer it* — is the one a reader cannot
  pick out.
- **Four exported probe signatures changed**, from `readonly JsonObject[]` to
  `readonly ProbeConfiguration[]`. A published break, taken now rather than
  behind an overload: this package has no external consumers, the alternative
  is two ways to say one thing for as long as the SDK exists, and `unasked` or
  `probeStates` is the one-call migration. `probeConfigurations` itself is
  unchanged, which is why lesson 15's worked transcript still prints what it
  says it prints.
- **Nothing derives an answer from `reads`.** A model reading the catalogue is
  told which name a primitive looks under (0181, 0184); the probe is told what
  is under it. The two declarations stay separate because they answer different
  questions, and pretending one implies the other is what would put an invented
  row in an audit.

## Alternatives considered

**A registration declares the shape it draws, so the probe can generate an
answer.** The tidiest version: 0180's decision 2 already has each bound
primitive carrying a schema for what it reads, and a generated value from a
declared schema is not an invention. Rejected for now because the schema lives
*inside* the component rather than on the definition, so this is a change to
`definePrimitive` and to every bound primitive — `Loom primitives`' lane, not
this one — and because a generated value still has to be generated: an
arbitrary instance of `{ title, detail?, meta?, href? }` reaches the rows
branch, and an arbitrary instance of `string | number` reaches `loom.tally`'s,
but neither reaches the *empty* branch, which is the one 0180's restriction is
about. It would close half the gap and add a declaration. Worth revisiting if a
third bound primitive arrives.

**A registration says *this slot is placed on a condition the probe cannot
reach*.** The finding named it and named its cost: it is weaker, and it would
quietly excuse the genuine defect `unplacedSlots` exists to catch — a slot the
author simply forgot to place. A list a primitive can opt out of is a list a
host cannot assert empty.

**Derive the answer states from `reads`.** The probe knows the name, so it could
build `{ [name]: { status: "unavailable", … } }` with no help at all, and that
one state costs no value. Rejected as a half-measure that reads like a whole
one: it reaches the failure branch and never the rows or the empty branch, so
`unplacedSlots` would still report a bound primitive's two real regions while
appearing to have been taught about answers. One mechanism that reaches every
state beats one that reaches the cheapest.

**A specimen declares sources rather than answers.** It is what a host does,
and it would let a specimen photograph an adapter as well as a primitive.
Rejected for the reason `endpoints` was: a specimen is a photograph, and a
photograph that can do IO is one that can differ between two runs of the same
tree. A lane wanting to look at an adapter has the runtime's own tests.

**Leave the probe alone and let the library declare fewer regions.** This is
the status quo, and it is what 0180 recorded. Rejected because the constraint
is invisible where it lands: a reader of `loom.feed` sees a primitive with one
slot and no way to tell that a second was possible and an instrument said no.
An instrument that shapes the thing it measures, silently, is worse than one
that reports a false positive a person can dismiss.
