# 0046. A render test crosses no boundary the framework would not

**Status:** Accepted
**Date:** 2026-08-09
**Section:** §5

## Context

The portal has had tests since it had pages, and until this run not one of them
rendered anything. All 328 were `.test.ts` files over pure functions in `lib/`:
what a URL parses to, what a page of the log resolves to, what a credit says.
Every `.tsx` file in the app — 41 of them — was covered by the type checker, by
`next build` compiling it, and by somebody looking at a deployment.

Day 26 named the gap when a component first rendered a fact about
accountability: `RevisionRow` shows `answeredBy`, and whether it shows it at all
is a decision 0029 argued about, held in JSX no test could reach. Two of the
three runs since have ended with a section headed "not verified in a browser".
The type checker cannot tell you that a form submits the fields the reader
resolves, or that a link's fragment matches the id of the row it should land on,
or that a component says nothing when 0029 requires silence. Those are claims
about a document, and only a document can answer them.

Rendering a component in a test is not, however, free of consequence. The first
attempt proved it in the loudest available way. Rendering one revision row
reached `UndoButton`, a client component, which imports `undoRevision` from a
`"use server"` module, which imports the write path, which constructs an
Anthropic client — which refused to be constructed, because it had detected a
browser-like environment and a key does not belong in one. Under Next that
import chain does not exist: the bundler replaces every `"use server"` module in
the client graph with opaque references, and the implementation stays on the
server. Vitest performs no such substitution, so the test had quietly assembled
a module graph the framework would never assemble, and the SDK was the only
thing that noticed.

## Decision

**The render harness reproduces the framework's client/server split, at the same
seam and by the same signal, and a render test proves only what a document can
prove.**

Three parts.

**A filename says which kind of test this is.** The portal's Vitest config
defines two projects. `.test.ts` runs in Node with no DOM — that is where the
pure logic and the Postgres contract tests already live, and a synthetic
document in front of a store test is scenery nothing reads. `.test.tsx` runs in
jsdom with Testing Library, cleanup between tests, and the substitution below.
Selecting per file with a docblock would work and would be forgotten; the
extension already carries the information. Same reasoning as 0015 — a filename
is a type.

**A `"use server"` module is replaced by handles, wherever it appears in a
render graph.** A Vite transform detects the module's own directive and emits one
export per value export, each throwing when called and naming itself. No test
declares which action to stub, because the boundary is not a fact about any one
test: a rule every author has to remember is a rule one of them will forget, and
forgetting this one means a DOM test importing the server without saying so.

**The handle throws; it does not resolve.** A render test that reaches a server
action has found a defect — work happening in the browser that the server was to
do — and a stub answering `undefined` would let it pass as an action that
happened to return nothing.

The consequence for what a test may claim is the point rather than a cost. A
render test proves a component is wired to the action it should be wired to, and
proves nothing about what the action does. Action behaviour is server behaviour,
tested where it runs.

**No browser is started, and `pnpm verify` still runs offline with no key.**

## Consequences

- Component behaviour is now assertable, and three components that shipped
  unrendered are covered: the revision link's rule that revision 0 is not a
  destination, the row's silence when 0029 requires it, and the box's dropped
  cursor — the invariant day 43's report called the one thing that would have
  shipped broken.
- **A component that cannot render without a live database is a component that
  needs its data as props.** The harness makes that pressure real rather than
  advisory. This is a constraint on how portal components are written, and it
  points the same way SRP already did.
- Async server components and anything requiring a router or a request context
  are outside this seam. Pages remain unrendered by tests; what they compose is
  now testable, which is where the logic should be anyway.
- Two suites means two ways to be configured wrong, so the wiring is itself
  under test: `server-action-boundary.test.tsx` imports the portal's real action
  modules and asserts they arrived as handles. If the transform ever stops being
  applied to the render project, that file fails rather than the write path
  silently loading into jsdom.
- jsdom, `@testing-library/react` and `@testing-library/dom` are dev
  dependencies of `@loom/portal` only. The runtime package is untouched.

## Alternatives considered

**Playwright against a running portal.** The honest answer to "not verified in a
browser", and the wrong first step. It needs a built app, a database, a browser
binary and a server to hold still — which makes the suite depend on the network
and on state, in a project whose testing policy is that every session can run it
offline with no key. A browser test would also fail for a dozen reasons before
it failed for the one being tested. It is still worth having eventually, as a
thin smoke test over a couple of flows, and it belongs beside `pnpm verify`
rather than inside it.

**One jsdom environment for the whole portal suite.** One line instead of a
projects config. It also puts a document in front of every store and Postgres
test, slows the suite for no benefit, and — the reason it is actually wrong —
would have hidden the failure that produced this record. The Anthropic client
refuses in a browser-like environment; had the store tests already been running
in one, that refusal would have surfaced somewhere unrelated long before anyone
was rendering a component.

**`vi.mock` on the action module, per test file.** Standard, and the option most
reasonable engineers would reach for. Rejected because it makes the boundary a
convention: the first component whose author does not know about it imports the
server graph into jsdom, and it either works by luck or breaks somewhere far
from the cause. The framework does not ask a component to opt into the boundary,
and neither should the harness.

**Snapshot tests over the rendered output.** Cheap coverage of all 41
components, and it records what changed rather than what is true. An updated
snapshot is not a review, and "allowed by nobody" would be approved into the
file the day someone regenerated it.

**`@testing-library/jest-dom` matchers.** Nicer assertions, another dependency
in the boundary layer, and `expect(el.getAttribute("href")).toBe(…)` says
exactly what it checks. Not now; not a difficult decision to revisit.
