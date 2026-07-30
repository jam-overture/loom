# 0018. The portal is a consumer, not an insider

**Status:** Accepted
**Date:** 2026-07-30
**Section:** §5

## Context

The portal needs to be an application — a Next.js app with Tailwind, routes and
a design system. `@loom/runtime` today is a pure library: `zod` as its only
dependency, React and the Anthropic SDK as optional peers. That was deliberate,
so a host bringing its own framework inherits nothing.

The portal also raises a question about what "built with our own framework" can
honestly mean. The appealing version — the portal's own editing UI is itself a
Loom tree — is not available, and it is worth writing down exactly why rather
than discovering it halfway through.

**A Loom tree cannot express the portal's chrome.** Props are `JsonValue`, so a
function is not a prop. The tree has no event model, no local state, no form
binding — by construction, because §1 made the tree data and 0008 made the
renderer a total pure projection of it. A prompt box, a diff view, an
approve/reject control and a history list are all interactivity. Self-hosting the
chrome would mean inventing an interactivity model in §5, which is a §1 schema
change, an escalation against 0001 and 0008, and a rewrite of the build order.

There is also a reason not to self-host the chrome that would survive even if the
schema allowed it: **the portal must keep working when the tree is broken.** If
the editing UI were itself a stored tree, a bad delta could break the only tool
that can repair the bad delta. Recovery tooling should not share a failure domain
with the thing it recovers.

## Decision

**The repo becomes a pnpm workspace. The portal is `apps/portal`, and it depends
on `@loom/runtime` as a workspace package — so it can only reach the published
entry points.**

The portal imports `@loom/runtime/store`, `/react`, `/sdk`. It cannot import
`../../src/store/store.js`. That is the whole point: **when the portal needs
something the public API does not expose, that is a framework gap to be fixed in
the framework, not a shortcut to be taken in the portal.**

That is also the honest form of the dogfooding claim, and it is a stronger one
than "we built our UI in it":

- The **preview pane is genuinely Loom** — the real tree, through `renderRequest`,
  with the real registry. Unavoidable, and the point.
- The **chrome is ordinary React**, for the reasons above.
- The **portal has no privileged access**, which is the part that actually proves
  something. A framework's first host discovers its missing pieces; a first host
  with private access discovers nothing.

## Consequences

- `@loom/runtime` keeps its dependency tree. Next and Tailwind live in
  `apps/portal` and never become something a host inherits.
- The dogfooding claim is enforced by resolution rather than discipline. A
  deep-import shortcut fails to resolve instead of passing review.
- The framework will grow entry points it did not know it needed, and that is the
  mechanism working, not scope creep. Each one is a real gap.
- Verification splits: `pnpm verify` must run across the workspace, so a portal
  that fails to typecheck fails the whole check. A portal that could be broken
  while the library was green would not be testing anything.
- The portal is not shipped as part of the package, so it can move faster than
  the library and take on dependencies the library would refuse.
- The still-deferred compile step (day 8) gets slightly more pressing, since a
  workspace consumer resolving `.ts` through package exports is exactly the
  arrangement that a published build would change.

## Alternatives considered

**Add Next and Tailwind to the root package.** Simplest, and rejected because it
puts a framework in the dependency tree of a framework-agnostic runtime. It also
destroys the enforcement: with one package, every deep import resolves, and
"the portal only uses public API" degrades to a promise nobody can check.

**Build the portal in a separate repository.** Genuinely enforces the consumer
relationship, and rejected for cost: a version bump between "the framework needs
an entry point" and "the portal can use it" would turn a five-minute discovery
into a release cycle. A workspace gives the same import discipline with none of
the latency.

**Self-host the chrome in Loom.** Rejected for the two reasons in Context — the
tree cannot express interactivity, and recovery tooling must not share a failure
domain with what it recovers. Recorded here rather than left implicit, because it
is the kind of appealing idea that gets proposed once a quarter forever.

**Take the design system from Hyperion wholesale.** Not a decision record's
business, but noted: the token approach there (CSS custom properties, mapped once
into semantic Tailwind utilities, never a raw hex in a component) is the same rule
`code-style.md` already imposes, so the tokens transfer and the components do not.
