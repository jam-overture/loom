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

export type SpecimenDocument = {
  readonly title: string
  readonly markup: string
  readonly lang?: string
}

export const specimenDocument = ({ title, markup, lang = "en" }: SpecimenDocument): string =>
  [
    "<!doctype html>",
    `<html lang="${escapeHtml(lang)}">`,
    "<head>",
    '<meta charset="utf-8">',
    '<meta name="viewport" content="width=device-width, initial-scale=1">',
    `<title>${escapeHtml(title)}</title>`,
    `<style>${RESET}</style>`,
    "</head>",
    "<body>",
    markup,
    "</body>",
    "</html>",
    "",
  ].join("\n")
