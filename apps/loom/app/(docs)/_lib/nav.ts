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
 * Architecture is written, and is the odd one: its prose is orientation only
 * and everything it points at — the course in `lessons/`, the rulings in
 * `decisions/` — is read from the repository as the page builds. So it is two
 * short MDX files that the checks below can see, holding two components that
 * cannot say anything the repository does not.
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

/**
 * Architecture: a thin index that points outward, and the last section on
 * purpose.
 *
 * It comes after the reference because a reader who wants to know *why* has
 * usually already tried to build something. Two pages is the whole of it —
 * anything longer would be the third copy of an argument that already exists in
 * `lessons/` and `decisions/`, and the copy on a docs site is the one that goes
 * stale, because nothing fails when it does.
 */
const architectureSection: DocsSection = {
  slug: "architecture",
  title: "Architecture",
  source: "written",
  pages: [
    {
      slug: "how-it-fits-together",
      title: "How it fits together",
      summary:
        "The eight ideas the whole system rests on, a paragraph each, and where to go for the reasoning and for the ruling.",
    },
    {
      slug: "decision-records",
      title: "Decision records",
      summary:
        "Every ruling Loom has made, what it means when one has been replaced, and why the trail is never edited.",
    },
  ],
}

const orderedSections: readonly DocsSection[] = [
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
        slug: "scaffolding-a-project",
        title: "Scaffolding a project",
        summary:
          "One command writes a primitive of your own, a registry that regenerates itself, and the test that catches the one failure nothing else reports.",
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
      {
        slug: "your-first-change",
        title: "Your first change",
        summary:
          "Ask for a change and watch what the runtime does with it: accept it, hold it for a person, or refuse it — the whole loop, live in your browser.",
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
      {
        slug: "theming",
        title: "Making it look like yours",
        summary:
          "A palette, a font pack and a style preset, named by id on the root — and how to get your own brand colour into one without shipping a page nobody can read.",
      },
      {
        slug: "what-ai-may-change",
        title: "What AI may change",
        summary:
          "The second list you write: which of your primitives matter, how much latitude each kind of asker gets, and the thirteen settings that decide it.",
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
      {
        slug: "the-history-of-a-page",
        title: "The history of a page",
        summary:
          "Where a page lives, what the log records about every change that was applied, and why an undo is a proposal rather than a rewind.",
      },
      {
        slug: "connecting-a-model",
        title: "Connecting a model",
        summary:
          "The one step that guesses: what a model is shown, what it is allowed to say back, what a request costs, and who has to act when it fails.",
      },
      {
        slug: "what-your-app-has-to-do",
        title: "What your app has to do",
        summary:
          "The one function that writes, the seven ways a write can end, and what your own code owes a person for each of them.",
      },
      {
        slug: "what-every-ask-leaves-behind",
        title: "What every ask leaves behind",
        summary:
          "The record of what was asked rather than of what happened: what a telemetry record keeps, the eight ways an ask can end, whether a confidence was worth anything, and how a journal is allowed to forget.",
      },
      {
        slug: "going-to-production",
        title: "Going to production",
        summary:
          "The three places a deployment keeps state, the tables Loom creates for them, and what your app is told when the database is not there.",
      },
    ],
  },
  apiReferenceSection,
  architectureSection,
]

export const docsSections: readonly DocsSection[] = orderedSections

/**
 * The written sections, for the checks that are about files on disk.
 *
 * Derived rather than listed, because a section that appeared in one list and
 * not the other would be a page nobody checks — which is the failure the two
 * checks exist to catch.
 */
export const writtenDocsSections: readonly DocsSection[] = docsSections.filter(
  (section) => section.source === "written"
)

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
