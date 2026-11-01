import { apiReference } from "./api/reference"
import { fencesOnPage } from "./fences/extract"
import { DOCS_LANDING_SLUG, docsHref, docsSections } from "./nav"
import { generatedPageWords } from "./search/generated"
import { readPageProse } from "./search/prose"

/**
 * What a page of this site puts in front of a reader, in bytes.
 *
 * **The plain version.** Every other number this surface holds is about the
 * *search box*: five caps, the largest of them 80,000 compressed bytes for the
 * prose of all thirty-five written pages at once. They exist because somebody
 * asked what a reader's connection is being spent on. Nobody had ever asked the
 * same question about **a page** — and one page of this site sends a reader
 * three hundred thousand compressed bytes, which is close to four times the
 * whole search corpus, before they have typed anything.
 *
 * ## The number this was written for
 *
 * `api/extract.ts` caps a single signature at `SIGNATURE_CAP` bytes, and the
 * reason it gives is a reader: a declaration that ran to a screen and a half is
 * cut, with the page saying how much it kept. **There was no cap on how many
 * signatures go on one page.** Six symbols in the whole reference are cut by
 * the per-symbol rule; `/docs/api-reference/signals` renders five hundred and
 * sixty-eight uncut ones, and the theoretical page the two rules together
 * permit is 568 × 6,000 bytes.
 *
 * So the pair is the point rather than either number: *a cap on how long one of
 * them may be, and none on how many.*
 *
 * ## What is counted, and why it is not the HTML
 *
 * The honest measurement of what a reader downloads is the served page, and it
 * cannot be taken here: it needs a build, a server and a request, and the
 * numbers it gives move with Next's hydration payload rather than with anything
 * this surface decides. The run that filed this measured it that way for the
 * report — `/docs/api-reference/signals` is 1,914,446 bytes of HTML, 308,898
 * compressed — and what the test holds is the **text those bytes are made of**,
 * counted off the same sources the pages render from.
 *
 * That is the right half to hold for the same reason `search/build.ts` holds
 * the index rather than the response: it is the part this lane writes, it is
 * build-free, and it moves in the same direction and for the same reasons.
 *
 * **A page's weight is two numbers, because they grow for different reasons.**
 * Prose is sentences and somebody wrote them. Code is blocks a reader copies —
 * fenced blocks on a written page, published signatures on a generated one —
 * and on the heaviest page in the site it is 93% of the total and not one byte
 * of it was written here.
 */

/** Bytes rather than characters: `"…".length` is 1 and what goes down the wire is 3. */
const bytes = (text: string): number => new TextEncoder().encode(text).length

export type PageWeight = {
  readonly href: string
  /** Whether a person wrote this page or the repository did. */
  readonly from: "written" | "generated"
  /** Bytes of sentences — the part a reader reads. */
  readonly prose: number
  /** Bytes of blocks — fences on a written page, signatures on a generated one. */
  readonly code: number
  readonly total: number
  /**
   * The thing the code half scales with: fenced blocks on a written page,
   * published symbols on a generated one.
   *
   * It is here because the remedy for a heavy page depends on which number is
   * big. A page with forty blocks is a page somebody wrote long; a page with
   * five hundred and sixty-eight symbols is a page that was never cut up.
   */
  readonly parts: number
}

const weigh = (href: string, from: PageWeight["from"], prose: number, code: number, parts: number): PageWeight => ({
  href,
  from,
  prose,
  code,
  total: prose + code,
  parts,
})

/**
 * A written page: its sentences off disk, and its fenced blocks.
 *
 * Both readers are the ones the search index already uses, so a page that is
 * heavy here is heavy in the index for the same reason and neither number can
 * drift from the other.
 */
export const writtenPageWeights = (): readonly PageWeight[] =>
  docsSections
    .filter((section) => section.source === "written")
    .flatMap((section) =>
      section.pages.map((page) => {
        const prose = [...readPageProse(section.slug, page.slug).values()].reduce(
          (total, text) => total + bytes(text),
          0
        )
        const fences = fencesOnPage(section.slug, page.slug)

        return weigh(
          docsHref(section.slug, page.slug),
          "written",
          prose,
          fences.reduce((total, fence) => total + bytes(fence.code), 0),
          fences.length
        )
      })
    )

/** Every published symbol on a reference page, which is one entry point's. */
const symbolsOn = (pageSlug: string) => {
  const entry = apiReference.entries.find((candidate) => candidate.slug === pageSlug)

  return entry === undefined ? [] : entry.groups.flatMap((group) => group.symbols)
}

/**
 * A generated page: the prose its bands render, and the signatures under them.
 *
 * The prose comes from `generatedPageWords`, which walks what the bands return
 * — so a band rewritten on Tuesday weighs its new sentences on Tuesday, and
 * nothing here restates a sentence that lives in a component.
 *
 * The code comes from the generated reference rather than from that walk, and
 * the reason is a deliberate hole in the walk: `rendered.ts` elides `<pre>` and
 * `<code>`, because a reader searching *import* wants prose about importing
 * rather than every block beginning with the keyword. That is right for an
 * index and wrong for a scale, so the two halves of a generated page are read
 * from the two places that have them.
 *
 * **The section's landing page has no symbols and is not empty.** It is the
 * table of sixteen doors, which is prose, and it weighs what it renders.
 */
export const generatedPageWeights = (): readonly PageWeight[] => {
  const words = generatedPageWords()

  return docsSections
    .filter((section) => section.source === "generated")
    .flatMap((section) =>
      section.pages.map((page) => {
        const href = docsHref(section.slug, page.slug)
        const symbols = page.slug === DOCS_LANDING_SLUG ? [] : symbolsOn(page.slug)

        return weigh(
          href,
          "generated",
          bytes(words.get(href) ?? ""),
          symbols.reduce((total, symbol) => total + bytes(symbol.signature) + bytes(symbol.summary), 0),
          symbols.length
        )
      })
    )
}

/** Every page on the site, heaviest first. */
export const docsPageWeights = (): readonly PageWeight[] =>
  [...writtenPageWeights(), ...generatedPageWeights()].sort((one, other) => other.total - one.total)

/**
 * The heaviest page of a kind, which is the number a cap is set against.
 *
 * Undefined is impossible for either kind on this site and is returned rather
 * than thrown, because the one caller that could see it is a test and a test
 * reads better asserting on a value than catching an error.
 */
export const heaviestPage = (from: PageWeight["from"]): PageWeight | undefined =>
  docsPageWeights().find((page) => page.from === from)

/**
 * What one written page may put in front of a reader.
 *
 * **This lane's number in both directions.** It moves when somebody writes a
 * long page here, and this surface is the one that would raise it — which is
 * the property `search/build.test.ts` names as what makes a cap worth having.
 *
 * Today's heaviest is *Where content comes from* at 19,255 bytes, so the
 * headroom is about a quarter of a page again: three or four more sections on
 * the longest page on the site. When it fires the question is whether the page
 * is one page, and the site already has the answer in its own shape — a long
 * page splits into two addresses the rail carries and the pager walks.
 */
export const WRITTEN_PAGE_CAP = 24_000

/**
 * What one generated page may put in front of a reader.
 *
 * **This is a trigger and nothing else**, in the sense the names cap already
 * established: it is this lane's number about somebody else's growth. The text
 * on a reference page is published signatures and the sentences their authors
 * left on them, and `/docs/api-reference/signals` is 99.6% signature. Not a
 * byte of the number was written here and no editing on this surface will bring
 * it down.
 *
 * Today's heaviest is 452,513 bytes — **1.9 times all thirty-five written pages
 * put together** — so the headroom is about a third of that page again, which
 * at the rate `src/signals/` has been publishing is months rather than years.
 *
 * **When it fires, the answer is not to raise it.** It is the answer the search
 * index reached twice: cut the page up along the line it grows on. A reference
 * page is already fifty-four groups with a heading each, the groups are modules
 * rather than an invented grouping, and the browser already knows which group a
 * reader is on — the same two sentences that made the contents file and the
 * words file shard. Raising the number instead buys one more quiet doubling of
 * what a reader downloads to read one sentence.
 */
export const GENERATED_PAGE_CAP = 600_000

export type PageCaps = {
  readonly written: number
  readonly generated: number
}

export const DOCS_PAGE_CAPS: PageCaps = {
  written: WRITTEN_PAGE_CAP,
  generated: GENERATED_PAGE_CAP,
}

/**
 * Every page over its cap, as a sentence somebody can act on.
 *
 * A list rather than a throw, and pure over its two arguments, for the reason
 * `plain.ts` and `fences/landing.ts` give: nothing on this site imports this
 * module, so there is no render for a throw to fail, and a reader held only
 * against today's pages is a reader whose rule is whatever today's pages happen
 * to do.
 *
 * **The fault names which half is big**, because the two are fixed in different
 * places and by different people. Prose is edited in the page's own MDX by
 * whoever is writing here. Code on a generated page is a published signature,
 * and the only thing this surface can do about it is stop putting five hundred
 * of them on one address.
 */
export const weightFaults = (
  pages: readonly PageWeight[] = docsPageWeights(),
  caps: PageCaps = DOCS_PAGE_CAPS
): readonly string[] =>
  pages
    .filter((page) => page.total > (page.from === "written" ? caps.written : caps.generated))
    .map((page) => {
      const cap = page.from === "written" ? caps.written : caps.generated
      const half =
        page.code > page.prose
          ? `${page.code} of it is ${page.parts} ${page.from === "written" ? "fenced blocks" : "published signatures"}`
          : `${page.prose} of it is prose`

      return `${page.href} renders ${page.total} bytes against a cap of ${cap}, and ${half}`
    })

export type DocsTextTotals = {
  readonly pages: number
  readonly prose: number
  readonly code: number
  readonly total: number
}

/** What a kind of page weighs across the whole site, for a report to quote. */
export const docsTextTotals = (from: PageWeight["from"]): DocsTextTotals => {
  const pages = docsPageWeights().filter((page) => page.from === from)

  return {
    pages: pages.length,
    prose: pages.reduce((sum, page) => sum + page.prose, 0),
    code: pages.reduce((sum, page) => sum + page.code, 0),
    total: pages.reduce((sum, page) => sum + page.total, 0),
  }
}
