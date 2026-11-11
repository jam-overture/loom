import { apiEntryAt, apiReference } from "./api/reference"
import { fencesOnPage } from "./fences/extract"
import { DOCS_LANDING_SLUG, docsHref, docsSections } from "./nav"
import { generatedPageWords } from "./search/generated"
import type { TravellingEntry } from "./search/model"
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
 * **The number that fires is 540,000 and not this one.** `weight.test.ts`
 * holds the heaviest generated page under **90%** of this cap, so the line a
 * run meets is nine tenths of the way up. Said here because the two paragraphs
 * that used to stand in this place were written about 600,000, and a run that
 * reads them relaxes by a page's worth of bytes it does not have. Filed by
 * this lane on 7 November after that run measured six days of headroom where
 * the comment implied fifteen.
 *
 * **Where it stands on 8 November.** The heaviest generated page was 509,948
 * bytes on the morning of this run, growing 6,535 a day, which was four days.
 * It is **264,650** by the afternoon, and not one byte of the difference is a
 * name that stopped being published: `api/extract.ts` grew the rule
 * `toItsFirstParagraph`, four fifths of a reference page's signature text was
 * commentary under the first paragraph of a member's doc comment, and the rule
 * the symbol summaries have always had now applies inside a declaration too.
 * So the headroom is 275,350 bytes, which is six weeks rather than four days,
 * and a name published from here on arrives at about a fifth of what it used
 * to cost this page.
 *
 * **When it fires, the answer is still not to raise it.** It is the answer the
 * search index reached twice: cut the page up along the line it grows on. A
 * reference page is already sixty groups with a heading each, the groups are
 * modules rather than an invented grouping, and the browser already knows
 * which group a reader is on. Raising the number instead buys one more quiet
 * doubling of what a reader downloads to read one sentence.
 *
 * **What the cut costs is measured and it is not on this page**, which is the
 * other half a run meeting this needs: `pageCutOf` below prices it in rows of
 * the table of contents, and on 7 November the cut of the one page over the
 * line wanted 13,105 bytes in a file with 7,611 left. That arithmetic has not
 * changed. What has changed is that nobody has to do it this week.
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
 * What one module of a reference page weighs.
 *
 * **The plain version.** A reference page is a stack of modules — *Window*,
 * *Health*, *Funnel* — each with a heading and the names that module publishes
 * under it. The page's weight is the sum of those stacks, and when a page is
 * too heavy the question is not *how heavy* but *which of them*.
 *
 * It exists because the cap above has one remedy and that remedy is a cut: the
 * modules are the line the page grows on, so they are the line it comes apart
 * on. A fault that gives a total tells a reader a page is too big. A fault
 * that gives the modules tells them where the knife goes.
 */
export type GroupWeight = {
  /** The declaring module, as the reference reads it off the package: `signals/window`. */
  readonly module: string
  /** The heading the page gives it. */
  readonly title: string
  readonly symbols: number
  /** Bytes of signature and summary, which is what a module contributes to a page. */
  readonly code: number
}

/**
 * The modules a generated page is made of, heaviest first.
 *
 * Empty for the section's landing page, which has no modules, and for an
 * address the reference does not serve — the same answer in both cases and
 * deliberately so: neither is a page with modules, and a caller that needed to
 * tell them apart would be asking this function a question about routing.
 */
export const groupWeightsOn = (pageSlug: string): readonly GroupWeight[] => {
  const entry = apiEntryAt(pageSlug)

  if (entry === undefined) return []

  return entry.groups
    .map((group) => ({
      module: group.module,
      title: group.title,
      symbols: group.symbols.length,
      code: group.symbols.reduce((total, symbol) => total + bytes(symbol.signature) + bytes(symbol.summary), 0),
    }))
    .sort((one, other) => other.code - one.code)
}

/**
 * The address a module would have, if the page it is on were cut up.
 *
 * **The whole module path, not its last segment.** `@jam-overture/loom/store`
 * publishes `store/store`, `project/store` and `application/store`, so the
 * obvious implementation — take the leaf — gives one door three addresses
 * called `store` and silently loses two of them. The test that holds this
 * asserts the addresses of a cut are distinct, which is the assertion that
 * kills the leaf.
 *
 * It is the same rule `apiGroupAnchor` uses for the anchor a reader lands on
 * today, minus the prefix an `id` needs: a module is spelled with its slashes
 * flattened, because that is the only spelling that is unique per door.
 */
export const cutAddressFor = (module: string): string => module.replace(/\//g, "-")

/**
 * What cutting a generated page along its modules would cost, and where.
 *
 * **The plain version, because this is the number nobody would guess.** The
 * remedy for a page over its cap is to cut it into its modules, one address
 * each. Those addresses are not free: every page on this site has a row in the
 * **table of contents**, the one file in the search index a reader sits in
 * front of and waits for, and a cut puts one more row in it per module. Sixty
 * modules is sixty rows.
 *
 * So the price of the remedy is paid in a different file from the one the cap
 * is about, by the same lane, out of a budget this module does not hold. A run
 * that trips the cap and reads only the cap will attempt the cut, and find out
 * half a day later.
 *
 * **The rows are the real rows, not an estimate of them.** They are built as
 * `TravellingEntry` — the shape `searchContents` actually publishes — and
 * measured as the JSON that shape travels as. A second idea of what a row
 * costs would be a second idea to keep true, and it would be wrong in the
 * direction that makes a cut look cheap.
 */
export type PageCut = {
  /** The page the cut is of. */
  readonly href: string
  /** One address per module, which is what the cut is. */
  readonly addresses: number
  /** Bytes the cut adds to the table of contents, as the rows it would add. */
  readonly contents: number
  /** The modules carrying the most, which is what a cut moves first. */
  readonly heaviest: readonly GroupWeight[]
}

/** How many of a cut's modules a fault names: enough to see the shape, few enough to read. */
const NAMED_IN_A_FAULT = 3

/**
 * The rows a cut would add to the table of contents.
 *
 * Pure over the groups and the door, so a test can state a page rather than
 * arrange for one — the rule the rest of this module and `plain.ts` already
 * follow.
 */
export const cutContentsRows = (
  pageSlug: string,
  groups: readonly GroupWeight[],
  summaries: ReadonlyMap<string, string> = new Map()
): readonly TravellingEntry[] =>
  groups.map((group) => {
    const summary = summaries.get(group.module) ?? ""

    return {
      href: `${docsHref("api-reference", pageSlug)}/${cutAddressFor(group.module)}`,
      title: group.title,
      context: "API reference",
      kind: "page" as const,
      ...(summary === "" ? {} : { summary }),
      family: "imports",
    }
  })

/**
 * What a cut of one generated page would be, measured.
 *
 * `undefined` where the address has no modules to cut along, which is the
 * landing page and anything the reference does not serve. A fault about such a
 * page says nothing about a cut rather than offering one of nought addresses —
 * *cutting it along its modules is 0 more addresses and 2 bytes of rows,
 * heaviest first:* is the sentence that guard exists to prevent.
 *
 * **The modules arrive as an argument so that guard is reachable.** A door
 * that publishes no modules is not a thing this package does today, so held
 * against the real reference the branch is dead code and a mutation that
 * deleted it was invisible. The default is the real answer and a caller may
 * state one, which is the same shape `weightFaults` gives its caps and its cut
 * reader, and for the same reason.
 */
export const pageCutOf = (
  pageSlug: string,
  groups: readonly GroupWeight[] = groupWeightsOn(pageSlug)
): PageCut | undefined => {
  const entry = apiEntryAt(pageSlug)

  if (entry === undefined || groups.length === 0) return undefined

  const summaries = new Map(entry.groups.map((group) => [group.module, group.summary] as const))

  return {
    href: docsHref("api-reference", pageSlug),
    addresses: groups.length,
    contents: bytes(JSON.stringify(cutContentsRows(pageSlug, groups, summaries))),
    heaviest: groups.slice(0, NAMED_IN_A_FAULT),
  }
}

/**
 * The cut clause of a fault: the remedy, and what it costs somewhere else.
 *
 * Separated from `weightFaults` so that the sentence can be held on its own,
 * and because a page with no cut has to produce no clause rather than an empty
 * one — a trailing *and cutting it* with nothing after it is the shape a
 * mutation would otherwise leave behind.
 */
export const cutClause = (cut: PageCut | undefined): string => {
  if (cut === undefined) return ""

  const named = cut.heaviest.map((group) => `${group.module} (${group.code})`).join(", ")

  return (
    `; cutting it along its modules is ${cut.addresses} more addresses` +
    ` and ${cut.contents} bytes of rows in the table of contents every reader waits for` +
    `, heaviest first: ${named}`
  )
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
 * places and by different people.
 *
 * **And for a generated page it names the cut**, which is the one remedy its
 * cap has, together with what that remedy costs in the table of contents —
 * `pageCutOf` carries that argument. It arrives as a third parameter with a
 * default rather than being read inside, so this stays pure over what it is
 * given: a reader held only against the real package is a reader whose
 * sentence is whatever today's package happens to publish, which is the
 * property the two arguments above already protect. Prose is edited in the page's own MDX by
 * whoever is writing here. Code on a generated page is a published signature,
 * and the only thing this surface can do about it is stop putting five hundred
 * of them on one address.
 */
export const weightFaults = (
  pages: readonly PageWeight[] = docsPageWeights(),
  caps: PageCaps = DOCS_PAGE_CAPS,
  cutFor: (pageSlug: string) => PageCut | undefined = pageCutOf
): readonly string[] =>
  pages
    .filter((page) => page.total > (page.from === "written" ? caps.written : caps.generated))
    .map((page) => {
      const cap = page.from === "written" ? caps.written : caps.generated
      const half =
        page.code > page.prose
          ? `${page.code} of it is ${page.parts} ${page.from === "written" ? "fenced blocks" : "published signatures"}`
          : `${page.prose} of it is prose`

      /* A written page is long because somebody wrote it long, and the remedy
         is theirs and obvious. A generated page is long because a package
         published into it, and its remedy is a cut whose price is in another
         file — so only that kind of fault carries the clause. */
      const cut = page.from === "generated" ? cutClause(cutFor(page.href.split("/").at(-1) ?? "")) : ""

      return `${page.href} renders ${page.total} bytes against a cap of ${cap}, and ${half}${cut}`
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
