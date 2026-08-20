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
 * Only sections that have pages are listed. Three of §4c's five — the runtime,
 * the API reference and Architecture — are not written yet, and an empty group
 * in a sidebar is a promise the site cannot keep. They arrive with their pages.
 */

export type DocsPage = {
  /** The last path segment, and the directory name under `app/docs/<section>/`. */
  readonly slug: string
  readonly title: string
  /** One sentence. It is the page's `<meta name="description">` and its pager caption. */
  readonly summary: string
}

export type DocsSection = {
  readonly slug: string
  readonly title: string
  readonly pages: readonly DocsPage[]
}

export const docsSections: readonly DocsSection[] = [
  {
    slug: "getting-started",
    title: "Getting started",
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
