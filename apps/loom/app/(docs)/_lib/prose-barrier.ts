import { readFileSync } from "node:fs"
import { join } from "node:path"

import { REPOSITORY_ROOT } from "./architecture/source"

/**
 * Reading `globals.css` as rules, so a claim about the stylesheet can be a test
 * rather than a comment.
 *
 * The claim is one sentence: **no rule written for markdown may reach inside a
 * `.not-prose` region.** That region is what a component draws itself, and — far
 * more importantly — it is what wraps every rendered `LoomTree` on this site.
 * An example is supposed to show a reader a page they can reproduce, so a
 * declaration the documentation site contributes to one is a lie in the only
 * place the site cannot afford one.
 *
 * The barrier is `:not(.not-prose *)` on each selector. This module finds the
 * selectors that need it; `prose-barrier.test.ts` is what insists they have it.
 *
 * Parsing CSS with a regular expression is usually a mistake, and it is not one
 * here for a narrow reason: this is a stylesheet in this repository, in this
 * lane, with no nesting inside `@layer components` and no `@media` within it.
 * The parser refuses anything it does not recognise rather than guessing, so a
 * sheet that grew a construct this cannot read fails loudly instead of quietly
 * reporting that every rule is fine.
 */

export type CssRule = {
  /** One comma-separated part of a rule's selector, trimmed. */
  readonly selector: string
  /** The line it starts on in `globals.css`, for a failure message worth reading. */
  readonly line: number
}

const STYLESHEET = join(REPOSITORY_ROOT, "apps", "loom", "app", "(docs)", "globals.css")

export const readDocsStylesheet = (): string => readFileSync(STYLESHEET, "utf8")

/** Comments hold example selectors and prose about them; neither is a rule. */
const withoutComments = (css: string): string => css.replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, " "))

/**
 * The body of `@layer components { … }`, which is where every prose rule lives.
 *
 * Found by brace-matching rather than by a regular expression, because the
 * block contains braces and a lazy match would stop at the first one.
 */
export const componentsLayer = (css: string): string => {
  const source = withoutComments(css)
  const start = source.indexOf("@layer components")
  if (start === -1) throw new Error("prose-barrier: no `@layer components` block in globals.css")

  const open = source.indexOf("{", start)
  if (open === -1) throw new Error("prose-barrier: `@layer components` has no body")

  let depth = 0
  for (let i = open; i < source.length; i += 1) {
    if (source[i] === "{") depth += 1
    else if (source[i] === "}") {
      depth -= 1
      if (depth === 0) return source.slice(open + 1, i)
    }
  }

  throw new Error("prose-barrier: `@layer components` is not closed")
}

/**
 * Every selector in the layer, one entry per comma-separated part.
 *
 * A rule reading `.prose h1, .prose h2 { … }` is two selectors here, because
 * the barrier has to be on both and a check that looked at the whole string
 * would pass on one.
 */
export const selectorsIn = (layerBody: string, css: string): readonly CssRule[] => {
  const out: CssRule[] = []
  let at = 0

  for (;;) {
    const open = layerBody.indexOf("{", at)
    if (open === -1) break

    const close = layerBody.indexOf("}", open)
    if (close === -1) throw new Error("prose-barrier: a rule in `@layer components` is not closed")

    const head = layerBody.slice(at, open).trim()
    if (head.startsWith("@")) throw new Error(`prose-barrier: unreadable at-rule inside the layer: ${head}`)

    if (head !== "") {
      /*
       * The line the selector is written on, not the line the previous rule
       * closed on: `at` sits immediately after the last `}`, and everything
       * between there and the first non-space is blank lines and comments.
       */
      const raw = layerBody.slice(at, open)
      const offset = withoutComments(css).indexOf(layerBody) + at + raw.length - raw.trimStart().length
      const line = css.slice(0, offset).split("\n").length

      for (const part of head.split(",")) {
        const selector = part.trim()
        if (selector !== "") out.push({ selector, line })
      }
    }

    at = close + 1
  }

  return out
}

export const BARRIER = ":not(.not-prose *)"

/**
 * Whether a selector can match an element inside a `.not-prose` region.
 *
 * The question is only about **descendant steps**, because that is the only way
 * a selector reaches past a region's own element. A selector is normalised to
 * its compounds — `>`, `+` and `~` bind them together, whitespace separates
 * them — and one compound cannot be inside anything.
 *
 * So `.prose > * + *` is exempt: its subject is a direct child of `.prose`,
 * which is what a `.not-prose` region *is*, so the rule dresses the region and
 * never its contents. `.prose > div h2` is not exempt, because the descendant
 * step after the child takes it inside.
 *
 * Two shapes are exempt before that: **`.prose` alone**, which styles the
 * container and reaches the region by inheritance rather than by matching —
 * `.prose .not-prose` is the answer to that one — and **any selector naming
 * `.not-prose` itself**, which is addressing the region on purpose.
 *
 * The barrier is stripped before any of this. It contains `.not-prose` and a
 * space, so a selector that already carries one would otherwise look both
 * exempt and single-compound — reporting a guarded sheet and an unguarded one
 * as equally fine, which is the one wrong answer this module must not give.
 */
export const needsBarrier = (selector: string): boolean => {
  const bare = selector.split(BARRIER).join("")

  if (!bare.startsWith(".prose")) return false
  if (bare.includes(".not-prose")) return false

  const compounds = bare.replace(/\s*([>+~])\s*/g, "$1").split(/\s+/)

  return compounds.length > 1
}

export const hasBarrier = (selector: string): boolean => selector.includes(":not(.not-prose *)")

/** The rules that reach into a region they should not. Empty is the invariant. */
export const unguardedProseSelectors = (css: string): readonly CssRule[] =>
  selectorsIn(componentsLayer(css), css).filter(
    (rule) => needsBarrier(rule.selector) && !hasBarrier(rule.selector)
  )
