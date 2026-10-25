import { existsSync, readFileSync, readdirSync } from "node:fs"
import { join } from "node:path"
import { fileURLToPath } from "node:url"

import { describe, expect, it } from "vitest"

import { docsExamples, docsExampleIds } from "./examples/catalogue"
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

/**
 * Both components that put an example on a page.
 *
 * `<BoundExample>` is the server component that resolves an example's questions
 * before handing it over, and it names an example by exactly the same id. A
 * pattern that knew only about `<Example>` would read the one example that asks
 * its deployment anything as registered and never used — which is what happened
 * the first time, and is the reason this is a pattern with an alternation in it
 * rather than two patterns.
 */
const EXAMPLE_REFERENCE = /<(?:Bound)?Example\s+id="([^"]+)"/g

const referencedExampleIds = (): readonly string[] =>
  writtenOrder.flatMap((entry) =>
    [...sourceOf(entry.section.slug, entry.page.slug).matchAll(EXAMPLE_REFERENCE)].map(
      (match) => match[1] ?? ""
    )
  )

/**
 * Which of the two components named each example, by id.
 *
 * `<Example` cannot match inside `<BoundExample` — the character before the
 * word is `d` and the pattern wants `<` — so the two sets are disjoint without
 * anything having to exclude one from the other.
 */
const namedBy = (component: "Example" | "BoundExample"): readonly string[] => {
  const pattern = new RegExp(`<${component}\\s+id="([^"]+)"`, "g")

  return writtenOrder.flatMap((entry) =>
    [...sourceOf(entry.section.slug, entry.page.slug).matchAll(pattern)].map((match) => match[1] ?? "")
  )
}

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

  /**
   * A landing page spells its own slug with the constant rather than with `""`,
   * which is the whole reason `DOCS_LANDING_SLUG` exists: an empty string in a
   * call reads as a page that forgot its name.
   */
  it("declares its metadata from the navigation rather than beside it", () => {
    for (const { section, page } of writtenOrder) {
      const argument = page.slug === DOCS_LANDING_SLUG ? "DOCS_LANDING_SLUG" : `"${page.slug}"`

      expect(sourceOf(section.slug, page.slug), `${section.slug}/${page.slug}`).toContain(
        `pageMetadata("${section.slug}", ${argument})`
      )
    }
  })

  /**
   * **Every written section is an address.**
   *
   * Four of them were not. `/docs/api-reference` served a page and
   * `/docs/getting-started` served a 404, along with the three other written
   * sections — so a reader who shortened an address, or who was handed *the
   * Architecture section* as a place rather than as a page, arrived nowhere.
   * Nothing in this repository could have said so: a section with no landing
   * page is a legal section, the rail draws its title as plain text, and no
   * link on the site pointed at the address that was missing.
   *
   * This is the check that makes it one rule rather than four pages somebody
   * wrote once. A sixth section added tomorrow with no page of its own fails
   * here.
   */
  it("serves every written section's own address", () => {
    for (const section of writtenDocsSections) {
      expect(docsLandingOf(section), section.slug).toBeDefined()
      expect(existsSync(pageFileFor(section.slug, DOCS_LANDING_SLUG)), section.slug).toBe(true)
    }
  })

  /**
   * A landing page names its own section when it asks for the list of pages in
   * it, and the section it names is the directory it is in.
   *
   * The slug is written twice on one of these pages — once for the metadata and
   * once for the list — and this is what stops the second one drifting. A page
   * naming another section's slug would render a perfectly good list of the
   * wrong pages, which is the sort of wrong nothing else here would notice.
   */
  it("lists its own pages on each landing page", () => {
    for (const section of writtenDocsSections) {
      expect(sourceOf(section.slug, DOCS_LANDING_SLUG), section.slug).toContain(
        `<PagesInThisSection section="${section.slug}" />`
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

  it("names an example that asks for data through the component that resolves it", () => {
    /**
     * The pairing a published page would otherwise get wrong silently. The one
     * example whose tree asks its deployment a question has to be named by
     * `<BoundExample>`, because plain `<Example>` renders it with no resolution
     * at all — which is legal, draws an empty list, and puts a diagnostic strip
     * under it on a page about data arriving correctly.
     */
    const asking = docsExampleIds.filter((id) => docsExamples.get(id)?.answers !== undefined)

    expect(asking.length).toBeGreaterThan(0)
    expect([...namedBy("BoundExample")].sort()).toEqual([...asking].sort())

    for (const id of namedBy("Example")) {
      expect(docsExamples.get(id)?.answers, `<Example id="${id}">`).toBeUndefined()
    }
  })

  it("shows at least one on the introduction", () => {
    expect(sourceOf("getting-started", "introduction")).toMatch(/<Example\s+id="/)
  })
})
