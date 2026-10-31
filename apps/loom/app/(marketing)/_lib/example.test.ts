import { sequentialIdFactory, type ElementNode, type LoomNode } from "@jam-overture/loom"
import { catalogueOf } from "@jam-overture/loom/sdk"
import { describe, expect, it } from "vitest"

import { ARRANGEMENTS, ARRANGEMENT_LABEL, examplePage, MARKS, rearrangedExample } from "./example"
import { LIBRARY_PARTS, partNameOf } from "./library"
import { elementsIn } from "./measure"
import { siteRegistry } from "./registry"

/**
 * The page inside the frame on `/why-use-it`, and the two things it claims.
 *
 * The band's whole argument is that the thing in the browser is made of the
 * parts named in the field of chips directly above it. That is a claim about
 * two lists agreeing, and it is the kind of claim that is true the day it is
 * written and quietly false a month later — a part renamed in `src`, a tile
 * swapped for a different primitive, a mark left pointing at something that
 * came off the page.
 *
 * So both halves are held here rather than looked at once.
 */

const example = examplePage(sequentialIdFactory("example"))
const elements = elementsIn(example)
const types = new Set<string>(elements.map((element) => element.type))

const pins = elements.filter((element) => element.type === "loom.pin")

describe("the example page", () => {
  /**
   * The one that makes the band honest. A mark reading *Feature grid* over a
   * page with no feature grid on it is a lie a reader can see and no other
   * check on this site would report — every tree would be valid, every name
   * would be a real part, and the picture would be wrong.
   */
  it("marks only parts that are really on the page", () => {
    const absent = MARKS.map(({ type }) => type).filter((type) => !types.has(type))

    expect(absent).toEqual([])
  })

  /**
   * And the label is the chips band's own string, because the reader is meant
   * to find it up there. `partNameOf` is the projection both sides run, so
   * this holds the two against the library rather than against each other.
   */
  it("labels each mark with the name the site prints for that part", () => {
    expect(pins.map((pin) => pin.props["label"])).toEqual(
      MARKS.map(({ type }) => partNameOf(type))
    )

    for (const pin of pins) {
      expect(LIBRARY_PARTS).toContain(pin.props["label"])
    }
  })

  /** Numbered in the order they are written, so the legend reads 1, 2. */
  it("numbers the marks in reading order", () => {
    expect(pins.map((pin) => pin.props["marker"])).toEqual(
      MARKS.map((_mark, index) => `${index + 1}`)
    )
  })

  /**
   * The claim under the picture is *every piece of this is a part from the
   * list above*, and this is that sentence as an assertion. It would catch the
   * day somebody reaches for a primitive this site does not register, which is
   * the same prohibition 0067 puts on the rest of the route group.
   */
  it("is built from registered parts and nothing else", () => {
    const registered = new Set<string>(catalogueOf(siteRegistry).map(({ type }) => type))
    const strangers = [...types].filter((type) => !registered.has(type))

    expect(strangers).toEqual([])
  })

  /**
   * A page within a page, so its own opening is a level three. `pages.test.ts`
   * holds every route to exactly one `h1` and this is the composition that
   * would break it.
   */
  it("opens at a level that leaves the page one h1", () => {
    const levels = elements
      .filter((element) => element.type === "loom.heading")
      .map((element) => element.props["level"])

    expect(levels).not.toHaveLength(0)
    expect(levels.every((level) => typeof level === "number" && level >= 3)).toBe(true)
  })

  /**
   * The example is a fictional product and may not accidentally become a
   * control on this site. `example.ts` has the argument: a button inside it
   * either lands nowhere or lands somewhere it has no business sending anybody.
   */
  it("carries nothing a reader can press", () => {
    const pressable = elements.filter(
      (element: ElementNode) => typeof element.props["href"] === "string"
    )

    expect(pressable).toEqual([])
  })
})

/**
 * The comparison band, which is the same page a second time and is held to
 * being the *same* page.
 *
 * Everything above is about one arrangement. What is checkable here is the
 * relationship between two of them, and it is the half a reader is being
 * asked to believe: that the right-hand screen is this screen rearranged and
 * not a different product with a different pitch.
 */
/** Every string a reader would see under a node, in tree order. */
const textIn = (node: LoomNode): readonly string[] =>
  node.kind === "text"
    ? [node.value]
    : node.kind === "element" || node.kind === "slot"
      ? node.children.flatMap((child) => textIn(child))
      : []

describe("the same page arranged for someone else", () => {
  const compared = rearrangedExample(sequentialIdFactory("compared"))
  const comparedElements = elementsIn(compared)

  /**
   * `loom.before-after` takes its height from the after region and stretches
   * the before region to match, so an arrangement with one more tile than the
   * other crops rather than reporting anything. Measured by the primitive's
   * own note and held here, because the failure is a silently cut-off screen
   * on a page nobody runs a test against by eye.
   */
  it("gives both arrangements the same number of tiles", () => {
    expect(ARRANGEMENTS.forAGift.offers).toHaveLength(ARRANGEMENTS.asBuilt.offers.length)
  })

  /**
   * The sentence that does not move. A comparison in which every string
   * differs is two pages rather than one page twice, and this is the line a
   * reader uses to work out which it is looking at.
   */
  it("keeps one line identical, so the page reads as the same page", () => {
    expect(ARRANGEMENTS.forAGift.line).toBe(ARRANGEMENTS.asBuilt.line)
  })

  it("changes the heading, or there is nothing to compare", () => {
    expect(ARRANGEMENTS.forAGift.heading).not.toBe(ARRANGEMENTS.asBuilt.heading)
  })

  /**
   * At least one tile survives the rearrangement. A right-hand screen sharing
   * no tile with the left is a replacement rather than a rearrangement, and
   * the four things this site says a change can be do not include *swap the
   * whole page*.
   */
  it("carries at least one tile across both arrangements", () => {
    const built = ARRANGEMENTS.asBuilt.offers.map((offer) => offer.title)
    const kept = ARRANGEMENTS.forAGift.offers.filter((offer) => built.includes(offer.title))

    expect(kept).not.toEqual([])
  })

  it("says who each arrangement is for rather than which came first", () => {
    const labels = Object.values(ARRANGEMENT_LABEL).map((label) => label.toLowerCase())

    expect(labels.some((label) => label.includes("before") || label.includes("after"))).toBe(false)
  })

  /**
   * A caption over each frame, and the band is nothing without them. Two
   * screens with no indication of who each belongs to is a before and an
   * after, and the claim is about people rather than about time.
   */
  it("captions both arrangements", () => {
    const said = textIn(compared)

    expect(said).toContain(ARRANGEMENT_LABEL.asBuilt)
    expect(said).toContain(ARRANGEMENT_LABEL.forAGift)
  })

  /**
   * The captions are this site's voice and the frames are a coffee company's.
   * A caption that slipped inside a frame would read as the fictional
   * product's own copy, which is the one thing that would make a reader
   * doubt the example.
   */
  it("keeps the captions outside the frames", () => {
    const framed = comparedElements
      .filter((element) => element.type === "loom.frame")
      .flatMap((frame) => textIn(frame))

    expect(framed).not.toContain(ARRANGEMENT_LABEL.asBuilt)
    expect(framed).not.toContain(ARRANGEMENT_LABEL.forAGift)
  })

  it("is built from registered parts and nothing else", () => {
    const registered = new Set(catalogueOf(siteRegistry).map((entry) => entry.type))

    expect(
      [...new Set(comparedElements.map((element) => element.type))].filter(
        (type) => !registered.has(type)
      )
    ).toEqual([])
  })

  /**
   * Two frames at the same address, which is the claim the band makes with no
   * words at all: one page, two readers. Two different addresses would say
   * the reader had been sent somewhere else.
   */
  it("shows both arrangements at the same address", () => {
    const addresses = comparedElements
      .filter((element) => element.type === "loom.frame")
      .map((frame) => frame.props["label"])

    expect(addresses).toHaveLength(2)
    expect(new Set(addresses).size).toBe(1)
  })

  it("carries nothing a reader can press", () => {
    expect(
      comparedElements.filter((element) => typeof element.props["href"] === "string")
    ).toEqual([])
  })
})
