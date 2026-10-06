import type { LoomTree } from "@jam-overture/loom"
import { renderLoomTree } from "@jam-overture/loom/react"
import { render } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { demoPageTree } from "@/app/(demo)/_lib/page-tree"
import { demoRegistry, demoThemes } from "@/app/(demo)/_lib/registry"
import { THE_TOP_OF_IT, thePageItself, type PageItself } from "@/app/(demo)/_lib/the-page-itself"

import { ThePageItselfView } from "./the-page-itself"

/**
 * The window itself, and the three things about it a screenshot cannot hold.
 *
 * `the-page-itself.test.ts` holds *which node* and *when*; `rail.test.ts` holds
 * that the rail wires it. What is held here is that the window is the page
 * rather than a picture of it, that nothing in it is reachable, and that it
 * carries the hooks the stylesheet clips and hides it by — which is the whole
 * of what a later run could take off it with every other test green.
 */

/** The page's own resolved theme, taken the way `page.tsx` takes it. */
const themeOf = (tree: LoomTree) =>
  renderLoomTree(tree, { resolver: demoRegistry, validator: demoRegistry, themes: demoThemes })
    .theme

const windowOn = (tree: LoomTree): PageItself => {
  const page = thePageItself({ tree, asked: false })
  if (page === undefined) throw new Error("the demo's page has no top band")

  return page
}

describe("the page on the first screen", () => {
  /**
   * It is the band, not a picture of the band: the same registry, the same
   * validator and the same components the stage resolved, so the first thing a
   * stranger on a phone sees is the clinic's own words rather than an image of
   * them.
   */
  it("shows the words the top of the page shows", () => {
    const tree = demoPageTree()
    const { container } = render(<ThePageItselfView page={windowOn(tree)} />)

    expect(container.textContent).toContain("Harbourline Physiotherapy")
    expect(container.textContent).toContain("Back to the things you had stopped doing.")
  })

  /**
   * The line that keeps the window from being read as the whole page. The fade
   * at the band's foot says *this continues* in pixels; this says it in words,
   * and it is outside the inert band so a screen reader still reads it.
   */
  it("says that the window is a part of the page, in Loom's own voice", () => {
    const { container } = render(<ThePageItselfView page={windowOn(demoPageTree())} />)

    const caption = container.querySelector("p.text-ink-muted")

    expect(caption?.textContent).toBe(THE_TOP_OF_IT)
    expect(caption?.closest("[inert]")).toBeNull()
  })

  /**
   * **The one way this band differs from the other three.**
   *
   * `pointer-events: none` is a rule about a mouse. The top of this page is
   * the clinic's hero, which carries an `h1` and two calls to action — so
   * without `inert` this window would put a second *Book an assessment* in the
   * tab order and a whole duplicate hero into a screen reader's reading of a
   * rail whose sentences are the only ones that explain anything.
   *
   * Asserted as *the band carries it* rather than *the section does*, because
   * the section carrying it would take the caption with it.
   */
  it("puts nothing in the tab order and nothing in the reading", () => {
    const { container } = render(<ThePageItselfView page={windowOn(demoPageTree())} />)

    const band = container.querySelector(".demo-part-stage")

    expect(band?.hasAttribute("inert")).toBe(true)
    for (const action of container.querySelectorAll("a, button")) {
      expect(action.closest("[inert]")).not.toBeNull()
    }
  })

  /**
   * The hooks the stylesheet clips, fades, hides and sizes it by. Taking either
   * off renders a full-length second copy of the clinic's hero inside the rail,
   * on every width — which is the failure this surface cannot have and no
   * render test would otherwise see.
   */
  it("hands the stylesheet the two hooks it is clipped and hidden by", () => {
    const { container } = render(<ThePageItselfView page={windowOn(demoPageTree())} />)

    expect(container.querySelector("section.demo-part.demo-part--arrival")).not.toBeNull()
    expect(container.querySelector(".demo-part-stage.loom-stage")).not.toBeNull()
  })

  /**
   * The theme is the page's, handed down from the page render — so a visitor
   * who re-themes the page re-themes this, and a window in last month's
   * palette is not a state this surface has.
   */
  it("wears the page's own theme rather than resolving one of its own", () => {
    const tree = demoPageTree()
    const theme = themeOf(tree)
    if (theme === undefined) throw new Error("the demo's tree names no theme")

    const { container } = render(
      <ThePageItselfView page={windowOn(tree)} theme={theme} />
    )

    expect(container.querySelector(".demo-part-stage")?.getAttribute("style")).toContain("--loom-")
  })

  /**
   * And no heading and no label on the region, which is the same decision as
   * `inert`: there is nothing in here to navigate to, and the page this is a
   * view of is the next landmark in the document. The rail's `h1` is three
   * lines up.
   */
  it("announces no region and adds no heading of its own", () => {
    const { container } = render(<ThePageItselfView page={windowOn(demoPageTree())} />)

    const section = container.querySelector("section")

    expect(section?.getAttribute("aria-label")).toBeNull()
    expect(section?.getAttribute("aria-labelledby")).toBeNull()
  })
})
