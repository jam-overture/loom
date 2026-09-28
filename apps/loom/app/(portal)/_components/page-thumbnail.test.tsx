import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import {
  buildElement,
  buildText,
  createTree,
  sequentialIdFactory,
  type LoomTree,
} from "@jam-overture/loom"

import { runtimeWordsIn } from "@/app/(portal)/_test/plain-language"

import { PageThumbnail, THUMBNAIL_WIDTH } from "./page-thumbnail"

const pageWith = (heading: string, body: string): LoomTree => {
  const ids = sequentialIdFactory("thumb")

  return createTree(
    buildElement(ids, {
      type: "loom.page",
      children: [
        buildElement(ids, {
          type: "loom.heading",
          props: { level: 1 },
          children: [buildText(ids, heading)],
        }),
        buildElement(ids, { type: "loom.prose", children: [buildText(ids, body)] }),
      ],
    }),
    ids
  )
}

const frameOf = (container: HTMLElement): HTMLElement =>
  container.querySelector("[aria-hidden='true']") as HTMLElement

describe("PageThumbnail", () => {
  /**
   * The claim the whole component rests on: this is the page, not a picture of
   * it. A screenshot pipeline would put an image here and an image can be stale;
   * what is asserted is that the page's own words reached the DOM.
   */
  it("draws the page itself rather than a stand-in for it", () => {
    render(<PageThumbnail tree={pageWith("Autumn prices", "What everything costs")} />)

    expect(screen.getByText("Autumn prices")).toBeTruthy()
    expect(screen.getByText("What everything costs")).toBeTruthy()
  })

  /**
   * The scale is a fraction of the width the card actually gave it, resolved by
   * the browser. A fixed pixel width was the first draft and a screenshot
   * refused it — a 288px picture in a 288px track needs a wider card than the
   * track, and the phone shot came back `402 / 390`.
   */
  it("scales the page to whatever width it is given, without being told", () => {
    const { container } = render(<PageThumbnail tree={pageWith("A", "B")} />)
    const inner = frameOf(container).firstElementChild as HTMLElement

    expect(inner.style.transform).toBe(`scale(calc(100cqw / ${THUMBNAIL_WIDTH}px))`)
    expect(inner.style.width).toBe(`${THUMBNAIL_WIDTH}px`)
  })

  /**
   * The query resolves against this element and not an ancestor, which is what
   * makes `100cqw` the card's width rather than the page's. Without it the unit
   * resolves against the small viewport and every thumbnail on the screen is
   * drawn at the same wrong scale.
   */
  it("measures its own box rather than something further up", () => {
    const { container } = render(<PageThumbnail tree={pageWith("A", "B")} />)

    expect(frameOf(container).style.containerType).toBe("inline-size")
  })

  /**
   * `top left` and not `center`. The origin decides which part of the page
   * survives the crop, and a page's heading is at the top — which is the one
   * thing that tells one card from the next before the name under it is read.
   */
  it("crops from the top left, where the page's own heading is", () => {
    const { container } = render(<PageThumbnail tree={pageWith("A", "B")} />)
    const inner = frameOf(container).firstElementChild as HTMLElement

    expect(inner.style.transformOrigin).toBe("top left")
  })

  /**
   * Rendered at a desktop width and shrunk, never rendered into a narrow box.
   * The primitives are responsive (0106), so drawing into a 288px container
   * would produce the *phone* layout and label it the page — a different
   * picture, and not the one most of a person's readers see.
   */
  it("draws at a desktop width however narrow the card is", () => {
    const { container } = render(<PageThumbnail tree={pageWith("A", "B")} />)
    const inner = frameOf(container).firstElementChild as HTMLElement

    expect(inner.style.width).toBe(`${THUMBNAIL_WIDTH}px`)
    expect(Number.parseInt(inner.style.width, 10)).toBeGreaterThan(1000)
  })

  /**
   * A crop of a page is a fixed shape, or a tall page would set the card's
   * height — and the shape is declared as a ratio rather than a height, which is
   * what lets the card be any width without being told one.
   */
  it("keeps the card's shape whatever is on the page", () => {
    const { container } = render(<PageThumbnail tree={pageWith("A", "B")} />)
    const frame = frameOf(container)

    expect(frame.style.aspectRatio).toBe("1.6 / 1")
    expect(frame.className).toContain("overflow-hidden")
    expect(frame.className).toContain("w-full")
  })

  /**
   * A picture of a page is not a name for it. The card around this carries the
   * name and the id as text, which is what a screen reader gets — and nothing
   * in here is pressable, because the press is the whole card.
   */
  it("is decorative, and does not take the press off the card", () => {
    const { container } = render(<PageThumbnail tree={pageWith("A", "B")} />)
    const frame = frameOf(container)

    expect(frame.getAttribute("aria-hidden")).toBe("true")
    expect(frame.className).toContain("pointer-events-none")
  })

  /**
   * Nothing this component writes is text of its own, which is what makes the
   * plain-language rule vacuous here and worth saying once: every word inside a
   * thumbnail is a word the reader's own page says.
   */
  it("says nothing of its own, so every word in it is the page's", () => {
    const { container } = render(
      <PageThumbnail tree={pageWith("Autumn prices", "What everything costs")} />
    )

    expect(runtimeWordsIn(container.textContent ?? "")).toEqual([])
    expect(container.textContent).toBe("Autumn pricesWhat everything costs")
  })
})
