# Publishing

`docs/rollout.md` Phase 2 names publishing as *"npm, a version number that means
something, and a public commitment about what may break."* This is that, for
`@loom/primitives`, written so it can be done from a standing start.

**Nothing here publishes anything.** `pnpm package:primitives` assembles the
package and prints what is ready; the last step is a person typing one line.

## What ships, and what does not

Two packages, from one repository, deliberately separate.

| | what it is | who owns getting it out |
| --- | --- | --- |
| `@loom/runtime` | the tree, the delta model, the Gate, the render seam, the data seam, the SDK | `Loom daily build` |
| `@loom/primitives` | the 98 registered primitives and the 44 starting compositions | `Loom primitives` |

**Not published, and not intended to be:** the marketing site, the
documentation site, the demo, the portal and the lessons. They are `@loom/app`,
they are `private: true`, and they are a deployment rather than a dependency.

`@loom/primitives` takes the runtime as a **peer** dependency. There must be
exactly one copy of it in a host's tree — two would be two `PrimitiveType`
brands and a registry that refuses its own entries — and a peer dependency is
how a package says that.

## Before the first publish — four things, three of them nobody here can do

1. **A licence.** There is no `LICENSE` at the repository root.
   `docs/rollout.md` names this as the maintainer's decision and says it *"gates
   whether the repository can be public at all"*, which understates it for npm:
   a published package with no licence is a package nobody may legally use, and
   npm will show it as UNLICENSED. Put an SPDX identifier on the first line
   (`MIT`) so the generated manifest can read it; anything else and the manifest
   says `SEE LICENSE IN LICENSE`, which is correct but tells a reader nothing.
   **`pnpm package:primitives` exits non-zero until this exists.**
2. **The `@loom` scope, owned by the publishing account.** Both
   `@loom/runtime` and `@loom/primitives` were unregistered when this was
   written, so the names are available — but a scope belongs to an npm user or
   org, and a scoped package's first publish needs `--access public` or npm
   treats it as private and refuses on a free account. The manifest sets
   `publishConfig.access` so the flag cannot be forgotten.
3. **npm auth on whatever machine publishes.** `npm whoami` must answer. A cloud
   routine session is not logged in and should not be: publishing is a
   deliberate act by a person, and a token that can publish is a token worth
   protecting more carefully than a routine's environment protects anything.
4. **The runtime goes out first, at a version the primitives' peer range
   accepts.** This is not a preference, it is `npm install` refusing to
   resolve — measured, not assumed:

   ```
   npm error code ERESOLVE
   npm error Found: @loom/runtime@0.0.1
   npm error Could not resolve dependency:
   npm error peer @loom/runtime@"~0.1.0" from @loom/primitives@0.1.0
   ```

   The root `package.json` is at `0.0.1` and `@loom/primitives` is built at
   `0.1.0`. **One of the two has to move**, and the recommendation is that both
   go out at `0.1.0` together: it is the first release either has had, `0.0.1`
   reads as a placeholder because it is one, and the two are compiled against
   each other. The runtime's version is `Loom daily build`'s file to change.

## The order

```bash
pnpm install && pnpm verify        # the merge gate, green, before anything
pnpm build                         # dist/ — package:primitives reads it and will not make it

# 1. the runtime
npm publish --access public        # from the repository root, once `private: true` is lifted

# 2. the primitives
pnpm package:primitives            # assembles packages/primitives, prints readiness
cd packages/primitives
npm pack --dry-run                 # read the file list before it is permanent
npm publish --access public
```

`npm publish` cannot be undone. `npm unpublish` is allowed within 72 hours and
only when nothing depends on the package, and a republished version number is
refused forever after — so **`npm pack --dry-run` and reading the list is the
step to not skip.**

## What the version means

Pre-1.0, the two packages move as a pair and the peer range is `~`, deliberately
narrow. A minor release may break: what breaks, when it does, is a prop or a
region on a primitive. The four operations and the shape of a tree are the
runtime's promise rather than the library's.

That promise is worth making explicit before 1.0 rather than after, and it is
not made here — this file records what the packages currently claim, and the
claim is `README.md`'s to state.

## What is in the package

620 files: every primitive and every composition, as `.js` with a `.d.ts`
beside it. No tests, no specimens — `tsconfig.build.json` has excluded both from
the build since September, so they never reach `dist/` to be copied.

**No source maps.** `tsc` emits them beside every file and they name their
sources as `../../src/primitives/…`, a path that exists in this repository and
in no published package. A map whose sources are not shipped is broken rather
than degraded, so `pnpm package:primitives` drops the maps and the
`sourceMappingURL` comments that name them. The doc comments — which is where
this library's documentation actually lives — are in the declaration files and
are shipped. Shipping sources as well is an additive change if somebody wants
the jump-to-definition back.

## How it is verified

The thing that cannot be checked from inside this repository is whether the
published package resolves in somebody else's `node_modules`, because every
import in `src/primitives/**` resolves perfectly well here by relative path. The
published files have to say `@loom/runtime` instead.

`tools/package/` holds that rewrite and `package.test.ts` holds it to the
runtime's own `exports` field, so a runtime that stops exporting one of the
three entry points fails the gate here rather than in a host's install. The
end-to-end check is a real install and is worth re-running before any publish
that changes the shape of the package:

```bash
npm pack --pack-destination /tmp/smoke                      # the runtime
cd packages/primitives && npm pack --pack-destination /tmp/smoke
cd /tmp/smoke && npm install ./loom-runtime-*.tgz ./loom-primitives-*.tgz react react-dom
node -e 'import("@loom/primitives").then((m) => console.log(m.STARTER_PRIMITIVES.length))'
```

Done on 26 September against both tarballs: **98 primitives, 44 compositions, a
22-part page sequence, a hero band rendered to 48KB of markup, zero
diagnostics, and no literal colour below the root** — the re-theme guarantee
holding in a package installed from a tarball by a project that is not this one.
