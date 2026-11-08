/**
 * What in a source file is code, and what is text a check must not read.
 *
 * Two checks in this directory read source text looking for a construct — a
 * module mock, a semicolon ending a statement — and both have the same way of
 * being wrong: the construct appears in a **docblock explaining the
 * construct**. `(marketing)/_lib/serving.test.ts` is the case that forces this.
 * It is the file that worked out why a module mock in a shared worker is
 * order-dependent, and its docblock prints two `vi.mock(…)` calls in a table of
 * what it measured. A check that grepped for `vi.mock(` would report the one
 * file in this repository that already understands the hazard.
 *
 * So this module blanks everything that is not code — comment bodies, string
 * and template-literal contents, regular-expression bodies — and keeps every
 * newline and every character position. A line number read off the result is a
 * line number in the file.
 *
 * **The failure mode is deliberate, and it is the reason a check here can be
 * trusted against `main`.** Blanking only ever removes a construct, so a
 * mis-read makes a check miss something rather than invent it. There is no JSX
 * mode — an apostrophe in `don&rsquo;t` would open a string and a `https://` in
 * prose would open a comment — and `unterminated` is how the sweeps assert that
 * no file in this repository ends mid-construct, which is what a mis-read bad
 * enough to matter looks like.
 */

type Quote = "'" | '"'

type Mode =
  | { readonly kind: "code" }
  | { readonly kind: "line-comment" }
  | { readonly kind: "block-comment" }
  | { readonly kind: "quoted"; readonly quote: Quote }
  | { readonly kind: "template" }
  | { readonly kind: "regex" }

/**
 * A template literal's `${…}` holds code, and that code may hold another
 * template literal. So the state is a stack rather than a mode, and an
 * expression frame counts its own braces to know which `}` closes it.
 */
type Frame = { readonly mode: Mode; braces: number }

const CODE: Mode = { kind: "code" }

/**
 * Where a `/` opens a regular expression rather than dividing.
 *
 * Deciding this properly needs the previous *token*, which needs a parser. The
 * approximation is the usual one: a `/` after an operator, an opening bracket or
 * one of these keywords cannot be division, because there is nothing to divide.
 *
 * Both ways of being wrong blank rather than reveal. A division read as a regex
 * blanks to the next `/`; a regex read as division leaves its body as code,
 * where a quote inside it opens a string and blanks further still. Neither
 * invents a semicolon or a mock call.
 */
const BEFORE_REGEX = new Set("(,=:[!&|?{};+-*%~^<>".split(""))

const KEYWORD_BEFORE_REGEX =
  /(?:^|[^\w$])(?:return|typeof|case|in|of|do|else|yield|await|new|delete|void|instanceof)$/

const opensRegex = (emitted: readonly string[]): boolean => {
  const code = emitted.join("")
  const trimmed = code.trimEnd()
  const last = trimmed.at(-1)

  if (last === undefined) return true
  if (BEFORE_REGEX.has(last)) return true

  return KEYWORD_BEFORE_REGEX.test(trimmed)
}

/** A newline survives blanking; everything else becomes a space. */
const blanked = (character: string): string => (character === "\n" ? "\n" : " ")

type Scan = { readonly code: string; readonly mode: Mode }

/**
 * The scan, with the mode it ended in.
 *
 * A file of well-formed TypeScript ends in `code`. Anything else means this
 * scanner lost its place, which the sweeps assert does not happen rather than
 * assume.
 */
export const scan = (source: string): Scan => {
  const out: string[] = []
  const stack: Frame[] = [{ mode: CODE, braces: 0 }]

  const top = (): Frame => stack[stack.length - 1] ?? { mode: CODE, braces: 0 }
  const keep = (character: string): void => void out.push(character)
  const hide = (character: string): void => void out.push(blanked(character))

  let index = 0

  while (index < source.length) {
    const character = source[index] ?? ""
    const next = source[index + 1] ?? ""
    const { mode } = top()

    switch (mode.kind) {
      case "code": {
        if (character === "/" && next === "*") {
          stack.push({ mode: { kind: "block-comment" }, braces: 0 })
          hide(character)
          hide(next)
          index += 2
          continue
        }

        if (character === "/" && next === "/") {
          stack.push({ mode: { kind: "line-comment" }, braces: 0 })
          hide(character)
          hide(next)
          index += 2
          continue
        }

        if (character === "/" && opensRegex(out)) {
          stack.push({ mode: { kind: "regex" }, braces: 0 })
          keep(character)
          index += 1
          continue
        }

        if (character === "'" || character === '"') {
          stack.push({ mode: { kind: "quoted", quote: character }, braces: 0 })
          keep(character)
          index += 1
          continue
        }

        if (character === "`") {
          stack.push({ mode: { kind: "template" }, braces: 0 })
          keep(character)
          index += 1
          continue
        }

        /**
         * Only an expression frame — one opened by `${` — closes on a brace. The
         * outermost frame counts braces too and never leaves, which is what
         * keeps an unbalanced `}` in a file from popping the stack empty.
         */
        if (character === "{") top().braces += 1

        if (character === "}" && stack.length > 1) {
          if (top().braces === 0) {
            stack.pop()
            keep(character)
            index += 1
            continue
          }

          top().braces -= 1
        }

        keep(character)
        index += 1
        continue
      }

      case "line-comment": {
        if (character === "\n") {
          stack.pop()
          keep(character)
          index += 1
          continue
        }

        hide(character)
        index += 1
        continue
      }

      case "block-comment": {
        if (character === "*" && next === "/") {
          stack.pop()
          hide(character)
          hide(next)
          index += 2
          continue
        }

        hide(character)
        index += 1
        continue
      }

      case "quoted": {
        if (character === "\\") {
          hide(character)
          hide(next)
          index += 2
          continue
        }

        if (character === mode.quote) {
          stack.pop()
          keep(character)
          index += 1
          continue
        }

        /**
         * A newline ends an unterminated string rather than running on. A
         * quote this scanner opened by mistake — an apostrophe in JSX prose —
         * then costs one line instead of the rest of the file.
         */
        if (character === "\n") {
          stack.pop()
          keep(character)
          index += 1
          continue
        }

        hide(character)
        index += 1
        continue
      }

      case "template": {
        if (character === "\\") {
          hide(character)
          hide(next)
          index += 2
          continue
        }

        if (character === "$" && next === "{") {
          stack.push({ mode: CODE, braces: 0 })
          keep(character)
          keep(next)
          index += 2
          continue
        }

        if (character === "`") {
          stack.pop()
          keep(character)
          index += 1
          continue
        }

        hide(character)
        index += 1
        continue
      }

      case "regex": {
        if (character === "\\") {
          hide(character)
          hide(next)
          index += 2
          continue
        }

        if (character === "/" || character === "\n") {
          stack.pop()
          keep(character)
          index += 1
          continue
        }

        hide(character)
        index += 1
        continue
      }
    }
  }

  return { code: out.join(""), mode: top().mode }
}

/** The source with everything that is not code blanked, positions preserved. */
export const codeOnly = (source: string): string => scan(source).code

/**
 * Whether the scan ended somewhere other than in code.
 *
 * A block comment nobody closed, a template literal nobody closed. Asserted
 * over this repository by the sweeps, because a scanner that has lost its place
 * is a check that is quietly reading the wrong text.
 */
export const unterminated = (source: string): boolean => scan(source).mode.kind !== "code"
