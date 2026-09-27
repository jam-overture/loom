import type { ReactElement } from "react"
import { describe, expect, it } from "vitest"

import { CHROME } from "./chrome"
import { pageColour, pageGround } from "./ground"
import { DEMO_STARTING_THEME } from "./page-tree"
import { demoThemes } from "./registry"
import { demoShareCard, SHARE_IMAGE_SIZE } from "./share"
import { CARD_PAIRINGS, PANE_WIDTHS, shareCardImage } from "./share-card"

/**
 * The image is drawn in a route no `vitest` run can enter, so what is asserted
 * here is the element tree it is drawn from — the same one the route hands to
 * `ImageResponse` and not a copy of it.
 *
 * Two classes of claim, and the second is the one worth having. That the words
 * reach the picture is cheap. That the picture is **readable** is the failure
 * only a stranger would ever see: nobody on this project looks at an unfurled
 * card, so a grey on a grey would survive indefinitely.
 */

const strings = (node: unknown): readonly string[] => {
  if (typeof node === "string") return [node]
  if (typeof node === "number") return [String(node)]
  if (Array.isArray(node)) return node.flatMap(strings)
  if (node === null || typeof node !== "object") return []

  const element = node as { readonly props?: { readonly children?: unknown } }

  return strings(element.props?.children)
}

/** Every explicit pixel width in the tree, in document order. */
const widths = (node: unknown): readonly number[] => {
  if (Array.isArray(node)) return node.flatMap(widths)
  if (node === null || typeof node !== "object") return []

  const element = node as {
    readonly props?: { readonly children?: unknown; readonly style?: { readonly width?: unknown } }
  }
  const here = element.props?.style?.width

  return [
    ...(typeof here === "number" ? [here] : []),
    ...widths(element.props?.children),
  ]
}

/**
 * Every value declared under one border property, in document order.
 *
 * By property and not by prefix, and that is the second version of this
 * helper: the first collected anything starting with `border`, which the bar
 * has had from the start, so the assertion below passed with the pane's own
 * line deleted. A collector that cannot tell two declarations apart measures
 * neither.
 */
const bordersOn = (which: string, node: unknown): readonly string[] => {
  if (Array.isArray(node)) return node.flatMap((child) => bordersOn(which, child))
  if (node === null || typeof node !== "object") return []

  const element = node as {
    readonly props?: {
      readonly children?: unknown
      readonly style?: Readonly<Record<string, unknown>>
    }
  }
  const here = element.props?.style?.[which]

  return [
    ...(typeof here === "string" ? [here] : []),
    ...bordersOn(which, element.props?.children),
  ]
}

const grounds = (node: unknown): readonly string[] => {
  if (Array.isArray(node)) return node.flatMap(grounds)
  if (node === null || typeof node !== "object") return []

  const element = node as {
    readonly props?: {
      readonly children?: unknown
      readonly style?: { readonly backgroundColor?: string }
    }
  }
  const here = element.props?.style?.backgroundColor

  return [...(here === undefined ? [] : [here]), ...grounds(element.props?.children)]
}

const luminance = (hex: string): number => {
  const digits = /^#([0-9a-f]{6})$/i.exec(hex.trim())?.[1]
  if (digits === undefined) throw new Error(`${hex} is not a six-digit hex colour`)

  const channels = [0, 2, 4].map((offset) => {
    const part = Number.parseInt(digits.slice(offset, offset + 2), 16) / 255

    return part <= 0.03928 ? part / 12.92 : ((part + 0.055) / 1.055) ** 2.4
  })

  return 0.2126 * channels[0]! + 0.7152 * channels[1]! + 0.0722 * channels[2]!
}

const contrast = (a: string, b: string): number => {
  const [light, dark] = [luminance(a), luminance(b)].sort((x, y) => y - x)

  return (light! + 0.05) / (dark! + 0.05)
}

describe("the card a shared link unfurls as", () => {
  const card = demoShareCard()
  const image: ReactElement = shareCardImage(card)
  const words = strings(image)

  it.each([
    ["the wordmark", "wordmark"],
    ["the page's headline", "pageHeadline"],
    ["the mark's chip", "markLabel"],
    ["the badge", "badge"],
    ["the verdict", "verdict"],
    ["the footnote", "footnote"],
  ] as const)("draws %s", (_what, key) => {
    expect(words).toContain(card[key])
  })

  it("draws the ask in the quotation marks the record card uses", () => {
    expect(words).toContain(`“${card.ask}”`)
  })

  it("draws every figure the leading ask takes off the page", () => {
    for (const figure of card.figures) {
      expect(words).toContain(figure.value)
      expect(words).toContain(figure.label)
    }
  })

  /**
   * The composition, asserted as the one thing a 360px thumbnail resolves: a
   * light ground and a dark one, side by side. It is the surface's single
   * structural decision, and a card that lost it would be a picture of a page
   * rather than of an argument.
   */
  it("keeps the split the surface is built on — a light stage, a dark rail", () => {
    const drawn = grounds(image)
    const light = drawn.filter((colour) => luminance(colour) > 0.5)
    const dark = drawn.filter((colour) => luminance(colour) < 0.05)

    expect(light.length).toBeGreaterThan(0)
    expect(dark).toContain(CHROME.page)
  })

  /**
   * The two panes are stated widths that add up to the image, and this is the
   * assertion the first draft of this card needed and did not have. Sized by
   * `flexGrow`, the rail would not shrink below its own min-content: it widened
   * to fit the longest run of the verdict and drew the end of that sentence off
   * the right edge of the picture. Nothing in the suite noticed, because every
   * word was present in the element tree — they were present and off the image.
   */
  it("divides the image between two panes that add up to its width", () => {
    const panes = widths(image).filter((width) => width >= 300)

    expect(panes).toEqual([PANE_WIDTHS.stage, PANE_WIDTHS.rail])
    expect(panes.reduce((total, width) => total + width, 0)).toBe(SHARE_IMAGE_SIZE.width)
  })

  /**
   * Every pair, at 4.5:1. `CARD_PAIRINGS` is the list the element draws from, so
   * a colour changed in one place and not the other is caught here rather than
   * in somebody's feed.
   */
  it.each(CARD_PAIRINGS)("keeps $what readable", ({ foreground, background }) => {
    expect(contrast(foreground, background)).toBeGreaterThan(4.5)
  })

  /**
   * **Readable was never enough**, and this is the test that says so.
   *
   * Until 26 September the stage half drew from `editorialPalette`, imported by
   * name, with a comment explaining that this was the palette the tree carries.
   * The tree then started carrying `midnight` and every assertion above stayed
   * green — a cream page with navy figures is a perfectly legible picture of a
   * page this deployment does not serve. What a stranger got was a link that
   * unfurled as one page and opened as another.
   *
   * So the claim is identity rather than legibility: the ground this picture
   * paints **is** the ground the running page paints, read off the same id.
   */
  it("draws the page in the palette the page is actually wearing", () => {
    const theme = demoThemes.resolve(DEMO_STARTING_THEME)

    expect(theme.ok).toBe(true)
    if (!theme.ok) return

    const ground = pageGround(theme.value)
    const stageGrounds = new Set(
      CARD_PAIRINGS.filter(({ what }) => what.startsWith("the page") || what.startsWith("a figure"))
        .map(({ background }) => background)
    )

    expect(stageGrounds).toEqual(new Set([ground?.backgroundColor]))
    expect(pageColour("bg-canvas")).toBe(ground?.backgroundColor)
  })

  /**
   * The split is the composition (`share-card.tsx`), and until this branch it
   * was carried by luminance alone: a white stage beside a near-black rail. A
   * dark palette makes the two grounds `#111827` and `#0a0a0a`, which at the
   * 360px an unfurled card is actually seen at is one rectangle. The hairline
   * is what makes the split a fact about the picture rather than about which
   * palette the tree happens to name.
   */
  it("draws a line between the two halves, whichever way the palette goes", () => {
    const card = demoShareCard()

    expect(bordersOn("borderRight", shareCardImage(card))).toEqual([`1px solid ${CHROME.edge}`])
  })
})
