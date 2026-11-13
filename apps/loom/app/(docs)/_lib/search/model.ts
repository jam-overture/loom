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
 * A pair rather than an object per entry, because there are two useful fields
 * and one of them is the key: `href` already identifies an entry uniquely — a
 * page by its path, a heading by its fragment — so the prose file is a list of
 * `[href, words]` and nothing else. That is about a fifth of what repeating the
 * entries would cost, and it cannot drift from the index, because an href it
 * does not recognize is simply dropped.
 *
 * **The key is the part of the address the browser does not already know.**
 * A prose file holds one section's words and the browser asked for it by that
 * section, so writing `/docs/the-runtime` at the front of all ninety of its
 * keys is ninety copies of the question. The file says once what its addresses
 * are `under` and the keys are what is left; `parseSearchProse` puts them back
 * together on the way in, so nothing downstream can tell the difference.
 *
 * This is the lesson the names file learned on 19 September, applied to the
 * other file that was still writing addresses down: *what is written down is a
 * name and not an address.* It is worth 5,377 raw bytes and 341 compressed
 * across the five files — measured in `build.test.ts`, and small, which is
 * stated here rather than left to be inferred from the absence of a number.
 */
export type SearchProse = {
  /**
   * What every key in this file is relative to — `/docs/the-runtime` for the
   * runtime's words — or the empty string for a file whose keys are whole
   * addresses.
   *
   * Empty is the tolerance rather than a shape of its own: a file from before
   * this field existed, or one that genuinely spans sections, parses as itself
   * and needs no second code path. It is what an absent field reads as, which
   * is the tolerance `parseSearchIndex` already gives the text fields.
   */
  readonly under: string
  readonly bodies: readonly (readonly [string, string])[]
}

const isTextPair = (value: unknown): value is readonly [string, string] =>
  Array.isArray(value) && value.length === 2 && typeof value[0] === "string" && typeof value[1] === "string"

/**
 * The address a key stands for.
 *
 * A **landing page's key is the empty string** — it is the section itself, so
 * there is nothing left of its address once the section is taken off the front.
 * That is the same empty string `DOCS_LANDING_SLUG` names in `nav.ts` and it is
 * handled here for the same reason: joining it blindly would ask the browser
 * for the words of `/docs/the-runtime` under the address
 * `/docs/the-runtime` + `""`, which is right by accident rather than by rule.
 */
export const proseAddressOf = (under: string, key: string): string => `${under}${key}`

export const parseSearchProse = (value: unknown): SearchProse => {
  if (!isRecord(value) || !Array.isArray(value.bodies)) {
    throw new Error("loom: the search prose has no bodies")
  }

  const under = typeof value.under === "string" ? value.under : ""

  /*
   * **Parsed, the keys are whole addresses, so `under` is the empty string and
   * not the prefix they arrived with.** It is the one field of this type that
   * says something about the *file* rather than about the words, and leaving
   * the prefix on a value whose keys no longer need it is how a value gets
   * prefixed twice — by anything that serialises what it parsed, which is what
   * every test in this directory does. Empty is true of the result and makes
   * the round trip idempotent.
   */
  return {
    under: "",
    bodies: value.bodies
      .filter(isTextPair)
      .map(([key, words]) => [proseAddressOf(under, key), words] as const),
  }
}

/**
 * The two halves, put back together.
 *
 * An entry the prose file says nothing about keeps the empty body it arrived
 * with, which is the ordinary case for the 863 published names — their words are
 * the signature on the reference page rather than a paragraph.
 */
export const withProse = (index: SearchIndex, prose: SearchProse): SearchIndex => {
  const bodies = new Map(prose.bodies)

  return { entries: index.entries.map((entry) => ({ ...entry, body: bodies.get(entry.href) ?? entry.body })) }
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
