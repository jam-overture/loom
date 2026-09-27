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
  /**
   * The last path segment, and the directory name under `app/docs/<section>/`.
   *
   * Empty on the one kind of page that has no segment of its own: a **landing
   * page**, which is the section itself rather than a page inside it. Its
   * address is `/docs/<section>`, and `docsHref` is the only place that knows
   * so — everything else asks for an href and gets one.
   */
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
  /**
   * What one of this section's pages is, plural — and by declaring it, that its
   * pages are **one page rendered many times** rather than separate writing.
   *
   * Only a section whose pages are variations of each other says this, and the
   * reference is the only one today: its sixteen pages are the same five bands
   * with a different import's numbers in them. That has a consequence a reader
   * feels, which is the whole reason this field exists. A sentence in one of
   * those bands is a sentence on all sixteen pages, so a query whose words are
   * in a band matches sixteen near-identical results and can fill a list ten
   * rows long — the search box folds them into one row reading *the closest of
   * 9 imports*, and this is the word it uses.
   *
   * It is declared rather than inferred from `source`, because being generated
   * is not the property that licenses folding. A generated section could
   * perfectly well hold pages that answer different questions; what licenses it
   * is that these answer the same one about a different door.
   *
   * **A landing page is never a member of the family.** It is the section
   * itself, it says something the pages inside it do not, and folding it away
   * would hide the page that answers best. `build.ts` is where that is applied.
   */
  readonly family?: string
  /**
   * The section's pages, in reading order, a landing page first where there is
   * one.
   *
   * A landing page is in this list rather than beside it so that everything
   * derived from the navigation — the pager, the search index, the metadata
   * check — reaches it without being taught a second shape. The rail is the one
   * place the difference shows, because a section whose own title is a link has
   * nothing to list twice.
   */
  readonly pages: readonly DocsPage[]
}

/**
 * The slug of a page that is its section.
 *
 * A constant rather than an empty string spelled out at each of the four places
 * that ask: `slug === ""` reads as a page that forgot its name, and this reads
 * as the thing it is.
 */
export const DOCS_LANDING_SLUG = ""

/** The page that *is* this section, where the section has one. */
export const docsLandingOf = (section: DocsSection): DocsPage | undefined =>
  section.pages.find((page) => page.slug === DOCS_LANDING_SLUG)

/** The pages *inside* this section — everything the rail lists under its title. */
export const docsPagesIn = (section: DocsSection): readonly DocsPage[] =>
  section.pages.filter((page) => page.slug !== DOCS_LANDING_SLUG)

/**
 * The API reference: one page per published entry point, and nothing typed
 * twice.
 *
 * A landing page comes first, and it is the one page in this section that is
 * not a door. Sixteen pages that each say *most of this package is somewhere
 * else* need one place that says where, and a reader who has not got a name to
 * search for has nothing else to go on.
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
  family: "imports",
  pages: [
    {
      slug: DOCS_LANDING_SLUG,
      title: "API reference",
      /*
       * Counted rather than written. "All sixteen imports" is a true heading
       * today and a false one the morning a seventeenth door opens — and
       * nothing would go red, because the door itself would have a page and the
       * rail would be complete. It is the same rule the pages below it follow.
       */
      heading: `All ${entryPoints.length} imports`,
      summary:
        "Every import this package publishes, how much of the package is behind each one, and the thing they do not do: nest.",
    },
    ...entryPoints.map((entry) => ({
      slug: apiSlugFor(entry.specifier),
      title: apiNavLabelFor(entry.specifier),
      summary: entry.summary,
      heading: entry.specifier,
    })),
  ],
}

/**
 * Architecture: a thin index that points outward, and the last section on
 * purpose.
 *
 * It comes after the reference because a reader who wants to know *why* has
 * usually already tried to build something. Three pages is the whole of it, and
 * the limit that keeps it there is not a page count: **no page in this section
 * may explain a ruling.** They may name one, count them, say what a stranger
 * needs in order to decide whether to open one — and the argument itself has to
 * stay in `lessons/` and `decisions/`, because the copy on a documentation site
 * is the one that goes stale, since nothing fails when it does.
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
      slug: "what-it-costs-you",
      title: "What it costs you",
      summary:
        "Eight things you can no longer do, the ruling behind each one, and the handful of constraints that are not settled.",
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
        slug: "quickstart",
        title: "Quickstart",
        summary:
          "One file and one command: register a primitive of your own, draw a page nobody wrote as markup, and watch three asks get three different answers.",
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
        slug: "where-content-comes-from",
        title: "Where the content comes from",
        summary:
          "A node can ask your app a question — for a list, a field, a price — and read the answer beside its props, with a named reason when there is none.",
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
        slug: "answering-a-held-change",
        title: "Answering a held change",
        summary:
          "The queue a person answers from: what is waiting in it, how to tell a change that can still be applied from one that cannot, and what saying yes actually does.",
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
        slug: "when-nothing-comes-back",
        title: "When nothing comes back",
        summary:
          "Loom waits for code you wrote in three places, and none of those waits is unbounded: what happens when a model, a source or an endpoint never answers, and how to change how long it is given.",
      },
      {
        slug: "what-your-app-has-to-do",
        title: "What your app has to do",
        summary:
          "The one function that writes, the seven ways a write can end, and what your own code owes a person for each of them.",
      },
      {
        slug: "what-a-form-posts-to",
        title: "What a form posts to",
        summary:
          "A form in a tree names a destination and never carries one: how a page asks a visitor for something, where the address comes from, and what happens when nobody can supply it.",
      },
      {
        slug: "what-every-ask-leaves-behind",
        title: "What every ask leaves behind",
        summary:
          "The record of what was asked rather than of what happened: what a telemetry record keeps, the eight ways an ask can end, whether a confidence was worth anything, and how a journal is allowed to forget.",
      },
      {
        slug: "what-your-readers-do",
        title: "What your readers do",
        summary:
          "A published page can report how it is being read — four kinds of signal, no content in any of them, and nothing switched on until your own code asks for it.",
      },
      {
        slug: "going-to-production",
        title: "Going to production",
        summary:
          "The three places a deployment keeps state, the tables Loom creates for them, and what your app is told when the database is not there.",
      },
      {
        slug: "when-something-looks-wrong",
        title: "When something looks wrong",
        summary:
          "Who put this node here, whether the page still matches its own history, and why a change nobody answered for three days can no longer be answered at all.",
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

/**
 * A page's address, and the only statement of what one looks like.
 *
 * A landing page has no segment of its own, so its address is the section's:
 * `/docs/api-reference` rather than `/docs/api-reference/`. Everything that
 * builds a docs link calls this — the rail, the pager, the search index, the
 * metadata — which is what keeps the trailing-slash version from existing
 * anywhere.
 */
export const docsHref = (sectionSlug: string, pageSlug: string): string =>
  pageSlug === DOCS_LANDING_SLUG ? `/docs/${sectionSlug}` : `/docs/${sectionSlug}/${pageSlug}`

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
