/**
 * The stylesheets a served document carries, as text.
 *
 * `<style>` is the one element in a Loom page whose content is both large and
 * expected to appear once: the library emits it beside every primitive that
 * needs a keyframe or a state selector, and React is expected to hoist the lot
 * into a single element in the head. It is therefore the first place to look
 * when a page is heavier than the sum of what is on it, and the reason this
 * instrument reads styles rather than every element.
 */

const STYLE_ELEMENT = /<style\b[^>]*>([\s\S]*?)<\/style>/g

/**
 * Read with a regular expression rather than a parser, deliberately.
 *
 * A served document is the artefact, and a parser would answer questions about
 * a tree it rebuilt from it. The bytes are the subject here, so the reading has
 * to be of the bytes — and `<style>` content is the one place in HTML where
 * `<` cannot appear unescaped, which is what makes the lazy match exact rather
 * than approximate.
 */
export const styleTexts = (document: string): readonly string[] =>
  [...document.matchAll(STYLE_ELEMENT)].map((match) => match[1] ?? "")
