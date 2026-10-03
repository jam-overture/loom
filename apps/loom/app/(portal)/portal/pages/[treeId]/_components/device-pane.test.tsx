import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { runtimeWordsIn } from "@/app/(portal)/_test/plain-language"
import { surfaceOf } from "@/app/(portal)/_test/rendered"
import { VIEWPORTS, viewportFrom } from "@/app/(portal)/_lib/viewports"

import { DevicePane } from "./device-pane"
import { SelectionProvider } from "./selection-context"

/**
 * jsdom lays nothing out and has no `ResizeObserver`, so the pane's fit is
 * stubbed rather than measured. Nothing below asserts a scale *value* for that
 * reason — what is pinned is the width the document is laid out at, which is
 * real, and that a reduction is said out loud when there is one.
 */
class NoLayout {
  observe() {}
  unobserve() {}
  disconnect() {}
}

globalThis.ResizeObserver ??= NoLayout as unknown as typeof ResizeObserver

const paneAt = (name: string) =>
  render(
    <SelectionProvider rows={[]}>
      <DevicePane treeId="t_seed1" viewport={viewportFrom(name)} />
    </SelectionProvider>
  )

describe("the sizes on offer", () => {
  it("offers every one of them", () => {
    paneAt("desktop")

    for (const viewport of VIEWPORTS) expect(screen.getByText(viewport.label)).toBeDefined()
  })

  /**
   * A link to the thing you are already looking at is a promise that something
   * will happen. The size you are on is text carrying `aria-current`, which is
   * the arrangement `/portal/rules/what-if` settled for the same reason.
   */
  it("does not link to the size you are already on, and says you are on it", () => {
    const { container } = paneAt("phone")
    const current = screen.getByText("Phone")

    expect(current.tagName).not.toBe("A")
    expect(current.getAttribute("aria-current")).toBe("true")
    expect([...container.querySelectorAll("a")].map((link) => link.textContent)).toEqual([
      "Desktop",
      "Tablet",
    ])
  })

  it("links every other size to an address somebody could send", () => {
    const { container } = paneAt("phone")
    const addresses = [...container.querySelectorAll("a")].map((link) => link.getAttribute("href"))

    expect(addresses).toEqual(["/portal/pages/t_seed1", "/portal/pages/t_seed1?as=tablet"])
  })
})

describe("the frame", () => {
  it("loads the page's own document at the size that was picked", () => {
    const { container } = paneAt("tablet")
    const frame = container.querySelector("iframe")

    expect(frame?.getAttribute("src")).toBe("/portal/pages/t_seed1/surface?as=tablet")
  })

  /**
   * The width on the frame is the real one. Scaling happens in a transform
   * afterwards, so the page lays out at the width it was asked for and nothing
   * about the layout is a guess — which is the whole reason this is an iframe
   * and not a narrow box.
   */
  it("lays the document out at the real width, not at the drawn one", () => {
    const { container } = paneAt("phone")
    const frame = container.querySelector("iframe")

    expect(frame?.getAttribute("width")).toBe("390")
    expect(frame?.getAttribute("height")).toBe("844")
  })

  it("says which size the frame is, for somebody who cannot see it", () => {
    const { container } = paneAt("phone")

    expect(container.querySelector("iframe")?.getAttribute("title")).toContain("Phone")
  })

  it("names the size it is drawing, in figures, beside the choices", () => {
    expect(surfaceOf(paneAt("phone").container)).toContain("390 × 844")
  })

  /**
   * Scaling is honest and leaving a reader to assume the text is that size is
   * not. In a test environment nothing is laid out, so the measured width is 0
   * and the scale is 0% — what is pinned is that a scale below 1 is **said**,
   * rather than the number it happens to be.
   */
  it("says so when it is not drawing at full size", () => {
    expect(surfaceOf(paneAt("desktop").container)).toContain("shown at")
  })
})

describe("the words a reader meets", () => {
  it("says what the size they picked is, in a person's words", () => {
    expect(surfaceOf(paneAt("phone").container)).toContain("Most people read most pages here")
  })

  it.each(VIEWPORTS.map((viewport) => [viewport.label, viewport.name]))(
    "says nothing in the runtime's words at %s",
    (_label, name) => {
      expect(runtimeWordsIn(surfaceOf(paneAt(name).container))).toEqual([])
    }
  )

  /**
   * Guards the guard: the detector has to be able to see this component's
   * surface at all, or every case above passes over an empty string.
   */
  it("has a surface for the rule to read", () => {
    expect(surfaceOf(paneAt("phone").container).length).toBeGreaterThan(40)
  })
})
