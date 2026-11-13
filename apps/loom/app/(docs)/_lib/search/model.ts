import { apiAnchorFor, apiSlugFor } from "../api/model"

import { decodeNames, encodeNames } from "./names"

/**
 * What the site knows how to find, as data.
 *
 * The index is built on the server, served as one static JSON file and searched
 * in the browser. That shape is what the types here are for: everything below
 * has to survive `JSON.stringify`, and nothing below may reach the filesystem —
 * the half that reads files lives in `headings.ts` and `build.ts` and is
 * imported by the route handler alone.
 *
 * **Three kinds of thing are findable, and nothing else is.** A page, a heading
 * on a page, and a published export. That is the site's own table of contents
 * plus the runtime's own surface.
 *
 * Each of those entries also carries the two things underneath it on the page:
 * **the prose** (`body`) and **the code** (`code`). Both cost what they were
 * always going to cost — the site's words and its blocks are shipped to the
 * browser a second time — and the caps in `build.test.ts` are what keep that
 * cost a number somebody chose rather than one that drifted. What they buy is
 * that a reader searching for something the site plainly says, in a sentence or
 * in a block they were invited to copy, stops being told the site has never
 * heard of it.
 *
 * **Three kinds of thing findable, four files.** What a reader waits for is the
 * site's own table of contents — its pages and the headings on them. The
 * runtime's published names, the words and the code follow, separately, and
 * each turns on one more band of the search underneath the box as it lands.
 *
 * The names are the odd one of the three that follow, because they bring
 * *entries* rather than fill a field on one. That is the split this file was
 * missing: a page is added when somebody writes one, and a name is published
 * when somebody in another part of the repository exports something — two
 * different things growing at two different speeds, in one payload, under one
 * number that could only ever be a number about both.
 */

export type SearchKind = "page" | "heading" | "export"

export type SearchEntry = {
  /** Where the result goes. A heading and an export carry their own fragment. */
  readonly href: string
  /** What the reader reads, and the field ranking weighs most heavily. */
  readonly title: string
  /**
   * Where this sits, in the words the rail uses: a section title, a page title,
   * or an import specifier. Shown beside the title so two results named the
   * same thing are still telling a reader which is which.
   */
  readonly context: string
  readonly kind: SearchKind
  /** One sentence, where the site already has one written. Often empty. */
  readonly summary: string
  /**
   * The words under this entry on the page — the prose of its section, stripped
   * of code and of markup (`prose.ts`). Empty for an export, whose words are
   * the signature its author wrote and live on the reference page itself.
   *
   * This is the field that lets a reader find a sentence rather than a heading.
   * It is scored below every other field and shown only as the excerpt that
   * explains why a result is in the list, never as the result's own title.
   */
  readonly body: string
  /**
   * The code under this entry — every fenced block below its heading, joined
   * (`code.ts`). Empty for an export and for a page with no blocks on it.
   *
   * The cheapest band there is, below the prose, and the reason is the same one
   * that puts prose below names: a heading that *mentions* a call in a snippet
   * is a worse answer than one that is *called* what you typed. What it does is
   * bring the page into the list at all, which is the difference between
   * finding the install command and being told the site has never heard of it.
   */
  readonly code: string
  /**
   * What this page is one of, plural, where it is one of a set of pages built
   * from one template — `"imports"` for the reference's sixteen doors, and the
   * empty string for everything else.
   *
   * It is the one field here that is not about what an entry *says*. It is about
   * what it is a **copy** of, and the search box needs it because a query whose
   * words are in a band those pages share matches all sixteen of them for one
   * reason. `match.ts` folds such a run into a single row and this word is what
   * the row calls them; `nav.ts` is where a section declares it and why.
   *
   * Empty for a heading, for an export, and for a page nobody templated —
   * including the reference's own front door, which is a page of its own and not
   * one of the sixteen.
   */
  readonly family: string
}

export type SearchIndex = {
  readonly entries: readonly SearchEntry[]
}

/**
 * An entry as the first file writes it down: the four fields that are always
 * there, and the three text fields only where they hold something.
 *
 * The three are omitted rather than emptied, and the difference is 38 KB. A
 * published export carries no summary, no prose and no code — its words are the
 * signature on its own reference page — and there are 986 of them, so
 * `"summary":"","body":"","code":""` was a fifth of the file a reader waits for
 * and said nothing at all.
 *
 * `family` joined the four on the same terms and for a sharper version of the
 * same reason: sixteen entries out of 207 have one, so writing it down for the
 * other 191 would be the field's own cost paid twelve times over to say nothing.
 *
 * Nothing downstream notices, because `parseSearchIndex` fills an absent field
 * with the empty string it would have carried. That tolerance is not new: it is
 * what `code` has always had, for a browser holding an index cached from a
 * deployment made before the code file existed.
 */
export type TravellingEntry = Omit<SearchEntry, "summary" | "body" | "code" | "family"> &
  Partial<Pick<SearchEntry, "summary" | "body" | "code" | "family">>

export type TravellingIndex = {
  readonly entries: readonly TravellingEntry[]
}

/**
 * Where the browser asks for the index.
 *
 * It sits under `/docs/` because it belongs to this surface and to no other,
 * and it is a route handler rather than a file in `public/` so that it is built
 * from `nav.ts` and the generated reference at build time — a copy in `public/`
 * would be a second statement of what the site contains, which is the exact
 * thing `nav.ts` exists to prevent.
 */
export const SEARCH_INDEX_PATH = "/docs/search-index"

/**
 * Where the browser asks for the words of **one section**, which arrive second,
 * separately, and the reader's own section first.
 *
 * **The index is four files, and it had to become four.** Indexing the prose
 * put the site's words in the same payload as its table of contents, and four
 * pages arriving at once took the whole thing to 46.7 KB compressed against a
 * 48 KB cap — with the cap's own comment saying the run that hit it should
 * split the index rather than raise the number. The runtime's published names
 * left on 19 September for the same reason; `SEARCH_NAMES_PATH` says why.
 *
 * The split is along the line the halves already grow on. What a reader needs
 * to type the first letter is the site's table of contents: 206 entries,
 * **7.4 KB compressed**, and it grows when somebody writes a page. The words
 * under them are **54 KB**, and they grow every time anybody writes a
 * paragraph. So the box opens on the first, which is the part that answers by
 * title, section and summary — the top three bands of the ranking — and the
 * prose lands a moment later and turns on the fourth.
 *
 * **The words themselves are now one file per section**, as of 21 September,
 * because 54 KB under a 60 KB cap was two written pages of headroom for the
 * whole site. A section is the line they grow on: somebody writes a page and
 * one section's file moves. The reader's own section is asked for first and the
 * rest follow behind it, so the band most likely to answer them turns on
 * first — `shards.ts` carries that argument and what it does not buy.
 *
 * A reader on a slow connection therefore gets a working search box rather than
 * a spinner, and the half that grows fastest is the half nothing waits for.
 */
export const searchProsePath = (sectionSlug: string): string => `/docs/search-index/prose/${sectionSlug}`

/**
 * Where the browser asks for the code, which arrives with the words and is
 * read after them.
 *
 * A third file rather than a third of one, for the reason the second exists:
 * the halves grow at different speeds and for different reasons. The table of
 * contents grows when a page is added or an export is published. The words grow
 * every time anybody writes a paragraph. The code grows when somebody adds a
 * block, which on this site is the slowest of the three and the one most likely
 * to arrive in a lump — four pages of snippets at once is what took the prose to
 * its cap.
 *
 * Keeping them apart is also what keeps the caps meaningful: a single number
 * over all three would be a number that moved for three unrelated reasons and
 * told nobody which.
 */
export const SEARCH_CODE_PATH = "/docs/search-index/code"

/**
 * Where the browser asks for the runtime's published names.
 *
 * **The fourth file, and the one that made the first one honest.** Until this
 * existed, the file a reader waited for carried the site's 206 pages and
 * headings *and* the runtime's 1,067 published names — and 78% of it was the
 * names, 60% of it compressed. So the payload a reader sat in front of grew every time any lane in
 * the repository exported a function, which is a thing this surface does not do
 * and cannot see coming. It had reached 96% of its compressed budget that way,
 * with about sixty exports of room left for the whole repository.
 *
 * Splitting it is the remedy the budget's own comment has prescribed since the
 * prose was split off — *the run that hits it should split the index rather
 * than raise the number* — applied along the line these entries really grow on.
 */
export const SEARCH_NAMES_PATH = "/docs/search-index/names"

/** How many results the dialog shows. Beyond this a reader types more instead. */
export const SEARCH_RESULT_LIMIT = 10

const KINDS: readonly SearchKind[] = ["page", "heading", "export"]

const isRecord = (value: unknown): value is Readonly<Record<string, unknown>> =>
  typeof value === "object" && value !== null && !Array.isArray(value)

/**
 * An entry as it arrives: the four fields that identify it, and nothing else
 * demanded.
 *
 * **What is demanded here is what a result cannot be shown without.** A row with
 * no href goes nowhere and a row with no title has nothing to read, so an entry
 * missing either is dropped rather than passed on. The three text fields are
 * read separately below, because every one of them is a *band of the ranking*
 * that may legitimately not be answering yet: the file that carries it may not
 * have landed, may not have existed when this browser cached the index, or — for
 * the 986 published names — may never have had anything to say. Demanding one
 * would drop entries over a field whose absence the search box already handles,
 * turning a band that is quiet into a search box that finds nothing.
 */
const isArrivingEntry = (value: unknown): value is Readonly<Record<string, unknown>> =>
  isRecord(value) &&
  typeof value.href === "string" &&
  typeof value.title === "string" &&
  typeof value.context === "string" &&
  KINDS.includes(value.kind as SearchKind)

/** One of the four fields that may be left out, or the empty string it stands in for. */
const textAt = (
  value: Readonly<Record<string, unknown>>,
  key: "summary" | "body" | "code" | "family"
): string => {
  const text = value[key]

  return typeof text === "string" ? text : ""
}

/**
 * The index, checked on the way into the browser.
 *
 * This repository writes the file the check is against, so in the ordinary case
 * it can only pass — which is exactly why it is worth having. The cases it is
 * for are a deployment serving a stale or half-written index, and a request
 * that got an HTML error page instead of JSON. Both would otherwise arrive as a
 * dialog rendering `undefined` at a reader who typed one word.
 */
export const parseSearchIndex = (value: unknown): SearchIndex => {
  if (!isRecord(value) || !Array.isArray(value.entries)) {
    throw new Error("loom: the search index has no entries")
  }

  return {
    entries: value.entries.filter(isArrivingEntry).map((entry) => ({
      href: String(entry.href),
      title: String(entry.title),
      context: String(entry.context),
      kind: entry.kind as SearchKind,
      summary: textAt(entry, "summary"),
      body: textAt(entry, "body"),
      code: textAt(entry, "code"),
      family: textAt(entry, "family"),
    })),
  }
}

/**
 * The words under the entries, as they travel.
 *
 * **A list of words and nothing else.** There is no key beside each body,
 * because the browser already has the list the keys would point into: it was
 * sent the table of contents first and has been searching it since, and the
 * words arrive afterwards in the order those entries are already sitting in.
 * So the file says once what its bodies are `under`, and then says the words.
 *
 * That is the same sentence the names file was rewritten around on 19
 * September — *what is written down is a name and not an address* — taken one
 * step further than it was taken here on 5 November. That day this type stopped
 * writing `/docs/the-runtime` at the front of ninety keys and kept the rest of
 * each key: 5,377 raw bytes and **341 compressed**. The rest of the key turns
 * out to be worth **4,356 compressed**, twelve times the prefix, because what
 * a reader can work out was never the section — it was the whole address.
 *
 * **What it costs is a rule instead of a lookup, and the rule is checkable.**
 * A keyed file could be read against an index it disagreed with and simply
 * drop what did not match; a positional one cannot, so `withProse` counts the
 * entries it is about and refuses a file that does not have exactly that many
 * bodies. A silent half-merge is the failure this shape could have, and it is
 * the one it is not allowed to have.
 */
export type SearchProse = {
  /**
   * The section these bodies are about — `/docs/the-runtime` for the runtime's
   * words — or the empty string for a file about the whole site.
   *
   * It is the only addressing this file does. `proseEntriesOf` turns it into
   * the entries the bodies line up with, and is the one definition of that, so
   * the half that builds a file and the half that reads one cannot hold two
   * ideas of which entries a section has.
   */
  readonly under: string
  /** One body per entry of `proseEntriesOf`, in that order. Empty where a page has no prose. */
  readonly bodies: readonly string[]
}

const isTextPair = (value: unknown): value is readonly [string, string] =>
  Array.isArray(value) && value.length === 2 && typeof value[0] === "string" && typeof value[1] === "string"

/**
 * Whether an address is one of the addresses a prose file is about.
 *
 * The boundary characters are the whole of it: `/docs/the-runtime` is the
 * section itself, `/docs/the-runtime#x` a heading on its landing page, and
 * `/docs/the-runtime/…` a page inside it — and a bare `startsWith` would also
 * claim `/docs/the-runtime-extras`, a section this site does not have today and
 * would not notice gaining. `build.test.ts` holds this against
 * `docsSectionOfPath`, which is the other answer to the same question, over
 * every entry the site has.
 */
const isUnder = (href: string, under: string): boolean =>
  under === "" || href === under || href.startsWith(`${under}/`) || href.startsWith(`${under}#`)

/**
 * The entries one prose file is about, in the order it writes their words.
 *
 * **Exports are not among them**, and that is what makes the order a property
 * of the site rather than of the fetch that happened to land first. The names
 * bring 2,100 entries of their own, they arrive on their own connection, and a
 * positional file that counted them would mean something different depending on
 * whether the names or the words got back first. `searchContents` draws the
 * same line for the same reason and this is the same predicate.
 */
export const proseEntriesOf = <TEntry extends { readonly href: string; readonly kind: SearchKind }>(
  entries: readonly TEntry[],
  under: string,
): readonly TEntry[] => entries.filter((entry) => entry.kind !== "export" && isUnder(entry.href, under))

/**
 * A prose file's words back under their addresses.
 *
 * The thing the file no longer writes down, worked out the way every reader of
 * one has to work it out — and the one place it is worked out, so that a caller
 * wanting a body by its href is not tempted to zip the two lists by hand and
 * get the filter subtly wrong.
 */
export const addressedProse = <TEntry extends { readonly href: string; readonly kind: SearchKind }>(
  entries: readonly TEntry[],
  prose: SearchProse,
): readonly (readonly [string, string])[] =>
  proseEntriesOf(entries, prose.under).map((entry, nth) => [entry.href, prose.bodies[nth] ?? ""] as const)

export const parseSearchProse = (value: unknown): SearchProse => {
  if (!isRecord(value) || !Array.isArray(value.bodies)) {
    throw new Error("loom: the search prose has no bodies")
  }

  /*
   * **`under` survives the parse**, where the keys it used to be stripped from
   * did not. It stopped being a fact about how the file was written down the
   * moment the bodies lost their keys: it is now the only thing in the file
   * that says which entries the words belong to, so dropping it would leave a
   * list of strings with nothing to say where they go.
   */
  return {
    under: typeof value.under === "string" ? value.under : "",
    bodies: value.bodies.filter((body): body is string => typeof body === "string"),
  }
}

/**
 * The two halves, put back together.
 *
 * An entry outside this file's section keeps the body it arrived with, which is
 * how five files merge into one index without any of them having an opinion
 * about the others.
 *
 * **A file that does not fit is refused whole, rather than merged as far as it
 * goes.** One body per entry is the only thing holding the words to their
 * addresses now, so a file carrying a different number of them is a file whose
 * every body after the first gap is on the wrong page — and a search box
 * quoting one page's sentence under another page's title is worse than one that
 * has no sentences yet. `build.test.ts` is where that mismatch is loud; here it
 * is simply not done.
 *
 * **Refused and not thrown**, which the component's own tests argued. Throwing
 * was written first and it took the whole box down: a reader who had been
 * searching titles since the contents landed lost those too, because one of the
 * four files that arrive afterwards did not line up. Refusing costs that reader
 * the sentence band and keeps everything else they already had.
 */
export const withProse = (index: SearchIndex, prose: SearchProse): SearchIndex => {
  const mine = proseEntriesOf(index.entries, prose.under)

  if (mine.length !== prose.bodies.length) return index

  const bodies = new Map(mine.map((entry, nth) => [entry.href, prose.bodies[nth] ?? ""] as const))

  return {
    entries: index.entries.map((entry) => {
      const body = bodies.get(entry.href)

      return body === undefined ? entry : { ...entry, body }
    }),
  }
}

/**
 * The code, as it travels: the same `[href, text]` pairs the prose uses, for
 * the same reasons.
 *
 * A separate type from `SearchProse` rather than one shared shape, because they
 * are two different claims about a page and a function that took either would
 * be a function that could put the words where the code goes. They are cheap
 * to keep apart and the mistake is not cheap to find.
 */
export type SearchCode = {
  readonly blocks: readonly (readonly [string, string])[]
}

export const parseSearchCode = (value: unknown): SearchCode => {
  if (!isRecord(value) || !Array.isArray(value.blocks)) {
    throw new Error("loom: the search code has no blocks")
  }

  return { blocks: value.blocks.filter(isTextPair) }
}

/** The entries and their code, put back together. */
export const withCode = (index: SearchIndex, code: SearchCode): SearchIndex => {
  const blocks = new Map(code.blocks)

  return { entries: index.entries.map((entry) => ({ ...entry, code: blocks.get(entry.href) ?? entry.code })) }
}


/**
 * The runtime's published surface, as the entry points that publish it.
 *
 * **An address is not written down here, it is built.** An export's page is
 * decided by its entry point and its place on that page by its name, so an
 * entry point and a list of names is everything there is to know — and the two
 * functions that turn those into an address are the same two the reference
 * pages use. Writing the address out per name instead cost 138 KB where this
 * costs 20, because it was `/docs/api-reference/runtime#s-` written down a
 * thousand times; and a file carrying its own copy of an address scheme is a
 * second place for that scheme to be true.
 *
 * This is the shape the builder and the browser work with. What travels is
 * `SearchNamesFile`, which writes each list of names as one front-coded line.
 */
export type SearchNames = {
  readonly entryPoints: readonly {
    /** The import specifier, as a reader would type it. */
    readonly specifier: string
    /** Every name that entry point publishes, in alphabetical order. */
    readonly names: readonly string[]
  }[]
}

/**
 * The names as they travel: one `[specifier, line]` pair per entry point,
 * where the line is the entry point's names put through `encodeNames`.
 *
 * Pairs rather than objects for the reason the prose file uses them — the
 * field names would be written out once per entry point for nothing — and a
 * line rather than an array because the array's quotes and commas, and the
 * prefix every name shares with the one before it, were most of what the file
 * had left to spend. `names.ts` has the numbers.
 */
export type SearchNamesFile = {
  readonly entryPoints: readonly (readonly [specifier: string, names: string])[]
}

export const encodeSearchNames = (names: SearchNames): SearchNamesFile => ({
  entryPoints: names.entryPoints.map((entryPoint) => [entryPoint.specifier, encodeNames(entryPoint.names)]),
})

const decodeEntryPoint = (value: unknown): SearchNames["entryPoints"] => {
  if (!isTextPair(value)) return []

  const [specifier, line] = value
  const names = decodeNames(line)

  return names === undefined ? [] : [{ specifier, names }]
}

/**
 * The names file as it arrived, or as much of it as can be trusted.
 *
 * An entry point whose pair is malformed, or whose line does not decode, is
 * dropped and the rest are kept — the same bargain `parseSearchIndex` strikes
 * for a row, because a search box missing one entry point's names is a smaller
 * failure than one missing all of them.
 */
export const parseSearchNames = (value: unknown): SearchNames => {
  if (!isRecord(value) || !Array.isArray(value.entryPoints)) {
    throw new Error("loom: the search names have no entry points")
  }

  return { entryPoints: value.entryPoints.flatMap(decodeEntryPoint) }
}

/**
 * A name, as the entry a result is shown from.
 *
 * Exported and used by the builder as well as by the browser, deliberately: the
 * server's idea of what an export's entry looks like and the browser's idea of
 * it have to be the same idea, and the cheapest way to guarantee that is for
 * there to be only one. A second copy here would drift the first time an anchor
 * scheme changed, and the symptom would be a search box whose every export
 * result 404s — which nothing at build time would notice, because a link in an
 * index is just a string.
 */
export const namesToEntries = (names: SearchNames): readonly SearchEntry[] =>
  names.entryPoints.flatMap((entryPoint) =>
    entryPoint.names.map((name) => ({
      href: `/docs/api-reference/${apiSlugFor(entryPoint.specifier)}#${apiAnchorFor(name)}`,
      title: name,
      context: entryPoint.specifier,
      kind: "export" as const,
      summary: "",
      body: "",
      code: "",
      family: "",
    }))
  )

/**
 * The table of contents and the names, put together.
 *
 * The one fold of the four that **adds rows** rather than filling a field on
 * one, which is why it is the one whose absence a reader can see: before it
 * lands, a search for `planReverts` finds the pages that mention it and not the
 * reference page that defines it. The box says so in as many words rather than
 * implying the site has never heard of the name.
 */
export const withNames = (index: SearchIndex, names: SearchNames): SearchIndex => ({
  entries: [...index.entries, ...namesToEntries(names)],
})
