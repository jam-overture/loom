# 0087. A primitive that posts declares it, and the audit checks the declaration against what it renders

**Status:** Accepted
**Date:** 2026-08-23
**Section:** §4b

## Context

[0065](0065-a-submission-names-a-destination-and-never-carries-one.md) built the
submission seam and named, in its own consequences, the thing it deliberately
did not build:

> Nothing enforces that a form primitive has a target. A primitive that needs
> one and is given none renders untargeted, and only its own author knows that
> is wrong.

At the time nothing in the library posted anywhere, so there was nothing to
enforce against. `loom.form` arrived on 18 August and the gap became real, and
was recorded and deferred three times over the following days for one reason
each time: the declaration `0065` sketched would have to be set on a primitive,
and `src/primitives/` belongs to another routine.

The failure is worth being precise about, because it is not "a form with no
endpoint". That case is handled: a node that declared a submission the
deployment could not resolve gets a `submit-unresolved` diagnostic, and
[0073](0073-a-form-with-nowhere-to-post-renders-disabled-and-says-so.md) renders
the form disabled with a sentence saying so. The uncovered case is the
**component**, not the tree: a primitive that is handed `loom.submit` and never
reads it. It renders a set of fields and a submit control with no `action`, a
browser resolves that by posting to whatever page the form is sitting on, and
nothing throws, logs or reports. The first person to find out is whoever filled
it in.

## Decision

**A primitive whose job includes sending what it collected declares `submits:
true`, and the registry audit probes whether it actually places the address it
is handed.**

Two halves, and the second is what makes the first worth having.

The declaration is a plain `boolean` on `definePrimitive`, with no conditional
form. `interactive` takes `{ whenProps }` because a card is a target only when
the tree gives it an `href`; there is no matching case here. A form is a form,
and a primitive that posts under one prop value and not another is two
primitives wearing one name.

The probe is `probeSubmissionPlacement`, alongside the decoration and slot
probes and answering in the same three-way shape. It calls the component with a
resolved target whose action is a string nothing else would produce, and looks
for that string in what came back. **Placing the address is the claim** — not
reading the outcome, not rendering a different sentence. The address is the
whole of what the seam delivers, and a primitive that reads the outcome only to
choose between two notices has connected nothing.

`auditRegistry` reports three lists from those two facts:

| list | what it means |
| --- | --- |
| `submits` | places an address — what a deployment holds its endpoint registry against |
| `undeclaredSubmitters` | places one and never said it would |
| `unwiredSubmitters` | said it would and places none |

`unwiredSubmitters` is the failure above. `undeclaredSubmitters` is the milder
one: the form works, but the declaration is what tells a deployment the seam is
load-bearing here, so an undeclared submitter is a page whose need for an
endpoint registry is invisible until someone fills the form in.

A primitive the probe could not call is in neither list. That is the reading
`decorationFromAudit` already makes: declining to answer is not answering no,
and "this form is broken" is not a claim to make on silence.

Nothing is refused at registration, per
[0010](0010-conformance-is-probed-not-proven.md). The audit reports and the host
decides.

## Consequences

- **The check has a subject on the day it lands, and no lane was crossed to give
  it one.** `loom.form` posts, does not declare `submits`, and the audit says
  so — `submits: ["loom.form"]`, `undeclaredSubmitters: ["loom.form"]`. The
  derived half is what made this buildable without editing another routine's
  file, and it is also the better half: it reports what the components do rather
  than the sum of their authors' intentions.
- **The declaration is checked, not trusted.** This is the difference between
  this and `interactive`, which is declared, carried through the registry, and
  believed. A declaration nothing verifies drifts silently — a prop is renamed,
  a component is rewritten, and the claim stays behind. Here the two are
  compared on every audit run.
- **`submits` is `false` rather than `undefined` on a registered primitive**,
  unlike `interactive`. There is no third state to express, and a reader asking
  "does this need an endpoint" should not have to handle "unstated".
- **The audit calls every component once more per configuration.** It already
  calls each twice; this makes three. It runs in a test or a build step, never
  in a request, which is what makes that acceptable.
- **One false negative, documented at the probe.** A primitive that rebuilds
  the action before rendering it — appending a query string, say — has posted
  somewhere real and reads as `not-placed`. That is the same bargain the
  decoration probe makes with identity, and it errs towards reporting a fault
  that is not one, which a reader dismisses in a second. The reverse error is
  the one this exists to prevent.
- **`loom.form` wants one line.** `submits: true` in its definition, which
  belongs to `Loom primitives` and is filed for them. Until it lands the audit
  reports it as an undeclared submitter, which is accurate.

## Alternatives considered

**The declaration alone, as 0065 sketched it.** Read `submits` off the
definition and report the list. It is a third of the code and it is an unchecked
claim: the audit would have echoed back what the author typed, which catches a
form that forgot to declare and nothing at all about a form that declared and
does not work. It also could not have been built this run without editing
`loom.form`, because with no derived half a seam nobody has declared reports
nothing and is a check with no subject.

**Derivation alone, with no declaration.** Report `submits` from the probe and
stop. Genuinely tempting: it needs no author to do anything and it is the fact a
deployment actually holds its endpoint registry against. It cannot express the
one thing the seam exists for, though — a primitive that *should* post and does
not is indistinguishable from one that was never meant to. That gap is only
closable by someone saying what was intended.

**Refusing registration when the two disagree.** Rejected on 0010's reasoning,
and more sharply here than elsewhere: the probe's false negative would take down
a deployment whose forms all work.

**A runtime diagnostic when a node's resolved target reaches a component that
does not render it.** The renderer cannot see this — it hands the context over
and never learns what was done with it — so detecting it at render time means
inspecting the returned element tree on every request for a fault that is a
property of the component and not of the page. Registration time is where a
constant fact belongs.
