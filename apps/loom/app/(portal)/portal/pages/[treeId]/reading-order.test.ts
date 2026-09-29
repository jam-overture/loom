import { describe, expect, it } from "vitest"

import { portalFile, screenSource } from "@/app/(portal)/_lib/screen-source"

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
const file = portalFile("portal", "pages", "[treeId]", "page.tsx")
const source = screenSource(file)

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
   * Phase 2's order, and it is the flow the screen is for: find the part on the
   * page, look at it on its own, then ask for the change. The pictures have to
   * come before the box, because the sentence saying what a change would cover
   * is *in* the box and a reader who has already typed is not reading it.
   */
  it("draws the parts a reader picked between the page and the box that acts on them", () => {
    expect(source.indexOf("<PickedParts")).toBeGreaterThan(source.indexOf("<PreviewFrame"))
    expect(source.indexOf("<PickedParts")).toBeLessThan(source.indexOf("<PromptBox"))
  })
})
