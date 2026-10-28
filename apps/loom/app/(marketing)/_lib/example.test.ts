import { sequentialIdFactory, type ElementNode } from "@jam-overture/loom"
import { catalogueOf } from "@jam-overture/loom/sdk"
import { describe, expect, it } from "vitest"

import { examplePage, MARKS } from "./example"
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
