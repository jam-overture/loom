/**
 * Where the fences are, decided once.
 *
 * Four things on this site needed to know whether a line is inside a fenced
 * block, and all four worked it out for themselves. The search index skipped
 * fences when it read headings and again when it read prose; the reference
 * skipped them the other way round, wanting what is inside and nothing else;
 * and the fence checker read them properly. Four copies of
 * `/^\s*(?:```|~~~)/` and a boolean that flips on every match.
 *
 * Four copies of one rule is four chances to disagree about it, and they did.
 * A boolean that flips on any run of three backticks cannot read a block that
 * *contains* a fence — the four-backtick block in `model.ts`, which shows what
 * the vocabulary looks like in markdown, is exactly that shape. Three of the
 * four would have read its inner ` ``` ` as a closing fence, silently treated
 * the rest of the page as code, and gone quiet. Nothing would have been red;
 * the page would simply have stopped being searchable half way down.
 *
 * So this module answers one question — **which lines are fenced, and what is
 * between them** — and answers it by markdown's own rule rather than by a
 * three-character prefix:
 *
 * - A fence opens on a run of **three or more** backticks or tildes.
 * - It closes on a run of the **same character, at least as long**, with
 *   nothing after it but whitespace.
 * - Anything else on those lines, inner fences included, is code.
 *
 * What a fence *claims to be* is a separate question and lives in `model.ts`
 * and `extract.ts`, which are strict about it and stop the build. This is
 * deliberately not: the two search readers run over markdown written to
 * exercise their own rules, and a scanner that threw on a fence with no
 * language would make that untestable.
 */

export type FenceSpan = {
  /** 1-based line of the opening ticks. */
  readonly opensAt: number
  /**
   * 1-based line of the closing ticks.
   *
   * Absent when the fence never closes, which is a page to fix rather than a
   * page to guess at: everything to the end of the file is inside it, and the
   * checker in `extract.ts` is the one that says so out loud.
   */
  readonly closesAt?: number
  /** The run that opened it, so a caller can see what closed it and what did not. */
  readonly ticks: string
  /** Everything after the opening ticks, untrimmed. `ts object-body`, or empty. */
  readonly info: string
  /** The lines between the fences, verbatim, with no trailing newline. */
  readonly code: string
}

const OPENING = /^[ \t]*(?<ticks>`{3,}|~{3,})(?<info>.*)$/

/**
 * Whether this line ends the fence that is open.
 *
 * The length rule is markdown's and it is the half that matters here: a block
 * showing markdown to a reader opens with four backticks so that a three-tick
 * fence can sit inside it, and a closer that only had to match the character
 * would end the outer block at the inner one's first line.
 */
const closes = (line: string, ticks: string): boolean => {
  const match = OPENING.exec(line)

  if (match?.groups === undefined) return false

  const found = match.groups["ticks"] ?? ""

  return (
    found[0] === ticks[0] &&
    found.length >= ticks.length &&
    (match.groups["info"] ?? "").trim() === ""
  )
}

/**
 * Every fenced block in a piece of markdown, in reading order.
 *
 * A scan rather than a markdown parse, for the reason `extract.ts` gives: the
 * word after the language is markdown *meta* and MDX throws it away, so the
 * source text is the only place it survives and the source text is what gets
 * read.
 */
export const fenceSpansIn = (source: string): readonly FenceSpan[] => {
  const lines = source.split("\n")
  const spans: FenceSpan[] = []

  let open: { readonly opensAt: number; readonly ticks: string; readonly info: string } | undefined
  let body: string[] = []

  lines.forEach((line, index) => {
    if (open === undefined) {
      const match = OPENING.exec(line)

      if (match?.groups === undefined) return

      open = {
        opensAt: index + 1,
        ticks: match.groups["ticks"] ?? "```",
        info: match.groups["info"] ?? "",
      }
      body = []
      return
    }

    if (closes(line, open.ticks)) {
      spans.push({ ...open, closesAt: index + 1, code: body.join("\n") })
      open = undefined
      return
    }

    body.push(line)
  })

  if (open !== undefined) spans.push({ ...open, code: body.join("\n") })

  return spans
}

/**
 * The same markdown with every fenced line blanked, so a reader of prose never
 * has to think about code.
 *
 * Blanked rather than removed, because two of the three callers count lines: a
 * heading's position and a mention's nearest heading are both worked out by
 * walking the file, and a scanner handed a shorter file would name the wrong
 * line. An empty line is what a fence looks like to something reading for
 * words — the shell prompt in *Installation* is not a section, and its
 * `# install the runtime` comment is not a heading.
 */
export const outsideFences = (source: string): readonly string[] => {
  const lines = source.split("\n")
  const spans = fenceSpansIn(source)

  const fenced = new Set(
    spans.flatMap((span) => {
      const last = span.closesAt ?? lines.length

      return Array.from({ length: last - span.opensAt + 1 }, (_, step) => span.opensAt + step)
    })
  )

  return lines.map((line, index) => (fenced.has(index + 1) ? "" : line))
}
