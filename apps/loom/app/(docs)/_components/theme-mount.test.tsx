import { render } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import {
  houseGround,
  mountedGround,
  mountedStyle,
  printRatio,
  ratioOnHouseGround,
  ratioOnThemeGround,
} from "@/app/(docs)/_lib/mounting"

import { MountedGround, ThemeMount } from "./theme-mount"

/**
 * The two frames, as markup.
 *
 * `mounting.test.ts` holds the numbers; this holds the thing a reader actually
 * looks at. The tests worth having here are the ones that would catch the
 * section quietly stopping being a comparison: two frames that no longer hold
 * the same band, a frame that lost the variables, or the fixed frame silently
 * getting the same ground as the broken one.
 */

/**
 * A hex as the DOM gives it back.
 *
 * `style.backgroundColor` is normalized to `rgb(…)` by the browser and by
 * jsdom, so a test comparing it against the palette's `#rrggbb` fails on a
 * frame that is painted exactly right. Converting here rather than asserting
 * the `rgb` string keeps the expectation written in the palette's own terms.
 */
const asRendered = (hex: string): string => {
  const probe = document.createElement("div")
  probe.style.backgroundColor = hex

  return probe.style.backgroundColor
}

const frames = (container: HTMLElement): readonly HTMLElement[] => [
  ...container.querySelectorAll<HTMLElement>("[data-frame]"),
]

const frameNamed = (container: HTMLElement, name: string): HTMLElement => {
  const found = container.querySelector<HTMLElement>(`[data-frame="${name}"]`)

  expect(found, `no frame named "${name}"`).not.toBeNull()

  return found as HTMLElement
}

describe("the two frames", () => {
  it("draws exactly two", () => {
    const { container } = render(<ThemeMount />)

    expect(frames(container)).toHaveLength(2)
  })

  /**
   * The comparison's whole premise. If the two sides ever held different
   * markup, every sentence in the section about *the same band* would be
   * false, and nothing else here would notice.
   */
  it("holds the same band in both", () => {
    const { container } = render(<ThemeMount />)
    const [left, right] = frames(container)

    expect(left?.innerHTML).toBe(right?.innerHTML)
    expect(left?.innerHTML.length ?? 0).toBeGreaterThan(0)
  })

  it("mounts the theme's variables on both, so only the paper differs", () => {
    const { container } = render(<ThemeMount />)
    const variables = Object.keys(mountedStyle).filter((key) => key.startsWith("--"))

    expect(variables.length).toBeGreaterThan(0)

    for (const frame of frames(container)) {
      for (const variable of variables) {
        expect(frame.style.getPropertyValue(variable), `${variable} on ${frame.dataset["frame"]}`).not.toBe("")
      }
    }
  })

  it("paints the broken frame the ground this site's chrome holds", () => {
    const { container } = render(<ThemeMount />)

    expect(frameNamed(container, "house").style.backgroundColor).toBe(asRendered(houseGround))
  })

  it("paints the fixed frame the ground the theme names", () => {
    const { container } = render(<ThemeMount />)
    const frame = frameNamed(container, "ground")

    expect(frame.style.backgroundColor).toBe(asRendered(mountedGround.backgroundColor))
    expect(frame.style.color).toBe(asRendered(mountedGround.color))
    expect(frame.style.colorScheme).toBe(mountedGround.colorScheme)
  })

  /**
   * Both grounds coming out the same would leave two identical frames under a
   * caption saying they differ — green on every test above.
   */
  it("gives the two frames different grounds", () => {
    const { container } = render(<ThemeMount />)

    expect(frameNamed(container, "house").style.backgroundColor).not.toBe(
      frameNamed(container, "ground").style.backgroundColor
    )
  })
})

describe("what is printed under each frame", () => {
  it("prints each frame's measured ratio", () => {
    const { container } = render(<ThemeMount />)
    const printed = [...container.querySelectorAll("[data-ratio]")].map((node) => node.getAttribute("data-ratio"))

    expect(printed).toEqual([printRatio(ratioOnHouseGround), printRatio(ratioOnThemeGround)])
  })

  it("says which one fails and which one clears", () => {
    const { container } = render(<ThemeMount />)

    expect(container.textContent).toContain(`${printRatio(ratioOnHouseGround)} — fails`)
    expect(container.textContent).toContain(`${printRatio(ratioOnThemeGround)} — clears`)
  })
})

describe("what themeGround came back with", () => {
  it("has a row for every declaration the function returned, and no others", () => {
    const { container } = render(<MountedGround />)
    const rows = [...container.querySelectorAll("[data-ground]")]

    expect(rows.map((node) => node.getAttribute("data-ground"))).toEqual(Object.keys(mountedGround))
    expect(rows.map((node) => node.textContent)).toEqual(Object.values(mountedGround))
  })
})
