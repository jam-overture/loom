# Publishing the framework

**`@jam-overture/loom` is the only thing this repository publishes.** The marketing
site, the documentation, the lessons, the demonstration and the portal are one
deployed application and are not packages; the starter primitive library is a
package and is not this one
([0194](../decisions/0194-the-framework-is-the-package-and-everything-that-uses-it-ships-separately.md)).

## Before the first publish, and only you can do these

Two things this repository cannot contain and no routine can do:

1. **Own the scope.** This publishes as `@jam-overture/loom` — the org is the
   house, the product keeps its name. `@loom` was tried first and could not be
   had: npm orgs and users share one namespace, so a scope with nothing
   published under it is still not a free one, and `loom` and `loomjs` are both
   held by users. Searching the registry for packages under a scope tells you
   nothing about whether you can have it. The only reliable check is the org
   creation form at `npmjs.com/org/create` — there is **no** `npm org create`
   subcommand, and reaching for one returns a usage error that reads like an
   availability answer and is not one.

   **Changing the name later is not one field.** `publishConfig` can rewrite
   `exports` and cannot rewrite `name`, so the published name is the workspace
   name and every import site moves with it — 466 files for this rename, 409 of
   them in `apps/loom`. The `reports/` and `decisions/` that name the old scope
   are deliberately **not** rewritten: they are the record of what was true on
   the day, and `pnpm verify` does not read them.
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
tar tzf jam-overture-loom-<version>.tgz | grep primitives   # only dist/testing/primitives.*
tar xzOf jam-overture-loom-<version>.tgz package/package.json | grep -A20 '"exports"'
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
- **No `.map` files.** The build emits them and the workspace wants them; the
  tarball does not carry them, because they name `../src/*.ts` and carry no
  `sourcesContent`. From a consumer's `node_modules/@jam-overture/loom/dist/`
  that path resolves to `node_modules/@jam-overture/src/*.ts`, which does not
  exist and never will — so they were 396 files and 42% of the package
  resolving to nothing.

  **A public repository does not change this**, and an earlier draft of this
  section implied it did. The maps carry no source text and the relative path
  is wrong wherever the package is installed; whether the source is readable on
  GitHub is irrelevant to a debugger resolving a path inside `node_modules`.
  Two things would make them useful, and both are a decision about the build
  rather than about the repository:

  - `"inlineSources": true` in `tsconfig.build.json`, which puts the source
    text inside each map. Self-contained, works for every consumer, and the
    ordinary answer. It makes the maps larger.
  - shipping `src/` in the tarball beside `dist/`, so `../src/*.ts` resolves.

  Either one is paired with dropping `"!dist/**/*.map"` from `files`. Doing
  only the drop ships 396 files that still resolve to nothing.

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
npm install /path/to/jam-overture-loom-<version>.tgz
node -e "import('@jam-overture/loom').then(m => console.log(typeof m.createTree))"   # function
node -e "import('@jam-overture/loom/primitives').catch(e => console.log(e.code))"    # ERR_PACKAGE_PATH_NOT_EXPORTED
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
