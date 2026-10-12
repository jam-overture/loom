# 0267 — The probe reports every configuration it tried, and the audit calls a fault only what the schema accepts

**Status:** Accepted
**Date:** 2026-10-11
**Section:** §4 — the SDK and the harness, not the library

> **Renumbered on 2026-10-12 by `Loom merge`**, from 0259, when the branch that
> carried it (#587) was merged. The note below was true when it was written and
> `main` has moved since: #592 landed a different 0259 — *a surface the portal
> governs renders from the store, and a page built at render time is not one* —
> and two records sharing a number is fatal
> ([0097](0097-a-hole-in-the-numbering-is-reported-and-a-clash-is-fatal.md)).
> The record already on `main` keeps the number; this one takes the next free
> above `main`'s highest. Nothing in it changed but the number, and the citations
> that mean it — `src/sdk/audit.ts`, `src/sdk/audit.test.ts`,
> `src/sdk/conformance.ts`, `src/cli/templates.test.ts`,
> `tools/specimen/unconfigured.specimen.ts`, `FINDINGS.md` and this run's report
> — were updated with it.

> **Why this number.** `0258` is the highest on `main`, and the highest on every
> open branch — #583, #584 and #585 all carry it; #566 holds `0250` and #548
> `0249`, both below. `0259` is the next free one everywhere. This record adds a
> partition and a reporting field to an existing instrument and supersedes
> nothing.

## Context

[0075](0075-a-primitive-is-audited-under-every-shape-its-schema-closes-over.md)
made the conformance probe call a primitive once per configuration its schema
closes over, rather than once with no props at all. The configurations are the
default one and then each closed choice's values one at a time:

```ts
export const probeConfigurations = (choices: readonly ClosedChoice[]): readonly JsonObject[] => [
  {},
  ...choices.flatMap(({ name, options }) => options.map((option) => ({ [name]: option }))),
]
```

**`{}` is not a configuration built from the schema.** For a primitive with a
required prop it is a props bag that primitive's own validator refuses, and no
tree the Gate would accept can produce it. The audit reported what happened
under it anyway, and `throwsOnDeclaredProps` says in its own doc comment that an
entry means *"a tree the validator accepts can take the page down"*. For such a
row that sentence was false.

Measured on this branch, with a primitive whose schema is
`z.object({ service: z.string().min(1).max(60) }).strict()` and whose component
is `createElement("div", { ...loom.editable }, props.service.toUpperCase())`:

```
configurations the probe builds:  [{}]
throwsOnDeclaredProps:            spec.shouting — {} (Cannot read properties of undefined)
                                  everyConfiguration: true
notProbeable:                     spec.shouting
notDecorated:                     (empty)
```

Three consequences, and the third costs the most: the row claims a fault, it
lands beside the class and hook-using components that are legitimately
unjudgeable ([0012](0012-conformance-is-probed-and-reported-not-enforced.md)), and
`notDecorated` is empty because nothing was ever successfully called — which is
the one question the scaffolded project's generated test exists to answer.

**Nothing in this repository is red, and the reason is a house style rather than
a rule.** Measured off the starter library:

| | |
| --- | --- |
| registered | 107 |
| with at least one required prop | 33 |
| whose default configuration the schema refuses | 33 |
| **every** configuration refused | 32 |
| `throwsOnDeclaredProps` | 0 |
| `notProbeable` | 0 |

Thirty-two of the hundred and seven are probed entirely under bags their own
schemas refuse, and every one of them answers, because each hands its props to
React and React renders `undefined` as nothing. Not one calls a method on a prop
value. The first host primitive that trims, uppercases, splits or parses a
required prop is a red audit with a reproduction its schema would have rejected.

Filed by `Loom docs` on 11 October, writing *A primitive of your own* — a page
that runs `auditRegistry` over a primitive a reader has just been shown. That
page's primitive renders its props rather than reading them, so it passes for
the same accidental reason the library does.

## Decision

**The probe reports every configuration it tried. The audit decides which of
them a claim may be made about, by asking the primitive's own validator.**

1. **A throw is a fault only under props the schema accepts.**
   `throwsOnDeclaredProps` filters its failures through
   `primitive.validate(props)`, so its stated sentence is true of every row.
   `undeclared` counts as accepted — nothing refused anything — which is the
   reading `render.ts` already gives it.

2. **A primitive the probe could reach in no accepted configuration is
   `notConfigured`, not `notProbeable`.** Both are "the probe got no answer",
   and only one is a fact about the component: a class or hook-using component
   cannot be called at all (0012), while a component nobody has handed required
   props to has not been asked a question it could answer. `notConfigured`
   carries the required prop names, the refusals in the validator's own words,
   and which of two causes applies — `no-props` or `props-not-accepted`, told
   apart for the reason `names-not-answered` is told from `no-answers` (0253): a
   host told to empty the list can hand over a bag that is refused too.

3. **A host may supply props, and they are not derived.**
   `RegistryAuditOptions` gains `props`, a map of type to props bags, beside
   `answers`. A required `z.string().min(1)` has no value the probe can read off
   the schema, and one it invented would make everything downstream a function
   of the guess — the argument `ProbeAnswers` already makes about answers
   ([0185](0185-a-probe-is-handed-answers-the-way-it-is-handed-props.md)).
   Whoever registered the primitive knows a bag it accepts. Each supplied bag is
   varied by every closed choice in turn, so a bag gets the treatment 0075 asks
   for; duplicates of the empty bag are dropped, so handing over what the probe
   already had changes nothing at all.

4. **Refused configurations are still probed, and still reported.** What a
   non-throwing probe observes is **reach** — *some* configuration decorated,
   *some* configuration placed this region — and a bag the schema refuses that
   places a region is evidence the component reads that region. A throw is the
   opposite kind of claim: it says this component is broken, and it needs the
   configuration to be one a tree could carry. So the two are judged
   differently, and `PrimitiveAudit.refusedConfigurations` carries the bags the
   schema refused, so a reader can see how much of a verdict rests on
   configurations no tree could produce — thirty-three primitives' worth, in the
   library Loom ships.

5. **The generated scaffold asserts it.** `loom init` writes a conformance test;
   it gains `expect(audit.notConfigured).toEqual([])` with the remedy in its doc
   comment, because the reader this was found for meets that file before they
   meet this record.

## Consequences

- **No verdict in this repository changes.** The starter library audits
  identically: `notConfigured` empty, `notProbeable` empty,
  `throwsOnDeclaredProps` empty, thirty-one leaves, the same four unplaced
  regions under no answers. What changes is that thirty-three of its audits now
  carry a `refusedConfigurations` list saying what the verdicts rest on.
- **`RegistryAudit` gains a field**, so a host destructuring it exhaustively or
  snapshotting the whole object sees one more key. The package is `0.1.0` and
  every caller in this repository is updated.
- **A host with such a primitive now has work to do**: `notConfigured` is a list
  to empty by handing props over, and until they do, the audit says plainly that
  nothing it reports about that primitive is about the component.
- **The refused-but-answering population is now visible and is not reported as a
  problem.** A future run may decide that thirty-three primitives answering only
  under bags their schemas refuse is worth closing — by the library supplying
  its own probe props, which is `Loom primitives`' call and not this record's.
- **`probeConfigurations` keeps its signature**, and
  `probeConfigurationsFrom(bases, choices)` is the general form. Three lesson
  transcripts quote the four-line body; it is now one line delegating to the
  other, and the four lines quoted are still the behaviour for the only argument
  those lessons pass.

## Alternatives considered

- **Build the default configuration from the schema.** Rejected on a
  measurement: of the thirty-three starter primitives with a required prop,
  **one** has all of them closed. The other thirty-two require a string, a
  number or a URL, for which a minimal bag is not derivable without inventing a
  value — and an invented value makes every row downstream a function of the
  guess, which is the trade `ProbeAnswers` already refused for answers. It would
  also have fixed nothing for the library it was proposed for.
- **Drop refused configurations from the probe entirely.** Sound for the fault
  claim and ruinous for everything else: thirty-two of the hundred and seven
  starter primitives have *every* configuration refused, so the audit would stop
  being able to say anything at all about a third of the library — `leaves`
  would empty, `notDecorated` would go quiet, and `decorationFromAudit` would be
  reading a lookup built from nothing. Reach and fault are different claims and
  this alternative treats them as one.
- **Keep `{}` and rename the list.** The third remedy the finding offered, and
  the cheapest. Rejected because the rename alone leaves the row in
  `notProbeable` beside the hook-using components, leaves `notDecorated` silent,
  and gives a host no way to get an answer — the renaming is in here anyway, as
  the part of the decision that `notConfigured` does.
- **Take the props from the registration rather than the audit call.** A
  `probeProps` field on `definePrimitive` would put the bag beside the schema it
  satisfies, which reads better than a map at the call site. Rejected for now
  because it is a change to the published definition shape for every primitive
  in order to serve the ones that need it, and because a host auditing someone
  else's library — which is what a deployment does — cannot edit the
  registration. Worth revisiting if the library supplies its own.
