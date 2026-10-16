import { readFileSync } from "node:fs"
import { fileURLToPath } from "node:url"

import { beforeAll, describe, expect, it } from "vitest"

import { DOC_PAGES, INSTALLATION, type DocPage } from "./docs-pages"
import { pathsLinkedFrom } from "./naming"
import { servedBy } from "./routes"
import { ORIGIN_FOR_TESTS, servedPages, type ServedPage } from "./served"

/**
 * Every link this site has into the documentation, held to the page it lands on.
 *
 * The 4 October finding, in this lane's own words: *"A link to `/docs#something`
 * is checked for nothing, and the same is true of `/demo` and `/lessons`…
 * Both are true today and both were checked by a person. Nothing would say so
 * if either stopped being."*
 *
 * This closes the `/docs` half of it, by the route the 15 October run took for
 * the portal's under-construction banner: **read the other lane's page off the
 * repository.** Nothing here imports `(docs)`, renders it, or asserts over its
 * chrome. A documentation page is an MDX file with its own heading at the top,
 * and the two things this site has been promising about those pages — that they
 * exist, and that a particular thing is on them — are both in that file.
 *
 * ## Four rules, and the third is the one with teeth
 *
 * 1. **A page this site names is a page this application serves.** `routes.ts`
 *    answers it, and it answers for the whole application rather than for this
 *    route group, which is what makes a documentation address checkable here.
 * 2. **It is the page this lane thinks it is**, by its own heading.
 * 3. **No link into the documentation goes anywhere undeclared.** Without this
 *    one the other three check a list rather than the site, and the next run to
 *    type a path into a band gets no check at all. That was the state of the
 *    site before this run: four controls pointed into the documentation and
 *    nothing held any of them.
 * 4. **The page carries what this site sent the reader for.**
 *
 * `/docs` itself is deliberately allowed by rule 3 and is not an entry. It is
 * the whole documentation rather than a page, it is what *Read the docs* should
 * mean, and `routes.test.ts` has held it since 4 October.
 */

/** The repository root, because `servedBy` answers in repo-relative paths. */
const REPOSITORY = fileURLToPath(new URL("../../../../../", import.meta.url))

/**
 * The page's words, with MDX's own punctuation out of the way.
 *
 * Two normalizations and no more. Emphasis markers are dropped because a phrase
 * this site promised is a phrase a reader reads, and `**one function that
 * changes a page**` is that phrase with four asterisks in it. Whitespace is
 * collapsed because the documentation's prose is hard-wrapped at about eighty
 * columns, so any quotation longer than a few words crosses a line break — a
 * check that did not do this would pass only the short claims and would look
 * exactly like one that worked.
 */
const wordsIn = (source: string): string => source.replace(/\*/g, "").replace(/\s+/g, " ")

const sourceOf = (page: DocPage): string => {
  const file = servedBy(page.path)

  if (file === undefined) return ""

  return readFileSync(`${REPOSITORY}${file}`, "utf8")
}

/**
 * The first heading of an MDX page, which is the one a reader lands on.
 *
 * Read off the lines rather than out of `wordsIn`, because a heading is a line
 * and collapsing the newlines takes away the only thing that ends it. The
 * imports above it are ordinary lines and none of them begins with a hash.
 */
const headingIn = (source: string): string | undefined =>
  source
    .split("\n")
    .map((line) => line.match(/^#\s+(.+?)\s*$/)?.[1])
    .find((heading) => heading !== undefined)

describe("a documentation page this site names", () => {
  it.each(DOC_PAGES)("$path is an address this application serves", (page) => {
    expect(servedBy(page.path), `${page.path} is served by nothing, so this site points at a 404`).toBeDefined()
  })

  /**
   * The self-check, and what it is actually for is narrower than it looks.
   *
   * Every rule below is of the form *the documentation's page says X*, so the
   * obvious thing to claim here is that a broken extraction would make them
   * pass on an empty string. **It would not, and that was measured rather than
   * assumed**: pointed at a directory that does not exist, this file goes red
   * eight ways, because neither a heading nor a quoted phrase is found in
   * nothing.
   *
   * What it buys is the **reason**. Those eight failures all read as though the
   * documentation lane had rewritten four pages, which sends the next run to
   * read somebody else's route group when the thing that moved is this file. A
   * failure saying the page was never read says where to look.
   *
   * And it is the assertion that still holds the day a rule here is written the
   * other way round — *the page no longer says X*, which is the shape
   * `unfinished.test.ts` needs in both directions and the shape that genuinely
   * does pass on an empty read.
   */
  it.each(DOC_PAGES)("$path was read, so the checks below are looking at something", (page) => {
    expect(sourceOf(page).length).toBeGreaterThan(200)
  })

  it.each(DOC_PAGES)("$path is headed the way this site says it is", (page) => {
    expect(headingIn(sourceOf(page))).toBe(page.heading)
  })

  /**
   * The claim, held to the page rather than to the link beside it.
   *
   * This is the half the 4 October finding is about. *Follow the install guide*
   * is a promise about a command being on the far side of a link, and the
   * command is in somebody else's file.
   */
  it.each(DOC_PAGES.flatMap((page) => page.carries.map((phrase) => ({ page, phrase }))))(
    "$page.path still carries $phrase",
    ({ page, phrase }) => {
      expect(
        wordsIn(sourceOf(page)).includes(phrase),
        `${page.path} no longer says "${phrase}", so either point the link elsewhere or reword the promise`
      ).toBe(true)
    }
  )
})

describe("every link this site has into the documentation", () => {
  let linked: readonly { readonly where: string; readonly path: string }[] = []

  beforeAll(async () => {
    const pages: readonly ServedPage[] = await servedPages()

    linked = pages.flatMap((page) =>
      [...pathsLinkedFrom(page.tree.root, ORIGIN_FOR_TESTS)]
        .filter((path) => path.startsWith("/docs/"))
        .map((path) => ({ where: `${page.route.path} (${page.state})`, path }))
    )
  })

  /**
   * The sweep looked at a site with links in it, which is the same self-check
   * one level out: a walk that finds nothing passes rule 3 trivially.
   */
  it("found the deep links this run put on the site", () => {
    expect(linked.length).toBeGreaterThan(0)
    expect(new Set(linked.map((entry) => entry.path)).size).toBeGreaterThan(1)
  })

  it("lands on a page this site has written down", () => {
    const declared = new Set(DOC_PAGES.map((page) => page.path))

    expect(
      linked
        .filter((entry) => !declared.has(entry.path))
        .map((entry) => `${entry.where} links to ${entry.path}, which is in no entry of DOC_PAGES`)
    ).toEqual([])
  })
})

/**
 * The bug this run was about, named rather than left to the rules above.
 *
 * A sweep reports *nothing is wrong*; it never reports *this control was the
 * reason*. The front door's install band printed `pnpm add` and then offered
 * *Follow the install guide* pointing at `/docs`, which redirects to the first
 * page in reading order — *Introduction*, three pages above the command. The
 * rules above would all have passed on that site, because a site with no deep
 * links into the documentation satisfies every one of them.
 */
describe("the control that offers the install guide", () => {
  it("goes to the page with the command on it", async () => {
    const pages = await servedPages()
    const front = pages.filter((page) => page.route.path === "/")

    expect(front.length).toBeGreaterThan(0)

    for (const page of front) {
      expect([...pathsLinkedFrom(page.tree.root, ORIGIN_FOR_TESTS)]).toContain(INSTALLATION.path)
    }
  })
})
