# 0012 — Conformance is probed and reported, never enforced by registration

**Status:** Accepted
**Date:** 2026-07-29
**Section:** §4 — Framework SDK

## Context

0010 made edit-mode decoration a contract: the runtime hands a primitive
`loom.editable` and the primitive spreads it onto its own root element. A
primitive that ignores it renders perfectly and is invisible to the portal —
nothing to click, no id to address, no error anywhere. 0010 asked §4 to catch
that "at registration, not as a runtime surprise".

Taken literally, that means `createPrimitiveRegistry` calls every registered
component while the module graph is still evaluating, to see what it returns.
Two problems. Calling arbitrary components at import time runs someone else's
render as a side effect of registering, which a library should not do behind a
host's back. And a component that uses hooks cannot be called outside a renderer
at all, so registration would fail for reasons that have nothing to do with
whether the contract is met.

## Decision

**Registration is pure and never calls a primitive.**
`createPrimitiveRegistry` validates identifiers, refuses duplicates, and builds
lookups. That is all.

**The check is a function a host runs.** `auditRegistry(registry)` probes every
registered component once and returns a verdict per primitive:

| verdict | meaning |
| --- | --- |
| `decorates` | the decoration it was handed reached an element it returned |
| `not-decorated` | it did not, so the portal will not see it |
| `not-probeable` | it could not be called outside a renderer, so nothing was learned |

**`not-probeable` is a third answer, not a failure.** A hook-using component and
a class component are both legitimate primitives; the probe simply cannot judge
them, and saying so is more useful than a pass or a fail it did not earn.

**The audit reports; it does not decide.** Nothing in the SDK refuses to run over
`not-decorated`. Whether that blocks a release depends on whether the deployment
has a portal at all, which the SDK does not know — so `notDecorated` is a list a
host asserts empty in its own test or build step.

**The probe is honest about being a probe.** It calls the component with a
synthetic context and searches the returned elements for the attributes it
supplied, following `children` and recognising the runtime's own object by
identity when it is handed to another component. A primitive that copies the
decoration into a prop of its own naming reads as `not-decorated` — a false
negative, tested and documented rather than papered over.

## Consequences

- Registration cannot fail for a reason unrelated to registration, and importing
  a registry has no side effects.
- The check runs where a failure is cheap: in a test, or a CI step, not on a
  request. Nothing about it costs anything at render time.
- A host that never runs the audit gets no protection. That is the price of not
  probing automatically, and it is why `describeRegistryAudit` produces a message
  fit to be a failing test's output — the intent is that hosts wire it once.
- §5 inherits the failure mode as a supported condition rather than a bug: a
  portal will encounter undecorated primitives in the wild and must degrade
  rather than assume every element is addressable.
- The false negative means a strict host could see a passing primitive reported
  as failing. Reported, not blocked — which is the whole reason the verdict is a
  value and not an exception.

## Alternatives considered

**Probe inside `createPrimitiveRegistry` and refuse a non-conforming primitive.**
Rejected: it runs foreign render code at import time, and it makes a
hook-using primitive unregisterable for a reason that has nothing to do with the
contract.

**Probe inside the registry but only warn (console).** Rejected. A library
writing to the console is a decision about someone else's log stream, and the
runtime already has a shape for "something to report": a value the caller
inspects.

**Require conformance in the type system instead.** Rejected as not expressible.
No type can state "this component spreads this object onto its root element";
what could be typed — a required prop — is exactly what 0010 rejected, since the
attributes are optional in production renders.

**Detect it at render time and diagnose per node.** Rejected: it would cost a
check per element on every request to learn a fact that is fixed at build time,
and it would only fire in edit mode — the one moment nobody wants noise.

**Render with `react-dom/server` inside the probe instead of calling the
component.** Rejected for this pass, and the honest upgrade path if the false
negative bites. It would judge markup rather than elements and would handle
hooks, at the cost of making the SDK depend on a DOM renderer — a heavier
dependency than a registration helper should carry.
