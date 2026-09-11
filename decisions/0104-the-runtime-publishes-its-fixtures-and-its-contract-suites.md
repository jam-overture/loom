# 0104. The runtime publishes its fixtures and its contract suites

**Status:** Accepted
**Date:** 2026-09-02
**Section:** §1, §2, §6

## Context

`src/testing/` holds the fixtures this package tests itself with: `sampleTree()`
and `formTree()`, scripted interpreters and clocks, a primitive registry, canned
model replies, and three suites — `describeTreeStoreContract`,
`describeHoldStoreContract`, `describeTelemetryJournalContract` — that assert the
promises a store, a hold store and a telemetry journal make.

None of it was reachable from outside the repository. `tsconfig.build.json`
excluded `src/testing/**`, so `dist/testing/` did not exist and no entry point
could have named it. That was correct while the only consumer was this package's
own suite.

Three consumers outside it now exist, and each one arrived at the same wall.

- **The course.** `./testing/fixtures.js` is the single most-imported specifier
  in the sixteen written lessons — seventeen fences, more than `./ids.js` and
  more than `./tree/delta.js` — because `sampleTree()` is the tree every lesson
  reasons about. `Loom lessons` built a runner that executes every Try it section
  and asked, on 28 August, for the fixtures to be published so the same runner
  could work in a reader's browser. It named this record's three lines exactly.
- **A host implementing a store.** Loom ships an in-memory `TreeStore` and a
  Postgres one and invites a third. The promises that make one correct — an
  append is ordered, a hold is exclusive, a journal is append-only — are not in
  the type, and a host discovering them from a production incident is a seam
  offered without the thing that makes it safe to take.
- **A host writing a primitive**, who wants a registry to register it in and a
  tree to render it against.

The alternative every one of them faces is to reimplement the fixture, which is
the worst outcome available and the reason `Loom lessons` refused to do it: a
`sampleTree` that agrees with the lesson and disagrees with Loom.

## Decision

**`src/testing/` is built and published, behind two entry points.**

| entry point | holds | needs |
| --- | --- | --- |
| `@loom/runtime/testing` | fixtures, doubles, test primitives and definitions, canned model replies, the episode harness, the in-memory filesystem | nothing a consumer of the runtime does not already have |
| `@loom/runtime/testing/contracts` | the three `describe*Contract` suites, their fixtures, and `rowSecurityOn` | `vitest`, and for the Postgres suites `drizzle-orm` |

**Two entry points rather than one, because of what the first one must not
reach.** The contract suites *are* `describe` blocks — that is what makes them
runnable against a host's own implementation rather than a description of what to
write — so they import `vitest`, and `vitest` throws on import outside a test run
by design. A test framework anywhere in the fixtures' import graph would reach
every consumer of `sampleTree()`, including the in-page runner the course wants,
which has no business loading a test runner to draw a tree in a browser.
`vitest` is therefore an **optional peer dependency**: required of anyone
importing the contracts, absent and unmissed for everyone else.

**Each entry point names its exports one module at a time.** A published entry
point is API — `sampleTree`'s shape becomes something a host may depend on and
this package may not silently change — so a module added to `src/testing/`
is internal until a line in `index.ts` or `contracts.ts` says otherwise. This is
the opposite convention from `src/index.ts`, which re-exports whole modules,
and deliberately: that file's directories were designed as public surface and
this one's were designed as scaffolding.

**What holds it.** `surface.test.ts` walks the import graph from each entry point
and fails if `vitest` is reachable from the fixtures, if it is *not* reachable
from the contracts, or if the fixtures reach a package the manifest does not
declare. `dist.smoke.test.ts` loads `dist/testing/index.js` under plain Node the
way a consumer would, and checks the contracts' emitted module graph resolves —
it cannot import that one, for the reason above, which is itself the fact worth
asserting.

## Consequences

- The course's browser runner is unblocked. Building it is `Loom lessons`' work
  and this record does not do it; the third line of their ask — `zod` in
  `apps/loom`'s dependencies — is theirs to add when a fence needs it, and is
  not needed to import the fixtures, which resolve `zod` through the runtime.
- `sampleTree()`, `formTree()` and the three contract suites are now API. Their
  shapes change under the same rules as anything else published here.
- `dist` grows by the testing directory. It is small, it is tree-shakeable, and
  a consumer that imports neither entry point loads none of it.
- A host writing a store has a way to find out it is wrong before its users do.
- `row-security.ts` sits with the contracts rather than the fixtures because it
  asks a live Postgres about a table; `src/testing/*.test.ts` is still excluded
  from the build, so what is emitted is the fixtures and the suites and nothing
  that runs them.

## Alternatives considered

**One entry point.** Rejected: it puts `vitest` in `sampleTree`'s import graph,
which breaks the browser case that is half the reason for doing this at all, and
does so as a resolution failure in somebody else's bundler rather than here.

**Publishing only the fixtures, not the contract suites.** Tempting, because the
fixtures are the ask on record and the suites are the larger commitment. Rejected
because the suites are the more valuable half: a fixture saves a host some typing
and a contract suite tells it whether its store is correct. Withholding the
second while inviting a third store implementation is the part that would have
been hard to defend.

**Re-exporting the directory with `export *`.** Rejected: it makes every module
added to `src/testing/` public by accident, which is how a scaffolding directory
becomes API without anybody deciding to make it one.

**Leaving it, and letting each consumer copy the fixture.** Rejected on the
lessons lane's own reasoning: a copied `sampleTree` produces output that agrees
with the lesson and disagrees with Loom, which is worse than no lesson.
