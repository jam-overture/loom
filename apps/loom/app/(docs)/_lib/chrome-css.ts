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
 * - `scroll-margin-top` is `calc(var(--press-landing) - var(--chrome-inset))`;
 * - and the browser adds the two, which is what it is for.
 *
 * The one number that is read is the landing itself, because the reading line
 * in `on-this-page.ts` is a figure in TypeScript chosen against it, and those
 * two are not in the same language.
 */

const REM_PX = 16

/**
 * Every custom property declared on `:root`.
 *
 * Both `:root` blocks, because there are two and they are two for a reason: the
 * palette's and the chrome's. The dark theme's block is a different selector
 * and is not read here — nothing about the chrome's height is a theme value.
 *
 * A regular expression rather than a parser, for `prose-barrier.ts`' reason
 * narrowed further: these blocks are declarations and nothing else, so there is
 * no nesting for a lazy match to stop short of.
 */
export const rootProperties = (css: string): ReadonlyMap<string, string> => {
  const blocks = [...withoutComments(css).matchAll(/:root\s*\{([^}]*)\}/g)]

  if (blocks.length === 0) throw new Error("chrome-css: globals.css declares nothing on :root")

  return new Map(
    blocks.flatMap((block) =>
      [...(block[1] ?? "").matchAll(/(--[\w-]+):\s*([^;]+);/g)].map(
        (declared) => [declared[1] ?? "", (declared[2] ?? "").trim()] as const
      )
    )
  )
}

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
