# 0063. A declared string travels with the primitive; a dictionary is what a host adds

**Status:** Accepted — partially supersedes 0060
**Date:** 2026-08-17
**Section:** §4f → §3

## Context

[0060](0060-a-primitive-owns-a-string-and-a-deployment-may-replace-it.md) decided
that a primitive declares the strings it owns and a deployment may replace them.
Two of its clauses say what a primitive receives:

> **3.** `loom.text` is always present and always complete. Every declared key is
> there, carrying the host's translation where there is one and the declared
> string where there is not. A primitive reads `loom.text.excluded` and gets a
> string — never `undefined` …

> **4.** A registry is a `TextResolver` over its own declarations. **So a
> deployment that translates nothing is correct with no wiring** …

The implementation did not do that. `RenderOptions.text` was optional, and its
absence meant every primitive received `NO_TEXT` — including the strings it had
declared itself. A deployment that translated nothing was correct only if it
remembered to wire its registry into a second option whose name says
*translation*, and 0060's own Consequences recorded the gap as an accepted cost:

> **Wiring is a choice, and a wrong one is quiet.** A render given no
> `TextResolver` hands every primitive an empty map, including its own declared
> strings. That mirrors `themes` and `data` …

The cost came due the day after. The primitives routine adopted the seam, filed
a finding on 16 August, and it had cost a red test to notice: a suite that had
been passing `resolver`, `validator` and `themes` since long before text existed
rendered `loom.perk`'s marker with no accessible name, and nothing said so. Two
of the framework's own consumers were wired the same way at the time this record
was written — the demo at `apps/portal/app/demo` and the portal's tree view —
and neither had done anything wrong by the shape of the API.

The mirror with `themes` and `data` is what made it look safe, and it is the
wrong mirror. A tree that names a theme and a tree that binds data both **say so
in the tree**, so the renderer can see the mismatch and reports it —
`theme-unregistered`, `data-unresolved`. Nothing in a tree says a primitive
declares strings. That knowledge lives only in the registry, so an unwired text
option is the one absence in the render options the renderer cannot detect and
cannot report. Silence is not a diagnostic that was left out; it is the only
outcome available.

The deeper reason is about ownership. `themes` and `data` are things a
**deployment has** — a palette set, a set of backends — and a deployment that has
none is a real, common, correct state. Declared strings are not something a
deployment has. They are part of the primitive, like its markup: they arrive with
the component, in the same package, from the same author. There is no deployment
that wants a marker glyph read out as nothing, so the absence of the option had
no meaning worth preserving.

## Decision

**The renderer reads declared strings off the resolver. `RenderOptions.text` is
the host's dictionary laid over them, and never the source of the declarations
themselves.**

1. **Declarations come from `resolver`.** When the resolver satisfies
   `TextResolver`, the renderer reads it for the strings each primitive declared.
   A registry built by §4's SDK satisfies it, which is 0060's clause 4 — now with
   nothing to remember.

2. **The test is exact, not a heuristic.** The only way to declare text is
   `definePrimitive`, and the only thing that carries a declaration to the
   renderer is `createPrimitiveRegistry`, whose result is a `TextResolver`. A
   resolver that is not one — `staticPrimitiveResolver` over a map of components,
   or a host's own — has no declarations to lose. "Does this resolver satisfy
   `TextResolver`" and "is there anything declared here" are the same question.

3. **`options.text` overlays, key by key.** A key it answers is the host's; a key
   it does not answer keeps its declared string. So a dictionary covering half
   the library, or built over a different one, is a partial translation rather
   than an accessible name that disappeared. `textResolverFor` already answers
   for every key of its own registry, so for the ordinary case the overlay
   changes nothing.

4. **The merge is memoised per type, per render.** One merge for a page with
   fifty markers, in a cache that lives for the length of the call — 0060's
   clause 5, held. When only one of the two halves is in play, which is almost
   always, there is no merge at all and the resolver is used directly.

5. **No wiring suppresses a declared string.** There is no option to leave out
   and no resolver to pass that produces a control with no name. That failure was
   reachable by omission and now is not reachable at all.

6. **Still no diagnostic.** 0060 rejected a diagnostic per untranslated node as
   noise, and that reasoning is untouched — with declarations always underneath,
   there is no longer a case where one would have said anything true.

This record takes over exactly one bullet of 0060's Consequences — *"Wiring is a
choice, and a wrong one is quiet"* — and nothing else. Every clause of 0060's
Decision stands; two of them are true now that were not before.

## Consequences

- **A deployment serving the library's own language wires nothing.** `resolver`,
  and whatever else it needs. That is what clause 4 promised.
- **The demo and the portal's tree view became correct without being edited.**
  Neither wires `text`; both now render declared strings. That is the shape of
  the fix working — the surfaces that were wrong were wrong by omission, so
  nothing had to change for them to be right.
- **`RenderOptions.text` now means one thing.** It was "the strings, and also the
  translation of them"; it is now "the translation". The name matches what it
  does, and a host reading the option list can tell what leaving it out means.
- **A host resolver may answer for part of the library.** It could not before —
  answering for one primitive meant blanking every other one's declarations — so
  a host with its own translation layer had to cover everything or nothing.
- **The renderer now asks a question about its resolver's shape.** One
  structural test, at the start of a render, on an interface the framework
  defines. It is the first place the render seam looks at what a resolver *is*
  rather than what it answers, and clause 2 is why that is sound rather than
  convenient.
- **A dictionary is still not pinned by a revision.** Unchanged from 0060, and
  the answer is still 0058's: decide it when a review needs it.

## Alternatives considered

- **Leave it, and make it loud** — the second option the finding offered:
  `auditRegistry` knows which primitives declare text, so a host could assert
  that its render is wired for them. It moves the failure from silent to
  assertable, which is better, but it still requires a host to know the trap
  exists and to write a test against it. The library's declared strings grow with
  every disclosure control and dismiss button in the remaining Hermes blocks, and
  a trap that is documented is still a trap. Rejected as a fix; still worth
  having as an audit, and nothing here forecloses it.
- **Make `text` required, with an explicit sentinel for "none".** It makes the
  omission impossible rather than harmless, which is stronger. Rejected because
  the sentinel would be a supported way to render a control with no accessible
  name — the failure the seam exists to prevent, promoted to API — and because it
  breaks every existing caller to protect against a mistake that is now
  unreachable anyway.
- **A diagnostic when the wired resolver leaves a declared key unanswered.**
  Symmetric with `props-undeclared`, and it was drafted before being cut. With
  clause 3 in place a partial answer is no longer a fault: a host covering half
  the library is a legitimate composition, and a diagnostic on every node of the
  other half is exactly the noise 0060 refused. What is left that a diagnostic
  could report is a wiring that is now correct.
- **Merge the two interfaces** — let `PrimitiveResolver` carry declared text, so
  there is one seam instead of two. It collapses the case 0060's clause 7 exists
  for: a host serving several languages would have to register its library once
  per language, because the language would be a property of the resolver.
- **Carry declarations on the component**, as a static property `definePrimitive`
  attaches, so the renderer reads them from the thing it already resolved. It
  means writing to a component the caller owns and keeps a reference to, which
  `definePrimitive` deliberately avoids for the declared strings themselves — and
  the wrapper that would avoid the mutation defeats the conformance probe, which
  0060 already rejected for the same reason.
