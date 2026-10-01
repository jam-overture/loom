// @vitest-environment node
import { contrastRatio, TEXT_CONTRAST_MINIMUM, type ResolvedTheme } from "@jam-overture/loom"
import { ImageResponse } from "next/og"
import { describe, expect, it } from "vitest"

import { siteThemes } from "./registry"
import { askRunFor } from "./render"
import { CARD_PAIRINGS, ink, SHARE_IMAGE_SIZE, shareCardImage } from "./share-card"
import { askedCard, publishedCard, type ShareCard } from "./share"
import { HOME, SITE_ROUTES, SITE_THEME_NAMES, SITE_THEMES, type SiteThemeName } from "./site"

/**
 * The picture, measured.
 *
 * **Node rather than the surface's jsdom default**, and it is not a preference:
 * the image renderer hands its finished SVG to `sharp`, and under jsdom the
 * string arrives as an object `sharp` refuses. The rest of this lane tests
 * markup and wants a document; this file tests a PNG and must not have one.
 */

const themeFor = (name: SiteThemeName): ResolvedTheme => {
  const resolved = siteThemes.resolve(SITE_THEMES[name].selection)

  if (!resolved.ok) throw new Error(`loom: ${name} is not registered`)

  return resolved.value
}

const png = async (card: ShareCard, theme: ResolvedTheme): Promise<ArrayBuffer> =>
  new ImageResponse(shareCardImage(card, theme), SHARE_IMAGE_SIZE).arrayBuffer()

type Drawn = { readonly props?: { readonly style?: Record<string, unknown>; readonly children?: unknown } }

/**
 * Every color the drawing actually names, read off the element it returns.
 *
 * Read from the drawing rather than from `CARD_PAIRINGS`, and that is the whole
 * point of it: a check that compares the card against the same list the card was
 * built from is the card agreeing with itself, and it passes a mutation that
 * changes both. This side is derived from the element tree, so a color written
 * into the file is caught whether or not anybody updated a list.
 */
const colorsIn = (node: unknown): readonly string[] => {
  if (Array.isArray(node)) return node.flatMap(colorsIn)
  if (typeof node !== "object" || node === null) return []

  const { props } = node as Drawn
  const values = Object.values(props?.style ?? {}).filter(
    (value): value is string => typeof value === "string"
  )

  return [
    ...values.flatMap((value) => [...value.matchAll(/#[0-9a-fA-F]{3,8}\b/g)].map(([hex]) => hex)),
    ...colorsIn(props?.children),
  ]
}

/**
 * Every ink the card puts on a ground, under every palette a visitor can send a
 * link in.
 *
 * The bar is the library's own (0074) and the measurement is the runtime's own
 * function, so this is the same check `library.test.ts` runs on the palettes —
 * pointed at the pairs *this card actually draws*. A card is read at thumbnail
 * size in somebody else's channel by someone who will not zoom in, and it is the
 * one surface of this site nobody here will ever look at in three palettes.
 */
describe.each(SITE_THEME_NAMES)("under the %s palette", (name) => {
  const theme = themeFor(name)

  it.each(CARD_PAIRINGS)("$what is legible", (pairing) => {
    const ratio = contrastRatio(
      ink(theme, pairing.foreground),
      ink(theme, pairing.background)
    )

    expect(ratio).toBeDefined()
    expect(ratio).toBeGreaterThanOrEqual(TEXT_CONTRAST_MINIMUM)
  })

  /**
   * The site's standing rule, on the one surface of it that is not a tree: no
   * color is hard-coded anywhere. Below the root of a page that is enforced by
   * the renderer — a primitive can only emit `var(--loom-…)` — and here there is
   * no renderer to enforce it, so it is enforced by measurement instead.
   */
  it.each([
    ["the front door", publishedCard(HOME, "https://loom.example")],
    ["a page somebody rearranged", undefined],
  ])("names no color of its own on %s", async (_what, given) => {
    const card =
      given ??
      askedCard(
        (await askRunFor({ origin: "https://loom.example", theme: name, ask: "problem" }))!.record,
        "https://loom.example"
      )
    const slots = Object.values(theme.palette.slots)
    const drawn = colorsIn(shareCardImage(card, theme))

    expect(drawn.length).toBeGreaterThan(0)
    expect([...new Set(drawn)].filter((color) => !slots.includes(color))).toEqual([])
  })

  /**
   * Not one size or weight is written down either. The proof is that the drawing
   * is a function of the resolved theme and nothing else: hand it a theme whose
   * palette and ramp differ and the bytes differ.
   */
  it("wears the palette the address named", async () => {
    const card = publishedCard(HOME, "https://loom.example")
    const [mine, minimal] = await Promise.all([
      png(card, theme),
      png(card, themeFor("minimal")),
    ])

    expect(mine.byteLength).toBeGreaterThan(1000)
    expect(name === "minimal" ? mine.byteLength === minimal.byteLength : true).toBe(true)

    if (name !== "minimal") {
      expect(Buffer.from(mine).equals(Buffer.from(minimal))).toBe(false)
    }
  })
})

describe("the picture", () => {
  it.each(SITE_ROUTES)("draws $path at the size every unfurler crops to", async (route) => {
    const response = new ImageResponse(
      shareCardImage(publishedCard(route, "https://loom.example"), themeFor("minimal")),
      SHARE_IMAGE_SIZE
    )

    expect(response.headers.get("content-type")).toBe("image/png")
    expect(SHARE_IMAGE_SIZE).toEqual({ width: 1200, height: 630 })
    expect((await response.arrayBuffer()).byteLength).toBeGreaterThan(1000)
  })

  /**
   * The state the whole run is for: an address somebody sent after asking the
   * page for something. It draws four more strings than a published card — the
   * verdict, the quoted request, the reasoning and the measurement — so it is
   * the one that would break first on a renderer that could not fit them.
   */
  it("draws a page as somebody left it", async () => {
    const run = await askRunFor({
      origin: "https://loom.example",
      theme: "minimal",
      ask: "problem",
    })

    expect(run).toBeDefined()

    const bytes = await png(askedCard(run!.record, "https://loom.example"), themeFor("minimal"))

    expect(bytes.byteLength).toBeGreaterThan(1000)
  })
})
