// @vitest-environment jsdom

import { act, createElement } from "react"
import { createRoot, type Root } from "react-dom/client"
import { renderToStaticMarkup } from "react-dom/server"
import { afterEach, beforeEach, describe, expect, it } from "vitest"

import { ADJUST_MAXIMUM, ADJUST_MINIMUM, ADJUST_PROPERTY, ADJUST_RESTING } from "./behaviour.js"
import { AdjustControl } from "./behaviour-adjust.js"
import { controlClass, controlDisplay } from "./control.js"

/**
 * The third control that needs a browser to be tested, for the reason the other
 * two suites give: everything the seam does around it — declaring, checking,
 * placing — is covered without a DOM in `behaviour.test.ts`.
 *
 * What is specific to this one is *where the value lands*. The contract is a
 * custom property on an element this control did not create, which is the whole
 * of 0096 and the one thing that silently breaks every page using it if it
 * moves. So these tests read the property off the parent by its exported name,
 * assert it is absent when it should be, and assert its value as the literal
 * string a `calc()` somebody else wrote would consume.
 */

declare global {
  // eslint-disable-next-line no-var
  var IS_REACT_ACT_ENVIRONMENT: boolean | undefined
}

let container: HTMLDivElement
let root: Root

const mount = async (label = "Reveal"): Promise<void> => {
  await act(async () => {
    root.render(createElement(AdjustControl, { label }))
  })
}

const slider = (): HTMLInputElement | null => container.querySelector("input")

const published = (): string => container.style.getPropertyValue(ADJUST_PROPERTY)

/**
 * How a reader moves it: the browser sets the value and fires `input`, which
 * React listens for as `onChange`. Setting `.value` alone would be a lie — the
 * React 19 event plumbing needs the native setter for the change to be seen.
 */
const dragTo = async (value: number): Promise<void> => {
  const input = slider()

  if (!input) throw new Error("no slider to drag")

  await act(async () => {
    const setter = Object.getOwnPropertyDescriptor(
      HTMLInputElement.prototype,
      "value"
    )?.set

    setter?.call(input, String(value))
    input.dispatchEvent(new Event("input", { bubbles: true }))
  })
}

beforeEach(() => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true
  container = document.createElement("div")
  document.body.appendChild(container)
  root = createRoot(container)
})

afterEach(() => {
  act(() => root.unmount())
  container.remove()
})

describe("the adjust control", () => {
  /**
   * The failure this ordering exists to prevent: a slider in the server's markup
   * that scripting never arrives to animate is a control a reader can drag with
   * nothing happening — and because the primitive reads the property through a
   * `var()` fallback, the comparison beside it would sit at its declared
   * position while the handle says otherwise.
   */
  it("is absent from the server's markup entirely", () => {
    expect(renderToStaticMarkup(createElement(AdjustControl, { label: "Reveal" }))).toBe("")
  })

  it("appears once an effect has proved scripting runs", async () => {
    await mount()

    expect(slider()).not.toBeNull()
  })

  it("is a range input, so dragging and the arrow keys are the browser's to get right", async () => {
    await mount()

    expect(slider()?.type).toBe("range")
    expect(slider()?.min).toBe(String(ADJUST_MINIMUM))
    expect(slider()?.max).toBe(String(ADJUST_MAXIMUM))
  })

  it("carries the name the primitive declared, in the deployment's language", async () => {
    await mount("Enthüllen")

    expect(slider()?.getAttribute("aria-label")).toBe("Enthüllen")
  })
})

describe("where an adjust control puts its value", () => {
  /**
   * The property is on the **parent**, and the test says so in both directions
   * because the mistake it guards against renders identically. Inheritance runs
   * downwards, so a property this control set on its own element would be
   * readable by nothing — least of all the sibling region it exists to drive —
   * and nothing about the page would look wrong until somebody dragged it.
   */
  it("publishes on the element the primitive placed it in, not on itself", async () => {
    await mount()

    expect(published()).toBe(String(ADJUST_RESTING))
    expect(slider()?.style.getPropertyValue(ADJUST_PROPERTY)).toBe("")
  })

  /**
   * Unitless, so that one value serves a clip, a width and a background position
   * alike — the stylesheet supplies the unit it needs. A number that arrived as
   * `"50%"` would break every `calc(… * 1%)` written against this.
   */
  it("publishes a bare number a stylesheet can compute with", async () => {
    await mount()
    await dragTo(37)

    expect(published()).toBe("37")
  })

  it("follows the reader", async () => {
    await mount()

    await dragTo(0)
    expect(published()).toBe("0")

    await dragTo(100)
    expect(published()).toBe("100")
  })

  /**
   * A stale property on an element the runtime does not own would outlive the
   * control that set it, and the primitive's own declared position — the `var()`
   * fallback — would never come back.
   */
  it("takes the property away with it when it unmounts", async () => {
    await mount()
    await dragTo(80)

    expect(published()).toBe("80")

    await act(async () => root.unmount())

    expect(published()).toBe("")
  })

  it("carries the classes a primitive aims a rule at", async () => {
    await mount()

    expect(slider()?.getAttribute("class")).toBe(controlClass("adjust"))
  })

  /**
   * The one control whose display a rule could already have reached, because it
   * did not set the property inline. It sets it now anyway: a property that hid
   * two controls of three would be a worse contract than one that hides none.
   */
  it("takes its display through the properties a primitive can override", async () => {
    await mount()

    expect(slider()?.style.display).toBe(controlDisplay("adjust", "inline-block"))
  })
})
