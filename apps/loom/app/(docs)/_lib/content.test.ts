import { existsSync, readFileSync, readdirSync } from "node:fs"
import { join } from "node:path"
import { fileURLToPath } from "node:url"

import { describe, expect, it } from "vitest"

import { docsExampleIds } from "./examples/catalogue"
import {
  DOCS_LANDING_SLUG,
  docsHref,
  docsLandingOf,
  docsSections,
  writtenDocsSections,
} from "./nav"

/**
 * The navigation, the pages on disk, and the examples they name — held against
 * each other.
 *
 * Three ways a documentation site rots quietly, all of them caught here rather
 * than by a reader: a page nobody links to, a link to a page nobody wrote, and
 * an example id that no longer names anything. The first two are why the
 * sidebar reads `lib/nav.ts` instead of the filesystem — a single list can be
 * checked; two lists that agree by convention cannot.
 *
 * Everything here is about **written** sections. A generated section has no
 * `page.mdx` to find and no heading typed by hand; what holds it honest is
 * `api/extract.test.ts`, which checks it against the thing it was generated
 * from.
 */

const docsRoot = fileURLToPath(new URL("../docs", import.meta.url))

/** Every written page, in reading order. */
const writtenOrder = writtenDocsSections.flatMap((section) =>
  section.pages.map((page) => ({ href: docsHref(section.slug, page.slug), section, page }))
)

/**
 * The file behind a page.
 *
 * A landing page has no segment of its own, so its file is the section
 * directory's own `page.mdx` — which is the same rule the URL follows, and the
 * reason `join` is given the empty slug rather than asked to skip it.
 */
const pageFileFor = (sectionSlug: string, pageSlug: string): string =>
  join(docsRoot, sectionSlug, pageSlug, "page.mdx")

/** Every `page.mdx` under `app/docs`, as `<section>/<page>`. */
const pagesOnDisk = (): readonly string[] =>
  readdirSync(docsRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .flatMap((section) => [
      /* A section's own `page.mdx`, where there is one: a written landing page
         is a page like any other and an unlisted one would be as unreachable. */
      ...(existsSync(join(docsRoot, section.name, "page.mdx"))
        ? [`${section.name}/${DOCS_LANDING_SLUG}`]
        : []),
      ...readdirSync(join(docsRoot, section.name), { withFileTypes: true })
        .filter((page) => page.isDirectory())
        .filter((page) => existsSync(join(docsRoot, section.name, page.name, "page.mdx")))
        .map((page) => `${section.name}/${page.name}`),
    ])

const sourceOf = (sectionSlug: string, pageSlug: string): string =>
  readFileSync(pageFileFor(sectionSlug, pageSlug), "utf8")

const EXAMPLE_REFERENCE = /<Example\s+id="([^"]+)"/g

const referencedExampleIds = (): readonly string[] =>
  writtenOrder.flatMap((entry) =>
    [...sourceOf(entry.section.slug, entry.page.slug).matchAll(EXAMPLE_REFERENCE)].map(
      (match) => match[1] ?? ""
    )
  )

describe("the navigation and the pages on disk", () => {
  it("has a written page behind every link", () => {
    for (const { section, page } of writtenOrder) {
      expect(existsSync(pageFileFor(section.slug, page.slug)), `${section.slug}/${page.slug}`).toBe(
        true
      )
    }
  })

  it("links to every page that exists", () => {
    const listed = writtenOrder.map((entry) => `${entry.section.slug}/${entry.page.slug}`)

    expect([...pagesOnDisk()].sort()).toEqual([...listed].sort())
  })

  it("titles each page once, in its own heading", () => {
    for (const { section, page } of writtenOrder) {
      const headings = sourceOf(section.slug, page.slug).match(/^# .+$/gm) ?? []

      expect(headings, `${section.slug}/${page.slug}`).toEqual([`# ${page.title}`])
    }
  })

  it("declares its metadata from the navigation rather than beside it", () => {
    for (const { section, page } of writtenOrder) {
      expect(sourceOf(section.slug, page.slug), `${section.slug}/${page.slug}`).toContain(
        `pageMetadata("${section.slug}", "${page.slug}")`
      )
    }
  })

  /**
   * A generated section's landing page has no MDX and no `[param]` route to
   * fall into: it is a `page.tsx` in the section directory, and if that file
   * goes the rail keeps pointing at a 404 and every check above stays green.
   */
  it("has a route behind every generated landing page", () => {
    for (const section of docsSections.filter((candidate) => candidate.source === "generated")) {
      const landing = docsLandingOf(section)

      if (landing === undefined) continue

      expect(existsSync(join(docsRoot, section.slug, "page.tsx")), section.slug).toBe(true)
    }
  })

  it("puts every section's pages in one directory named for it", () => {
    for (const section of docsSections) {
      const directory = join(docsRoot, section.slug)

      expect(existsSync(directory), section.slug).toBe(true)
    }
  })
})

describe("the examples the pages name", () => {
  it("names only examples the catalogue registers", () => {
    for (const id of referencedExampleIds()) {
      expect(docsExampleIds, `<Example id="${id}">`).toContain(id)
    }
  })

  it("leaves no example registered and unused", () => {
    const referenced = new Set(referencedExampleIds())

    expect(docsExampleIds.filter((id) => !referenced.has(id))).toEqual([])
  })

  it("shows at least one on the introduction", () => {
    expect(sourceOf("getting-started", "introduction")).toMatch(/<Example\s+id="/)
  })
})
