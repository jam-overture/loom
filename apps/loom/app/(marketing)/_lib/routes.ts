import { readdirSync } from "node:fs"
import { fileURLToPath } from "node:url"

import appConfig from "../../../next.config"

/**
 * Which addresses this application actually serves, read off the application.
 *
 * ## The sentence that is not true
 *
 * `anchors.test.ts` scoped itself to same-page fragments on 4 October and gave
 * a reason for stopping there:
 *
 * > *"Every other control on this site is a path, and a path that has gone
 * > wrong announces itself: the route is missing, the build says so, `pnpm
 * > verify` goes red."*
 *
 * It does not. Measured rather than argued: with `LESSONS.path` moved to
 * `/the-course` — so that the bar, the footer's map, the front door's cards and
 * the closing band all point at nothing — `next build` finished at **exit 0**,
 * prerendered every page and reported no error. Nothing in a Next build reads
 * an `href`. The first thing that reports a moved surface is a visitor landing
 * on the 404.
 *
 * ## What the lane did have, and what it could not see
 *
 * `site.test.ts` has held *a surface this site points at is a page that exists
 * on this deployment* since the demonstration moved in August, and it is right
 * — it is how the falsification above was caught twice rather than once. What
 * it reads is `app/(group)/<path>/page.tsx`, and that works for the four paths
 * it was written against and for nothing else:
 *
 * - **It knows one spelling of a page.** The documentation's pages are
 *   `page.mdx` (§4c: prose is the page), so every address under
 *   `/docs/getting-started` reads as served by nothing.
 * - **It knows one segment.** `/docs/the-runtime/what-the-gate-decides` would
 *   be looked for at `(docs)/docs/the-runtime/what-the-gate-decides/page.tsx`
 *   only if a group happened to be named for the whole of it.
 * - **It reads a list rather than the site.** `PRODUCT_SURFACES` is checked;
 *   an address typed into a band, a card or an action is not, and the addresses
 *   this site builds for itself go through `internalHref` and `askHref`.
 *
 * So the gap is not that nobody thought of it. It is that the check was shaped
 * to the four paths in front of whoever wrote it, which is the same shape of
 * failure `served.ts` records about four rules written against the page as
 * authored rather than the page as served.
 *
 * This module is that check generalised: every address, every route shape, read
 * once. `site.test.ts` now asks it rather than keeping a second reading of
 * *does this application serve that* — two readings would eventually disagree,
 * and the one that disagreed would be whichever was not looked at.
 *
 * ## Why this is possible now and was not in August
 *
 * The four surfaces used to be four applications
 * ([0067](../../../../../../decisions/0067-the-four-surfaces-are-one-application.md)),
 * and `/docs` was somebody else's deployment at somebody else's address. The
 * only honest thing this lane could do with such a link was point at it and
 * hope. They are one application now, so *does this product have a page at
 * `/docs`* is a question with an answer on disk, and the answer is the
 * directory the other lane keeps.
 *
 * ## It reads directories and not the build
 *
 * `tools/prerender` asks the same shape of question of `.next`, which is the
 * right instrument for *what came out* and the wrong one here: it needs a build
 * to exist, and a check that quietly passes when the artefact is missing is the
 * failure mode `docs/routines.md` has a section about. The route conventions
 * are a naming scheme on a directory tree, so this reads the directory tree.
 * Read on the day this was written it finds **72 addresses, which is exactly
 * the number of rows in `next build`'s own route table** once that table's five
 * file conventions are set aside.
 *
 * **A segment shape it does not recognise throws rather than being guessed at.**
 * The documentation lane's DDL grammar made the same call on 4 October and the
 * argument is theirs: a grammar that guesses wrong is worse than one that
 * refuses, because the refusal is a failing build and the guess is a link this
 * file reports as fine.
 *
 * ## What it means when this file goes red in another lane's run
 *
 * It means that lane moved a page this site sends people to, and the front door
 * now points at nothing. That is a real break and this is where it should
 * surface, but the 19 August finding — *the marketing site's checked numbers
 * make every other lane's run go red* — is about exactly this blast radius, so
 * the failure names the address, the state it was found in, and the file that
 * used to serve it. **Nothing outside `app/(marketing)/` has to be edited to
 * get green**: the fix is the link, and the link is this lane's.
 */


/** One segment of a route, in the only four shapes Next gives a directory. */
export type RouteSegment =
  /** A plain directory: matches itself and nothing else. */
  | { readonly kind: "literal"; readonly value: string }
  /** `[slug]`: exactly one segment. */
  | { readonly kind: "one" }
  /** `[...rest]`: one segment or more. */
  | { readonly kind: "many" }
  /** `[[...rest]]`: none, one or more — so it matches its own parent too. */
  | { readonly kind: "maybe-many" }

/** An address this application serves, and the file that serves it. */
export type AppRoute = {
  readonly segments: readonly RouteSegment[]
  /** Repo-relative, so a failure says where to look. */
  readonly file: string
}

/**
 * The files that make a directory into an address a reader can open, built from
 * the application's own `pageExtensions`.
 *
 * Typed out, this list would have been wrong on the day it was written. The
 * documentation lane's pages are `page.mdx` — §4c's decision that prose is the
 * page — and a guessed list of `.tsx` and `.js` would have reported that every
 * address under `/docs/getting-started` is served by nothing. The four-line
 * version of this check found exactly that and it is why the list is read.
 *
 * `next.config.ts` belongs to `Loom docs` (`docs/routines.md` says so, because a
 * file Next forces to the application root follows its content and not its
 * location). This reads it and changes nothing in it.
 */
const SERVING_FILES: readonly string[] = (appConfig.pageExtensions ?? ["js", "jsx", "ts", "tsx"]).flatMap(
  (extension) => [`page.${extension}`, `route.${extension}`]
)

const OPTIONAL_CATCH_ALL = /^\[\[\.\.\.[^\]]+\]\]$/
const CATCH_ALL = /^\[\.\.\.[^\]]+\]$/
const DYNAMIC = /^\[[^.\]][^\]]*\]$/
const GROUP = /^\([^()]+\)$/

/**
 * What a directory name contributes to the address, or nothing when it is a
 * route group.
 *
 * Throws on anything else bracketed. Next has conventions this repository does
 * not use — parallel routes (`@slot`), intercepting routes (`(.)`, `(..)`) —
 * and each of them would change what an address means. Reading one as a plain
 * directory would make this module report a route that does not exist, which is
 * worse than the silence it was written to end.
 */
/**
 * Exported for its own test and for no other reader.
 *
 * The refusal is the half of this module that cannot be reached through
 * `servedBy`: every directory in this application today is a shape it reads, so
 * the only way to hold the line *refuse rather than guess* is to hand it the
 * shape of a convention nobody has written yet.
 */
export const segmentFor = (name: string): RouteSegment | undefined => {
  if (GROUP.test(name)) return undefined
  if (OPTIONAL_CATCH_ALL.test(name)) return { kind: "maybe-many" }
  if (CATCH_ALL.test(name)) return { kind: "many" }
  if (DYNAMIC.test(name)) return { kind: "one" }

  if (/[[\]@]/.test(name) || name.startsWith("(")) {
    throw new Error(
      `loom: ${name} is a routing convention this check cannot read, so it would have to guess what address it serves`
    )
  }

  return { kind: "literal", value: name }
}

/**
 * A folder prefixed with `_` is private: Next serves nothing under it, however
 * many `page.tsx` files it holds.
 *
 * Every surface in this application keeps its components and its non-route code
 * in one, so without this line the four lanes' private trees would all read as
 * addresses — and a check that believes in routes nobody can open is a check
 * that cannot find the one that is missing.
 */
const isPrivate = (name: string): boolean => name.startsWith("_")

const APP_DIRECTORY = new URL("../../", import.meta.url)

const walk = (directory: URL, segments: readonly RouteSegment[], at: string): readonly AppRoute[] => {
  const entries = readdirSync(fileURLToPath(directory), { withFileTypes: true })
  const serves = entries.find((entry) => entry.isFile() && SERVING_FILES.includes(entry.name))

  return [
    ...(serves === undefined ? [] : [{ segments, file: `${at}/${serves.name}` }]),
    ...entries.flatMap((entry) => {
      if (!entry.isDirectory() || isPrivate(entry.name)) return []

      const segment = segmentFor(entry.name)

      return walk(
        new URL(`${entry.name}/`, directory),
        segment === undefined ? segments : [...segments, segment],
        `${at}/${entry.name}`
      )
    }),
  ]
}

/**
 * Every address this application serves, read once.
 *
 * Read eagerly rather than behind a function because it is a directory tree and
 * cannot change inside a run, and because a module that throws on an
 * unrecognised convention should throw while the file is being loaded rather
 * than inside whichever assertion happened to ask first.
 */
export const APP_ROUTES: readonly AppRoute[] = walk(APP_DIRECTORY, [], "apps/loom/app")

/** The segments of a path, with the empty ones a leading or trailing `/` makes dropped. */
const segmentsOf = (path: string): readonly string[] => path.split("/").filter((part) => part !== "")

/**
 * Whether an address falls to a route, by the arithmetic of how many segments
 * each shape swallows.
 *
 * A catch-all is last or it is nothing — Next requires it — so the only
 * question is how many segments come before it and how few it will accept. A
 * `[...rest]` needs at least one of its own; a `[[...rest]]` is content with
 * none, which is why `/portal/audit` and `/portal/audit/a/b` are one route.
 */
const matches = (route: AppRoute, parts: readonly string[]): boolean => {
  const last = route.segments[route.segments.length - 1]
  const open = last?.kind === "many" || last?.kind === "maybe-many"
  const before = open ? route.segments.length - 1 : route.segments.length

  if (open) {
    if (parts.length < (last?.kind === "many" ? before + 1 : before)) return false
  } else if (parts.length !== before) {
    return false
  }

  return route.segments.slice(0, before).every((segment, at) => {
    if (segment.kind === "literal") return parts[at] === segment.value

    return parts[at] !== undefined
  })
}

/**
 * The file that serves an address, or nothing when this application has no such
 * address.
 *
 * It answers with the file rather than with a boolean because the file is what
 * makes the failure actionable: *`/lessons` is served by nothing* sends whoever
 * reads it looking, and *`/lessons` was served by `app/(lessons)/lessons/page.tsx`
 * and is not any more* does not.
 */
export const servedBy = (path: string): string | undefined => {
  const parts = segmentsOf(path)

  return APP_ROUTES.find((route) => matches(route, parts))?.file
}

/** Whether a reader who opens this address gets a page rather than a 404. */
export const serves = (path: string): boolean => servedBy(path) !== undefined
