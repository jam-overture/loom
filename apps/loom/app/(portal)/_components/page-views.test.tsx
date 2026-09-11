import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import type { TreeId } from "@loom/runtime"

import { screenName } from "@/app/(portal)/_lib/screen-names"

import { PageViews } from "./page-views"

const TREE = "t_seed1" as TreeId

const links = (container: HTMLElement): readonly HTMLAnchorElement[] =>
  Array.from(container.querySelectorAll("a"))

describe("PageViews", () => {
  it("offers every other view of the same page", () => {
    const { container } = render(<PageViews treeId={TREE} current="changed" />)
    const hrefs = links(container).map((link) => link.getAttribute("href"))

    expect(hrefs).toContain("/portal/pages/t_seed1")
    expect(hrefs).toContain("/portal/activity?tree=t_seed1")
    expect(hrefs).toContain("/portal/trust?tree=t_seed1")
    expect(hrefs).toContain("/portal/checkup?tree=t_seed1")
  })

  /**
   * The view the reader is on stays a link rather than becoming dead text.
   * Re-following it is how somebody reloads a screen after answering a change on
   * it, and `aria-current` is what says which one it is to a reader who cannot
   * see the styling.
   */
  it("marks the current view without taking it away", () => {
    const { container } = render(<PageViews treeId={TREE} current="changed" />)
    const current = links(container).filter((link) => link.getAttribute("aria-current") === "page")

    expect(current).toHaveLength(1)
    expect(current[0]?.textContent).toBe(screenName("/portal/history"))
    expect(current[0]?.getAttribute("href")).toBe("/portal/history?tree=t_seed1")
  })

  /**
   * "Every page" means this same question asked of every page, not the list of
   * pages — which is the promise four screens each made in different words and
   * two of them broke.
   */
  it("leaves the scope by the view the reader is already in", () => {
    const { container } = render(<PageViews treeId={TREE} current="trust" />)
    const out = screen.getByText("Every page →")

    expect(out.getAttribute("href")).toBe("/portal/trust")
    expect(links(container)).toHaveLength(6)
  })

  it("names itself, so the strip is not five unexplained links", () => {
    render(<PageViews treeId={TREE} current="page" />)

    expect(screen.getByLabelText("Views of this page")).not.toBeNull()
  })

  /**
   * Asserted as whole labels rather than by substring. A tab reading `trees` or
   * `calibration` is the runtime's vocabulary back on the surface, and a strip
   * is the most repeated text in the portal — it appears on all five screens.
   */
  it("asks a question a person would ask, on every tab", () => {
    const { container } = render(<PageViews treeId={TREE} current="page" />)

    expect(links(container).map((link) => link.textContent)).toEqual([
      "The page",
      screenName("/portal/activity"),
      screenName("/portal/history"),
      "Can you trust it?",
      "Does it add up?",
      "Every page →",
    ])
  })
})
