# 0028. The package ships compiled output

**Status:** Accepted
**Date:** 2026-08-02
**Section:** §4 → §5

## Context

`@loom/runtime` has always been consumed as TypeScript source. Its entry points
pointed at `src/*.ts`, its `bin` at `src/cli/main.ts`, and every consumer was
responsible for compiling it.

That decision was never made. It was the absence of one, deferred on day 8 and
carried for five sessions, and it has broken something in three of them:

- **Day 8** — Node's `--experimental-strip-types` will not resolve a `.js`
  specifier to a `.ts` source, so there was no runnable `loom` binary at all. Worked
  around with a `tsx` shebang.
- **Day 11** — `next build` failed with 35 "export doesn't exist" errors while
  typecheck was green and every test passed, because a bundler resolved
  `./audit.js` literally and the re-export chains came back empty. Worked around
  with `extensionAlias` and a `--webpack` pin.
- **Day 12 onward** — that pin sat in the production build path, so every
  deployment depended on a workaround holding.

The diagnosis that mattered was getting the cause the right way round. The `.js`
specifiers were never the problem. **They are correct** — they are exactly what
Node's ESM resolution requires, and what `moduleResolution: "NodeNext"` emits.
The problem was shipping source that had not become `.js` yet, so a convention
written for compiled output was being handed to tools asked to resolve it against
TypeScript files.

That reframing is what makes this a build-configuration change rather than a
refactor: **not one of the 659 relative specifiers in `src/` needed editing.**

## Decision

**The package compiles to `dist/` and every entry point resolves there.**
`tsconfig.build.json` emits with `module: "NodeNext"`, declarations, declaration
maps and source maps. `bin` points at `dist/cli/main.js` with a `node` shebang.

Two consequences worth stating as rules rather than leaving implicit:

**Build order is declared where it is depended on.** `apps/portal`'s `build` and
`typecheck` scripts each begin `pnpm --filter @loom/runtime build`. The obvious
alternative — a root `prepare` script — was tried first and **does not run** under
pnpm 10 on `pnpm install`, which was discovered by checking a clean clone rather
than by trusting the lifecycle. A build that silently does not happen is worse
than one that is written down, because the failure surfaces as a missing module
in an unrelated place.

**`src/` stays the thing the tests run against.** Vitest resolves relative
specifiers itself, so the suite continues to exercise source, not output. Testing
`dist/` would test the compiler; testing `src/` and shipping `dist/` is only sound
because a smoke check loads the compiled output under plain Node — which is now
part of the verification, not an assumption.

## Consequences

- **Three workarounds are deleted, not one.** `next.config.ts` is empty:
  `transpilePackages`, `extensionAlias` and the `--webpack` pin all existed to
  consume source. The portal builds on **Turbopack**, which it could never do
  before.
- **`dist/` is gitignored and built on demand.** It is not committed, so a clean
  clone has no `dist` until something builds it — which is why the ordering above
  had to be explicit and had to be tested from a fresh clone.
- The `tsx` dependency remains, for `pnpm loom` in development and for the
  `db:push` script. It is no longer load-bearing for anything shipped.
- `files: ["dist"]` and the `types` conditions in `exports` make the package
  publishable in the ordinary way, which it was not before. Nothing publishes it
  yet.
- `src/testing/**` and the CLI's scaffold fixture are excluded from the build.
  They are test infrastructure and a committed artefact; shipping them would put
  fixtures in the public surface.
- **Builds cost about ten seconds more.** `tsc` runs before the portal's
  typecheck and before its build. Acceptable, and the alternative was a bundler
  pin in production.

## Alternatives considered

**Keep shipping source, keep the workarounds.** Rejected on evidence rather than
taste: three sessions, three failures, and the last one sat in the deployment
path. A workaround that has broken twice is a decision that has not been made.

**Rewrite the 659 `.js` specifiers to be extensionless.** This is the fix that
looks obvious and is backwards. Extensionless relative imports are what a bundler
wants and what Node's ESM loader refuses, so it would trade a build-time problem
for a runtime one, and it would touch every file in `src/`.

**A bundler — tsup, esbuild, rollup.** Faster, and rejected as unnecessary. There
is nothing to bundle: the package is ESM, its dependency is Zod, and its
consumers do their own bundling. `tsc` emits declarations and maps without a
second tool to configure and keep aligned with `tsconfig.json`.

**A root `prepare` script.** The idiomatic answer, and it does not work under
pnpm 10 — verified, not assumed. Left out rather than left in as a hopeful
no-op.
