# 2026-08-09 (day 44) — the portal's components, rendered for the first time

**Build order section:** §5 — Loom Portal. The open item day 26 raised and the
last three runs kept re-raising: the portal has 41 components and no way to test
one.

**Branch:** `day-44-portal-render-harness`, off `day-43-naming-a-revision`.
**PR:** against `day-43-naming-a-revision`, so the diff is this unit alone.

---

## Where this run started

Second run of 9 August; day 43 was twelve hours ago. Eleven PRs open, all mine,
and **still no maintainer feedback** — I checked #60's comments and its review
threads, and every human-looking comment on it is my own report comment or
Vercel's deploy bot. The last genuine human comment remains *"tell me more about
item number 2"* on #45, answered on 4 August. So nothing to act on before
continuing.

Day 43's report ended with a recommendation, and it was the third run in a row to
end with a heading reading "not verified in a browser". That is what this run
built. Its named §5 gaps are closed; this is the one that was blocking confident
work on the rest.

## What was built

### The gap, stated exactly

The portal had 328 tests before this run and not one of them rendered anything.
All of them were `.test.ts` files over pure functions in `lib/`: what a URL
parses to, what a page of the log resolves to, what a credit says. Every `.tsx`
file in the app was covered by the type checker, by `next build` compiling it,
and by somebody looking at a deployment.

That was tolerable while components were layout. It stopped being tolerable at
day 26, when `RevisionRow` began rendering a fact about accountability — 0029
says a revision with no `answeredBy` cannot distinguish "nobody had to approve
this" from "a host approved it and named nobody", so the row must say nothing.
Whether it *does* say nothing was a claim about a document, held in JSX, that
nothing could check.

### The failure that shaped the design

The first attempt did not produce a passing test. It produced this:

```
Error: It looks like you're running in a browser-like environment.
  ❯ new Anthropic … lib/interpreter.ts:46
  ❯ lib/write.ts:5
```

Rendering one revision row reached `UndoButton`, a client component, which
imports `undoRevision` from a `"use server"` module, which imports the write
path, which constructs an Anthropic client — which refused, correctly, because a
key does not belong in a browser.

Under Next that import chain does not exist. The bundler replaces every
`"use server"` module in the client graph with opaque references and the
implementation stays on the server. Vitest performs no such substitution, so the
test had assembled a module graph the framework would never assemble, and the SDK
was the only thing in the room that noticed.

**That is not a test problem to work around.** It is jsdom telling the truth
about what had been dragged across a boundary, and the harness is shaped by it.

### The harness

**A filename says which kind of test this is.** Two Vitest projects. `.test.ts`
runs in Node with no DOM — that is where the pure logic and the Postgres
contract tests already live, and a synthetic document in front of a store test is
scenery nothing reads. `.test.tsx` runs in jsdom with Testing Library, cleanup
between tests, and the substitution below. Choosing per file with a docblock
would work and would be forgotten; the extension already carries the
information. Same reasoning as 0015 — a filename is a type.

**A `"use server"` module is replaced by handles, wherever it appears in a render
graph.** A Vite transform detects the module's own directive and emits one export
per value export. No test names an action to mock, because the boundary is not a
fact about any one test: a rule every author has to remember is a rule one of
them will forget, and forgetting this one means a DOM test importing the server
without saying so.

**The handle throws when called, naming itself.** A render test that reaches a
server action has found a defect — work happening in the browser that the server
was supposed to do — and a stub answering `undefined` would let that pass as an
action that happened to return nothing.

So what a render test proves is that a component is wired to the action it should
be wired to, and what it cannot prove is what the action then does. That is the
right split: action behaviour is server behaviour and is tested where it runs.

**Nothing starts a browser, and `pnpm verify` still runs offline with no key.**

### What is now actually held down

Three components, chosen because they are the ones the last two runs shipped
without ever rendering:

| component | what a test can now say |
| --- | --- |
| `RevisionLink` | the href carries an encoded tree, the anchor, and a fragment matching the row id; **revision 0 renders unlinked**, because no entry produces it |
| `RevisionRow` | the row carries the id a credit's link points at; it marks itself only when anchored; **it says nothing about approval when the revision does not know** (0029); it falls back to origin rather than naming nobody; one described operation per operation; undo names the revision the row shows |
| `RevisionBox` | it is a GET to `/history`; it echoes what was typed; and **it submits exactly `tree` and `at` and no cursor** |

That last one is the reason the harness was worth building this run rather than
next. Day 43's report called the dropped cursor "the one part of the change that
would have shipped broken without thinking about it" — `historyRead` resolves a
cursor ahead of an anchor, so a form carrying `older` through would name a
revision the read then ignores, and the box would silently do nothing from the
second page onward. It was argued for in a comment and asserted nowhere. It is
asserted now, against the rendered form.

### The wiring is under test too

Two suites is two ways to be configured wrong.
`test/server-action-boundary.test.tsx` imports the portal's *real* action modules
and asserts they arrived as handles. If the transform ever stops being applied to
the render project, that file fails — rather than the write path silently loading
into jsdom and something unrelated failing strangely later.

The extractor underneath it is a pure function with its own `.test.ts`: it finds
`export const` and `export function`, ignores `export type` and `export
interface`, is not fooled by the directive appearing inside a string, and does
look past leading comments.

## Decisions I made that were not specified

**Testing Library over a browser, for now.** Playwright is the honest answer to
"not verified in a browser" and the wrong first step — it needs a built app, a
database, a browser binary and a server to hold still, in a project whose testing
policy is that every session can run the suite offline with no key. It is still
worth having as a thin smoke test over two or three flows, beside `pnpm verify`
rather than inside it. Recorded as a rejected alternative in 0046 so the next
session does not have to re-derive it.

**No snapshots.** Cheap coverage of all 41 components, and it records what
changed rather than what is true. An updated snapshot is not a review, and
"allowed by nobody" would be approved into the file the day someone regenerated
it.

**No `@testing-library/jest-dom`.** `expect(el.getAttribute("href")).toBe(…)`
says exactly what it checks, and the boundary layer is the last place to add a
dependency for ergonomics. Easy to revisit.

**Framework primitives are used, not stubbed.** `next/link` and `next/form` both
render in jsdom without a router, which I checked before designing around it —
so the tests assert against the real `<a href>` and the real `<form method>`
rather than against a stand-in I wrote. The only thing stubbed is the thing the
framework itself stubs.

**Async server components are out of scope of this seam**, and pages stay
unrendered. What pages compose is now testable, which is where the logic should
live anyway.

## Decision records

**Added 0046 — "A render test crosses no boundary the framework would not."**
Index rebuilt with `pnpm decisions:index`.

It earns a record on three of the four criteria: it fixes a contract other
components have to satisfy (**a component that cannot render without a live
database is a component that needs its data as props**), it decides what a test
may claim about AI-authored change and what it may not, and it rules out
Playwright-in-`verify`, snapshots, and per-file `vi.mock` — all approaches a
reasonable engineer would reach for first.

**None superseded, nothing contradicted.** 0015, 0029 and 0032 all hold; this
builds on them. No escalation: `LoomTree`, the delta model,
`TREE_SCHEMA_VERSION` and every store contract are untouched, and apart from the
record and this report the run changes no file outside `apps/portal`.

## Test coverage and status

`pnpm verify` green end to end: build, typecheck, both suites, portal build.

- **Runtime: 993 tests / 78 files**, all passing, **nothing skipped** —
  unchanged, as expected for a run that touched no runtime file.
- **Portal: 359 tests / 33 files**, up from 328 / 28. **Thirty-one new tests
  across five new files** — the first `.test.tsx` files in the repository. Split
  by suite: **node 338 / 29**, **dom 21 / 4**.
- **Both live API tests ran and passed** against `claude-opus-5`
  (`DEFAULT_INTERPRETER_MODEL`, unchanged), via `LOOM_ANTHROPIC_API_KEY`.
  Nothing in this unit calls a model; they ran because a key was present.

New files: `test/server-action-stub.ts` (+ `.test.ts`, 10 tests),
`test/server-action-boundary.test.tsx` (2), `test/dom-setup.ts`,
`app/_components/revision-link.test.tsx` (3),
`app/history/_components/revision-box.test.tsx` (6),
`app/history/_components/revision-row.test.tsx` (10).

**Nothing weakened. Nothing skipped.** No component was changed to make it
testable — all three rendered as written, which is a fact about how they were
already built rather than luck.

### What is still not verified in a browser

Honestly: less than before, and not nothing. The tests assert the DOM a component
produces. They do not assert that Next's client-side navigation actually fires on
that form, that the CSS resolves to something legible, or that the box sits
sensibly beside the header. The Vercel preview remains the way to check those,
and it is still worth thirty seconds on `/history`.

## Open questions and blockers for the next session

1. **§5's blocking gap is closed; 38 of 41 components are still unrendered by
   any test.** The harness exists and the pattern is set, so covering the rest is
   ordinary work rather than a unit of its own. **Recommendation for next run:
   pick up §6 or §5's next feature and cover components as they are touched**,
   rather than spending a run bulk-writing tests for components nobody is
   changing. Say the word if you would rather I did a sweep.
2. **Playwright smoke test, beside `verify` and not inside it.** Two or three
   flows: sign in, propose a change, open `/history` at a revision.
   **Recommendation: worth one run, but after something in §6** — the value is
   real and the maintenance cost lands on every future session, so not while
   there are cheaper gaps.
3. **Lesson 07 (#58) still documents behaviour #59 changes.** Unchanged for a
   third day: **land #58 before #59**, then let the lessons routine correct
   lesson 07 as it corrected lesson 04 in #49.
4. **Eleven PRs open, build stack nine deep** — #49, #50 → #51 → #53 → #54 →
   #56 → #57 → #59 → #60 → this one, and #52 → #55 → #58. `main` last moved on
   5 August. **Recommendation: land #50**, the bottom of the build stack; #49 is
   independent and also ready. This is the fourth run raising it and the stack
   grows by one every twelve hours.
5. **Still nothing scheduled** — telemetry prune (day 34) and snapshot audit
   (day 28). **Recommendation: one nightly Vercel cron covering both**, once you
   are happy with the 90-day default. Unanswered across ten runs.
6. **Carried, still yours — sign-in lockout history** (option B, #45/#50).
   **Recommendation: not yet**; a governance call about retaining failed attempts
   against a public form.
7. **ARCHITECTURAL, from day 35, still yours: should a tree carry the ids it has
   retired?** Unchanged. **Recommendation: not yet.**
8. **Carried, unchanged:** a contained emit failure is invisible by design
   (day 39); a sink can still block (day 39); telemetry written before day 37
   keeps `interpreter-unavailable` on failures that were really rejections; RLS
   fails closed for a non-owner role (day 34, by design); a missed `db:push` is
   still a sign-in outage (day 32); `policyId` is a name rather than a fingerprint
   (day 31); calibration does not segment by policy (day 31); and the reply schema
   sits near its 3500-byte guard.

**§7 — Marketplace — remains the only section I will not start without you saying
so.** Sections 1–6 are functional end to end; what is left in each is the list
above.
