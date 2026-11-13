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
 * JSON-escaped: `>` is `>`, a newline is `\n`. A payload copy shares no
 * long substring with the element it came from, so **the unit of measurement
 * cannot be the string.** It has to be a part of the string that escaping
 * leaves alone.
 *
 * **One such part is not a count** — 0387, and the correction that cost this
 * module its first wrong number. A landmark the text contains once is still a
 * token the rest of the document may contain any number of times, and on
 * 8 November a 78-byte rule whose landmark was `background-color` was reported
 * as carried 426 times when the document held it twice. So a copy is located by
 * **several** landmarks, in the order the text puts them in, each the right
 * distance from the one before: the thing a copy has and a coincidence does not.
 */

/**
 * The shortest run that is rare enough to be a landmark rather than a
 * coincidence.
 *
 * `.loom` appears in a stylesheet a hundred times and in unrelated markup
 * besides, and a landmark has to be rare to be one. Length is **not** what
 * makes it rare, which is 0387: against a document that is mostly CSS the
 * tokens that are both long and common are exactly the property names.
 */
export const LANDMARK_FLOOR = 8

/**
 * How many landmarks a copy is located by.
 *
 * Each one costs a scan of the document, and each one a coincidence has to
 * satisfy at the right distance from the last. Two is where the arithmetic
 * stops being a single token's count; six is where the scans stop buying much.
 */
export const LANDMARKS_COUNTED = 6

/**
 * The fewest landmarks a count may rest on.
 *
 * A text with one is reported as unmeasurable rather than measured by its one
 * token's count, which is the figure 0387 was written to stop printing.
 */
export const LANDMARKS_NEEDED = 2

/**
 * The most an encoding may grow one character of the text into.
 *
 * `>` written `>` is the longest of the escapes a payload copy is made of,
 * and it is six characters. Every encoding this module can see leaves
 * escape-safe runs alone and maps one character to between one and six, in
 * order — so the distance between two landmarks in a copy is at least their
 * distance in the text and at most six times it.
 */
export const MAX_ENCODED_EXPANSION = 6

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
 * One of the escape-safe tokens a copy of the text is recognised by, and how
 * far into the text it sits after the landmark before it.
 */
export type Landmark = {
  readonly token: string
  /** Characters from the previous landmark's start to this one's. Nought for the first. */
  readonly since: number
}

type Placed = { readonly token: string; readonly at: number }

const placedIn = (text: string): readonly Placed[] =>
  [...text.matchAll(ESCAPE_SAFE)].map((match) => ({ token: match[0], at: match.index ?? 0 }))

const longestFirst = (left: Placed, right: Placed): number =>
  right.token.length - left.token.length ||
  (left.token < right.token ? -1 : left.token > right.token ? 1 : 0)

const gapped = (placed: readonly Placed[]): readonly Landmark[] =>
  placed.map((landmark, index) => ({
    token: landmark.token,
    since: index === 0 ? 0 : landmark.at - (placed[index - 1]?.at ?? landmark.at),
  }))

/**
 * The landmarks to recognise a copy of `text` by: its longest escape-safe
 * tokens that `text` contains exactly **once**, in the order the text puts
 * them in.
 *
 * Once is the whole of why this is reliable. A token appearing twice per copy
 * would make every count a division, and a division is where an off-by-one
 * becomes a number somebody believes — so a text with no unique landmark is
 * reported as unmeasurable rather than measured by estimate.
 *
 * Longest first when choosing, because the longest tokens are the ones a copy
 * is most likely to be alone in carrying; ties break lexicographically so the
 * answer is the same on every run and a test can name it. The chosen ones are
 * then returned in **text order**, because what locates a copy is the sequence.
 */
export const landmarksOf = (text: string): readonly Landmark[] =>
  gapped(
    [...placedIn(text)]
      .filter((placed) => occurrencesOf(text, placed.token) === 1)
      .sort(longestFirst)
      .slice(0, LANDMARKS_COUNTED)
      .sort((left, right) => left.at - right.at),
  )

const firstWithin = (positions: readonly number[], from: number, to: number): number | undefined =>
  positions.find((at) => at >= from && at <= to)

type Step = { readonly since: number; readonly positions: readonly number[] }

/**
 * Where the landmarks after the first sit, if they sit where a copy would put
 * them: the nearest occurrence that is at least `since` characters along and at
 * most six times that.
 *
 * The nearest rather than every candidate, so there is no search and no run
 * takes a different answer than another. It can miss a copy whose nearest
 * candidate is a coincidence — which under-counts, and under-counting is the
 * direction this module's figure is already promised in.
 */
const chainFrom = (start: number, steps: readonly Step[]): number | undefined =>
  steps.reduce<number | undefined>(
    (at, step) =>
      at === undefined
        ? undefined
        : firstWithin(step.positions, at + step.since, at + step.since * MAX_ENCODED_EXPANSION),
    start,
  )

const timesWithin = (positions: readonly number[], from: number, to: number): number =>
  positions.filter((at) => at >= from && at < to).length

/**
 * Whether the span the chain covers carries each landmark exactly once, which a
 * copy of the text does and the stretch of document between two unrelated
 * rules does not.
 *
 * It is the half of the check that does the work. A pair of landmarks at a
 * plausible distance is otherwise satisfied by the **tail of one copy and the
 * head of the next**: the last `background-color` of a stylesheet's copy, and
 * the `color-scheme` of the small rule encoded after it. That span holds
 * `background-color` twice, and a copy of a text its landmark occurs once in
 * never can.
 */
const eachCarriedOnce = (landmarks: readonly (readonly number[])[], from: number, to: number): boolean =>
  landmarks.every((positions) => timesWithin(positions, from, to) === 1)

/**
 * Where each copy of `text` starts in `document`, in order.
 *
 * A copy is a run of the text's landmarks in the text's own order, each at
 * least as far from the one before as the text puts it and at most six times
 * that — the span an encoding may stretch to and no further — and each
 * occurring exactly once inside the span. Occurrences of one landmark that no
 * such run passes through belong to somebody else's markup and are not counted.
 *
 * **Two copies cannot overlap, and nothing here has to say so.** A span carries
 * the first landmark once, so the next occurrence of it is past the end of the
 * copy just counted — the guard this function was first written with turned out
 * to be unreachable, and a mutation of it survived a sweep that killed nine
 * others, which is how it was found.
 *
 * Empty when the text has fewer than two landmarks, which is not a count of
 * nought: `repetitionIn` reports that text as unmeasurable.
 */
export const copyPositionsIn = (document: string, text: string): readonly number[] => {
  const [first, ...rest] = landmarksOf(text)
  if (first === undefined || rest.length < LANDMARKS_NEEDED - 1) return []

  const steps = rest.map((landmark) => ({
    since: landmark.since,
    positions: positionsOf(document, landmark.token),
  }))

  const starts = positionsOf(document, first.token)
  const everyLandmark = [starts, ...steps.map((step) => step.positions)]
  const lastLength = rest.at(-1)?.token.length ?? 0

  return starts.filter((start) => {
    const end = chainFrom(start, steps)

    return end !== undefined && eachCarriedOnce(everyLandmark, start, end + lastLength)
  })
}

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
   * becoming `>` — so this is provably under the true saving and never
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

export type UnmeasuredCode = "no-landmark" | "one-landmark"

export type Unmeasured = { readonly bytes: number; readonly code: UnmeasuredCode }

const WHY: Record<UnmeasuredCode, string> = {
  "no-landmark": `no run of ${LANDMARK_FLOOR} or more letters, digits, dots, underscores or hyphens occurs exactly once in it, so there is no landmark an escaped copy would share`,
  "one-landmark": `only one run of ${LANDMARK_FLOOR} or more letters, digits, dots, underscores or hyphens occurs exactly once in it, and one landmark counts every place the rest of the document happens to use that token`,
}

export const describeUnmeasured = (unmeasured: Unmeasured): string =>
  `${unmeasured.bytes} bytes, not counted: ${WHY[unmeasured.code]}`

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
  const landmarks = landmarksOf(text)
  if (landmarks.length < LANDMARKS_NEEDED) {
    return err({ bytes: text.length, code: landmarks.length === 0 ? "no-landmark" : "one-landmark" })
  }

  const at = copyPositionsIn(document, text)
  if (at.length <= 1) return ok({ bytes: text.length, copies: at.length, repeatedBytes: 0 })

  return ok({
    bytes: text.length,
    copies: at.length,
    repeatedBytes: (at.length - 1) * text.length,
  })
}
