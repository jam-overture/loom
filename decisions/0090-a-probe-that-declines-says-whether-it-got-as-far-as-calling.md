# 0090. A probe that declines says whether it got as far as calling the component

**Status:** Accepted
**Date:** 2026-08-24
**Section:** §4

## Context

0012 gave the conformance probe a third answer. `not-probeable` is neither a
pass nor a failure, because a hook-using component and a class component are
both legitimate primitives that simply cannot be called outside a renderer, and
saying so is more useful than a verdict the probe did not earn.

0075 then added `throwsOnDeclaredProps`, whose documented purpose is the fault
that matters most: *"a tree the validator accepts can take the page down"*. A
component that throws on a value its own schema accepts is one a legal tree
crashes a page with, and the list exists to be asserted empty.

On 24 August the lessons routine registered a component that throws
unconditionally, audited it, and filed what came back:

```
loom.exploding: could not be probed (calling it outside a renderer threw: boom)
throwsOnDeclaredProps: []
notProbeable: ["loom.exploding"]
```

**The most extreme instance of the fault was missing from the list that names
the fault.** A component that throws on *every* value its schema accepts is
worse than one that throws on a single enum member, and it landed in
`notProbeable` instead — the one list a host cannot assert empty, because 0012
put legitimate primitives there.

This is 0075 working exactly as written: it excludes a throwing configuration
from the verdict and reports it separately, and *"only when no configuration
answers is the verdict `not-probeable`"*. The two rules are individually right
and together they leave a host with nowhere to put the assertion. The
distinction survived only inside the human-readable `reason` — `calling it
outside a renderer threw: boom` versus what a class component gets — which is
prose in a CLI message, not a value.

## Decision

**`not-probeable` carries a cause and the failures it saw.**

```ts
type NotProbeable = {
  outcome: "not-probeable"
  cause: "not-callable" | "threw"
  reason: string
  failures: readonly ProbeFailure[]
}
```

- **`not-callable`** — nothing was called. Not a function, or a class component.
  `failures` is empty because there is nothing to report.
- **`threw`** — the component was called under every configuration its schema
  closes over and threw under all of them, and `failures` carries each one.

The line is *whether the probe got as far as calling the component*, which is
the only thing it can always know. All four probes share the shape, because all
four already built the same verdict from the same two branches.

**`throwsOnDeclaredProps` becomes complete.** Every primitive that threw on a
configuration its own schema accepts is in it, including one that threw under
all of them — which is what its name and its doc comment have said since 0075.
Each entry carries `everyConfiguration`, and that flag is where the honesty is:

- **`false`** — some configurations rendered and this one threw. The component
  is callable and a value its own schema accepts crashes it. **Certain.**
- **`true`** — nothing answered. A broken component and a hook-using one look
  identical from outside a renderer, so the audit is reporting rather than
  concluding.

**The audit does not guess which.** A hook-using primitive lands in the
`everyConfiguration: true` half beside a genuinely broken one, and this record
says so rather than leaving it to be discovered. Both are functions, both throw,
and the error React raises for a hook outside a render is a message rather than
a type. A host with no hook-using primitives — which is every host the starter
library and the scaffold produce — asserts the whole list empty. A host that
ships them asserts the `false` half and reads the rest.

**The scaffold asserts it.** `loom init` already generated assertions for
`notDecorated` and `notProbeable` and not for the list that stops a page rather
than a portal. It now generates all three, with a comment saying how to narrow
the third if a hook-using primitive is added.

## Consequences

- **The 24 August finding is closed.** `loom.exploding` now appears in
  `throwsOnDeclaredProps` with `everyConfiguration: true`, and the generated
  host test fails on it.
- **A new assertion in every scaffolded host**, and a stronger one than the two
  it joins: `notDecorated` costs a portal handle and `throwsOnDeclaredProps`
  costs the page.
- **The prose improves where it was actively wrong.** A component that throws
  unconditionally was described as *"calling it outside a renderer threw"*,
  which blames the probe's context for a component that would throw anywhere.
  It now reads *"threw under every configuration probed"* and names each one,
  matching what `describePlacement` already did for a partial failure.
- **The starter library is unchanged.** It has no unprobeable primitives, so
  `throwsOnDeclaredProps` stays empty and no existing host assertion moves.
- **`ThrowingConfigurations` grew a field**, so a host destructuring it
  exhaustively needs updating. Pre-production, and the alternative was a second
  parallel list.
- **0012 and 0075 both stand.** `not-probeable` is still a third answer and not
  a failure; a throwing configuration is still excluded from the verdict. This
  refines what the declining verdict *carries*, and supersedes neither.

## Alternatives considered

**Record throwing configurations regardless, and say nothing more** — the
finding's first suggestion, taken literally. Rejected as written, and adopted
with the flag. Without `everyConfiguration`, a hook-using primitive enters
`throwsOnDeclaredProps` indistinguishably from a broken one, and the list stops
being assertable for exactly the reason `notProbeable` is not — which would move
the problem rather than fix it.

**Discriminate the `not-probeable` reason and leave `throwsOnDeclaredProps`
alone** — the finding's second suggestion. Rejected as insufficient on its own:
it puts the cause in the right place but leaves the fault named by the wrong
list, so a host still asserts on `notProbeable` and still tolerates whatever
else is in it. The cause is adopted; the list is fixed too.

**Match React's invalid-hook-call error to identify hook-using components.**
Rejected. It would make the audit's answer depend on the wording of another
library's error message, which changes between versions and between development
and production builds, and it would fail closed in the dangerous direction — a
reworded message turns a hook-using primitive into a reported fault, and a
component that throws that string turns a real fault into a pass.

**Let the author declare it — a `usesHooks: true` on `definePrimitive`.**
Rejected. 0075 rejected a declared `leaf: true` because a declaration is a second
copy of a fact that lives in the component; this is worse, because the copy is
the thing that *silences* the audit. An author who reaches for it to quiet a
failing check has turned the check off, and nothing says so.

**Render with `react-dom/server` inside the probe.** This would settle it — a
hook-using component renders and a broken one throws — and it is the same
upgrade 0012 named as the honest path if the false negative bit. Still rejected,
and still for 0012's reason: it makes the SDK depend on a DOM renderer to
answer a question a flag answers well enough. Recorded again because this is the
second finding it would have closed, and a third should probably tip it.
