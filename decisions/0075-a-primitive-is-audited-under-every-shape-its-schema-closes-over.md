# 0075. A primitive is audited under every shape its schema closes over

**Status:** Accepted
**Date:** 2026-08-20
**Section:** §4

## Context

`auditRegistry` probes each registered primitive by calling it — once, with a
synthetic render context and **no props at all** — and reports what it saw:
whether the component spread `loom.editable`, whether it placed each region it
declared, and whether it placed the children it was handed. That last one names
the primitive a leaf, and a portal offering "insert into this node" reads it to
avoid offering a place nothing will appear.

On 20 August the primitives routine filed the first case where one render is not
enough:

> `loom.field` renders its children **only when `type` is `select`**, because
> only a select has choices (they are `loom.option` nodes — 0052 applied to the
> one thing on a form that repeats). Probed at its default type, it places
> nothing and is reported a leaf.
>
> Nothing is broken … But the report is wrong in a way a host reading it would
> act on — "this primitive has nowhere to put a child node" is false, and the
> primitive that would genuinely have lost its `children` is indistinguishable
> from this one.

The library worked around it by asserting the leaf list *including*
`loom.field`, with a comment saying why. That is a test agreeing with a wrong
answer, and the next primitive whose rendering turns on a prop inherits it.

The general shape of the fault is worth naming, because it is not only about
leaves. Every claim the audit makes is a claim about **a primitive**, and all
three were being answered from **one configuration** of it. A primitive that
decorates in five modes and forgets in the sixth passed. A primitive that places
its `aside` only when `layout` is `split` was reported as dropping it.

## Decision

**The probe answers from every configuration the primitive's own schema closes
over, not from one.**

`closedChoices(schema)` (in `src/catalogue.ts`, beside `catalogueFields`,
because it reads the same object schema through the same public Zod surface)
lists the props whose accepted values can be *listed* rather than invented: a
`z.enum`'s members, and both values of a `z.boolean`, looking through
`.optional()`, `.default()` and `.nullable()`, which change whether a prop is
present and not which values it accepts. A string, a number or a record has no
enumerable set, and choosing one would make the audit's answer a function of the
guess.

`probeConfigurations` turns that into the list the probes run: **the default
configuration first, then each choice's values one at a time.** The *sum* of the
choices, not their product.

Each claim is then resolved the way that claim's failure mode requires:

- **`rendersChildren` is true if any configuration placed them.** "Has nowhere
  to put a child" is a claim about the primitive, and one shape that takes
  children refutes it.
- **A declared slot is unplaced only if no configuration placed it**, for the
  same reason.
- **Decoration must hold under every configuration.** It is a promise, not a
  capability: a primitive that is addressable in five modes and invisible in the
  sixth is broken in the sixth, and reporting it as decorating would hide
  exactly the case a portal falls over on.

A configuration that **throws** answers neither way, so it is excluded from the
verdict and reported separately, as `threw` on the placement verdict and
`throwsOnDeclaredProps` on the registry audit. It is a fault of its own — a
component that throws on a value its own schema accepts is one a valid tree can
take a page down with — and it is not a reason to distrust the configurations
that did render. Only when *no* configuration answers is the verdict
`not-probeable`, which is what it was before.

## Consequences

- **`loom.field` is no longer reported as a leaf**, and the library's test says
  so by omission rather than by a comment explaining a wrong answer. That is the
  finding closed.
- **The audit's claims are now about primitives.** A host asserting
  `notDecorated` empty is asserting something stronger than it was yesterday,
  and a primitive that decorates conditionally will start failing it. Nothing in
  the starter library does; the whole library was re-probed under the new
  configurations and moved exactly one type, out of `leaves`.
- **A new list to assert empty.** `throwsOnDeclaredProps` is empty for the
  starter library today. A host that adds a primitive with a switch it forgot a
  branch of will find out from the audit rather than from a page.
- **Probing costs the sum of a schema's closed choices.** `loom.field` is the
  most expensive primitive in the library at twenty-four configurations — eight
  types, eleven autocomplete tokens, two spans, both values of `required`, and
  the default. The forty-five starter primitives come to 320 configurations,
  each called twice (once per probe), and the library's audit tests run in
  twenty milliseconds. The audit runs in a test or a build step (0010), never in
  a request.
- **A combination is not probed.** A primitive that places children only when
  `type` is `select` *and* `span` is `row` is still reported a leaf. Named here
  rather than left to be discovered; see below for why.

## Alternatives considered

**Report a third state instead of probing more.** `leaves` becomes "placed no
children under the configuration probed", with a separate list for "placed
children under some". This was the finding's second suggestion and it is
cheaper. Rejected because it moves the judgement to the reader without giving
the reader anything to judge with: a portal deciding whether to offer "insert
here" cannot act on "maybe, under some configuration I did not try", and would
have to either offer it anyway or probe the primitive itself. The audit exists
so that nobody downstream has to call a component.

**Probe the product of the configurations rather than the sum.** Complete, and
unbounded: `loom.field` alone is 8 × 11 × 2 × 2 × 2 = 704 renders, and a schema
with six enums of eight members is a quarter of a million. Rejected for cost, and
also because the primitive it would catch — one whose children appear only under
two particular values together — is a primitive nobody can read. The sum is the
honest cheap answer and the record says what it misses.

**Have the author declare it: a `leaf: true` on `definePrimitive`.** Rejected for
the reason `conformance.ts` already gives about slots — a declaration is a second
copy of a fact that lives in the component, and the day the component changes,
the copy is wrong and nothing says so. The probe cannot get out of step with the
code because it *is* the code, run.

**Enumerate numbers too, from a `z.number().int().min(1).max(3)`.** Rejected.
The bounds are reachable through Zod's internals rather than its public surface,
most numeric props are unbounded anyway, and a prop that selects among a closed
set of renderings is an enum — which is what `loom.divider`'s ornament and
`loom.field`'s type both already are.
