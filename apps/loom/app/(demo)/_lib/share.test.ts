import { describe, expect, it } from "vitest"

import { plainState } from "@/app/(portal)/_lib/vocabulary"

import { randomIdFactory } from "@jam-overture/loom"

import { demoPageTree } from "./page-tree"
import { DEMO_LEADING_PRESET, elementsOf, firstOfType, presetById } from "./presets"
import { demoShareCard, demoShareMetadata, DEMO_PATH, SHARE_IMAGE_SIZE } from "./share"
import { labelFor } from "./spotlight"

/**
 * A share card is the only copy on this project written for people who never
 * reach the page, and therefore the only copy nothing on the page can correct.
 * So the thing worth asserting is not that it reads well — it is that **every
 * word of it is quoted** from something the surface already ships, and that a
 * change to the page moves the card with it.
 *
 * Each case below unwires one of those quotations at its source and is red if
 * the card went on saying what it used to.
 */
describe("what a shared link to the demo says", () => {
  it("quotes the page's own headline rather than a sentence typed into a picture", () => {
    const heading = elementsOf(demoPageTree().root).find(
      (element) => element.type === "loom.heading" && element.props["level"] === 1
    )

    expect(heading).toBeDefined()
    expect(demoShareCard().pageHeadline).toBe(
      heading?.children.map((child) => (child.kind === "text" ? child.value : "")).join("")
    )
    expect(demoShareCard().pageHeadline.length).toBeGreaterThan(0)
  })

  it("quotes the hero's eyebrow, so the card names the clinic the page names", () => {
    expect(demoShareCard().pageEyebrow).toBe(firstOfType(demoPageTree(), "loom.hero")?.props["eyebrow"])
  })

  /**
   * The figures are the subject of the whole card: they are what the leading ask
   * takes off the page, and the ring is drawn around them. A card showing three
   * numbers the page does not have would be advertising a demonstration this
   * deployment cannot give.
   */
  it("shows the figures the leading ask is about, in the page's order", () => {
    const grid = firstOfType(demoPageTree(), "loom.stat-grid")
    const values = (grid?.children ?? [])
      .filter((child) => child.kind === "element" && child.type === "loom.stat")
      .map((child) => (child.kind === "element" ? child.props["value"] : undefined))

    expect(values.length).toBe(3)
    expect(demoShareCard().figures.map((figure) => figure.value)).toEqual(values)
  })

  it("quotes the leading preset's utterance as the ask", () => {
    expect(demoShareCard().ask).toBe(presetById(DEMO_LEADING_PRESET)?.utterance)
  })

  /**
   * The badge and the sentence under it are the shared vocabulary's, which is
   * what the record card renders three inches from the ring. Two declarations of
   * one sentence is how a card comes to promise a verdict the surface no longer
   * gives.
   */
  it("takes the badge and the verdict from the vocabulary the record card uses", () => {
    const card = demoShareCard()

    expect(card.badge).toBe(plainState("waiting").label)
    expect(card.verdict).toBe(plainState("waiting").meaning)
  })

  /**
   * The chip is drawn by the same call the ring on the stage makes, for the
   * removal the leading ask actually plans. Both halves matter: a chip reading
   * *This would be removed* over an ask that moves something is the class of lie
   * this surface has already shipped once.
   */
  it("draws the chip the stage draws, for the kind of change the lead plans", () => {
    const tree = demoPageTree()
    const plan = presetById(DEMO_LEADING_PRESET)?.plan(tree, randomIdFactory)

    expect(plan?.every((operation) => operation.op === "remove")).toBe(true)
    expect(demoShareCard().markLabel).toBe(labelFor("removed", "awaiting", "node", false))
  })

  it("is 1.91:1, which is what every unfurler crops to", () => {
    expect(SHARE_IMAGE_SIZE.width / SHARE_IMAGE_SIZE.height).toBeCloseTo(1.9, 1)
  })
})

/**
 * The half an unfurler reads before it fetches anything. Every assertion here
 * is about a tag that was absent: the demo carried a title and a description
 * and no `og:*` or `twitter:*` at all, so a pasted link showed a bare URL.
 */
describe("the tags an unfurler reads", () => {
  const meta = demoShareMetadata("https://loom.example")

  it("resolves relative addresses against the origin it is served from", () => {
    expect(meta.metadataBase?.toString()).toBe("https://loom.example/")
  })

  it("names the demo as its own canonical address", () => {
    expect(meta.alternates?.canonical).toBe(DEMO_PATH)
    expect(meta.openGraph?.url).toBe(DEMO_PATH)
  })

  it("asks for the large card, which is the one that shows the picture", () => {
    expect((meta.twitter as { readonly card?: string } | undefined)?.card).toBe(
      "summary_large_image"
    )
  })

  /**
   * Three places say the same two strings, and they have to agree: a channel
   * shows the Open Graph pair, a client that reads neither falls back to the
   * document's own, and X reads the Twitter pair.
   */
  it("says the same thing in all three places it is asked", () => {
    const twitter = meta.twitter as { readonly title?: string; readonly description?: string }

    expect(meta.openGraph?.title).toBe(meta.title)
    expect(twitter.title).toBe(meta.title)
    expect(meta.openGraph?.description).toBe(meta.description)
    expect(twitter.description).toBe(meta.description)
  })

  /**
   * The description is the card's footnote, which is the one full sentence of
   * claim on the image. A card whose picture and whose text said different
   * things would be two first impressions of one surface.
   */
  it("uses the same sentence in the tags and on the picture", () => {
    expect(demoShareCard().footnote).toBe(meta.description)
  })

  /**
   * Nothing here names the image. That is Next's file convention's job
   * (`demo/opengraph-image.tsx`), and naming it twice is how the tag outlives
   * the route.
   */
  it("leaves the picture to the route that draws it", () => {
    expect(meta.openGraph?.images).toBeUndefined()
    expect((meta.twitter as { readonly images?: unknown }).images).toBeUndefined()
  })
})
