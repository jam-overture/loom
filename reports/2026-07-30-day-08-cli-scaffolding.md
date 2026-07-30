# 2026-07-30 (day 8) — CLI scaffolding, and §4 closed

**Build order section:** §4 — Framework SDK (CLI scaffolding). §4 is now complete.

**Visual:** [2026-07-30-day-08-cli-scaffolding.svg](2026-07-30-day-08-cli-scaffolding.svg)

**Branch:** `day-08-cli-scaffolding`, off `main` at `2c5cf64`

---

## Review feedback

You approved 0014 in the previous run and merged it (#11), and merged #10 before
that. Nothing outstanding. One question you asked mid-run is answered below under
**The grammar budget question**, with a one-line code change.

---

## What was completed

**`loom init` and `loom add primitive`.** §4's other half, so §4 is closed:

```
loom init [--dir <directory>]
loom add primitive <type> [--dir <directory>]
```

`init` writes three files into `<directory>/primitives/`: a starter primitive, a
generated registry, and a **conformance test that actually runs `auditRegistry`**.
That last one is the point. 0012 decided the audit reports rather than enforces,
which means a deployment only benefits if something runs it — and a host is far
likelier to keep a test that was there from the first commit than to add one
later. `add primitive` declares one more and regenerates the registry.

**The pipeline is parse → plan → write, and nothing is written until the whole
plan is known to be safe.** A command that would clash with an existing file
reports it before the first write, so a refused command leaves the directory
exactly as it was. That property has its own test.

**The registry is generated from the directory** (0015). A primitive's module is
named after its type verbatim — `commerce.product-card.ts`, dots included —
because that is what lets the type be recovered exactly. A slug reads better and
cannot round-trip: nothing can tell whether `commerce-product-card` was
`commerce.product-card` or `commerce-product.card`.

**Two type names are reserved.** `registry` and `registry.test` are both valid
primitive types, so a primitive named either one would be written over the file
that registers it. The CLI refuses them at parse time, and a test asserts every
reserved name is one the tree schema would otherwise accept — an entry that does
not need reserving is a mistake worth catching.

---

## The strongest thing in this run: the scaffold is proven, not asserted

A scaffolder that emits code which does not compile is worse than no scaffolder,
and string assertions (`expect(generated).toContain("definePrimitive")`) only
prove the template says what I intended.

So **`loom init`'s exact output is committed** at `src/cli/scaffold-fixture/`, and
two pieces of machinery that already existed do the rest:

- `tsc` typechecks it along with the rest of `src/`, against the real
  `@loom/runtime/react` and `@loom/runtime/sdk` entry points.
- Vitest **runs the generated conformance test** — it appears in our own suite as
  `src/cli/scaffold-fixture/registry.test.ts (2 tests)`.

So "the scaffold compiles, and the audit it ships passes" is enforced on every
`pnpm verify` rather than claimed in a report. A golden test asserts the fixture
is byte-identical to what `planCommand` produces today, so a template edit that
does not regenerate the fixture fails immediately.

This caught nothing on the way in — the templates were right — but it is the
difference between believing that and knowing it.

---

## A flaw a test caught

I wrote a test asserting that `loom add primitive Loom.Card` reports the bad type
without reading the directory. It failed: `runCli` listed the directory first, so
a typo surfaced only after the filesystem cooperated, and on an unreadable
directory it would have been reported as a permissions problem.

The test was right, and the fix was a seam, not a reorder: whether a type is
well-formed is a property of the string and of nothing else, so that validation
moved into `args.ts`. `plan.ts` now holds only the checks that genuinely need the
listing — already-declared, and would-overwrite. Parsing answers "is this a
well-formed request"; planning answers "does it fit this directory".

---

## The grammar budget question

You asked whether the schema limit was about performance at scale. It is not our
scale and not our limit: the service compiles the schema into a grammar for
constrained decoding and refuses one that is too large, per request, as a 400.
Our traffic, tree sizes, and registry size do not move it.

Checking the current API documentation turned up one genuinely scale-relevant
fact, though, and in our favour: a schema is compiled once and the compilation
cached for about a day, keyed by the schema. Byte-identical output across every
deployment pays that cost once; a per-deployment or per-request schema would pay
it every time. That is a second argument against 0013's rejected alternative of
generating a schema per primitive, so it is now recorded in `schema.ts` beside the
budget guard, as its own commit. The docs publish the schema *shape* limits (no
recursion, closed objects) and **no size ceiling at all**, which confirms 0014's
4 kB boundary is empirical and is why the live test remains the authority.

---

## Decisions I made that weren't specified

1. **The generated registry throws on a refused registration** rather than
   exporting something unbuilt. Registration is fallible; a generated file that
   ignored the `Result` would teach the opposite of what the contract wants.

2. **`add primitive` does not rewrite the conformance test.** `init` owns it. A
   host that has customised it should not lose that on every addition.

3. **`init` refuses if *any* of its three files exist**, including the registry it
   otherwise owns. Re-running it over a populated directory would discard every
   registration but the starter.

4. **The starter primitive declares `z.object({}).strict()`.** Strict is the
   better default to teach: it means an AI-authored prop the author never declared
   is refused at the render seam rather than silently ignored.

5. **The filesystem seam has exactly two operations**, and a missing directory
   lists as empty rather than failing — "nothing here yet" is the ordinary case
   for `init`, not an error. Failures are injectable in the test double, because
   "wrote one file, then the disk refused" is a path the CLI must report honestly
   and no real filesystem produces on demand.

6. **Argument parsing is hand-written.** For two commands and one option, a parser
   is smaller than the configuration a parser library would need, and it stays
   pure so the grammar is asserted directly.

7. **No model work, so no model id decision.** The CLI does not call a model; the
   interpreter default is unchanged.

---

## Decision records

| #    | Title                                                                          | Status   |
| ---- | ------------------------------------------------------------------------------ | -------- |
| 0015 | The registry is generated from the directory, and a module's name is its type   | Accepted |

Nothing superseded, no `Accepted` record contradicted. **No ARCHITECTURAL
escalation** — the CLI reads the tree schema's type validator and writes files;
it touches neither the tree schema nor the delta model. The only changes to
existing files are `package.json` (a `./cli` entry point), the READMEs, the
decisions index, and one comment in `schema.ts`.

---

## Test coverage / status

```
Test files  46 passed
Tests       423 passed | 0 skipped
```

`pnpm verify` green, live smoke test included and passing. **45 new tests**
across five files, plus the two generated tests that now run in our suite.

What the new tests pin down:

- every spelling of help, the directory default, `--dir` before or after the
  command, and `--dir` with nothing (or another flag) after it
- a stray positional argument is refused rather than ignored — silently dropping
  one is how someone loses a typo'd type name
- a bad type and a reserved type are both refused before any directory is read
- `init` plans exactly three files, honours `--dir`, and refuses if any of them
  exists
- `add primitive` regenerates the registry from the **whole** directory, not just
  the new primitive, sorted for a stable diff
- a dotted type round-trips exactly through its filename; the generated modules
  and non-primitive files are skipped when recovering the directory's contents
- **a refused plan writes nothing at all**, and a write that fails mid-plan is
  reported with the path it stopped at
- the emitted primitive satisfies the contract it scaffolds (declares props
  strictly, spreads `loom.editable`, names a description and slots) and carries no
  placeholder that must be resolved before it compiles
- the generated registry handles the `Result` and never exports an unbuilt registry
- the committed fixture is byte-identical to what `init` writes today

---

## Open questions for the next session

1. **The `loom` executable needs a build step.** Node's type stripping will not
   resolve this repo's `.js` import specifiers to `.ts` sources — verified, not
   assumed — so there is no working `loom` binary today. The scaffolding logic is
   complete and tested as library code (`runCli` from `@loom/runtime/cli`, with
   `src/cli/main.ts` as the entry). Two ways to close it: a compile step (which
   the package has never had, and which would also change what the published
   entry points point at), or a TypeScript loader as a dev dependency. **This is
   the one thing I would ask you to pick**, since it is a packaging decision
   rather than a design one — my recommendation is in the PR comment.

2. **§5, the Portal, is next** on the build order, and it inherits two things
   already recorded: nearest-decorated-ancestor addressing (0010), and undecorated
   primitives as a supported condition to degrade over (0012). It can also read
   the same `PrimitiveCatalogue` for an insert menu (0013).

3. **The schema is at 3381 of a 3500 guard.** Unchanged by this run and still the
   nearest cliff: anything that adds a field to an operation trips it.

4. **One live call is still thin evidence** for how often a real model emits an
   unparseable prop bag — the failure 0014 accepted. A §6 telemetry question.

5. **Node-level provenance.** (Carried from day 1.) Still unforced.
