import { err, ok, type Result } from "../../src/result.js"

/**
 * What it costs a document to carry one string more than once.
 *
 * Written for a defect that every verbatim measurement reports as absent. On
 * 4 November `/why-use-it` served 2,491,320 bytes, of which the library
 * stylesheet was 47,981 — and the page contained that stylesheet's text
 * **exactly once**, because React 19 hoists a `<style>` with an `href` and a
 * `precedence` and deduplicates it correctly. Counting verbatim copies of it
 * answers 1, truthfully, and misses 88% of the page.
 *
 * The copies were in the RSC flight payload, where the same text is
 * JSON-escaped: `>` is `\u003e`, a newline is `\n`. A payload copy shares no
 * long substring with the element it came from, so **the unit of measurement
 * cannot be the string.** It has to be a part of the string that escaping
 * leaves alone.
 */

/**
 * The shortest run that is rare enough to be a landmark rather than a
 * coincidence.
 *
 * `.loom` appears in a stylesheet a hundred times and in unrelated markup
 * besides, and a landmark has to be rare to be one.
 */
export const LANDMARK_FLOOR = 8

/**
 * A run of characters no payload encoding rewrites.
 *
 * Letters, digits, dot, underscore and hyphen: JSON, HTML attribute and
 * `\u`-escaping all pass these through unchanged, so a token made only of them
 * reads the same inside markup, inside an escaped payload and inside a
 * base64-free data URL.
 */
const ESCAPE_SAFE = new RegExp(`[A-Za-z0-9._-]{${LANDMARK_FLOOR},}`, "g")

/** Non-overlapping occurrences of `needle`, which is what a landmark count means. */
export const occurrencesOf = (haystack: string, needle: string): number => {
  let found = 0

  for (let at = haystack.indexOf(needle); at !== -1; at = haystack.indexOf(needle, at + needle.length)) {
    found += 1
  }

  return found
}

/** Where every non-overlapping occurrence of `needle` starts, in order. */
export const positionsOf = (haystack: string, needle: string): readonly number[] => {
  const found: number[] = []

  for (let at = haystack.indexOf(needle); at !== -1; at = haystack.indexOf(needle, at + needle.length)) {
    found.push(at)
  }

  return found
}

/**
 * The landmark to count copies of `text` by: its longest escape-safe token that
 * `text` contains exactly **once**.
 *
 * Once is the whole of why this is reliable. A token appearing twice per copy
 * would make every count a division, and a division is where an off-by-one
 * becomes a number somebody believes — so a text with no unique landmark is
 * reported as unmeasurable rather than measured by estimate.
 *
 * Longest rather than first, because length is what makes a coincidental match
 * in unrelated markup implausible; ties break lexicographically so the answer
 * is the same on every run and a test can name it.
 */
export const fingerprintOf = (text: string): string | undefined =>
  [...new Set(text.match(ESCAPE_SAFE) ?? [])]
    .filter((token) => occurrencesOf(text, token) === 1)
    .sort((left, right) => right.length - left.length || (left < right ? -1 : left > right ? 1 : 0))[0]

export type Repetition = {
  /** The text's own size, as the document would carry it unescaped. */
  readonly bytes: number
  /** How many times the document carries it, in any encoding. */
  readonly copies: number
  /**
   * What the document would be lighter by if it carried the text once — **at
   * least**, and the bound is the point.
   *
   * `(copies - 1)` times the text's own length. An encoded copy is never
   * smaller than the text it encodes — escaping only ever adds characters, `>`
   * becoming `\u003e` — so this is provably under the true saving and never
   * over it.
   *
   * Two estimates of a copy's *actual* size were tried first and both
   * over-reported, which is why the bound is what ships. The mean gap between
   * landmarks charges a text for whatever sits between its copies: the first
   * reading of `/why-use-it` put one stylesheet at 98% of the page and a second
   * at a further 10%, summing past the whole document. The smallest gap is
   * tighter and still wrong in the same direction, because a gap is one copy
   * *plus* the content interleaved with it, and on that page the second
   * stylesheet's four copies are spread among the first's forty-two — giving a
   * 2,255-byte stylesheet a 53,344-byte "copy".
   *
   * A number somebody is going to act on should be one they can check. This one
   * is multiplication.
   */
  readonly repeatedBytes: number
}

export type Unmeasured = { readonly bytes: number; readonly code: "no-landmark" }

export const describeUnmeasured = (unmeasured: Unmeasured): string =>
  `${unmeasured.bytes} bytes, not counted: no run of ${LANDMARK_FLOOR} or more letters, digits, dots, underscores or hyphens occurs exactly once in it, so there is no landmark an escaped copy would share`

/**
 * How many times `document` carries `text`, and what the repetition costs.
 *
 * It reports and does not judge, which is
 * [0213](../../decisions/0213-the-harness-reads-a-box-it-prints-the-number-and-the-judgement-stays-in-the-report.md):
 * a string carried twice is sometimes exactly right — a critical stylesheet
 * inlined once and linked once is two copies on purpose — so whether a number
 * here is a defect is the report's to say and never this function's.
 */
export const repetitionIn = (document: string, text: string): Result<Repetition, Unmeasured> => {
  const landmark = fingerprintOf(text)
  if (landmark === undefined) return err({ bytes: text.length, code: "no-landmark" })

  const at = positionsOf(document, landmark)
  if (at.length <= 1) return ok({ bytes: text.length, copies: at.length, repeatedBytes: 0 })

  return ok({
    bytes: text.length,
    copies: at.length,
    repeatedBytes: (at.length - 1) * text.length,
  })
}
