# Publishing the framework

**`@loom/runtime` is the only thing this repository publishes.** The marketing
site, the documentation, the lessons, the demonstration and the portal are one
deployed application and are not packages; the starter primitive library is a
package and is not this one
([0194](../decisions/0194-the-framework-is-the-package-and-everything-that-uses-it-ships-separately.md)).

## Before the first publish, and only you can do these

Two things this repository cannot contain and no routine can do:

1. **Own the `@loom` scope on npm.** As of 26 September 2026 the scope holds no
   published package and `@loom/runtime` is unregistered, which means it is
   *available* rather than *yours*. Publishing into a scope requires the npm org
   or user of that name. If `@loom` cannot be had, the fallback costs one field:
   set `name` to `loom-runtime`, which is also unregistered, and change nothing
   else — every entry point is a subpath and none of them names the scope.
2. **Provide a credential.** There is none in this repository and none in the
   routines' container. For a local publish, `npm login` once. For a publish
   from a cloud session, add `NPM_TOKEN` in the environment's settings — the
   cloud environment menu in the session title bar, then Edit, under API
   credentials where that section is offered and otherwise as an environment
   variable — and a new session picks it up. Never paste a token into a chat, a
   commit, a report or a pull request.

## The publish

From a clean checkout of `main`, with `pnpm install` done:

```bash
pnpm verify                      # the gate: build, typecheck, 3000+ tests, four surfaces
pnpm pack --pack-destination /tmp # what would go out, without going out
pnpm publish --access public     # the irreversible line
```

`prepack` runs `pnpm build`, so a tarball can never carry a stale `dist` — but
`pnpm verify` is still the gate, because `prepack` does not run the tests.

`pnpm publish` refuses a dirty tree and a branch behind its remote by default.
Leave those checks on. If one fires, the tree is telling you something.

## What goes out, and how to see it before it does

`pnpm pack` writes the exact tarball. Three things are worth looking at:

```bash
tar tzf loom-runtime-<version>.tgz | grep primitives   # only dist/testing/primitives.*
tar xzOf loom-runtime-<version>.tgz package/package.json | grep -A20 '"exports"'
```

- **`dist/primitives/` is not in it.** `files` carries `"!dist/primitives"`,
  which is the only thing keeping it back — `publishConfig` cannot exclude
  files, only rewrite fields, and that was measured rather than assumed.
- **The published `exports` has fifteen subpaths and not `./primitives`.** That
  comes from `publishConfig.exports`, which pnpm applies at publish time. The
  manifest in the repository keeps `./primitives` because five surfaces in
  `apps/loom` import it.
- **`dist/testing/primitives.*` is in it and belongs there.** It is the testing
  fixture, not the starter library — the same word, two different files.

`tools/publish/manifest.test.ts` holds all of that as assertions and runs in
`pnpm verify`, including the drift that is otherwise invisible: a subpath added
to `exports` and forgotten in `publishConfig.exports` ships as a subpath
consumers cannot import.

## Proving it works before believing it

The tarball loading in this repository proves nothing — the workspace resolves
everything. Install it somewhere that resolves nothing:

```bash
mkdir /tmp/cleanroom && cd /tmp/cleanroom
npm init -y && npm pkg set type=module
npm install /path/to/loom-runtime-<version>.tgz
node -e "import('@loom/runtime').then(m => console.log(typeof m.createTree))"   # function
node -e "import('@loom/runtime/primitives').catch(e => console.log(e.code))"    # ERR_PACKAGE_PATH_NOT_EXPORTED
npx loom --help
```

Run on 26 September against `0.1.0`: all fifteen entry points load with their
optional peers installed; nine of them load with **no** peers at all; `./sdk`
and `./testing` need `react`; `./testing/contracts` loads only inside a `vitest`
run, by design; `npx loom init` scaffolds a working registry.

## Versions

`0.1.0` is the first public number. Pre-1.0 is the signal that nothing is
stable, which is what the README has said since the beginning — there is no need
for an `alpha` dist-tag on top of it, and a package whose only version is behind
a tag is a package nobody installs by accident *or* on purpose.

A published version is permanent. npm allows unpublishing for 72 hours and
discourages it; after that the only remedies are `npm deprecate` and a new
number. Everything above exists so the first number does not need either.

## What is not set up, deliberately

There is no `.github/workflows` in this repository and this adds none. A publish
is a person deciding to publish; wiring it to a branch push means the credential
lives in the repository's secrets and every merge is one misconfiguration away
from a release. When that changes, it is a decision worth recording rather than
a file worth adding quietly.
