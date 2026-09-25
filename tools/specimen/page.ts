/**
 * The document a specimen's markup is photographed inside.
 *
 * Deliberately almost empty. The library ships its own stylesheet beside the
 * primitives that need it, and the theme arrives as custom properties on the
 * root element the tree named — so a specimen page that added a font stack, a
 * background or a container width would be photographing this file's opinions
 * rather than the library's. What is here is the four things a browser needs
 * before any of that means anything.
 */

const ESCAPES: Readonly<Record<string, string>> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
}

export const escapeHtml = (text: string): string =>
  text.replace(/[&<>"]/g, (character) => ESCAPES[character] ?? character)

/**
 * `margin: 0` is the one reset worth having: the browser's default 8px on
 * `body` puts a white gutter around every full-bleed band in the library and
 * makes an overflow measurement disagree with the viewport by sixteen pixels.
 */
const RESET = `*,*::before,*::after{box-sizing:border-box}html,body{margin:0;padding:0}`

/**
 * The file a live specimen's bundle is written to and loaded from, relative to
 * the served directory. One bundle for the whole specimen rather than one per
 * theme: the module is the same, and the page says which of its themes it is.
 */
export const SPECIMEN_BUNDLE_FILE = "specimen.js"

/**
 * The attribute a live document carries its planned page name in, and the whole
 * of what the browser is told.
 *
 * A name rather than a serialised theme, because the specimen module is in the
 * bundle already: the client re-plans the pages with the same pure function the
 * server used and looks this one up. Serialising the selection would put a
 * second copy of it on the page for the client to disagree with, which is the
 * one thing hydration is unforgiving about.
 */
export const SPECIMEN_PAGE_ATTRIBUTE = "data-loom-specimen-page"

export type SpecimenDocument = {
  readonly title: string
  readonly markup: string
  readonly lang?: string
  /**
   * The planned page's name, present only for a live specimen. Its presence is
   * what adds the bundle, so a static document is byte-for-byte what it was
   * before any of this existed.
   */
  readonly page?: string
}

/**
 * A live body holds the markup and nothing else — no newline around it and no
 * wrapper element.
 *
 * Both are hydration's doing rather than fussiness. React compares the
 * container's children with what the client renders, so a stray whitespace text
 * node is a disagreement it has to resolve, and it resolves those by keeping the
 * server's markup and saying nothing. A wrapper would settle it too, and costs a
 * box on the page — which would stop a live specimen's picture being comparable
 * with a static one's, and comparing them is most of what these are for.
 */
const body = (markup: string, page: string | undefined): readonly string[] =>
  page === undefined
    ? ["<body>", markup, "</body>"]
    : [`<body ${SPECIMEN_PAGE_ATTRIBUTE}="${escapeHtml(page)}">${markup}</body>`]

export const specimenDocument = ({ title, markup, lang = "en", page }: SpecimenDocument): string =>
  [
    "<!doctype html>",
    `<html lang="${escapeHtml(lang)}">`,
    "<head>",
    '<meta charset="utf-8">',
    '<meta name="viewport" content="width=device-width, initial-scale=1">',
    `<title>${escapeHtml(title)}</title>`,
    `<style>${RESET}</style>`,
    ...(page === undefined ? [] : [`<script src="${SPECIMEN_BUNDLE_FILE}" defer></script>`]),
    "</head>",
    ...body(markup, page),
    "</html>",
    "",
  ].join("\n")
