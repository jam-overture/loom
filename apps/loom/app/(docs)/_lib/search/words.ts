/**
 * The last thing that happens to every body in the index, wherever it came
 * from.
 *
 * There are two ways a sentence on this site reaches the search box. Most pages
 * are MDX files, and `prose.ts` reduces one to words by taking the markdown
 * out. The reference pages have no file at all — they are components over
 * generated data — and `rendered.ts` reduces one to words by walking what the
 * component returns. The two readers have nothing in common until here, and
 * from here on a body is a body: same spacing, same elision, same trim.
 *
 * Shared rather than copied because the alternative was measured on this site
 * once already. Four scanners disagreeing about where a fence begins cost a run
 * a day in September, and the entry that closed it said the cure is one reader
 * rather than four that agree today.
 */

/**
 * What is left where a name was.
 *
 * A name between backticks on a written page, and a name inside `<code>` on a
 * generated one, are the same thing to a reader and the same thing here: they
 * are left out, because the site answers *where is this name* from the index of
 * published names and a body full of them would outrank it. Taking one out of
 * the middle of a sentence leaves prose that reads as a mistake — *"it asks the
 * you passed"* was the first excerpt this produced — so an ellipsis says a word
 * was left out, which is what happened.
 */
export const ELIDED = "…"

/**
 * One line of plain words: no runs of whitespace, no run of elisions, and no
 * space in front of the punctuation a removed name left behind.
 *
 * Two names in a row are one omission to a reader rather than two, which is
 * what the middle rule is for — and it is the one a body assembled from a
 * component needs most, because a band that prints six package names in a row
 * produces six of them.
 */
export const plainWords = (text: string): string =>
  text
    .replace(/\s+/g, " ")
    .replace(new RegExp(`${ELIDED}(?:[\\s,;]*${ELIDED})+`, "g"), ELIDED)
    .replace(new RegExp(`\\s+([,.;:)])`, "g"), "$1")
    .trim()
