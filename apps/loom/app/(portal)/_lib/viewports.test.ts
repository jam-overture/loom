import { describe, expect, it } from "vitest"

import { runtimeWordsIn } from "../_test/plain-language"
import {
  DEFAULT_VIEWPORT,
  surfaceAddress,
  viewportAddress,
  viewportFrom,
  VIEWPORTS,
} from "./viewports"

describe("the screen sizes a page can be checked at", () => {
  it("offers three, and names them the way a person would", () => {
    expect(VIEWPORTS.map((viewport) => viewport.label)).toEqual(["Desktop", "Tablet", "Phone"])
  })

  /**
   * CSS widths, not hardware pixels. A phone with a 1170-pixel panel lays out at
   * 390, and a pane built on the hardware number would be a picture of a page
   * nobody is served.
   */
  it("uses the widths those screens lay out at", () => {
    expect(VIEWPORTS.map((viewport) => viewport.width)).toEqual([1280, 834, 390])
  })

  it("goes widest to narrowest, which is the order a page is usually judged in", () => {
    const widths = VIEWPORTS.map((viewport) => viewport.width)

    expect([...widths].sort((one, other) => other - one)).toEqual(widths)
  })

  it("names every size once, so two rows cannot mean the same thing", () => {
    expect(new Set(VIEWPORTS.map((viewport) => viewport.name)).size).toBe(VIEWPORTS.length)
  })

  it("opens on a desktop, because a reviewer is judging a change described in those terms", () => {
    expect(DEFAULT_VIEWPORT).toBe("desktop")
    expect(VIEWPORTS[0]?.name).toBe(DEFAULT_VIEWPORT)
  })
})

describe("reading a size off an address", () => {
  it("answers the one that was asked for", () => {
    expect(viewportFrom("phone").width).toBe(390)
    expect(viewportFrom("tablet").width).toBe(834)
  })

  /**
   * A mistyped query parameter is not worth a refusal on a screen whose job is
   * to show somebody their own page, and there is nothing here a wrong value
   * could damage — the pane is a read.
   */
  it.each([["nothing", undefined], ["a typo", "pnohe"], ["empty", ""], ["a device", "iphone-15"]])(
    "falls back to the default for %s",
    (_case, asked) => {
      expect(viewportFrom(asked).name).toBe(DEFAULT_VIEWPORT)
    }
  )
})

describe("the address a size lives at", () => {
  /**
   * The default is dropped, so a link only ever names what differs from what
   * you would get by opening the page yourself. A parameter restating the
   * current value reads, to whoever it was sent to, as a thing somebody wants
   * changed.
   */
  it("says nothing about the size you would get anyway", () => {
    expect(viewportAddress("t_seed1", "desktop")).toBe("/portal/pages/t_seed1")
  })

  it("names any other size, so the link can be sent to somebody", () => {
    expect(viewportAddress("t_seed1", "phone")).toBe("/portal/pages/t_seed1?as=phone")
  })

  it("round trips: every size's own link reads back as that size", () => {
    for (const viewport of VIEWPORTS) {
      const address = viewportAddress("t_seed1", viewport.name)
      const asked = new URL(address, "https://example.test").searchParams.get("as") ?? undefined

      expect([viewport.name, viewportFrom(asked).name]).toEqual([viewport.name, viewport.name])
    }
  })

  it("escapes an id rather than pasting it into a URL", () => {
    expect(viewportAddress("t_a/b", "phone")).toBe("/portal/pages/t_a%2Fb?as=phone")
    expect(surfaceAddress("t_a/b", "phone")).toContain("t_a%2Fb")
  })

  /**
   * The document inside the frame always names its size, default included —
   * unlike the screen's own address. It is loaded by an iframe rather than
   * opened by a person, so there is nobody for a bare address to read better,
   * and a frame that asked for no size would have to guess one.
   */
  it("always names the size on the document inside the frame", () => {
    for (const viewport of VIEWPORTS) {
      expect(surfaceAddress("t_seed1", viewport.name)).toBe(
        `/portal/pages/t_seed1/surface?as=${viewport.name}`
      )
    }
  })
})

describe("the words a reader meets", () => {
  it("says what picking each one tells you, in a person's words", () => {
    for (const viewport of VIEWPORTS) {
      expect(viewport.meaning.length).toBeGreaterThan(20)
      expect(runtimeWordsIn(`${viewport.label}. ${viewport.meaning}`)).toEqual([])
    }
  })

  /**
   * No breakpoints and no model numbers on the surface. *834px* is a fact about
   * CSS and *iPad Air (4th generation)* is a fact about a shop; neither is what
   * somebody asking "does this hold up on a tablet" wants read back to them.
   */
  it("never labels a size with a number or a model", () => {
    for (const viewport of VIEWPORTS) {
      expect(viewport.label).not.toMatch(/\d/u)
      expect(viewport.label.toLowerCase()).not.toContain("ipad")
      expect(viewport.label.toLowerCase()).not.toContain("iphone")
    }
  })
})
