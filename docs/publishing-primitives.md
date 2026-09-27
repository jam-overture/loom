# Publishing the starter library

`docs/rollout.md` Phase 2 names publishing as *"npm, a version number that means
something, and a public commitment about what may break."* This is that, for
`@jam-overture/loom-primitives`, written so it can be done from a standing start.

**Nothing here publishes anything.** `pnpm package:primitives` assembles the
package and prints what is ready; the last step is a person typing one line.

## Where this sits

`@jam-overture/loom` went to npm on 27 September, and
[0194](../decisions/0194-the-framework-is-the-package-and-everything-that-uses-it-ships-separately.md)
**withholds `./primitives` from it**: fifteen subpaths publish, the starter
library does not, and `@jam-overture/loom/primitives` is
`ERR_PACKAGE_PATH_NOT_EXPORTED` for everybody outside this workspace. That
record names the gap in its own consequences — *"the starter library needs a
package of its own, and does not have one"* — and this is that package.

`docs/publishing.md` is the framework's. This is the library's, and the two
differ in one structural way worth stating: **the framework publishes itself,
and the library has to be assembled.** `src/primitives/**` imports the runtime
by relative path, which resolves inside one compiled tree and nowhere else, so
something has to rewrite `../sdk/definition.js` into
`@jam-overture/loom/sdk` before it can go out. `tools/package/` is that, and
`pnpm package:primitives` runs it.

0194's Alternatives considered weighed moving `src/primitives/` into
`packages/primitives/` outright and rejected it for this release: *"it moves 131
files in another routine's lane, rewrites twelve import sites across five
surfaces, the generated API reference, the compiled documentation fences and the
lesson transcripts."* Assembling the package from `dist/` buys the same
published result without any of that — the source does not move, the five
surfaces keep importing what they import, and the rewrite happens once, at
package time, under test.

**Not published, and not intended to be:** the marketing site, the
documentation, the lessons, the demonstration and the portal. They are
`@loom/app`, they are `private: true`, and they are a deployment rather than a
package.

`@jam-overture/loom-primitives` takes the framework as a **peer** dependency.
There must be exactly one copy of it in a host's tree — two would be two
`PrimitiveType` brands and a registry that refuses its own entries — and a peer
dependency is how a package says that.

## What is left

`pnpm package:primitives` goes and looks rather than listing preconditions from
memory, so the table it prints is the current answer. As of 27 September:

| | |
| --- | --- |
| license | **ready** — MIT, read from the framework's own manifest so the two cannot disagree |
| the peer | **ready** — `@jam-overture/loom@0.1.0` is on the registry and satisfies `~0.1.0` |
| npm auth | **blocked** — this machine is not logged in, and publishing is a person's act |

The command exits non-zero while anything is blocked and withholds the publish
line, so it cannot be pasted out of a table that is not ready.

**Chain it with `&&`, which is why the block above is written that way.** On
27 September the maintainer ran the same steps as separate lines. The table
printed `BLOCKED npm auth` and the command exited 1 — correctly — and the next
line ran anyway, because a shell does not care what the previous line returned.
`npm publish` then failed with:

```
npm error 404 Not Found - PUT https://registry.npmjs.org/@jam-overture%2floom-primitives
npm error 404  The requested resource could not be found or you do not have permission to access it.
```

**That 404 is npm's answer to an unauthorized *create*.** It is not 403 and it
does not say "log in", because the registry will not leak whether a name
exists to somebody who may not have it. `npm whoami` returned `E401`: the
machine was not logged in at all. A gate whose verdict nothing reads is not a
gate, and the fix is one `&&` per line.

## The order

```bash
pnpm install && pnpm verify &&
pnpm build &&
pnpm package:primitives &&
cd packages/primitives &&
npm pack --dry-run                 # read the file list, then:
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
published files have to say `@jam-overture/loom` instead.

`tools/package/` holds that rewrite and `package.test.ts` holds it to the
runtime's own `exports` field, so a runtime that stops exporting one of the
three entry points fails the gate here rather than in a host's install. The
end-to-end check is a real install and is worth re-running before any publish
that changes the shape of the package:

```bash
cd packages/primitives && npm pack --pack-destination /tmp/smoke
cd /tmp/smoke && npm install ./jam-overture-loom-primitives-*.tgz react react-dom
node -e 'import("@jam-overture/loom-primitives").then((m) => console.log(m.STARTER_PRIMITIVES.length))'
```

Done on 26 September against both tarballs: **98 primitives, 44 compositions, a
22-part page sequence, a hero band rendered to 48KB of markup, zero
diagnostics, and no literal colour below the root** — the re-theme guarantee
holding in a package installed from a tarball by a project that is not this one.
