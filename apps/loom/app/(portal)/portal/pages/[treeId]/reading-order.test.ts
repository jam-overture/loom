import { readFileSync } from "node:fs"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

/**
 * A phone screenshot found this and no test could have.
 *
 * The two columns were laid out with `lg:flex-row-reverse`, which puts the
 * outline first in the source so it lands on the right of a wide screen. On a
 * wide screen that works. On a narrow one the row is not a row, so the source
 * order *is* the reading order — and a visitor met `loom.page`,
 * `loom.heading` and "Nothing picked yet" before they met their own page or
 * its name. An address book for a thing they had not been shown.
 *
 * The same reversal costs a keyboard user on every screen: focus follows the
 * source, so tabbing began in the right-hand column.
 *
 * Reading the source is crude, and it is the only check that catches this
 * without a browser at two widths. The rule it pins is one sentence: **the
 * page comes before the index of the page**, and it is on the right because it
 * is second rather than because the row is reversed.
 */
const file = join(process.cwd(), "app", "(portal)", "portal", "pages", "[treeId]", "page.tsx")

/**
 * Comments are stripped before the source is read, because the comment above
 * the layout names the class it stopped using and explains why. A check that
 * cannot tell a warning from the thing it warns about would make the warning
 * unwriteable.
 */
const source = readFileSync(file, "utf8").replace(/\/\*[\s\S]*?\*\/|\/\/[^\n]*/gu, "")

describe("the page screen's reading order", () => {
  it("shows the page itself before the list of its parts", () => {
    expect(source.indexOf("<PreviewFrame")).toBeGreaterThan(-1)
    expect(source.indexOf("<TreeOutline")).toBeGreaterThan(-1)
    expect(source.indexOf("<PreviewFrame")).toBeLessThan(source.indexOf("<TreeOutline"))
  })

  it("puts what a reader can act on before what they have not picked yet", () => {
    expect(source.indexOf("<PromptBox")).toBeLessThan(source.indexOf("<SelectedNode"))
  })

  /**
   * The guard, rather than the symptom. Any reversal reintroduces the split
   * between reading order and source order that produced it, whichever way the
   * components happen to be written that day.
   */
  it("never reverses a row to place a column", () => {
    expect(source).not.toContain("flex-row-reverse")
    expect(source).not.toContain("flex-col-reverse")
  })
})
