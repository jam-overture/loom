import { entryPoints } from "./entry-points"
import { apiNavLabelFor, apiSlugFor } from "./api/model"

/**
 * The site's shape, in one place.
 *
 * The sidebar, the prev/next pager, the sitemap and the "does this page exist"
 * test all read this list, so there is exactly one statement of what the
 * documentation contains and in what order. A page that is written but not
 * listed here is unreachable, and a page listed here that nobody wrote is a
 * broken link — `content.test.ts` fails on either, which is what keeps the two
 * halves honest without anyone remembering to check.
 *
 * Two kinds of section live here and the difference is which of those two
 * checks applies. A **written** section is prose in MDX, one directory per
 * page. A **generated** section has no files at all: its pages come from
 * something the repository already knows, and asking for a `page.mdx` behind
 * one would be asking for the copy that generating it exists to avoid.
 *
 * Architecture, the last of §4c's five sections, is not here yet — an empty
 * group in a sidebar is a promise the site cannot keep, so a section arrives
 * with its pages.
 */

export type DocsPage = {
  /** The last path segment, and the directory name under `app/docs/<section>/`. */
  readonly slug: string
  /** What the rail and the pager call it. */
  readonly title: string
  /** One sentence. It is the page's `<meta name="description">` and its pager caption. */
  readonly summary: string
  /** The page's own heading, where it is longer than the rail can carry. */
  readonly heading?: string
}

export type DocsSection = {
  readonly slug: string
  readonly title: string
  /** Whether a person writes these pages or the repository does. */
  readonly source: "written" | "generated"
  readonly pages: readonly DocsPage[]
}

/**
 * The API reference: one page per published entry point, and nothing typed
 * twice.
 *
 * The list is `entryPoints`, which `entry-points.test.ts` already holds against
 * the runtime's own `exports` map — so a door that opens in `package.json` and
 * is missing from the rail is a red test rather than a page nobody can find.
 * What is *behind* each door is generated separately and read only by the page;
 * the rail deliberately does not import it, because the sidebar is a client
 * component and three hundred kilobytes of signatures have no business in a
 * browser.
 */
const apiReferenceSection: DocsSection = {
  slug: "api-reference",
  title: "API reference",
  source: "generated",
  pages: entryPoints.map((entry) => ({
    slug: apiSlugFor(entry.specifier),
    title: apiNavLabelFor(entry.specifier),
    summary: entry.summary,
    heading: entry.specifier,
  })),
}

const writtenSections: readonly DocsSection[] = [
  {
    slug: "getting-started",
    title: "Getting started",
    source: "written",
    pages: [
      {
        slug: "introduction",
        title: "Introduction",
        summary:
          "What Loom is, and the bargain it asks you to take: a bounded vocabulary in exchange for a change you can review.",
      },
      {
        slug: "installation",
        title: "Installation",
        summary: "Install the runtime and find your way around its ten entry points.",
      },
      {
        slug: "your-first-tree",
        title: "Your first tree",
        summary: "Build a page as data — elements, text and props — with the builders that cannot produce an invalid tree.",
      },
      {
        slug: "rendering-a-tree",
        title: "Rendering a tree",
        summary:
          "Turn a tree into React through a registry, resolve a theme, and read the diagnostics a render leaves behind.",
      },
    ],
  },
  {
    slug: "building-with-loom",
    title: "Building with Loom",
    source: "written",
    pages: [
      {
        slug: "primitives",
        title: "Primitives and the registry",
        summary:
          "A primitive is a name, a schema and a component. The registry is the allowlist of what a proposal may say.",
      },
      {
        slug: "composition",
        title: "Children and slots",
        summary:
          "How a primitive holds other primitives: an ordered list of children, and named regions the primitive places itself.",
      },
    ],
  },
  {
    slug: "the-runtime",
    title: "The runtime",
    source: "written",
    pages: [
      {
        slug: "proposing-a-change",
        title: "Proposing a change",
        summary:
          "Nothing edits a page directly. An ask becomes a written plan of four kinds of operation, and only then is anything applied.",
      },
      {
        slug: "what-the-gate-decides",
        title: "What the Gate decides",
        summary:
          "Yes, ask a person, or no — and the two questions the runtime asks about a change before it answers.",
      },
    ],
  },
]

export const docsSections: readonly DocsSection[] = [...writtenSections, apiReferenceSection]

/** The written sections, for the checks that are about files on disk. */
export const writtenDocsSections: readonly DocsSection[] = writtenSections

export type DocsEntry = {
  readonly href: string
  readonly section: DocsSection
  readonly page: DocsPage
}

export const docsHref = (sectionSlug: string, pageSlug: string): string =>
  `/docs/${sectionSlug}/${pageSlug}`

/** Every page, in reading order. The pager walks this and nothing else. */
export const docsOrder: readonly DocsEntry[] = docsSections.flatMap((section) =>
  section.pages.map((page) => ({ href: docsHref(section.slug, page.slug), section, page }))
)

export const docsEntryAt = (href: string): DocsEntry | undefined =>
  docsOrder.find((entry) => entry.href === href)

export type DocsNeighbours = {
  readonly previous?: DocsEntry
  readonly next?: DocsEntry
}

/**
 * What comes before and after, across section boundaries.
 *
 * Crossing them is deliberate: a reader who finishes the last page of "Getting
 * started" is ready for the first page of "Building with Loom", and a pager
 * that stopped at the end of a section would leave them to find it themselves.
 *
 * An unknown href has no neighbours rather than the first page's — a pager
 * cannot say where you are going if it does not know where you are.
 */
export const docsNeighbours = (href: string): DocsNeighbours => {
  const index = docsOrder.findIndex((entry) => entry.href === href)

  if (index === -1) return {}

  const previous = docsOrder[index - 1]
  const next = docsOrder[index + 1]

  return { ...(previous ? { previous } : {}), ...(next ? { next } : {}) }
}

/** Where `/` sends a reader: the first page of the first section. */
export const docsEntryPoint = (): string => {
  const first = docsOrder[0]

  if (first === undefined) throw new Error("loom: the documentation has no pages")

  return first.href
}
