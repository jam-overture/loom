import { codeOnly } from "./code.js"

/**
 * Whether a formatter has been run over a file in this repository.
 *
 * `Loom signals` filed this on 12 October. That run wrote a module, ran
 * `npx prettier --write` on it and on two files it had edited, on the
 * reasonable assumption that the style here was a formatter's output. **There
 * is no `.prettierrc`, no `prettier.config.*`, no `.editorconfig` and no
 * formatter in any `package.json`**, so prettier ran on its own defaults —
 * which are not this repository's. A change of about 150 lines across two files
 * became a diff touching roughly every line of a 640-line module and its
 * 700-line suite, for a change nobody could then review.
 *
 * **Nothing in `pnpm verify` would have failed.** There is no lint or format
 * step, so `build`, `typecheck`, `test`, `findings:check` and `prerender:check`
 * are all green on a wholly reformatted file. It was caught because a semicolon
 * count in a file that lane had not written looked wrong.
 *
 * This is that count, as a check. The style here is maintained by hand (0360)
 * and **no statement in this repository ends in a semicolon** — measured over
 * 1,904 sources, where the only six lines that look like one are the two
 * exceptions below. A formatter's most reliable signature is that it adds them,
 * so a run that reaches for one goes red on its own branch, naming the file,
 * rather than on `main` a day later with everybody's diff already unreadable.
 *
 * It is a detector and not a style rule: it holds the one property that a
 * reformat cannot avoid changing and says nothing about the rest. Quoting,
 * wrapping and spacing are matched by reading the file beside yours.
 */

/** `&hellip;` in JSX text. Prose, not a statement, and there are four. */
const HTML_ENTITY = /&(?:#\d+|#x[0-9a-fA-F]+|[a-zA-Z][a-zA-Z0-9]*);$/

/** `for` in any position a statement can start, rather than inside a word. */
const FOR_HEADER = /(?:^|[^\w$])for\s*\(/g

/**
 * The lines a `for` header spans.
 *
 * Its first two clauses end in semicolons, and `ancestryOf` in
 * `src/signals/broadcast.ts` is long enough to put each clause on its own line.
 * Those are the language's separators rather than statement terminators, so
 * they are exempt — and the exemption is the header's own extent rather than
 * "a line that mentions `for`", so a semicolon on a line after the header
 * closes is still reported.
 */
const forHeaderLines = (code: string): ReadonlySet<number> => {
  const lineOf = (index: number): number => code.slice(0, index).split("\n").length
  const covered = new Set<number>()

  for (const match of code.matchAll(FOR_HEADER)) {
    const opening = code.indexOf("(", match.index)
    let depth = 0

    for (let at = opening; at < code.length; at += 1) {
      const character = code[at]

      if (character === "(") depth += 1
      if (character === ")") depth -= 1
      if (depth === 0) {
        for (let line = lineOf(opening); line <= lineOf(at); line += 1) covered.add(line)
        break
      }
    }
  }

  return covered
}

export type SemicolonLine = { readonly line: number; readonly text: string }

export const semicolonTerminated = (source: string): readonly SemicolonLine[] => {
  const code = codeOnly(source)
  const inForHeader = forHeaderLines(code)

  return code.split("\n").flatMap((text, offset) => {
    const line = offset + 1
    const trimmed = text.trimEnd()

    if (!trimmed.endsWith(";")) return []
    if (inForHeader.has(line)) return []
    if (HTML_ENTITY.test(trimmed)) return []

    return [{ line, text: trimmed.trim() }]
  })
}
