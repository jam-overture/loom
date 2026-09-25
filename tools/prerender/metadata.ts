import { readdir, readFile } from "node:fs/promises"
import { join, resolve } from "node:path"

import { err, ok, type Result } from "../../src/result.js"

/**
 * A metadata file that was written, tested, and never built into a route.
 *
 * `Loom marketing` filed this on 24 September. A `robots.ts` was composed from
 * the site's own lists, eleven assertions were written against what it returns,
 * every one of them passed, and `GET /robots.txt` answered with the
 * application's not-found page. The file was in `app/(marketing)/`, beside the
 * `sitemap.ts` that works from exactly there.
 *
 * The cause is an asymmetry in Next's own matcher, and it is not guessed here —
 * `isMetadataRouteFile` compiles `robots` and `manifest` against a pattern
 * anchored to the application root and `sitemap`, `icon`, `apple-icon`,
 * `opengraph-image` and `twitter-image` against patterns that are not
 * ([0190](../../decisions/0190-a-route-group-may-contribute-a-sitemap-and-may-not-contribute-a-robots-txt.md)).
 * So a route group may contribute a sitemap and may not contribute a
 * `robots.txt`, and the build says nothing either way: the file is not a route,
 * not a page, and not an error. It is simply not read.
 *
 * **What no test of the exported function can see** is the same shape as the
 * run-together hazard next door: the assertion is made against a value, and
 * what a reader is served is decided by a transform nothing in the repository
 * opened. The difference is that here the transform produced *nothing at all*,
 * so there is not even a wrong artefact to read — which is why this asks the
 * build what it did rather than reading output.
 *
 * It needs no knowledge of where Next honours what. It reads the conventions
 * out of the source tree, reads the routes out of `app-paths-manifest.json`,
 * and reports any convention with no route. A rule that changes in a Next
 * upgrade changes what the manifest contains, and this notices on the next run
 * rather than being a second copy of the rule to keep true.
 */

/**
 * The file conventions that become a route, and the address each is served at.
 *
 * `favicon.ico` is absent deliberately: it is a static file rather than a
 * module, so there is no exported function to pass a test that the route is
 * missing. The failure this exists to catch cannot happen to it.
 */
const SERVED_AS = {
  robots: "robots.txt",
  manifest: "manifest.webmanifest",
  sitemap: "sitemap.xml",
  icon: undefined,
  "apple-icon": undefined,
  "opengraph-image": undefined,
  "twitter-image": undefined,
} as const satisfies Record<string, string | undefined>

export type MetadataConvention = keyof typeof SERVED_AS

const CONVENTIONS = Object.keys(SERVED_AS) as readonly MetadataConvention[]

/** A module Next may turn into a route: the four it compiles, and nothing else. */
const MODULE_EXTENSIONS = ["ts", "tsx", "js", "jsx"] as const

/**
 * `icon.tsx` and `icon1.tsx` are both the icon convention: a trailing digit is
 * how the convention spells a second one in the same segment.
 */
const STEM = new RegExp(`^(${CONVENTIONS.join("|")})(\\d?)$`)

export type MetadataSource = {
  /** Relative to the app directory, so a message names a file and not a checkout. */
  readonly file: string
  readonly convention: MetadataConvention
  /** The directory it sits in, relative to the app directory: `""` at the root. */
  readonly segment: string
  /** The last path part of the address it should be served at. */
  readonly servedAs: string
}

export type MetadataError = { readonly kind: "no-manifest"; readonly path: string }

export const describeMetadataError = (error: MetadataError): string =>
  `${error.path} does not exist — run \`pnpm --filter @loom/app build\` first`

/** Where `next build` records every route it produced, keyed by its own path. */
export const APP_PATHS_MANIFEST = resolve("apps/loom/.next/server/app-paths-manifest.json")

/** The application's source, which is the other half of the comparison. */
export const APP_ROOT = resolve("apps/loom/app")

/**
 * A directory Next does not route from, so a convention name inside one is an
 * ordinary module and not a missing route.
 *
 * `_`-prefixed folders are private by convention and every surface keeps its
 * components and its `_lib` in one.
 */
const routable = (name: string): boolean => !name.startsWith("_") && !name.startsWith(".")

const sourcesUnder = async (dir: string, segment: string): Promise<MetadataSource[]> => {
  const entries = await readdir(dir, { withFileTypes: true })
  const sources: MetadataSource[] = []

  for (const entry of entries) {
    if (entry.isDirectory()) {
      if (!routable(entry.name)) continue

      sources.push(...(await sourcesUnder(join(dir, entry.name), `${segment}${entry.name}/`)))
      continue
    }

    const dot = entry.name.lastIndexOf(".")
    if (dot <= 0) continue

    const stem = entry.name.slice(0, dot)
    const extension = entry.name.slice(dot + 1)

    if (!(MODULE_EXTENSIONS as readonly string[]).includes(extension)) continue

    const matched = STEM.exec(stem)
    if (matched === null) continue

    const convention = matched[1] as MetadataConvention

    sources.push({
      file: `${segment}${entry.name}`,
      convention,
      segment,
      servedAs: SERVED_AS[convention] ?? stem,
    })
  }

  return sources
}

/**
 * Every metadata convention file in the application's source.
 *
 * A test file is excluded by the same rule that includes everything else:
 * `sitemap.test.ts` has the stem `sitemap.test`, which is not a convention
 * name. Nothing here special-cases it, and a convention file named after a
 * convention is what the build reads too.
 */
export const metadataSources = async (
  root: string = APP_ROOT
): Promise<readonly MetadataSource[]> =>
  [...(await sourcesUnder(root, ""))].sort((left, right) => left.file.localeCompare(right.file))

const ESCAPE = /[.*+?^${}()|[\]\\]/g

/**
 * The manifest key a source should have produced.
 *
 * The route group stays in the key — `app-paths-manifest.json` is keyed by the
 * build's own path rather than by the URL — so the comparison is between two
 * spellings of the same file and needs no model of how a group affects an
 * address. The two optional parts are Next's: a six-character content hash on
 * a generated image, and the `[__metadata_id__]` segment a dynamic one gets.
 */
export const servedRoutePattern = (source: MetadataSource): RegExp =>
  new RegExp(
    `^/${source.segment.replace(ESCAPE, "\\$&")}${source.servedAs.replace(ESCAPE, "\\$&")}` +
      `(-[0-9a-z]+)?(/\\[__metadata_id__\\])?/route$`
  )

/**
 * Every route `next build` produced, or the reason there are none.
 *
 * An absent manifest is an error rather than an empty list, for the reason
 * `prerenderedPages` gives: a check that passes by reading nothing is not a
 * check, and running it before the build is how that happens.
 */
export const appRouteKeys = async (
  path: string = APP_PATHS_MANIFEST
): Promise<Result<readonly string[], MetadataError>> => {
  let raw: string

  try {
    raw = await readFile(path, "utf8")
  } catch {
    return err({ kind: "no-manifest", path })
  }

  return ok(Object.keys(JSON.parse(raw) as Record<string, string>))
}

/** The conventions the build did not turn into a route. */
export const unservedMetadata = (
  sources: readonly MetadataSource[],
  routes: readonly string[]
): readonly MetadataSource[] =>
  sources.filter((source) => {
    const pattern = servedRoutePattern(source)

    return !routes.some((route) => pattern.test(route))
  })

/**
 * Where it is, what it should have answered, and the one thing that is usually
 * wrong.
 *
 * The root-only pair is named in the message rather than left to the record,
 * because the reader of this line is somebody who has just moved a file and the
 * answer is *move it back up*.
 */
export const describeUnserved = (source: MetadataSource): string => {
  const rootOnly = source.convention === "robots" || source.convention === "manifest"

  const because = rootOnly
    ? ` — \`${source.convention}\` is honoured only at the application root, so this file is not read at all (0190)`
    : ""

  return `app/${source.file} produced no route: nothing in the build is served at /${source.segment}${source.servedAs}${because}`
}
