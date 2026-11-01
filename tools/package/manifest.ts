import { posix } from "node:path"

/**
 * What `@jam-overture/loom-primitives` is, as data rather than as a file somebody edits by
 * hand — and the one transformation that makes the library publishable apart
 * from the runtime it is compiled against.
 *
 * ## Why this package exists separately at all
 *
 * The primitive library and the runtime are two products with two audiences.
 * The runtime is what a host installs to get a tree, a Gate and a render seam;
 * the library is a *vocabulary* built on top of it, and
 * [0170](../../decisions/0170-a-library-is-a-set-to-choose-from-and-a-vocabulary-is-priced-per-entry.md)
 * already says a deployment registers a **slice** of it rather than all of it.
 * A host that registers its own primitives and none of these should not be
 * installing 98 of them, and a host that wants the vocabulary should be able to
 * take a new version of it without taking a new runtime.
 *
 * So the runtime is a **peer** dependency, not a bundled one. There must be
 * exactly one copy of it in a host's tree — two would mean two `PrimitiveType`
 * brands, two schema identities and a registry that rejects its own entries —
 * and a peer dependency is how a package says that.
 *
 * ## The rewrite, and why it is not a bundler
 *
 * `src/primitives/**` imports the runtime the way every other file in the
 * repository does: by relative path. Compiled, that is `../sdk/definition.js`
 * sitting in `dist/primitives/`, which resolves inside the runtime's own build
 * and nowhere else.
 *
 * The published files have to say `@jam-overture/loom/sdk` instead. TypeScript
 * deliberately does not rewrite import specifiers on emit, so something has to
 * — and the something is deliberately **not** a bundler. Bundling would inline
 * the runtime into this package, which is exactly the duplicate-copy failure
 * the peer dependency exists to prevent, and it would throw away the per-file
 * output and the declaration maps that make this library readable from a host's
 * editor.
 *
 * What it is instead is a specifier map derived from the runtime's **own**
 * `exports` field. Every module the library reaches for is already on a public
 * entry point — that was measured before this was written, across all twenty of
 * them — so the mapping is a fact about the runtime's published surface rather
 * than a convention this file invents. {@link ENTRY_POINTS} is that fact, and
 * `package.test.ts` holds it against the runtime's actual `exports`, so a
 * runtime that stops exporting one of these fails the gate here rather than in
 * a host's `node_modules`.
 */

/** The runtime's public entry points, by the `dist/` directory they cover. */
export const ENTRY_POINTS: ReadonlyArray<{ readonly prefix: string; readonly specifier: string }> = [
  /**
   * Order matters: the first match wins, so the two specific doors come before
   * the root. `sdk/` and `render/` are the only directories the runtime puts
   * behind a subpath; everything else the library touches — `ids`, `result`,
   * `tree/`, `theme/`, `data/`, `runtime/`, `submit/` — is re-exported from the
   * root barrel and reached as `@jam-overture/loom`.
   */
  { prefix: "sdk/", specifier: "@jam-overture/loom/sdk" },
  { prefix: "render/", specifier: "@jam-overture/loom/react" },
  { prefix: "", specifier: "@jam-overture/loom" },
]

/**
 * Where a specifier inside `dist/primitives/` points, as a path relative to
 * `dist/`, or `undefined` when it stays inside the library.
 *
 * `fileDir` is the emitting file's own directory relative to `dist/primitives`
 * — `""` for a primitive, `"compositions"` for a band — which is what makes
 * `../tree/node.js` and `../../tree/node.js` the same module rather than two.
 */
export const runtimeTarget = (fileDir: string, specifier: string): string | undefined => {
  if (!specifier.startsWith(".")) return undefined

  const from = fileDir === "" ? "primitives" : `primitives/${fileDir}`
  const resolved = posix.join(from, specifier)

  /**
   * Two things are not a runtime module. A path still under `primitives/` is
   * the library talking to itself — every primitive importing `tokens.js` is
   * this case, several hundred times — and a path that climbed out of `dist/`
   * altogether is a specifier nothing here can map, which the build refuses
   * rather than guesses at.
   */
  return resolved.startsWith("primitives/") || resolved.startsWith("..") ? undefined : resolved
}

/**
 * One import specifier, rewritten for publication — or returned unchanged.
 *
 * Unchanged is the common case and the important one: 159 specifiers in the
 * emitted library point outward and several hundred point at its own siblings,
 * and a rewrite that touched the second kind would break every primitive's
 * import of `tokens.js` while leaving the tests green.
 */
export const publishedSpecifier = (fileDir: string, specifier: string): string => {
  const target = runtimeTarget(fileDir, specifier)
  if (target === undefined) return specifier

  const entry = ENTRY_POINTS.find(({ prefix }) => target.startsWith(prefix))

  return entry === undefined ? specifier : entry.specifier
}

/**
 * The version both packages go out at, together — **read off the framework's
 * manifest rather than restated here.**
 *
 * `@jam-overture/loom-primitives` is compiled against a specific runtime and its peer range
 * says so. They are not independently versioned until there is a reason for
 * them to be, and pre-1.0 they move as a pair: the library cannot promise
 * anything the runtime has not, and a host that upgrades one and not the other
 * is the case neither of them is tested in.
 *
 * **This was a constant until 1 November, and a constant is a second place to
 * forget.** Releasing `0.2.0` meant moving a version by hand in three
 * unconnected places, and of the three only the installation page's callout was
 * held to anything that could fail — a test reading the root manifest. The copy
 * here was guarded by assertions that read this same constant on both sides, so
 * they agreed with themselves whatever it said and with the framework never.
 *
 * What a forgotten bump would have shipped is worse than a stale sentence: a
 * library at `0.2.0` declaring `peerDependencies: { "@jam-overture/loom":
 * "~0.1.0" }` while the framework is at `0.3.0` resolves to nothing in a host's
 * install, which is the exact failure `docs/publishing-primitives.md` says the
 * peer range exists to prevent.
 *
 * So the copy is gone rather than tested. This is the same move `licenseIdOf`
 * already made for `license`, for the same reason, and it is pure for the same
 * reason: the caller reads the file, so a test can hand it a manifest without
 * one existing on disk.
 *
 * @throws if the manifest carries no version. There is no honest fallback —
 * `JSON.stringify` drops an `undefined` field, so a guess here is a published
 * `package.json` with no `version` at all, and the build stopping is the
 * cheapest place for that to be noticed.
 */
export const versionOf = (rootManifest: string): string => {
  const parsed: { version?: unknown } = JSON.parse(rootManifest)

  if (typeof parsed.version !== "string" || parsed.version === "")
    throw new Error("the framework's manifest carries no `version`, so the library has none to publish at")

  return parsed.version
}

/** The range the peer dependency carries. Pre-1.0, a minor is allowed to break. */
export const runtimeRangeOf = (version: string): string => `~${version}`

/**
 * React's range, and it is the framework's rather than a looser one.
 *
 * This said `>=19.0.0` until an audit against the published framework on
 * 27 September, which declares `^19.0.0`. A library that accepts React 20 while
 * the framework beside it does not is a library advertising a combination that
 * cannot install — npm resolves both peers against one tree — and the only
 * thing the wider range could do is let somebody onto a major nothing here has
 * ever been run against.
 *
 * It is **required** here and optional in the framework, which is correct in
 * both: the framework can be used for its tree and its Gate without rendering
 * anything, and every primitive in this package calls `createElement`.
 */
const REACT_RANGE = "^19.0.0"

export type Manifest = Readonly<Record<string, unknown>>

/**
 * The two fields this file cannot derive on its own, read off the repository by
 * whoever calls it.
 *
 * Both are strings and neither is interchangeable with the other, so they
 * arrive named rather than positional: a swapped pair would compile, publish a
 * package licensed `0.2.0` under the version `MIT`, and fail nothing here.
 */
export type ManifestFacts = {
  /**
   * The SPDX identifier, from `licenseIdOf` — or `UNLICENSED` when the
   * repository has no LICENSE file to publish beside the package, which is a
   * fact about the working tree rather than about the manifest.
   */
  readonly license: string
  /** The framework's own version, from {@link versionOf}. */
  readonly version: string
}

/**
 * The published `package.json`.
 *
 * It is generated rather than committed for the reason the decision index is:
 * four of its fields — the version, the peer range, the license and the files
 * list — are facts about something else in the repository, and a copy of a fact
 * is a copy that goes stale silently.
 *
 * The version and the license arrive as {@link ManifestFacts} rather than being
 * read here, which keeps this function pure and is what lets `package.test.ts`
 * ask what the manifest says at a version without a release happening. Neither
 * is this repository's decision to make: `docs/rollout.md` names the license as
 * the maintainer's, and the version is the framework's.
 */
export const manifest = ({ license, version }: ManifestFacts): Manifest => ({
  name: "@jam-overture/loom-primitives",
  version,
  description:
    "The starter primitive library for Loom — 98 registered primitives and 44 starting compositions, themed from the palette and renderable on a server.",
  license,
  type: "module",
  /**
   * Two entry points and no more. The root is the registry and every
   * primitive; `./compositions` is the phrasebook, which a host that only wants
   * the vocabulary never has to load.
   */
  exports: {
    ".": { types: "./dist/index.d.ts", default: "./dist/index.js" },
    "./compositions": {
      types: "./dist/compositions/index.d.ts",
      default: "./dist/compositions/index.js",
    },
  },
  types: "./dist/index.d.ts",
  files: ["dist", "README.md", "LICENSE"],
  sideEffects: false,
  /**
   * `zod` is a real dependency: every primitive's props schema is a `z.object`
   * and a host never sees it. `react` and the runtime are peers — one copy of
   * each in a host's tree or nothing works.
   */
  dependencies: { zod: "^3.24.1" },
  peerDependencies: { "@jam-overture/loom": runtimeRangeOf(version), react: REACT_RANGE },
  engines: { node: ">=22.0.0" },
  publishConfig: { access: "public" },
  /**
 * `src/primitives`, not `packages/primitives`. npm turns this into a "view
 * source" link, and the package root is assembled by `pnpm package:primitives`
 * — everything in it but the README is generated and gitignored, so the link
 * would land a reader in an almost empty directory. The source they want is
 * where it has always been.
 */
  repository: { type: "git", url: "git+https://github.com/jam-overture/loom.git", directory: "src/primitives" },
  keywords: ["loom", "primitives", "ui", "react", "server-components", "design-system", "ai"],
})

/**
 * What the package says its license is — read from the runtime's own manifest
 * rather than parsed out of the LICENSE file.
 *
 * The first version of this read an SPDX identifier off the LICENSE's first
 * line, which was a convention this tool invented and the repository did not
 * follow: the file `Loom daily build` shipped opens `MIT License`, the
 * conventional header, which is not a bare identifier. Two packages out of one
 * repository disagreeing about their license is the failure that would have
 * caused, and the fix is to stop having a second source of truth — `license`
 * in the root manifest is what npm publishes for the framework, so it is what
 * this publishes for the library.
 */
export const licenseIdOf = (rootManifest: string): string => {
  const parsed: { license?: unknown } = JSON.parse(rootManifest)

  return typeof parsed.license === "string" && parsed.license.length > 0
    ? parsed.license
    : "SEE LICENSE IN LICENSE"
}

/**
 * Everything the published manifest needs that only the repository knows, out
 * of one read of it.
 *
 * It exists so the seam is testable without a build. `assemble` used to gather
 * these two facts inline, which meant the only proof that the version reaching
 * {@link manifest} came off the framework's manifest — rather than from a
 * literal somebody typed — was running the whole assembly, and that needs a
 * compiled `dist/primitives` this suite deliberately does not depend on.
 *
 * `hasLicenseFile` is a fact about the working tree and not about the manifest,
 * which is why it is a second parameter rather than something read here: a
 * package published with a license it does not ship the text of is worse than
 * one that says `UNLICENSED` honestly.
 */
export const manifestFacts = (rootManifest: string, hasLicenseFile: boolean): ManifestFacts => ({
  license: hasLicenseFile ? licenseIdOf(rootManifest) : "UNLICENSED",
  version: versionOf(rootManifest),
})
