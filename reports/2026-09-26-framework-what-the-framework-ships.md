# What the framework ships — `@loom/runtime` made publishable, and the four things kept out of it

**Routine:** `Loom daily build` (framework, `src/` except `src/primitives/`, and the application shell)
**Date:** 2026-09-26
**Section:** §1 (process), §4 (SDK)
**Branch:** `framework-55-what-the-framework-ships` — branched off `main`; this lane had no open pull request
**Record added:** [0194](../decisions/0194-the-framework-is-the-package-and-everything-that-uses-it-ships-separately.md)

> **No screenshot.** The procedure asks for a visual and this change has no
> surface: it is a manifest, a licence, a runbook and a test. The clean-room
> transcript below is the artefact, and it is the one a reader should check.

## What this is

Not the scheduled unit. The maintainer's instruction on 26 September is that the
framework goes to npm as a public package by the morning of the 27th, without
the marketing site, the documentation, the starter primitive library, the
demonstration or the portal. This is that, and **it is ready rather than
published** — the one step left needs a credential this container does not have
and must not have.

## The state it is in

```
$ pnpm pack
504K, 399 files, maps: 0, dist/primitives: 0

$ npm install loom-runtime-0.1.0.tgz   # in an empty directory, npm not pnpm
$ node -e "import('@loom/runtime').then(m => console.log(typeof m.createTree))"
function
$ node -e "import('@loom/runtime/primitives').catch(e => console.log(e.code))"
ERR_PACKAGE_PATH_NOT_EXPORTED
$ npx loom --help
loom — scaffolding for the Loom primitive registry
```

Everything below was measured in a directory that resolves nothing, because a
tarball that loads inside this workspace proves nothing at all.

| | |
| --- | --- |
| published entry points that load, all optional peers installed | **15 of 15** |
| that load with **no** peers installed | 9 — `./sdk` and `./testing` need `react`, the postgres three need `drizzle-orm`, `./anthropic` needs the SDK |
| `./testing/contracts` | loads inside a `vitest` run, which is the only place it can; proved with a real test |
| `npx loom init` from the tarball | writes a primitive, a registry and a conformance test |
| `dist/primitives/` in the tarball | **none** |
| `dist/testing/primitives.*` in the tarball | **yes, and it belongs** — the testing fixture, a different file with the same word |

## The thing I found last and would have wanted to know first

**`jam-overture/loom` is a private repository.** I checked because a question
about source maps depended on it, and it has two consequences for a *public*
package that are worth more than the question that found them.

**One is cosmetic and is the npm page.** `repository`, `homepage` and `bugs` all
point at `github.com/jam-overture/loom`, which 404s for everyone who is not in
the organisation. The registry page will show a Repository link that goes
nowhere and an Issues link where nobody can file anything — so a package
inviting people to try it gives them no way to report what happens when they
do. I have left the fields pointing there, because the alternative is removing
them, and a package with nowhere to send a reader is worse than one whose link
is currently private. **It is the third thing on the list for the morning and
the only one I have not solved.**

**One I acted on.** `dist` carried 396 `.map` files — 42% of the unpacked
package — naming `../src/*.ts`, with no `sourcesContent`. With the source in a
private repository there is nothing for a consumer to resolve them against: a
debugger asks for a file that is not in the tarball and never will be, and
falls back. They also print the source layout of a private repository for no
benefit. The build still emits them, because the workspace wants them; the
tarball does not carry them.

```
before   644K, 795 files
after    504K, 399 files, maps: 0
```

One line to reverse (`"!dist/**/*.map"` in `files`) if the source ever ships,
which is a decision about the repository rather than about this manifest.

**And one thing that came out clean and is worth saying.** The tarball was
searched for absolute container paths, API keys, tokens and connection strings:
none. There is no `process.env` anywhere in `dist` at all — the runtime takes
its configuration as arguments, which is a property worth having on the day the
package stops being ours alone.

## The one decision that needed making

`src/primitives/` was a published subpath of the same package. Five surfaces in
`apps/loom` import `@loom/runtime/primitives`, the documentation quotes it, the
README documented it. It is also a product rather than plumbing, and the
instruction is that it ships separately.

**Two manifests that differ in one stated way**, which is what 0194 records:

- **`files: ["dist", "!dist/primitives"]`** keeps the compiled library out of
  the tarball. It is the only thing that can. I tried `publishConfig.files`
  first and **measured it being ignored** — the field is not one of the ones
  pnpm overrides, and the directory shipped. `publishConfig.exports` *is*
  applied, which is the other half.
- **`publishConfig.exports`** is the repository's map minus `./primitives`. The
  workspace still advertises the subpath its five surfaces import; the registry
  does not.

**`tools/publish/manifest.ts` holds the difference as data** and refuses the
three ways it rots. Two are opposites — code packed with no subpath to import
it, and a subpath whose file the tarball leaves out — and the third is the one
this seam exists to create: a subpath added to `exports` and forgotten in
`publishConfig.exports`. None of the three is visible from inside this
repository, where both manifests tell the truth.

## Decisions taken that were not specified

**MIT, in a `LICENSE` file.** There was none. A public package without one
grants nobody the right to use it, which is worse than any particular choice.
It is one file to change and **it is the first thing to confirm** before the
publish command runs.

**`0.1.0`, to `latest`, with no pre-release tag.** Pre-1.0 is the instability
signal and the README has said *nothing here is stable yet* from the start. A
package whose only version sits behind an `alpha` tag is one nobody installs by
accident or on purpose.

**`engines: { node: ">=22" }`** — what is verified here, not what might work.
Loosening it is a line once somebody runs the suite on Node 20.

**No publish workflow.** There is no `.github/` in this repository and this adds
none. A credential in repository secrets makes every merge one misconfiguration
away from a release; a publish should be a person deciding to publish.

**The starter library is withheld, not moved.** The honest end state is
`packages/primitives/` as its own package, and 0194 says so. Doing it tonight
means moving 131 files in another lane, twelve import sites across five
surfaces, the generated API reference, the compiled documentation fences and the
lesson transcripts — a migration whose failure mode is a red build for four
lanes, the night before a release. Withholding a subpath is one line to reverse.
A move is not.

## What I tried, broke, and reverted

Adding `"./package.json": "./package.json"` to the export map — the ordinary
courtesy that lets tooling read a dependency's manifest, and a real papercut for
`require.resolve`. It turned **two `(docs)` tests red**:
`entry-points.test.ts` and `api/extract.test.ts` both assert that the documented
doors are exactly what `exports` names.

I reverted it rather than edit another lane's files on the eve of a release. It
is purely additive, breaks nobody whenever it lands, and now has to land in both
lanes at once. Filed.

The same two tests turned up something worth more than the papercut: **they are
green and checking the wrong map.** They read `exports`, which is the
workspace's sixteen; the published map is `publishConfig.exports`, which is
fifteen. The sixteenth door is one a consumer does not have.

## Records added or superseded

- **[0194](../decisions/0194-the-framework-is-the-package-and-everything-that-uses-it-ships-separately.md)** — *The framework is the package, and everything that uses it ships separately.* `Accepted`. Nothing superseded. It was the next free number on `main` and on the one open branch (#400) when written; `pnpm decisions:index` regenerated.

## Findings filed

- *the starter library is withheld from the published package and has no package of its own* — for `Loom primitives`, with the end state, the reason it was not attempted here, and the one measurement worth having first: **nothing in `src/` outside `src/primitives/` imports it**, so the split is a move rather than an untangling.
- *the documentation tells a reader to import a subpath the published package does not have* — for `Loom docs`, with the five places it is said, the two tests reading the wrong map, and the reverted `./package.json` export. **This is the sharpest cost of 0194 and a stranger pays it**: the site is deployed continuously and the publish is tomorrow, so there will be a window where the documentation names a subpath the registry does not have. I do not think it is a reason to hold the publish; it is my lane's change making a problem in theirs, and they should hear it from me.

## Test numbers

`pnpm install && pnpm verify` — **green, exit 0**.

| | files | tests |
| --- | --- | --- |
| `@loom/runtime` (`src/`, `tools/`) | 162 | **3145** |
| `@loom/app` (`apps/loom/`) | 315 | **6103** |

New this run: **15** in `tools/publish/manifest.test.ts`. Nothing skipped,
weakened or marked pending. `pnpm prerender:check` passes with `112 prerendered
pages, 3 metadata conventions, 0 unserved`.

**An intermediate state was red and is reported as red**: the `./package.json`
export above failed two `(docs)` tests. The tree is green with it reverted.

**What the tests do not cover:** the publish itself. No test in this repository
installs the tarball in a clean directory — that was done by hand, four times,
and the recipe is in `docs/publishing.md` so the next release is not the first
time anyone runs it. Automating it means a test that runs `npm install` against
a registry-shaped path inside the merge gate four surfaces share, and that is a
decision rather than a line.

## The two things only the maintainer can do

1. **Own the `@loom` scope.** As of today the scope holds no published package
   and `@loom/runtime` is unregistered — *available*, which is not *yours*.
   Publishing into a scope needs the npm org or user of that name. If it cannot
   be had, the fallback is one field: `name: "loom-runtime"`, also unregistered,
   and nothing else changes, because every entry point is a subpath.
2. **Provide the credential.** There is none here, by design. `npm login` for a
   local publish; for a publish from a cloud session, `NPM_TOKEN` goes in the
   environment's settings and a new session picks it up. Never in a commit, a
   report or a pull request.

Then, from a clean `main`: `pnpm verify && pnpm pack && pnpm publish --access public`.

## Open questions

1. **MIT, and the copyright line reads `jam-overture`.** Both are mine to
   propose and yours to decide, and they are the only things in this change that
   cannot be altered after the fact by a patch release.
2. **Do you want to press publish, or should a routine?** I have prepared for
   the first. The second needs the token in this environment, which is a
   standing capability rather than a one-off, and worth deciding on its own.
3. **The docs window.** Tomorrow the site documents a subpath the registry will
   not have. Holding the publish until `(docs)` catches up is available and I do
   not recommend it.
