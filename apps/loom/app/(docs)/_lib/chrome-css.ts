import { withoutComments } from "./prose-barrier"

/**
 * The stylesheet's own account of the chrome, read back as values.
 *
 * ## The plain version
 *
 * `globals.css` declares how tall the header is, how tall a control in the bar
 * is, and the hairline each of them draws. Everything else about the chrome is
 * arithmetic over those three: where the bar sticks, how tall a rail can be,
 * how far the browser insets the top of the page when a reader asks for a
 * heading. `_lib/chrome.ts` names the classes that read them back in markup.
 *
 * This is how a **test** reads them back, so that the chain from the number to
 * the element can be held together rather than described in a comment.
 *
 * ## What it deliberately does not do
 *
 * It does not evaluate `calc()`, and that is the whole shape of this module.
 *
 * The open finding of 17 October named three ways to stop the chrome's height
 * being a figure typed into a test, and the first was *a check that reads the
 * classes and converts them to pixels* — rejected there as a second
 * implementation of Tailwind's scale, wrong the first time somebody writes an
 * arbitrary value. An arithmetic evaluator for the stylesheet is the same
 * mistake one layer down: a second implementation of `calc`, wrong the first
 * time a declaration multiplies.
 *
 * So the numbers are not recomputed. The **expressions** are asserted, exactly
 * as written, and the arithmetic they describe is then a fact about the
 * browser rather than about this repository. *A press lands a heading at
 * `--press-landing`* is proved by three strings:
 *
 * - `scroll-padding-top` is `var(--chrome-inset)`;
 * - `--press-margin` is `calc(var(--press-landing) - var(--chrome-inset))`, and
 *   `scroll-margin-top` is `var(--press-margin)`;
 * - and the browser adds the two, which is what it is for.
 *
 * The margin is a property with its own name because the rule above is only
 * one of its four readers: everything this site renders inside `.not-prose` is
 * outside that rule and wears `PRESS_LANDING_CLASS` instead.
 *
 * The one number that is read is the landing itself, because the reading line
 * in `on-this-page.ts` is a figure in TypeScript chosen against it, and those
 * two are not in the same language.
 */

const REM_PX = 16

/** The declarations in one block body, as written. */
const declarationsIn = (body: string): ReadonlyMap<string, string> =>
  new Map(
    [...body.matchAll(/(--[\w-]+):\s*([^;]+);/g)].map(
      (declared) => [declared[1] ?? "", (declared[2] ?? "").trim()] as const
    )
  )

/**
 * A guarded block, read back as the condition it is under and what it says.
 *
 * `condition` is the query exactly as the stylesheet wrote it, which is the
 * point: the chrome's one media query asks for `theme(--breakpoint-xl)`, and a
 * reader that resolved that to `80rem` would be unable to tell the two apart —
 * which is the whole thing the query exists to make checkable.
 */
export type GuardedRoot = {
  readonly condition: string
  readonly properties: ReadonlyMap<string, string>
}

/**
 * One `@media` rule's own span, found by matching braces.
 *
 * `componentsLayer` in `prose-barrier.ts` does this for `@layer components` and
 * for the same reason: the body contains braces, so a lazy match stops at the
 * first inner one. A media query holding a `:root` block is exactly that case.
 *
 * `after` is where the rule ends, which is what lets the next one be found and
 * lets the rule be taken back out of the sheet.
 */
type MediaSpan = {
  readonly condition: string
  readonly body: string
  readonly at: number
  readonly after: number
}

const firstMediaSpan = (css: string): MediaSpan | undefined => {
  const at = css.indexOf("@media")
  if (at === -1) return undefined

  const open = css.indexOf("{", at)
  if (open === -1) throw new Error("chrome-css: an @media in globals.css has no body")

  let depth = 0
  for (let i = open; i < css.length; i += 1) {
    if (css[i] === "{") depth += 1
    else if (css[i] === "}") {
      depth -= 1
      if (depth === 0) {
        return {
          condition: css.slice(at + "@media".length, open).trim(),
          body: css.slice(open + 1, i),
          at,
          after: i + 1,
        }
      }
    }
  }

  throw new Error("chrome-css: an @media in globals.css is not closed")
}

/** Every top-level `@media` rule. A query nested in another is that one's body. */
const mediaSpans = (css: string): readonly MediaSpan[] => {
  const span = firstMediaSpan(css)

  return span === undefined ? [] : [span, ...mediaSpans(css.slice(span.after))]
}

/** The sheet with every `@media` rule taken out of it, braces and all. */
const withoutMediaRules = (css: string): string => {
  const span = firstMediaSpan(css)

  return span === undefined ? css : css.slice(0, span.at) + withoutMediaRules(css.slice(span.after))
}

/**
 * Every custom property declared on `:root` **at every width**.
 *
 * Both unguarded `:root` blocks, because there are two and they are two for a
 * reason: the palette's and the chrome's. The dark theme's block is a different
 * selector and is not read here — nothing about the chrome's height is a theme
 * value.
 *
 * A block inside a media query is left out, and that is the one thing about
 * this function worth knowing. The chrome has a second configuration above
 * 1280, where the bar is not rendered and its band is nothing tall; folding
 * that into the same map would hand back whichever value came last in the file
 * and call it *the* value of `--chrome-bar-band`. There is no such value. The
 * two are read separately, and `guardedRoots` is the other one.
 *
 * A regular expression rather than a parser, for `prose-barrier.ts`' reason
 * narrowed further: these blocks are declarations and nothing else, so there is
 * no nesting for a lazy match to stop short of once the guarded ones are gone.
 */
export const rootProperties = (css: string): ReadonlyMap<string, string> => {
  const blocks = [...withoutMediaRules(withoutComments(css)).matchAll(/:root\s*\{([^}]*)\}/g)]

  if (blocks.length === 0) throw new Error("chrome-css: globals.css declares nothing on :root")

  return new Map(blocks.flatMap((block) => [...declarationsIn(block[1] ?? "")]))
}

/**
 * The `:root` blocks a media query guards, with the query that guards them.
 *
 * One today, and the check on it is in `chrome.test.ts`: the chrome changes at
 * exactly one width, and a second query redeclaring a chrome property would be
 * a second width nobody had decided on.
 */
export const guardedRoots = (css: string): readonly GuardedRoot[] =>
  mediaSpans(withoutComments(css)).flatMap((span) =>
    [...span.body.matchAll(/:root\s*\{([^}]*)\}/g)].map((block) => ({
      condition: span.condition,
      properties: declarationsIn(block[1] ?? ""),
    }))
  )

/**
 * The one value a property is given anywhere in the stylesheet, as written.
 *
 * It insists on **one**. A second declaration of `scroll-padding-top` would
 * make a reader pick whichever came first, and a test that picks is the shape
 * of the defect this file exists to close: the reading line was held against
 * one of the two declarations that decide where a press lands, and passed for
 * a day while the mark sat on the wrong section.
 */
export const soleDeclaration = (css: string, property: string): string => {
  const found = [...withoutComments(css).matchAll(new RegExp(`(?<![\\w-])${property}:\\s*([^;]+);`, "g"))]

  if (found.length !== 1) {
    throw new Error(`chrome-css: globals.css declares ${property} ${found.length} times, and one is the only workable number`)
  }

  return (found[0]?.[1] ?? "").trim()
}

/**
 * The custom properties a string reads — a class list, or another declaration.
 *
 * This is what makes an undeclared property a failing test rather than a
 * silent one: `h-[var(--chrome-bar)]` with nothing declaring `--chrome-bar` is
 * not an error in a browser, it is a declaration the browser discards, and the
 * element has no height. Nothing about the rendered page says which of those
 * two it is looking at.
 */
export const propertiesNamedIn = (text: string): readonly string[] => [
  ...new Set([...text.matchAll(/var\(\s*(--[\w-]+)\s*\)/g)].map((found) => found[1] ?? "")),
]

/**
 * A length in `rem`, in pixels, and nothing else.
 *
 * Refuses anything it is not sure of rather than guessing — a `calc`, a `px`, a
 * viewport unit, two lengths — because the one caller is a comparison against a
 * number in TypeScript and a wrong answer there is worse than no answer.
 */
export const remPx = (value: string): number => {
  const found = /^([\d.]+)rem$/.exec(value.trim())

  if (found === null) throw new Error(`chrome-css: "${value}" is not a plain rem length`)

  return Number(found[1]) * REM_PX
}
