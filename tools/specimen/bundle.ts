import { dirname, resolve } from "node:path"

import { build, type BuildOptions } from "esbuild"

import { err, ok, type Result } from "../../src/result.js"

/**
 * The one build step in the harness, and the reason it took five behaviors to
 * arrive.
 *
 * A specimen is markup with no bundler behind it, and that is most of what
 * makes it cheap: there is nothing between the render seam and the camera, and
 * nothing to go stale. Hydration cannot be had that way — a control that proves
 * scripting runs needs scripting to run — so a live specimen pays for a bundle,
 * and the design is arranged so that only a live specimen pays.
 *
 * **It bundles the specimen module itself, not a description of it.** The entry
 * below imports the lane's own file and hands it to `hydrateSpecimen`, so the
 * browser builds the tree from the same function the server did. That is what
 * lets the two renders agree without a single value being serialised onto the
 * page (see `element.ts`), and it is why `Specimen.primitives` had to live on
 * the specimen rather than on the command line: a flag reaches the server and
 * not the browser, and a registry that differed between the two would be a
 * hydration mismatch React resolves in silence.
 *
 * esbuild rather than the framework's bundler for the reason Playwright is kept
 * behind `capture.ts`: this is a tool for taking a picture, not part of what
 * ships. It is a devDependency of the runtime, imported by this file only, and
 * nothing under `src/` knows it exists.
 */

export type BundleError = { readonly detail: string }

export const describeBundleError = (error: BundleError): string =>
  `the specimen bundle would not build: ${error.detail}`

/**
 * The module the browser runs, as source.
 *
 * Three lines and no conditions, which is the point: everything that could
 * differ between two live specimens is inside the module it imports. It is
 * generated rather than committed because one of those two paths is the lane's
 * and is only known at the command line.
 *
 * Written as TypeScript, and the extension is load-bearing. The repository
 * imports its own modules with `.js` specifiers that name `.ts` files, and
 * esbuild only applies TypeScript's resolution rule for those when the importer
 * is itself TypeScript.
 */
export const entrySource = (modulePath: string, hydratePath: string): string =>
  [
    `import specimen from ${JSON.stringify(modulePath)}`,
    `import { hydrateSpecimen } from ${JSON.stringify(hydratePath)}`,
    "",
    "void hydrateSpecimen(specimen)",
    "",
  ].join("\n")

/**
 * `production` rather than the ambient value, and it is not an optimisation.
 *
 * React's development build warns on a hydration mismatch and then patches the
 * DOM to match the client, which is a different page from the one the browser
 * was served — so a specimen photographed in development mode could show a
 * picture that no reader will ever be served. The production build is the one
 * whose behavior a deployment has.
 */
export const bundleOptions = (entry: string, resolveDir: string): BuildOptions => ({
  stdin: { contents: entry, resolveDir, sourcefile: "specimen-entry.ts", loader: "ts" },
  bundle: true,
  format: "iife",
  platform: "browser",
  target: "es2022",
  write: false,
  define: { "process.env.NODE_ENV": '"production"' },
  legalComments: "none",
  logLevel: "silent",
})

/** The client entry, resolved off this file so it moves when the directory does. */
const HYDRATE_MODULE = resolve(dirname(new URL(import.meta.url).pathname), "hydrate.ts")

/**
 * The bundle a live specimen's pages load, as text to be written beside them.
 *
 * Errors come back as a `Result` like everything else in the harness rather than
 * as a thrown build failure, because the caller is a command whose whole
 * contract is that a failure is a sentence and an exit code (`main.ts`).
 */
export const bundleSpecimen = async (modulePath: string): Promise<Result<string, BundleError>> => {
  const absolute = resolve(modulePath)
  const entry = entrySource(absolute, HYDRATE_MODULE)

  try {
    const built = await build(bundleOptions(entry, dirname(absolute)))
    const first = built.outputFiles?.[0]

    return first === undefined
      ? err({ detail: "esbuild produced no output file" })
      : ok(first.text)
  } catch (thrown) {
    return err({ detail: thrown instanceof Error ? thrown.message : String(thrown) })
  }
}
