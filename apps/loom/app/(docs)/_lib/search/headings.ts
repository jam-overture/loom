import { existsSync, readFileSync } from "node:fs"
import { join } from "node:path"

import { REPOSITORY_ROOT } from "../architecture/source"

import { headingAnchor } from "./anchor"

/**
 * The headings on a written page, read off the page itself.
 *
 * This runs at build time and never in a browser: the route handler that serves
 * the index is statically generated, so the files below are read once by
 * `next build` and by the tests, and the browser only ever sees the JSON that
 * came out. `architecture/source.ts` reads the repository the same way and for
 * the same reason — a list of headings typed into this directory would be a
 * copy of the pages, and a copy of a page goes stale the first time somebody
 * edits the page.
 *
 * **Fenced code is skipped**, which is not fussiness. Several pages on this
 * site show a shell prompt or a JSON tree inside a fence, and a `# install the
 * runtime` comment in one of them is a comment rather than a section — indexing
 * it would send a reader to an anchor that does not exist.
 */

export type PageHeading = {
  /** 2 or 3. The `#` heading is the page's own title and is indexed as the page. */
  readonly level: number
  readonly text: string
  /** The `id` `rehype-slug` will have put on it. */
  readonly anchor: string
}

/**
 * Where the pages are, found from the repository root rather than from this
 * file.
 *
 * The obvious spelling — `new URL("../../docs", import.meta.url)` — does not
 * survive the build. Turbopack reads that shape as *an asset this module
 * imports* and tries to resolve `../../docs` as a module, so the build fails
 * outright with a module-not-found on a directory that plainly exists.
 * `architecture/source.ts` walks up from the working directory for the same
 * reason and resolves the root once; this borrows it rather than walking twice.
 *
 * Checked at module load, because the failure this guards is the route group
 * being moved by another lane — which the documentation brief says to expect.
 * A sentence naming the directory beats an `ENOENT` on a page nobody was
 * looking at.
 */
const docsRoot = join(REPOSITORY_ROOT, "apps", "loom", "app", "(docs)", "docs")

if (!existsSync(docsRoot)) {
  throw new Error(`loom: the documentation pages are not at ${docsRoot} — the search index cannot be built`)
}

const FENCE = /^\s*(?:```|~~~)/
const HEADING = /^(#{2,3})\s+(.+?)\s*$/

/**
 * The inline markdown a heading is allowed, removed so the index holds what a
 * reader sees.
 *
 * Backticks and emphasis only. A heading that needed more than this would be a
 * heading doing something other than naming a section, and the anchor test is
 * what would notice.
 */
const stripInline = (text: string): string => text.replace(/[`*_]/g, "")

/**
 * The headings in a page's source, as a pure function of the text.
 *
 * Separated from the file read so the fence rule can be tested against markdown
 * written for the purpose — the one thing here that has a wrong answer, and the
 * one thing that no page on the site currently exercises.
 */
export const headingsIn = (source: string): readonly PageHeading[] => {
  const { headings } = source.split("\n").reduce<{
    readonly fenced: boolean
    readonly headings: readonly PageHeading[]
  }>(
    (state, line) => {
      if (FENCE.test(line)) return { ...state, fenced: !state.fenced }
      if (state.fenced) return state

      const match = HEADING.exec(line)
      if (match === null) return state

      const text = stripInline(match[2] ?? "")

      return {
        ...state,
        headings: [
          ...state.headings,
          { level: (match[1] ?? "").length, text, anchor: headingAnchor(text) },
        ],
      }
    },
    { fenced: false, headings: [] }
  )

  return headings
}

/**
 * A written page's source, read once.
 *
 * Exported because two things now read the same file — the headings here and
 * the prose in `prose.ts` — and the index would otherwise read every page
 * twice to answer two questions about the same text.
 */
export const readPageSource = (sectionSlug: string, pageSlug: string): string =>
  readFileSync(join(docsRoot, sectionSlug, pageSlug, "page.mdx"), "utf8")

export const readPageHeadings = (sectionSlug: string, pageSlug: string): readonly PageHeading[] =>
  headingsIn(readPageSource(sectionSlug, pageSlug))
