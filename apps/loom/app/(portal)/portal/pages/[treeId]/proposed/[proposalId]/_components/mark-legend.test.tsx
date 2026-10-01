import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { runtimeWordsIn } from "@/app/(portal)/_test/plain-language"
import { legendFor, MARK_ORDER } from "@/app/(portal)/_lib/proposed-view"
import type { NodeId } from "@jam-overture/loom"

import { MarkLegendView } from "./mark-legend"

const every = () =>
  legendFor(MARK_ORDER.map((kind, index) => ({ nodeId: `n_${index}` as NodeId, kind })))

describe("MarkLegendView", () => {
  it("says what each color means, in a person's words", () => {
    render(<MarkLegendView legend={every()} notOutlined={null} />)

    expect(screen.getByText(/Taken away/)).toBeTruthy()
    expect(screen.getByText("On your page now, and not on it afterwards.")).toBeTruthy()
  })

  it("says how many parts wear each color, spelling out one", () => {
    render(
      <MarkLegendView
        notOutlined={null}
        legend={legendFor([
          { nodeId: "n_1" as NodeId, kind: "going" },
          { nodeId: "n_2" as NodeId, kind: "changed" },
          { nodeId: "n_3" as NodeId, kind: "changed" },
        ])}
      />
    )

    expect(screen.getByText(/Taken away · one part/)).toBeTruthy()
    expect(screen.getByText(/Changed · 2 parts/)).toBeTruthy()
  })

  /**
   * The swatch is drawn by the rule it is a key to, not by a border picked here.
   * A hand-picked color would go on saying green after the declaration had been
   * changed — a legend contradicting a picture on the same screen, which is the
   * one thing a key must not be able to do.
   */
  it("draws each swatch with the same declaration that draws the outline", () => {
    const { container } = render(<MarkLegendView legend={every()} notOutlined={null} />)
    const swatches = [...container.querySelectorAll(".loom-marked [data-loom-mark]")].map(
      (element) => element.getAttribute("data-loom-mark")
    )

    expect(swatches).toEqual([...MARK_ORDER])
  })

  it("shows nothing about a color a change does not use", () => {
    render(
      <MarkLegendView
        legend={legendFor([{ nodeId: "n_1" as NodeId, kind: "going" }])}
        notOutlined={null}
      />
    )

    expect(screen.queryByText(/Moved/)).toBeNull()
    expect(screen.queryByText(/New/)).toBeNull()
  })

  /**
   * The governing principle, on the one part of this screen whose whole job is to
   * explain a convention. The record — which of the four operations each color
   * stands for — is one click down and is *meant* to use the runtime's words, so
   * the sweep is over what a reader meets before they have asked for any.
   */
  it("uses none of the runtime's vocabulary above the disclosure", () => {
    const { container } = render(<MarkLegendView legend={every()} notOutlined={null} />)
    const details = container.querySelector("details")

    details?.remove()

    expect(runtimeWordsIn(container.textContent ?? "")).toEqual([])
  })

  /**
   * The line that keeps the key from being a claim the picture cannot honour. It
   * belongs *in* the key rather than under the pictures: a reader who has read
   * the key and gone looking has already spent the attention it was meant to
   * save.
   */
  it("says what has no ring to look for, beside the colors that do", () => {
    const { container } = render(
      <MarkLegendView
        legend={legendFor([{ nodeId: "n_1" as NodeId, kind: "going" }])}
        notOutlined="One of these is writing inside a part rather than a part of its own."
      />
    )
    const text = container.textContent ?? ""

    expect(text).toContain("writing inside a part")
    expect(text.indexOf("Taken away")).toBeLessThan(text.indexOf("writing inside a part"))
  })

  it("says nothing of the sort when every part of a change has a ring", () => {
    const { container } = render(<MarkLegendView legend={every()} notOutlined={null} />)

    expect(container.textContent).not.toContain("no ring")
  })

  it("keeps the operation behind each color, one click down", () => {
    const { container } = render(<MarkLegendView legend={every()} notOutlined={null} />)
    const details = container.querySelector("details")

    expect(details).not.toBeNull()
    expect(details?.textContent).toContain("remove ×1")
    expect(details?.textContent).toContain("insert ×1")
  })
})
