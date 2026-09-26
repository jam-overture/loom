import { posix } from "node:path"

/**
 * What `@loom/primitives` is, as data rather than as a file somebody edits by
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
 * The published files have to say `@loom/runtime/sdk` instead. TypeScript
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
   * root barrel and reached as `@loom/runtime`.
   */
  { prefix: "sdk/", specifier: "@loom/runtime/sdk" },
  { prefix: "render/", specifier: "@loom/runtime/react" },
  { prefix: "", specifier: "@loom/runtime" },
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
 * The version both packages go out at, together.
 *
 * `@loom/primitives` is compiled against a specific runtime and its peer range
 * says so. They are not independently versioned until there is a reason for
 * them to be, and pre-1.0 they move as a pair: the library cannot promise
 * anything the runtime has not, and a host that upgrades one and not the other
 * is the case neither of them is tested in.
 */
export const VERSION = "0.1.0"

/** The range the peer dependency carries. Pre-1.0, a minor is allowed to break. */
export const RUNTIME_RANGE = `~${VERSION}`

export type Manifest = Readonly<Record<string, unknown>>

/**
 * The published `package.json`.
 *
 * It is generated rather than committed for the reason the decision index is:
 * three of its fields — the version, the peer range and the files list — are
 * facts about something else in the repository, and a copy of a fact is a copy
 * that goes stale silently. `license` is the exception and is deliberately a
 * parameter: it is not this repository's decision to make
 * (`docs/rollout.md` names it as the maintainer's), and a package published
 * without one is a package nobody may legally use.
 */
export const manifest = (license: string): Manifest => ({
  name: "@loom/primitives",
  version: VERSION,
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
  peerDependencies: { "@loom/runtime": RUNTIME_RANGE, react: ">=19.0.0" },
  engines: { node: ">=20.9.0" },
  publishConfig: { access: "public" },
  repository: { type: "git", url: "git+https://github.com/jam-overture/loom.git", directory: "packages/primitives" },
  keywords: ["loom", "primitives", "ui", "react", "server-components", "design-system", "ai"],
})
