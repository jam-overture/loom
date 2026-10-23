import { readFileSync } from "node:fs"
import { fileURLToPath } from "node:url"

import { beforeAll, describe, expect, it } from "vitest"

import { PACKAGES, RUNTIME_PACKAGE, STARTER_PACKAGE } from "./copy"
import { DOC_PAGES, INSTALLATION, type DocPage } from "./docs-pages"
import { pathsLinkedFrom } from "./naming"
import { servedBy } from "./routes"
import { ORIGIN_FOR_TESTS, SERVED_STATE_COUNT, servedPages, sweepCover, type ServedPage } from "./served"
import { PAGES_AT_LEAST, SITE_PATHS } from "./site"

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
 * A fifth arrived on 18 October and is at the foot of this file: the install
 * guide names **every package this site's own command installs**, derived from
 * `PACKAGES` rather than quoted. Rule 4 had been standing in for it with one
 * typed command fragment that named one of the two.
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

/**
 * **One sweep for the file, which it did not have until 23 October.**
 *
 * It swept twice — once in the describe below and once inside the `it` under
 * that — so this file built 150 pages a run to read two things off 75, and
 * neither sweep was held to having reached the site. The guard the other six
 * sweep files carry was missing here altogether, and the floors that stood in
 * for it (`linked.length`, the distinct count, `front.length`) are floors on
 * what the walk *found* rather than on where it looked.
 *
 * Measured with `servedPages` dropping its last route, so the sweep read two
 * of this site's three pages: **29 of 29 green.** The deep links on the two
 * that remained cleared every floor, and nothing said a third of the site had
 * gone unread.
 */
let pages: readonly ServedPage[] = []

beforeAll(async () => {
  pages = await servedPages()
})

describe("the sweep these rules are read off", () => {
  it("reached every page of this site, in every state it can be served in", () => {
    const cover = sweepCover(pages)

    expect(cover).toEqual({ states: SERVED_STATE_COUNT, routes: SITE_PATHS })
    expect(cover.routes.length).toBeGreaterThanOrEqual(PAGES_AT_LEAST)
  })
})

describe("every link this site has into the documentation", () => {
  let linked: readonly { readonly where: string; readonly path: string }[] = []

  beforeAll(() => {
    linked = pages.flatMap((page) =>
      [...pathsLinkedFrom(page.tree.root, ORIGIN_FOR_TESTS)]
        .filter((path) => path.startsWith("/docs/"))
        .map((path) => ({ where: `${page.route.path} (${page.state})`, path }))
    )
  })

  /**
   * The sweep looked at a site with links in it, which is the same self-check
   * one level out: a walk that finds nothing passes rule 3 trivially.
   *
   * It is kept beside the coverage guard above rather than replaced by it. The
   * two fail for different reasons — *the sweep never read the site* and *the
   * site stopped linking into the documentation* — and this file's own docblock
   * on the self-check argues that the reason is the thing a guard buys.
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
 * reason*. The front door's install band printed its command and then offered
 * *Follow the install guide* pointing at `/docs`, which redirects to the first
 * page in reading order — *Introduction*, three pages above the command. The
 * rules above would all have passed on that site, because a site with no deep
 * links into the documentation satisfies every one of them.
 */
describe("the control that offers the install guide", () => {
  it("goes to the page with the command on it", () => {
    const front = pages.filter((page) => page.route.path === "/")

    expect(front.length).toBeGreaterThan(0)

    for (const page of front) {
      expect([...pathsLinkedFrom(page.tree.root, ORIGIN_FOR_TESTS)]).toContain(INSTALLATION.path)
    }
  })
})

/**
 * A package name, matched as a name and not as a run of characters.
 *
 * `@jam-overture/loom` is a prefix of `@jam-overture/loom-primitives`, so
 * `includes` is satisfied by the longer one standing where the shorter one
 * should be — which is precisely the state this rule exists to refuse, since
 * *the starter library is the only one the guide still names* is the break it
 * is watching for. The lookahead is the character classes a package name is
 * made of: a name followed by a word character, a dot, a slash or a hyphen is
 * the start of a different name.
 *
 * Built per call rather than held in a map because the input is two constants
 * this module already owns, and a cached regular expression with `g` on it is
 * the `lastIndex` bug this file would find the hard way.
 *
 * **A full stop is admitted deliberately**, and the twin of this matcher in
 * `pages/installed.test.ts` has the whole of why: refusing one makes the rule
 * go red on a name at the end of a sentence, which is correct copy. What the
 * lookahead is for is the hyphen between these two names, not punctuation.
 */
const namesPackage = (source: string, name: string): boolean =>
  new RegExp(`${name.replace(/[.*+?^${}()|[\]\\\/-]/g, "\\$&")}(?![\\w/-])`).test(source)

/**
 * The hop from the command to the guide, held to the packages rather than to a
 * sentence somebody typed.
 *
 * The install band is the one control on this site that asks a stranger to run
 * something, and the button under it promises the longer version of what they
 * were just shown. Until today the only thing holding that promise was one
 * quoted command fragment naming one of the two packages — and the page it
 * quotes says *"You can skip the second one."* The docblock on `INSTALLATION`
 * has the whole of it.
 *
 * Both rules pass on the site as it stands. That is what they are for: the
 * first was written because the break it names is one sentence away in somebody
 * else's file, and the second because the first would be worth nothing if a
 * third Loom package arrived and only one surface heard about it.
 */
describe("the install guide and the command that sends a reader to it", () => {
  const guide = (): string => wordsIn(sourceOf(INSTALLATION))

  it.each(PACKAGES)("names %s, which this site's own command installs", (name) => {
    expect(
      namesPackage(guide(), name),
      `${INSTALLATION.path} no longer names ${name}, which the front door's install command installs — so either take it out of PACKAGES or raise it with Loom docs`
    ).toBe(true)
  })

  /**
   * The reverse, scoped to this project's own packages.
   *
   * The guide asks for `react` and `react-dom` as well, and that is correct and
   * is not this band's business: the band's heading is *put it in a project you
   * already have*, so a React renderer is a thing the reader has. What would be
   * this band's business is a **third `@jam-overture/` package** becoming part
   * of installing Loom and the front door going on printing two — a command
   * that no longer installs what the guide beside it teaches.
   */
  it("asks for no Loom package the front door leaves out of its command", () => {
    const named = new Set(guide().match(/@jam-overture\/[\w.-]+/g) ?? [])

    expect(named.size).toBeGreaterThan(0)
    expect([...named].filter((name) => !PACKAGES.includes(name))).toEqual([])
  })

  /**
   * The matcher itself, because the rule above is only as good as it is and a
   * substring check would pass both of them on a page naming one package.
   */
  it("reads a whole name, so the starter library cannot stand in for the runtime", () => {
    expect(namesPackage(STARTER_PACKAGE, STARTER_PACKAGE)).toBe(true)
    expect(namesPackage(STARTER_PACKAGE, RUNTIME_PACKAGE)).toBe(false)
    expect(namesPackage(`${RUNTIME_PACKAGE} and more`, RUNTIME_PACKAGE)).toBe(true)
    expect(namesPackage(`${RUNTIME_PACKAGE}.`, RUNTIME_PACKAGE)).toBe(true)
  })
})
