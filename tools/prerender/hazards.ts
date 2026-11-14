/**
 * What the built page says, which is not always what a test saw.
 *
 * `Loom docs` filed this on 9 September, from the arrival route's footer. The
 * source is one paragraph:
 *
 * ```tsx
 * <p className="mt-3">
 *   {ARRIVAL_TOTALS.compiled} of those blocks are TypeScript, …
 * </p>
 * ```
 *
 * Under `vitest` that renders `16 of those blocks are TypeScript` and a test
 * asserting exactly that string on `container.textContent` **passed**. The same
 * component in `next build`'s output is:
 *
 * ```html
 * <p class="mt-3">16<!-- -->of those blocks are TypeScript, …
 * ```
 *
 * The reader gets *"16of those blocks"*. Same source file, two renderers, two
 * sentences, and the one a reader gets is the one nothing in this repository
 * looked at. It reached the site and was caught in a screenshot; a run that
 * skipped the visual would have shipped it green.
 *
 * The important half of that finding is not the paragraph. It is that **no test
 * written on `textContent` can catch this class at all** — the assertion is made
 * against a different transform's output, so writing a stricter one does not
 * help. Four surfaces now share the transform and therefore share the blind
 * spot. What closes it is reading the artefact the reader is served, which
 * `pnpm verify` already produces and nothing opened.
 *
 * **Two classes live here, and the second is the first one step to the left.**
 * On 23 October `Loom docs` met the same defect with the separator missing —
 * the space had not been moved, it had been dropped, so there was no second
 * text child and so no marker. `runTogethersIn` reads the separator;
 * `tagRunTogethersIn` reads the two characters either side of an inline
 * element's end tag. `0119` asked that a second class be argued from a defect
 * that reached a reader rather than from one somebody imagined, and both of
 * these reached one.
 */

/**
 * The separator React writes between two adjacent text children.
 *
 * It exists so hydration can find the boundary between children that would
 * otherwise be one text node, and it is invisible to a reader. That makes it
 * exactly the marker this needs: wherever it appears, two pieces of text were
 * placed side by side, and whether a space belongs between them is a question
 * somebody answered — or, in the case above, did not notice they were being
 * asked.
 */
const SEPARATOR = "<!-- -->"

/** Not a space, not punctuation: the characters that run together when they meet. */
const JOINING = /[A-Za-z0-9]/

export type RunTogether = {
  /** Where it is, relative to the prerender root. */
  readonly page: string
  /** The two characters the separator sits between, joined as a reader sees them. */
  readonly joined: string
  /** Enough either side to recognise the sentence without opening the file. */
  readonly context: string
}

const CONTEXT_EITHER_SIDE = 40

/**
 * The window either side, as a reader sees it rather than as it is stored.
 *
 * **The junction's own markup is cut out rather than blanked**, so the two
 * sides meet exactly as a reader sees them meet: that is the whole message.
 * `16of those blocks are TypeScript` is a bug report, and so is
 * `say colorin a sentence`; either of them with a space put back where the
 * markup was is a sentence that reads fine and names no defect.
 *
 * Everything else in the window — other tags, other comments — is blanked,
 * because a window is a fixed width and the rest of it is a haystack.
 */
const contextAround = (html: string, at: number, end: number): string =>
  (
    html.slice(Math.max(0, at - CONTEXT_EITHER_SIDE), at) +
    html.slice(end, end + CONTEXT_EITHER_SIDE)
  )
    .replace(/<!--.*?-->/gsu, "")
    .replace(/<[^>]*>/gsu, " ")
    /** The window is a fixed width, so either end can land inside a tag. */
    .replace(/^[^<]*>/u, " ")
    .replace(/<[^>]*$/u, " ")
    .replace(/\s+/gu, " ")
    .trim()

/**
 * Every place in one built page where two text runs meet with nothing between
 * them and both sides are the kind of character that runs together.
 *
 * The rule is deliberately about **the two characters the separator sits
 * between** and not about meaning. `$` and `%` are not joining characters, so
 * `$<!-- -->16` and `16<!-- -->%` pass, which is right — a reader sees `$16`
 * and `16%` and both are sentences somebody meant. `16<!-- -->of` does not
 * pass, and neither would `16<!-- -->px`.
 *
 * There is no exemption list, because the honest fix for a junction that is
 * meant to run together is to make it **one** text child — `{`${n}px`}` rather
 * than `{n}px` — which emits no separator and so is never asked about. An
 * exemption would be a second way to say the same thing, and the one that
 * leaves the next reader guessing which was intended.
 *
 * What this cannot see is a space lost across a tag: `16<!-- --><span>of</span>`
 * reads `16of` to a reader and passes here, because the character after the
 * separator is `<`. Widening to the rendered text stream would need this to
 * decide which elements introduce a space of their own, and that is a second
 * question with its own wrong answers. Recorded as an open question in 0119
 * rather than half-answered.
 */
export const runTogethersIn = (page: string, html: string): readonly RunTogether[] => {
  const found: RunTogether[] = []

  for (let at = html.indexOf(SEPARATOR); at !== -1; at = html.indexOf(SEPARATOR, at + 1)) {
    const end = at + SEPARATOR.length
    const before = html.slice(Math.max(0, at - 1), at)
    const after = html.slice(end, end + 1)

    if (!JOINING.test(before) || !JOINING.test(after)) continue

    found.push({ page, joined: `${before}${after}`, context: contextAround(html, at, end) })
  }

  return found
}

/**
 * How many separators a page carries, run-together or not.
 *
 * Counted so a run can say what it read. A check over built output can pass
 * because the output is clean or because it opened nothing, and those look
 * identical from a green tick — this is the number that tells them apart.
 */
export const separatorsIn = (html: string): number => html.split(SEPARATOR).length - 1

export const describeRunTogether = (hazard: RunTogether): string =>
  `${hazard.page}: reads "${hazard.joined}" — ${hazard.context}`

/**
 * HTML's text-level elements, which are the ones that end **inside a line**.
 *
 * The list is the spec's *text-level semantics* category minus the void
 * elements, which have no end tag to be followed by anything. It is not an
 * allowed list and it is not taste: it is the definition of the hazard. A
 * reader sees characters touch only when nothing between them breaks the line,
 * so `</em>in` is a sentence run together and `</p>in` is the next paragraph.
 * Flagging a block element's end would be a red gate over correct output, and
 * the gate is now four surfaces' rather than one.
 */
const TEXT_LEVEL: ReadonlySet<string> = new Set([
  "a", "abbr", "b", "bdi", "bdo", "cite", "code", "data", "dfn", "em", "i", "kbd", "mark",
  "q", "rp", "rt", "ruby", "s", "samp", "small", "span", "strong", "sub", "sup", "time",
  "u", "var",
])

const CLOSING_TAG = /<\/([a-zA-Z][a-zA-Z0-9-]*)>/gu

/**
 * A plural hung on the element's text: `<code>Map</code>s`.
 *
 * The one shape in this class with **no second spelling**, which is why it is
 * allowed here where `0119` allowed nothing. Moving the `s` inside the element
 * styles it as code and changes what the page says; leaving it outside is the
 * only way to write the sentence. The allowance is therefore not a choice
 * between two ways of saying one thing — it is the one way — and it is held to
 * a single `s` that ends the word, so a lost space before any word at all
 * still reports.
 */
const isPlural = (html: string, end: number): boolean =>
  html.slice(end, end + 1) === "s" && !JOINING.test(html.slice(end + 1, end + 2))

/**
 * Every place in one built page where an inline element's end tag is followed
 * **immediately** by a joining character, and the element's own text ends in
 * one too.
 *
 * This is the second hazard class and the mirror of the first. `runTogethersIn`
 * reads the separator React writes between two adjacent text children; the
 * defect `Loom docs` met on 23 October left no separator at all, because the
 * space that would have been the second text child was gone:
 *
 * ```tsx
 * <p>…so a page can say <em>color</em> in a sentence…</p>   // the source, with the space
 * ```
 * ```html
 * …so a page can say <em>color</em>in a sentence…           // what next build wrote
 * ```
 *
 * `container.textContent` under `vitest` reads *say color in a sentence*.
 * `pnpm prerender:check` read 1,917 junctions and passed. A hazard that leaves
 * no marker is invisible to a detector built on the marker, so this one is
 * built on the two characters a reader sees touch instead — **the one before
 * the end tag and the one after it** — which is `runTogethersIn`'s rule with
 * the tag in the separator's place, and takes its answers for punctuation with
 * it.
 *
 * **An element that keeps the space inside is not a junction**, and it is how
 * most of them are written: `<span>Asked: </span>Make the main heading…` has a
 * space before the end tag, so the characters either side are a space and an
 * `M`, and it passes without `span` being named anywhere. An allowed list of
 * tag names would have exempted the element this defect is likeliest to appear
 * on.
 *
 * **Only the closing direction.** A space lost *before* a tag —
 * `say<em>color</em>` — has the same shape as a styled badge sitting against
 * the text it labels, and that shape is on this site 2,134 times across 139
 * pages, every one of them correct. There is nothing in the markup that tells
 * the two apart, so this reads end tags only and the opening direction stays an
 * open question, as `0119` left the span-crossing one.
 */
export const tagRunTogethersIn = (page: string, html: string): readonly RunTogether[] => {
  const found: RunTogether[] = []

  for (const match of html.matchAll(CLOSING_TAG)) {
    const at = match.index
    const end = at + match[0].length
    const before = html.slice(Math.max(0, at - 1), at)
    const after = html.slice(end, end + 1)

    if (!TEXT_LEVEL.has((match[1] ?? "").toLowerCase())) continue
    if (!JOINING.test(before) || !JOINING.test(after)) continue
    if (isPlural(html, end)) continue

    found.push({ page, joined: `${before}${after}`, context: contextAround(html, at, end) })
  }

  return found
}

/**
 * How many inline end tags a page carries with text hard against them, correct
 * or not — `separatorsIn`'s number for the second class, and read for the same
 * reason: a check that opened nothing and a page that is clean are the same
 * green tick without it.
 */
export const tagJunctionsIn = (html: string): number => {
  let junctions = 0

  for (const match of html.matchAll(CLOSING_TAG)) {
    const end = match.index + match[0].length

    if (!TEXT_LEVEL.has((match[1] ?? "").toLowerCase())) continue
    if (JOINING.test(html.slice(end, end + 1))) junctions += 1
  }

  return junctions
}
