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
 * Each of those entries also carries **the prose it sits above** (`body`), which
 * is the decision this file used to say was filed rather than taken. Taking it
 * costs what it was always going to cost — the site's words are shipped to the
 * browser a second time — and `payload.test.ts` is what keeps that cost a number
 * somebody chose rather than one that drifted. What it buys is that a reader
 * searching for a word the site plainly uses stops being told the site has never
 * heard of it.
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
}

export type SearchIndex = {
  readonly entries: readonly SearchEntry[]
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

/** How many results the dialog shows. Beyond this a reader types more instead. */
export const SEARCH_RESULT_LIMIT = 10

const KINDS: readonly SearchKind[] = ["page", "heading", "export"]

const isRecord = (value: unknown): value is Readonly<Record<string, unknown>> =>
  typeof value === "object" && value !== null && !Array.isArray(value)

const isEntry = (value: unknown): value is SearchEntry =>
  isRecord(value) &&
  typeof value.href === "string" &&
  typeof value.title === "string" &&
  typeof value.context === "string" &&
  typeof value.summary === "string" &&
  typeof value.body === "string" &&
  KINDS.includes(value.kind as SearchKind)

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

  return { entries: value.entries.filter(isEntry) }
}
