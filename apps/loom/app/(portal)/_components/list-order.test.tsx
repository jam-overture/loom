import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { runtimeWordsIn } from "@/app/(portal)/_test/plain-language"

import { ListOrder } from "./list-order"
import { ORDER_LEAD, SAME_AFTER_THAT, type PageOrder } from "../_lib/page-order"

const RANKED: readonly PageOrder[] = [
  "needs-you-first",
  "ready-to-check-first",
  "most-changed-first",
  "worst-first",
]

describe("ListOrder", () => {
  it.each(RANKED)("%s names its top and says the rest agrees with every other list", (order) => {
    render(<ListOrder order={order} />)

    expect(screen.queryByText(new RegExp(ORDER_LEAD[order], "u"))).not.toBeNull()
    expect(document.body.textContent).toContain(SAME_AFTER_THAT)
  })

  /**
   * For `by-name` the shared tiebreak **is** the order, so *after that, every
   * list here is in the same order* would be a second sentence about nothing —
   * and a reader who is told twice that a list is alphabetical learns less than
   * one told once.
   */
  it("says nothing about a tiebreak on the one list whose order is the tiebreak", () => {
    render(<ListOrder order="by-name" />)

    expect(document.body.textContent).toContain(ORDER_LEAD["by-name"])
    expect(document.body.textContent).not.toContain(SAME_AFTER_THAT)
  })

  /**
   * Both halves of the governing rule on one render: the reader meets plain
   * language, the argument is there, and the argument is the half allowed to use
   * the runtime's words. A version of this component that explained cursor order
   * on the surface would pass the first assertion of every other test here.
   */
  it("keeps the argument for the order one click down and not on the surface", () => {
    const { container } = render(<ListOrder order="needs-you-first" />)

    const surface = container.querySelector("p")?.textContent ?? ""
    expect(runtimeWordsIn(surface), surface).toEqual([])

    const record = container.querySelector("details")?.textContent ?? ""
    expect(record).not.toBe("")
    expect(runtimeWordsIn(record).length).toBeGreaterThan(0)
  })

  it("puts the sentence before the disclosure, because a reader meets it first", () => {
    const { container } = render(<ListOrder order="worst-first" />)
    const html = container.innerHTML

    expect(html.indexOf("<p")).toBeLessThan(html.indexOf("<details"))
  })
})
