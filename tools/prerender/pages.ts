import { readdir, readFile } from "node:fs/promises"
import { join, relative, resolve } from "node:path"

import { err, ok, type Result } from "../../src/result.js"

/**
 * Where `next build` leaves the pages a reader is served.
 *
 * Every statically rendered route in `apps/loom` is written here as the HTML a
 * browser receives — the same bytes, before hydration and before any test's
 * jsdom has touched them. It is the artefact this repository produces on every
 * `pnpm verify` and has never opened.
 */
export const PRERENDER_ROOT = resolve("apps/loom/.next/server/app")

export type PrerenderedPage = {
  /** Relative to the prerender root, so a message names a route and not a checkout. */
  readonly path: string
  readonly html: string
}

export type PrerenderError =
  | { readonly kind: "no-build"; readonly root: string }
  | { readonly kind: "no-pages"; readonly root: string }

/**
 * The build command by name, because the failure this reports is almost always
 * "you ran the check on its own" and the next thing the reader needs is what to
 * run instead.
 */
export const describePrerenderError = (error: PrerenderError): string =>
  error.kind === "no-build"
    ? `${error.root} does not exist — run \`pnpm --filter @loom/app build\` first`
    : `${error.root} holds no prerendered pages; nothing was checked`

const htmlUnder = async (dir: string, root: string): Promise<PrerenderedPage[]> => {
  const entries = await readdir(dir, { withFileTypes: true })
  const pages: PrerenderedPage[] = []

  for (const entry of entries) {
    const full = join(dir, entry.name)

    if (entry.isDirectory()) {
      pages.push(...(await htmlUnder(full, root)))
      continue
    }

    if (!entry.name.endsWith(".html")) continue

    pages.push({ path: relative(root, full), html: await readFile(full, "utf8") })
  }

  return pages
}

/**
 * Every prerendered page, or the reason there are none.
 *
 * An empty result is an error rather than an empty success, and that is the
 * whole reason this returns a `Result`-shaped answer at all. A check over built
 * output that finds nothing looks identical, from a green tick, to a check that
 * opened nothing — and the second is what happens the first time a route group
 * turns dynamic, a build path moves, or somebody runs the check before the
 * build. A gate that can pass by reading zero files is not a gate.
 */
export const prerenderedPages = async (
  root: string = PRERENDER_ROOT
): Promise<Result<readonly PrerenderedPage[], PrerenderError>> => {
  let pages: readonly PrerenderedPage[]

  try {
    pages = await htmlUnder(root, root)
  } catch {
    return err({ kind: "no-build", root })
  }

  if (pages.length === 0) return err({ kind: "no-pages", root })

  return ok([...pages].sort((left, right) => left.path.localeCompare(right.path)))
}
