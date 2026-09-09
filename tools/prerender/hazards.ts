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
 * Tags and comments are taken out — including the separator itself — because
 * the whole value of the message is that it prints the sentence that is wrong.
 * `16of those blocks are TypeScript` is a bug report; the same span with the
 * hydration markers left in is a haystack with the needle still in it.
 */
const contextAround = (html: string, at: number, end: number): string =>
  html
    .slice(Math.max(0, at - CONTEXT_EITHER_SIDE), end + CONTEXT_EITHER_SIDE)
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
