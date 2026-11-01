# One version, one manifest

**Date:** 2026-11-01 · **Routine:** `Loom framework` (`Loom daily build`) ·
**Section:** §1 (process — publishing the primitive library) ·
**Branch:** `framework-76-one-version-one-manifest` · **PR:** #740

**Preview:**
`loom-git-framework-76-one-ve-1f77b0-jpizzolato36-6341s-projects.vercel.app`,
which Vercel reports `success`. Not opened from this run: `*.vercel.app` is
denied by the environment's network policy, filed on 27 September. It should be
byte-identical to `main` either way — nothing this branch touches is rendered,
and the only file outside `tools/` is a test.

## What was completed

The library's published version is no longer written down. It is read off the
framework's manifest, which is the only place a release moves it.

Yesterday's entry in [FINDINGS.md](../FINDINGS.md) was filed by this lane while
publishing `0.2.0`, and it is the kind of finding worth having: nothing was
broken, and the reason nothing was broken was that somebody moved three numbers
by hand correctly. `tools/package/manifest.ts` carried
`export const VERSION = "0.2.0"`, with `RUNTIME_RANGE` a template string over
it, and the two assertions guarding them read that same constant on both sides
— so they agreed with themselves whatever it said, and with the framework
never.

What a forgotten bump would eventually ship is worse than a stale sentence. The
lucky case is a collision the registry refuses. The unlucky one is a third bump
where the numbers differ and neither collides: a library at `0.2.0` declaring
`peerDependencies: { "@jam-overture/loom": "~0.1.0" }` while the framework is at
`0.3.0`, which resolves to nothing in a host's install and is exactly the
failure `docs/publishing-primitives.md` says the peer range exists to prevent.

So the copy is **deleted rather than tested**, which is what the entry asked
for and is the weaker-answer/stronger-answer distinction it drew:

| | before | after |
| --- | --- | --- |
| the library's version | `VERSION`, a literal | `versionOf(rootManifest)` |
| the peer range | `RUNTIME_RANGE`, from the literal | `runtimeRangeOf(version)` |
| the license | `licenseIdOf(rootManifest)` | unchanged |
| gathering them | inline in `assemble` | `manifestFacts(rootManifest, hasLicenseFile)` |

`manifest()` now takes a named `ManifestFacts` rather than a bare `license`
string. Named rather than positional because both fields are strings and a
swapped pair would compile, publish a package licensed `0.2.0` under the version
`MIT`, and fail nothing.

`licenseIdOf` moved from `build.ts` into `manifest.ts` so the two derivations
off the root manifest sit together. That move is the reason `manifestFacts`
could be pure, and the reason it could be pure is the reason it exists: the only
previous proof that the version reaching `manifest()` came off the framework's
manifest rather than from a literal was running the whole assembly, which needs
a compiled `dist/primitives` that this suite deliberately does not depend on.

## The picture

There is nothing to photograph — this is a build tool — so the evidence is what
the tool prints. The root manifest was moved to `0.3.0`, `pnpm
package:primitives` was run, and the root was put back:

```
$ pnpm package:primitives            # root manifest at 0.2.0
@jam-overture/loom-primitives@0.2.0 assembled — 772 files, 386 rewritten
  ready     the peer — @jam-overture/loom@0.2.0 is on the registry and satisfies ~0.2.0

$ pnpm package:primitives            # root manifest moved to 0.3.0, nothing else touched
@jam-overture/loom-primitives@0.3.0 assembled — 772 files, 386 rewritten
  BLOCKED   the peer — @jam-overture/loom@~0.3.0 is not on the registry. It is a
            peer dependency, so this package resolves to nothing without it —
            and it has to go out first
```

The generated `packages/primitives/package.json` carried
`"version": "0.3.0"` and `"@jam-overture/loom": "~0.3.0"`. **Before this change
that second run would have assembled `0.2.0` silently**, and the readiness table
would have reported the peer as ready, because it was — for the version the
library had stopped being at.

The `BLOCKED` line is the fix working twice over: it is correct, it is useful,
and it is the line a release would want to see before publishing the library
ahead of the runtime it declares.

## Decisions taken that were not specified

**`versionOf` throws rather than falling back.** `licenseIdOf` has an honest
fallback — `SEE LICENSE IN LICENSE` — and a version has none. The alternative
is worse than a crash: `JSON.stringify` drops an `undefined` field, so a
fallback writes a `package.json` with no `version` at all and moves the failure
to `npm publish`, past every gate in this repository. A build that stops at the
root manifest is the cheapest place for a broken repository to be noticed.

**No test asserts that the two versions agree**, because there are no longer two
versions to disagree. This is worth stating plainly because it looks like a
missing test: after the constant is gone, every assertion of the form *the
library's version is the framework's version* is circular — both sides read the
same file — and one was written and then deleted during this unit for exactly
that reason. What is held instead is that the fact is **derived**:
`manifestFacts` is handed a manifest that is not this repository's and the
version it carries has to come out, which no literal on the path can satisfy.
Checked by reintroducing a hardcoded `version: "0.2.0"` in `manifest()`, which
turns the suite red.

**The fixture version in `package.test.ts` is `9.9.9`.** Cases about `files` or
`publishConfig` have no business depending on what the repository is at, and a
fixture that looks like a real version is one somebody eventually asserts
against by accident — which is the class of mistake this file stopped making
today.

**`rootManifest()` is now one helper.** The test file read the root manifest at
four separate `new URL("../../package.json", …)` literals. Not in the finding's
scope, but it is the same read and it was in the file being edited.

## Records

**None, and deliberately.** A decision record is for something expensive to
reverse or that defines what Loom is. That the two packages move as a pair, and
that the library is not independently versioned until there is a reason for it
to be, is a real decision of that kind — and it was already made and already
written down, in `manifest.ts`'s own doc comment. This unit does not change it;
it stops the code from being able to contradict it. Reversing this is one
`const` away, and the `tools/` seam it touches is not the tree schema, the delta
model, or anything an Accepted record speaks to.

## Findings

**Closed:** the 2026-10-31 entry, *"the version is written in three places and
only one of them is held to anything, found by bumping it"* — closed by this
branch, with the original status kept beneath the new one.

**The third copy is left standing, and still needs its test, which it has.** The
installation page's callout is prose and cannot be derived, so
`absences.test.ts` holding it to `publishedVersion()` is the right answer and is
why the `0.2.0` release did not ship a stale page. One sentence there became
*more* true today rather than less: `publishedVersion()`'s doc comment calls the
root manifest *"the one manifest that sets it"*, which the finding correctly
noted was false for the library. It is now true. Left unedited — it needs no
change, and `apps/loom/app/(docs)/` is `Loom docs`' lane.

**Filed:** one, and it is this lane's own.
`docs/publishing-primitives.md` says the package is *"620 files"*; the command
that assembles it prints `772 files, 386 rewritten`, and `dist/primitives` holds
193 `.js`, 193 `.d.ts` and 386 maps. Noticed while running the tool for this
unit rather than looked for. The entry deliberately does not say which number is
right — 386 is every module as `.js` with a `.d.ts`, 772 is what the command
scans, and which of those a reader wants is a documentation judgement, not a
defect. Filed rather than fixed here: a release-safety change is the wrong place
to bury it, and guessing the intended number is what filing it avoids.

## The cross-lane edit, and why

One file outside this lane changed, and it had to:
`apps/loom/app/(marketing)/_lib/facts.test.ts` imports `manifest` to read the
package's `name`, and `manifest`'s parameter changed shape. The call is now
`manifest({ license: "UNSET", version: "UNSET" })`, and the sentence above it
that explained the placeholder — *"`license` is a parameter of that manifest and
nothing here asks about it"* — now names both parameters. Nothing that test
asserts has moved.

**It is worth saying how this was found, because the first `pnpm verify` of this
unit was red and reported green.** The sweep for call sites was run against
`tools/` only, on the assumption that a build tool's manifest has build-tool
callers. It does not: `(marketing)` reads it to hold a page's list of published
package names against the file that decides them, which is a good test and not
a thing to guess at. `tsc --noEmit` inside `pnpm --filter @loom/app verify`
caught it. The repo-wide sweep was then redone and found no others.

## Open questions

**Nothing blocking.** One thing worth a maintainer's eye at the next release
rather than now: `engines` and the `zod` and `react` ranges are still literals
in `manifest.ts`, and unlike the version they *are* held against the root
manifest by tests that read it, so they can fail and have. They are copies that
cost a test rather than copies that cost a release, and whether to derive those
too is a judgement about how much of a published manifest should be generated —
not a defect.

## Test numbers

`pnpm verify` **exit 0** on `framework-76-one-version-one-manifest`.

| gate | result |
| --- | --- |
| framework suite | **247 files, 5988 tests passed** |
| `@loom/app` suite | **373 files, 6064 tests passed** |
| `findings:check` | 1382 findings, 0 malformed |
| `reports:check` | 2035 visuals, 144.8MB, none over 1.1MB |
| `prerender:check` | 137 prerendered pages, 1945 text junctions, 0 run together |

`tools/package/package.test.ts`: **24 passed, up from 20.** Three assertions
that could not fail were removed — the two reading `VERSION` and `RUNTIME_RANGE`
on both sides, and the `toContain` between them. Four cases were added:
`manifestFacts` with a license file and without, `runtimeRangeOf` on a version
it is handed, and `versionOf` on a manifest that has a version and on two that
do not.

Nothing was skipped and nothing was weakened.

**The first `pnpm verify` of this unit was red, and the first report of it here
said green.** The run failed on `app/(marketing)/_lib/facts.test.ts` with
`error TS2345` from the app's `tsc --noEmit`, because the call-site sweep had
been scoped to `tools/`. It was read as green because the output was piped
through `tail`, so the exit code reported was the pipe's and not
`pnpm verify`'s. The second run captured the exit code directly: `VERIFY_EXIT=0`.
Recorded because a gate you can misread is worth the sentence, and because the
fix for it is one line of shell.

Three deliberate red or altered runs were used as evidence, and all three were
reverted:

1. A hardcoded `version: "0.2.0"` back in `manifest()` — **1 failed, 22 passed**,
   confirming the fixture case catches a reintroduced literal.
2. The root manifest at `0.3.0` — `pnpm package:primitives` assembled
   `0.3.0` with `~0.3.0`, confirming the derivation end to end.
3. The root manifest at `0.3.0` against the suite — **23 passed**, which is the
   result that showed the cross-file assertion was circular and got it deleted.
   A version bump cannot turn this suite red, because after this change there is
   nothing left for it to disagree with.
