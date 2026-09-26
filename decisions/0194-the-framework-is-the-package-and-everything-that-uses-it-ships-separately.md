# 0194. The framework is the package, and everything that uses it ships separately

**Status:** Accepted
**Date:** 2026-09-26
**Section:** §1 (process), §4 (SDK)

## Context

Loom has been a private workspace since it started: `private: true`, a version
of `0.0.1`, no licence, and `@loom/runtime` resolved by pnpm rather than by
anybody. The maintainer's instruction on 26 September is that the framework goes
to npm as a public package, and that the marketing site, the documentation, the
starter primitive library, the demonstration and the portal do not go with it.

That instruction draws a line this repository has never had to draw, because
inside a workspace everything resolves. The line matters in one specific place:
**`src/primitives/` is a published subpath of the same package.**
`@loom/runtime/primitives` is imported by five surfaces in `apps/loom`, quoted
in the documentation, and written into the README. It is also, plainly, a
product rather than plumbing — ten primitives a deployment may adopt, with a
release rhythm of its own and a lane of its own
([0052](0052-a-repeated-item-is-a-node-and-a-fixed-field-is-a-prop.md) split it
out of the framework routine in August).

The four surfaces are not in question: `apps/loom` is a deployment, not a
package, and was never going to be in a tarball.

## Decision

**`@loom/runtime` publishes the framework and withholds the starter library.**
Fifteen subpaths go out; `./primitives` does not.

The mechanism is two manifests that differ in one stated way:

- **`files: ["dist", "!dist/primitives"]`** keeps the compiled library out of
  the tarball. This is the only thing that can: `publishConfig` rewrites fields
  and cannot exclude files, which was measured rather than assumed — a
  `publishConfig.files` override was ignored and the directory shipped.
- **`publishConfig.exports`** is the repository's export map minus
  `./primitives`. pnpm applies it at publish time, so the manifest in the
  workspace still advertises the subpath that five surfaces import and the
  manifest on the registry does not.
- **`tools/publish/manifest.ts`** holds the difference as data and
  `publicationFaults` refuses the two opposite ways it can rot: code packed with
  no subpath to import it, and a subpath whose file the tarball leaves out. The
  drift it exists for is neither — it is a *new* subpath added to `exports` and
  forgotten in `publishConfig.exports`, which is invisible in this repository,
  where both manifests tell the truth.

Also decided, because a first publish settles them whether or not anyone writes
them down:

- **MIT**, in a `LICENSE` file. A public package with no licence grants nobody
  the right to use it, which is a worse default than any particular licence.
- **`0.1.0`**, not `0.0.1` and not `1.0.0`, published to `latest` with no
  pre-release tag. Pre-1.0 is the instability signal and the README has carried
  "nothing here is stable yet" from the first commit.
- **`engines: { node: ">=22" }`** — what is verified, not what might work.
  Loosening it is a line, once somebody runs the suite on Node 20.
- **No publish workflow.** There is no `.github/` in this repository and this
  adds none; a credential in repository secrets makes every merge one
  misconfiguration away from a release.

## Consequences

- **A consumer who follows the published documentation about the starter
  primitives gets an error.** `@loom/runtime/primitives` is documented on the
  site and in the README, and from the first publish it resolves for nobody
  outside this workspace. The README now says so in two places. The site is
  `Loom docs`' and is filed for them; **this is the sharpest cost of the
  decision and it is real on day one.**
- **The starter library needs a package of its own**, and does not have one.
  Until it does, the ten primitives are reachable only by working in this
  repository. Filed for `Loom primitives`, whose directory it is.
- **`dist/primitives/` is still built.** The workspace needs it; only the
  tarball does not have it. Nothing about the surfaces changes.
- **Two manifests can now disagree.** That is the cost of the `publishConfig`
  seam, paid down by the test rather than avoided. The alternative that avoids
  it entirely is a real package split, below.
- **The name is not secured.** `@loom/runtime` is unregistered, which is not the
  same as owned; `docs/publishing.md` names the fallback and the one field it
  costs.

## Alternatives considered

- **Move `src/primitives/` into `packages/primitives/` as `@loom/primitives`
  now.** The honest end state, and the one this decision points at. Rejected for
  *this* change: it moves 131 files in another routine's lane, rewrites twelve
  import sites across five surfaces, the generated API reference, the compiled
  documentation fences and the lesson transcripts — a migration whose failure
  mode is a red build for four surfaces, undertaken the night before a release.
  Withholding a subpath is reversible in one line; a move is not.
- **Publish the primitives with the framework and split later.** Rejected
  because it is the one thing a version cannot take back. A subpath that exists
  in `0.1.0` and vanishes in `0.2.0` breaks every consumer who used it, and the
  instruction is explicit that the library ships separately.
- **Strip the primitives from the build.** Excluding `src/primitives/**` from
  `tsconfig.build.json` would keep the tarball just as clean and would break
  `apps/loom`, because the workspace resolves through `dist`.
- **A second package.json, generated at publish time.** What `publishConfig`
  already is, without the tooling to go wrong. Rejected for that reason.
- **An `alpha` dist-tag.** Safer against accidental installs and worse at the
  actual goal: a public package people can try. `0.x` already says it.
