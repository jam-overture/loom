import {
  buildElement,
  buildSlot,
  createTree,
  sequentialIdFactory,
  type IdFactory,
  type LoomNode,
  type LoomTree,
} from "@jam-overture/loom"
import { describe, expect, it } from "vitest"

import { action, prose, section } from "../nodes"
import { bandsOf } from "../outline"
import { homePageTree } from "../pages/home"
import { DEFAULT_THEME } from "../site"

import { discloseTargetIn, pressTargetIn, UNDECLARED_DISCLOSING_TYPES } from "./aim"

/**
 * Where a press lands, held against the page it is about and against pages built
 * for the purpose.
 *
 * The front door answers *does this work on the real thing*; the built trees
 * answer the questions the front door cannot be made to ask without changing it
 * — a card that is a link against a card that is not, a band with nothing in it
 * anybody could press.
 */

const ORIGIN = "https://loom.example"

const frontDoor = () => homePageTree({ origin: ORIGIN, theme: DEFAULT_THEME })

const bandNamed = (page: LoomTree, name: string) => {
  const found = bandsOf(page).find((band) => band.name === name)

  expect(found).toBeDefined()
  return found!
}

/** A page of one band, so a test can put exactly what it means inside it. */
const pageOf = (band: (ids: IdFactory) => LoomNode): LoomTree => {
  const ids = sequentialIdFactory("aim")

  return createTree(
    buildElement(ids, {
      type: "loom.page",
      props: { width: "wide" },
      children: [band(ids)],
    }),
    ids
  )
}

describe("the thing a reader pressed", () => {
  it("is inside the band and is never the band itself", () => {
    const page = frontDoor()
    const band = bandNamed(page, "See it happen")
    const aim = pressTargetIn(page, band.id, band.name)

    expect(aim.at.nodeId).not.toBe(band.id)
    expect(aim.within.map((address) => address.nodeId)).toContain(band.id)
  })

  /**
   * Nearest first and ending at the page, which is the order the browser's own
   * walk produces — it starts at the target's parent and climbs. A consumer
   * reading it the other way round would file a press under the page rather than
   * under the band it happened in.
   */
  it("names the regions above it nearest first, ending at the page", () => {
    const page = frontDoor()
    const band = bandNamed(page, "See it happen")
    const within = pressTargetIn(page, band.id, band.name).within

    expect(within.at(-1)?.nodeId).toBe(page.root.id)
    expect(within.at(-2)?.nodeId).toBe(band.id)
    expect(within.every((address) => address.type.length > 0)).toBe(true)
  })

  it("carries no duplicate regions, and never the target itself", () => {
    const page = frontDoor()
    const band = bandNamed(page, "Keep going")
    const aim = pressTargetIn(page, band.id, band.name)
    const ids = aim.within.map((address) => address.nodeId)

    expect(new Set(ids).size).toBe(ids.length)
    expect(ids).not.toContain(aim.at.nodeId)
  })

  /**
   * The assertion that makes this a question asked of the registry rather than a
   * list of type strings. `loom.card` declares itself interactive
   * `whenProps: ["href"]`, so the same primitive is a target in one tree and
   * scenery in another, and only the tree can say which.
   */
  it("reads a card as a target when the tree gave it a link, and not when it did not", () => {
    const linked = pageOf((ids) =>
      section(ids, { eyebrow: "Ways in" }, "Where to go", [
        buildElement(ids, {
          type: "loom.card",
          props: { href: "https://loom.example/docs" },
          children: [prose(ids, "The documentation")],
        }),
      ])
    )
    const plain = pageOf((ids) =>
      section(ids, { eyebrow: "Ways in" }, "Where to go", [
        buildElement(ids, {
          type: "loom.card",
          props: {},
          children: [prose(ids, "The documentation")],
        }),
      ])
    )

    const band = (page: LoomTree) => bandNamed(page, "Ways in")

    expect(pressTargetIn(linked, band(linked).id, "Ways in").at.type).toBe("loom.card")
    expect(() => pressTargetIn(plain, band(plain).id, "Ways in")).toThrow(/pressed something/)
  })

  /**
   * A disclosure is not a press. The broadcaster excludes a disclose control
   * from `activated` for the same reason, so a fixture that let one answer here
   * would be minting the wrong kind against the right node.
   */
  it("is never a disclosure", () => {
    const page = frontDoor()
    const band = bandNamed(page, "Questions")

    expect(() => pressTargetIn(page, band.id, band.name)).toThrow(/pressed something/)
    expect(UNDECLARED_DISCLOSING_TYPES).toContain(discloseTargetIn(page, band.id, band.name).at.type)
  })

  /**
   * The same rule where the registry is the one answering.
   *
   * `loom.nav` renders a disclose control and says so, which the registry
   * requires it to also declare interactive — so it is a target by every test
   * this module runs except the one that matters. A browser files opening it as
   * `disclosed` and never as `activated`, and so does this: the press goes to the
   * link inside it.
   */
  it("passes over a control that opens a region, and takes the link inside it", () => {
    const page = pageOf((ids) =>
      section(ids, { eyebrow: "The bar" }, "The menu", [
        buildElement(ids, {
          type: "loom.nav",
          props: { tone: "surface" },
          children: [
            buildElement(ids, {
              type: "loom.link",
              props: { href: "https://loom.example/docs", label: "Docs" },
              children: [],
            }),
          ],
        }),
      ])
    )
    const band = bandNamed(page, "The bar")

    expect(discloseTargetIn(page, band.id, band.name).at.type).toBe("loom.nav")
    expect(pressTargetIn(page, band.id, band.name).at.type).toBe("loom.link")
  })

  /**
   * A band that is itself a control still answers with what is inside it.
   *
   * A whole band can be a link — a `loom.card` with an `href` is one — and a
   * walk that started *at* the band rather than inside it would answer with the
   * band. The press would then be filed against the region it happened in, the
   * ancestry would lose that region entirely, and every number on the page would
   * be back to the shape this module exists to stop.
   */
  it("never answers with the band, even when the band is itself a link", () => {
    const page = pageOf((ids) =>
      buildElement(ids, {
        type: "loom.card",
        props: { href: "https://loom.example/docs" },
        children: [action(ids, "Read the docs", "https://loom.example/docs")],
      })
    )
    const band = page.root.children[0]

    expect(band?.kind).toBe("element")
    const aim = pressTargetIn(page, band!.id, "A band that is a link")

    expect(aim.at.type).toBe("loom.action")
    expect(aim.at.nodeId).not.toBe(band!.id)
    expect(aim.within.map((address) => address.nodeId)).toEqual([band!.id, page.root.id])
  })

  /** The front door's own case: the menu is a bar a reader opens, not one they press. */
  it("takes a press in the menu to something inside the menu", () => {
    const page = frontDoor()
    const band = bandNamed(page, "The menu")
    const aim = pressTargetIn(page, band.id, band.name)

    expect(aim.at.nodeId).not.toBe(band.id)
    expect(aim.within.map((address) => address.nodeId)).toEqual([band.id, page.root.id])
  })

  /**
   * Naming the band rather than a node id, because whoever reads this message is
   * looking at a fixture written in band names and has no way to look an id up.
   */
  it("stops the build and names the band when there is nothing to aim at", () => {
    const page = pageOf((ids) =>
      section(ids, { eyebrow: "Quiet" }, "Nothing to press here", [prose(ids, "Only words.")])
    )
    const band = bandNamed(page, "Quiet")

    expect(() => pressTargetIn(page, band.id, band.name)).toThrow(/“Quiet”/)
  })

  it("stops the build when asked about a band the page does not have", () => {
    const page = frontDoor()

    expect(() => pressTargetIn(page, "n_nowhere", "Nowhere")).toThrow(/no band with the id/)
  })

  /**
   * Slots are not addressed in the render, so they are walked through rather
   * than stopped at — a control in a hero's `actions` slot reports the hero, not
   * the slot, which is what the browser's element walk produces.
   */
  it("walks through a slot without reporting it", () => {
    const page = pageOf((ids) =>
      buildElement(ids, {
        type: "loom.hero",
        props: { eyebrow: "The opening" },
        children: [
          buildSlot(ids, "actions", [action(ids, "Try it", "https://loom.example/demo")]),
        ],
      })
    )
    const band = bandNamed(page, "The opening")
    const aim = pressTargetIn(page, band.id, band.name)

    expect(aim.at.type).toBe("loom.action")
    expect(aim.within.map((address) => address.nodeId)).toEqual([band.id, page.root.id])
  })
})

describe("the thing a reader opened", () => {
  it("is the question rather than the band or the list holding it", () => {
    const page = frontDoor()
    const band = bandNamed(page, "Questions")
    const aim = discloseTargetIn(page, band.id, band.name)

    expect(aim.at.nodeId).not.toBe(band.id)
    expect(aim.at.type).toBe("loom.faq")
    expect(aim.within.map((address) => address.type)).toContain("loom.faq-list")
    expect(aim.within.at(-1)?.nodeId).toBe(page.root.id)
  })

  it("stops the build and names the band when the band holds nothing that opens", () => {
    const page = frontDoor()
    const band = bandNamed(page, "See it happen")

    expect(() => discloseTargetIn(page, band.id, band.name)).toThrow(/opened something/)
  })
})
