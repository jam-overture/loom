// @vitest-environment jsdom

import { act, createElement } from "react"
import { createRoot, type Root } from "react-dom/client"
import { renderToStaticMarkup } from "react-dom/server"
import { afterEach, beforeEach, describe, expect, it } from "vitest"

import { DRAG_SCOPE_ATTRIBUTE, DRAG_VALUE_PROPERTY } from "./behaviour.js"
import { DragControl } from "./behaviour-drag.js"

/**
 * The third control that needs a browser to be tested, and the first whose
 * contract has two halves: an attribute the primitive writes and a custom
 * property the runtime writes back into it.
 *
 * So these assert the published number as the literal string a CSS author's
 * `var()` will resolve to, on the element that author's rule will be scoped by.
 * That pair is what breaks a page if it changes, and nothing else here is worth
 * a test that the seam's own suite does not already cover without a DOM.
 */

declare global {
  // eslint-disable-next-line no-var
  var IS_REACT_ACT_ENVIRONMENT: boolean | undefined
}

let container: HTMLDivElement
let root: Root

/** jsdom implements neither pointer capture nor layout; both are stubbed per test. */
const captured = new Set<Element>()

const BOX = { left: 100, width: 200 }

const scopeIn = (parent: HTMLElement, declared?: number): HTMLDivElement => {
  const scope = document.createElement("div")

  scope.setAttribute(DRAG_SCOPE_ATTRIBUTE, "")
  if (declared !== undefined) scope.style.setProperty(DRAG_VALUE_PROPERTY, String(declared))

  scope.getBoundingClientRect = () =>
    ({ left: BOX.left, right: BOX.left + BOX.width, width: BOX.width }) as DOMRect

  parent.appendChild(scope)

  return scope
}

const mountInto = async (parent: HTMLElement, label = "Move the edge"): Promise<Root> => {
  const mounted = createRoot(parent)

  await act(async () => {
    mounted.render(createElement(DragControl, { label }))
  })

  return mounted
}

const slider = (): HTMLElement | null => container.querySelector('[role="slider"]')

const press = async (key: string): Promise<void> => {
  await act(async () => {
    slider()?.dispatchEvent(new KeyboardEvent("keydown", { key, bubbles: true }))
  })
}

const pointerAt = async (clientX: number): Promise<void> => {
  const target = slider()

  await act(async () => {
    target?.dispatchEvent(new MouseEvent("pointerdown", { bubbles: true, clientX }))
  })
}

const published = (scope: HTMLElement): string => scope.style.getPropertyValue(DRAG_VALUE_PROPERTY)

beforeEach(() => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true
  container = document.createElement("div")
  document.body.appendChild(container)
  root = createRoot(container)

  Element.prototype.setPointerCapture = function setPointerCapture() {
    captured.add(this)
  }
  Element.prototype.releasePointerCapture = function releasePointerCapture() {
    captured.delete(this)
  }
  Element.prototype.hasPointerCapture = function hasPointerCapture() {
    return captured.has(this)
  }
})

afterEach(() => {
  act(() => root.unmount())
  container.remove()
  captured.clear()
})

describe("the drag control", () => {
  /**
   * The failure this ordering exists to prevent is the one the finding behind
   * 0086 named: a handle that looks draggable and is not. Before hydration
   * nothing can move, so what the server sends is inert — and `hidden` rather
   * than nothing at all only because the element is how the control finds out,
   * on mount, whether it is inside a scope.
   */
  it("sends an inert placeholder from the server, and no control", () => {
    const markup = renderToStaticMarkup(createElement(DragControl, { label: "Move the edge" }))

    expect(markup).toBe('<span hidden=""></span>')
    expect(markup).not.toContain("slider")
  })

  /**
   * A control publishing into nothing is the same defect one layer down: it
   * would drag, and the picture would not move. The audit catches this at
   * registration; this is what happens if one ever gets past it.
   */
  it("stays a placeholder outside a scope", async () => {
    await act(async () => {
      root.render(createElement(DragControl, { label: "Move the edge" }))
    })

    expect(slider()).toBeNull()
    expect(container.firstElementChild?.hasAttribute("hidden")).toBe(true)
  })

  it("becomes a slider, under its declared name, inside one", async () => {
    const scope = scopeIn(container, 50)
    const mounted = await mountInto(scope)

    expect(slider()?.getAttribute("aria-label")).toBe("Move the edge")
    expect(slider()?.getAttribute("aria-valuemin")).toBe("0")
    expect(slider()?.getAttribute("aria-valuemax")).toBe("100")
    expect(slider()?.getAttribute("tabindex")).toBe("0")

    act(() => mounted.unmount())
  })

  /**
   * The whole point of the primitive writing the number first: the control
   * arrives where the page already looks, so a reader who presses a key once
   * moves the edge by one rather than snapping it to the middle.
   */
  it("starts at the number the scope already carries", async () => {
    const scope = scopeIn(container, 30)
    const mounted = await mountInto(scope)

    expect(slider()?.getAttribute("aria-valuenow")).toBe("30")

    act(() => mounted.unmount())
  })

  /** And nothing moves on hydration: reading is not publishing. */
  it("writes nothing until it is used", async () => {
    const scope = scopeIn(container, 30)
    const mounted = await mountInto(scope)

    expect(published(scope)).toBe("30")

    act(() => mounted.unmount())
  })

  it("starts in the middle where the scope names no number", async () => {
    const scope = scopeIn(container)
    const mounted = await mountInto(scope)

    expect(slider()?.getAttribute("aria-valuenow")).toBe("50")

    act(() => mounted.unmount())
  })

  it("publishes a plain number on the scope, which is what a var() resolves", async () => {
    const scope = scopeIn(container, 30)
    const mounted = await mountInto(scope)

    await press("ArrowRight")

    expect(published(scope)).toBe("31")
    expect(slider()?.getAttribute("aria-valuenow")).toBe("31")

    act(() => mounted.unmount())
  })

  it("moves by ten on a page key and to the ends on Home and End", async () => {
    const scope = scopeIn(container, 50)
    const mounted = await mountInto(scope)

    await press("PageUp")
    expect(published(scope)).toBe("60")

    await press("PageDown")
    expect(published(scope)).toBe("50")

    await press("Home")
    expect(published(scope)).toBe("0")

    await press("End")
    expect(published(scope)).toBe("100")

    act(() => mounted.unmount())
  })

  it("stops at the ends rather than running past them", async () => {
    const scope = scopeIn(container, 50)
    const mounted = await mountInto(scope)

    await press("End")
    await press("ArrowRight")
    expect(published(scope)).toBe("100")

    await press("Home")
    await press("ArrowLeft")
    expect(published(scope)).toBe("0")

    act(() => mounted.unmount())
  })

  /**
   * The geometry is the scope's, not the control's. A handle two centimetres
   * wide measured against itself would move the edge across the whole picture
   * in a few pixels; the box the reader is comparing inside is the box the
   * fraction is taken from.
   */
  it("takes its number from where the pointer is across the scope", async () => {
    const scope = scopeIn(container, 50)
    const mounted = await mountInto(scope)

    await pointerAt(BOX.left + BOX.width / 4)

    expect(published(scope)).toBe("25")

    act(() => mounted.unmount())
  })

  it("clamps a pointer dragged outside the scope", async () => {
    const scope = scopeIn(container, 50)
    const mounted = await mountInto(scope)

    await pointerAt(BOX.left + BOX.width * 2)
    expect(published(scope)).toBe("100")

    await pointerAt(BOX.left - BOX.width)
    expect(published(scope)).toBe("0")

    act(() => mounted.unmount())
  })

  /**
   * A wipe is placed with `insetInlineStart` and clipped from the inline start,
   * so a right-to-left page mirrors the whole comparison. A control that did
   * not mirror with it would move the edge away from the pointer.
   */
  it("mirrors the pointer and the arrow keys in a right-to-left scope", async () => {
    const scope = scopeIn(container, 50)
    scope.style.direction = "rtl"
    const mounted = await mountInto(scope)

    await pointerAt(BOX.left + BOX.width / 4)
    expect(published(scope)).toBe("75")

    await press("ArrowRight")
    expect(published(scope)).toBe("74")

    await press("ArrowLeft")
    expect(published(scope)).toBe("75")

    act(() => mounted.unmount())
  })

  /**
   * Up and down are not mirrored by either the pattern or the page: they mean
   * more and less wherever the text runs.
   */
  it("keeps up and down meaning more and less in either direction", async () => {
    const scope = scopeIn(container, 50)
    scope.style.direction = "rtl"
    const mounted = await mountInto(scope)

    await press("ArrowUp")
    expect(published(scope)).toBe("51")

    await press("ArrowDown")
    expect(published(scope)).toBe("50")

    act(() => mounted.unmount())
  })

  it("ignores a key it does not handle", async () => {
    const scope = scopeIn(container, 50)
    const mounted = await mountInto(scope)

    await press("Enter")

    expect(published(scope)).toBe("50")

    act(() => mounted.unmount())
  })

  /**
   * The control owns one element and no more. A wrapper would land in the
   * middle of a layout the primitive owns, which is the objection 0086 raised
   * against every shape that reaches into a primitive's markup.
   */
  it("renders one element", async () => {
    const scope = scopeIn(container, 50)
    const mounted = await mountInto(scope)

    expect(scope.children).toHaveLength(1)
    expect(scope.firstElementChild).toBe(slider())

    act(() => mounted.unmount())
  })
})
