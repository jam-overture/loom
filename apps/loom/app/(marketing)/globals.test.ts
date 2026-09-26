import { readFileSync } from "node:fs"
import { fileURLToPath } from "node:url"

import { describe, expect, it } from "vitest"

const css = readFileSync(fileURLToPath(new URL("./globals.css", import.meta.url)), "utf8")

/** The stylesheet with its prose taken out, which is where the words are. */
const declarations = css.replace(/\/\*[\s\S]*?\*\//g, "")

/**
 * Everything declared for a selector, across every rule that names it.
 *
 * All of them rather than the first: `html, body` and `body` are two rules and
 * a reader asking what the body is told cares about both, so a test that took
 * whichever came first would be asserting against an accident of ordering.
 */
const declaredFor = (selector: string): string =>
  [...declarations.matchAll(/([^{}]+)\{([^}]*)\}/g)]
    .filter(([, selectors]) =>
      (selectors ?? "").split(",").some((one) => one.trim() === selector)
    )
    .map(([, , body]) => body ?? "")
    .join("\n")

/**
 * The one file on this surface that nothing else can check.
 *
 * No component imports it, the type checker does not read it, and everything it
 * declares applies to every page at once. That is a bad combination for the two
 * things it is capable of getting wrong, and both have now happened once:
 *
 * - **Declaring anything the theme owns.** A color, a face or a spacing step
 *   here is a second source of truth that no re-theme reaches, and the site's
 *   whole claim is that there is one.
 * - **Sizing the page by its widest contents.** Fixed on 24 August; the comment
 *   in the stylesheet says what it cost. It is the failure that looks like
 *   nothing until one band happens to hold something that does not wrap, and
 *   then it is the whole site rather than that band.
 */
describe("the front door's stylesheet", () => {
  it("lets the page be narrower than the widest thing on it", () => {
    expect(declaredFor("body")).toContain("grid-template-columns: minmax(0, 1fr)")
  })

  it("still fills the window on a short page", () => {
    expect(declaredFor("body")).toContain("min-height: 100dvh")
  })

  it("declares nothing the theme owns", () => {
    for (const owned of [
      "color:",
      "background",
      "font-family",
      "font-size",
      "border",
      "--loom-",
      "gradient",
    ]) {
      expect(declarations).not.toContain(owned)
    }
  })
})
