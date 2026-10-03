/**
 * As much markdown as a lesson actually uses, and not one construct more.
 *
 * This is not a markdown implementation and must not become one. A lesson is
 * written by one routine, reviewed as text, and the constructs it reaches for
 * are countable: headings, paragraphs, ordered and unordered lists, fenced
 * code, blockquotes, pipe tables, and the horizontal rules that separate
 * sections. Every one of those is here; nothing else is, and a lesson that
 * needs something else will fail loudly at build time rather than render as
 * punctuation the reader has to ignore.
 *
 * The reason for parsing at all — rather than handing the file to an MDX
 * pipeline the way the docs surface does — is 0067. What a reader reads here is
 * a tree of registered primitives, so the markdown has to become *blocks*
 * before it can become nodes. A renderer that emitted HTML would be a second
 * component library with extra steps.
 *
 * Inline markup is deliberately not parsed. `plainText` strips it, because no
 * primitive in the starter library takes a span inside a paragraph — that cost
 * is real, is filed, and is not this module's to invent a way around.
 */

export type TableRow = readonly string[]

export type Block =
  | { readonly kind: "heading"; readonly level: number; readonly text: string }
  | { readonly kind: "paragraph"; readonly text: string }
  | { readonly kind: "list"; readonly ordered: boolean; readonly items: readonly string[] }
  | { readonly kind: "code"; readonly language: string | undefined; readonly code: string }
  /**
   * An HTML comment: a line the reader never sees, in either rendering of the
   * course.
   *
   * It is here because one thing a lesson needs to say is addressed to whoever
   * maintains it rather than to whoever is reading it — see the `moves:` mark in
   * `transcripts.test.ts`, which is the only kind of note this course currently
   * writes. GitHub does not render an HTML comment and neither does this
   * surface, so the note is invisible in both and present in the source, which
   * is the whole of why that shape was chosen over a visible aside.
   *
   * Before this existed, a comment in a lesson parsed as a **paragraph** and was
   * drawn on the page as the punctuation the reader has to ignore — the exact
   * outcome the module comment above says a lesson will fail loudly rather than
   * produce. No lesson had one, so nothing had ever shown it; the construct is
   * handled now rather than the hazard being left for the first author who
   * reaches for it.
   */
  | { readonly kind: "note"; readonly text: string }
  | { readonly kind: "quote"; readonly blocks: readonly Block[] }
  | { readonly kind: "table"; readonly headers: TableRow; readonly rows: readonly TableRow[] }
  | { readonly kind: "rule" }

const HEADING = /^(#{1,6})\s+(.*)$/
const FENCE = /^```(\S*)\s*$/
const RULE = /^-{3,}\s*$/
const QUOTE = /^>\s?(.*)$/
const ORDERED = /^(\d+)\.\s+(.*)$/
const BULLET = /^[-*]\s+(.*)$/
const CONTINUATION = /^\s+\S/
const TABLE_ROW = /^\|(.*)\|\s*$/
const TABLE_RULE = /^\|[\s:|-]+\|\s*$/
const COMMENT_OPEN = /^<!--/
const COMMENT_CLOSE = /-->/

const cells = (line: string): TableRow => {
  const inner = TABLE_ROW.exec(line)?.[1] ?? ""

  return inner.split("|").map((cell) => cell.trim())
}

/**
 * A soft-wrapped paragraph is one paragraph. Every lesson is wrapped at eighty
 * columns, so a line break inside a paragraph carries no meaning and joining on
 * a space is what the author wrote. The one place a newline *is* content is
 * inside a fence, which never reaches here.
 */
const joined = (lines: readonly string[]): string => lines.join(" ").replace(/\s+/g, " ").trim()

export const parseBlocks = (markdown: string): readonly Block[] => {
  const lines = markdown.split("\n")
  const blocks: Block[] = []
  let at = 0

  const paragraph = (): void => {
    const held: string[] = []

    while (at < lines.length) {
      const line = lines[at] ?? ""
      if (line.trim() === "") break
      if (HEADING.test(line) || FENCE.test(line) || RULE.test(line)) break
      if (QUOTE.test(line) || TABLE_ROW.test(line)) break
      if (ORDERED.test(line) || BULLET.test(line)) break
      /**
       * A comment ends a paragraph even with no blank line between them, which
       * is not how markdown treats arbitrary inline HTML and is how every note
       * this course writes is laid out: a sentence of prose, then the mark, then
       * the fence it governs. Absorbing it would put the note's text into a
       * rendered paragraph, and the point of the construct is that no reader
       * ever sees it.
       */
      if (COMMENT_OPEN.test(line.trim())) break

      held.push(line.trim())
      at += 1
    }

    if (held.length > 0) blocks.push({ kind: "paragraph", text: joined(held) })
  }

  const list = (ordered: boolean): void => {
    const items: string[] = []
    let held: string[] = []

    const close = (): void => {
      if (held.length > 0) items.push(joined(held))
      held = []
    }

    while (at < lines.length) {
      const line = lines[at] ?? ""
      const marker = ordered ? ORDERED.exec(line) : BULLET.exec(line)

      if (marker !== null) {
        close()
        held = [(ordered ? marker[2] : marker[1]) ?? ""]
        at += 1
        continue
      }

      /** An indented line under an item belongs to it. */
      if (CONTINUATION.test(line)) {
        held.push(line.trim())
        at += 1
        continue
      }

      /**
       * A blank line inside a list is not the end of the list, and getting this
       * wrong is not a formatting nicety: every Predict section separates its
       * numbered questions with one, so a parser that stops at the first blank
       * line finds question 1 and silently drops the other two. The lesson still
       * renders. It renders wrong.
       *
       * So look past the blank run: another item, or an indented continuation,
       * and the list goes on. Anything else ends it.
       */
      if (line.trim() === "") {
        let next = at

        while (next < lines.length && (lines[next] ?? "").trim() === "") next += 1

        const following = lines[next] ?? ""
        const continues =
          CONTINUATION.test(following) ||
          (ordered ? ORDERED.test(following) : BULLET.test(following))

        if (!continues) break

        at = next
        continue
      }

      break
    }

    close()

    if (items.length > 0) blocks.push({ kind: "list", ordered, items })
  }

  const fence = (language: string): void => {
    const held: string[] = []
    at += 1

    while (at < lines.length && !FENCE.test(lines[at] ?? "")) {
      held.push(lines[at] ?? "")
      at += 1
    }

    /** The closing fence, if the file has one. An unterminated fence is the rest of the file. */
    at += 1

    blocks.push({ kind: "code", language: language === "" ? undefined : language, code: held.join("\n") })
  }

  /**
   * From `<!--` to the first `-->`, which may be the same line or a later one.
   *
   * An unterminated comment is the rest of the file, matching what `fence` does
   * with an unterminated fence: both are the author having left something open,
   * and swallowing the remainder makes that loud at the first thing that counts
   * blocks rather than quietly dropping one line.
   */
  const comment = (): void => {
    const held: string[] = []

    while (at < lines.length) {
      const line = lines[at] ?? ""
      held.push(line)
      at += 1

      if (COMMENT_CLOSE.test(line)) break
    }

    const text = held
      .join(" ")
      .replace(/^\s*<!--/, "")
      .replace(/-->\s*$/, "")
      .replace(/\s+/g, " ")
      .trim()

    blocks.push({ kind: "note", text })
  }

  const quote = (): void => {
    const held: string[] = []

    while (at < lines.length) {
      const inner = QUOTE.exec(lines[at] ?? "")
      if (inner === null) break

      held.push(inner[1] ?? "")
      at += 1
    }

    blocks.push({ kind: "quote", blocks: parseBlocks(held.join("\n")) })
  }

  const table = (): void => {
    const headers = cells(lines[at] ?? "")
    at += 2

    const rows: TableRow[] = []

    while (at < lines.length && TABLE_ROW.test(lines[at] ?? "")) {
      rows.push(cells(lines[at] ?? ""))
      at += 1
    }

    blocks.push({ kind: "table", headers, rows })
  }

  while (at < lines.length) {
    const line = lines[at] ?? ""

    if (line.trim() === "") {
      at += 1
      continue
    }

    const heading = HEADING.exec(line)
    if (heading?.[1] !== undefined) {
      blocks.push({ kind: "heading", level: heading[1].length, text: heading[2] ?? "" })
      at += 1
      continue
    }

    if (COMMENT_OPEN.test(line.trim())) {
      comment()
      continue
    }

    const fenced = FENCE.exec(line)
    if (fenced !== null) {
      fence(fenced[1] ?? "")
      continue
    }

    if (RULE.test(line)) {
      blocks.push({ kind: "rule" })
      at += 1
      continue
    }

    if (QUOTE.test(line)) {
      quote()
      continue
    }

    if (TABLE_ROW.test(line) && TABLE_RULE.test(lines[at + 1] ?? "")) {
      table()
      continue
    }

    if (ORDERED.test(line)) {
      list(true)
      continue
    }

    if (BULLET.test(line)) {
      list(false)
      continue
    }

    const before = at
    paragraph()

    /** Nothing matched and nothing was consumed: skip the line rather than spin. */
    if (at === before) at += 1
  }

  return blocks
}
