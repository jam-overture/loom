// @vitest-environment jsdom

import { act, createElement } from "react"
import { createRoot, type Root } from "react-dom/client"
import { renderToStaticMarkup } from "react-dom/server"
import { afterEach, beforeEach, describe, expect, it } from "vitest"

import {
  ADJUST_MAXIMUM,
  ADJUST_MINIMUM,
  ADJUST_PROPERTY,
  ADJUST_RESTING,
  ADJUST_RESTING_PROPERTY,
} from "./behaviour.js"
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

/**
 * What a primitive does to say where its control starts: one custom property on
 * the element it places the control in, which is this container. Declared
 * *before* mounting, because the control reads it once and the thing being
 * tested is that it reads it at all.
 */
const declareResting = (value: string): void => {
  container.style.setProperty(ADJUST_RESTING_PROPERTY, value)
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
    await dragTo(37)

    expect(published()).toBe("37")
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
})

describe("when an adjust control publishes anything at all", () => {
  /**
   * The defect this suite exists for, and the one assertion that would have
   * caught it. A band authored at 35 rendered at 35 in the server's markup and
   * jumped to the runtime's midpoint the instant hydration landed, because the
   * control wrote its own resting value in a mount effect. On every page a
   * reader actually visits, the declared position did nothing.
   *
   * Appearing is not an instruction. The primitive's `var()` fallback already
   * says where the divider is, and a control that has not been touched has
   * nothing to add to it.
   */
  it("publishes nothing until the reader has moved it", async () => {
    declareResting("35")
    await mount()

    expect(slider()).not.toBeNull()
    expect(published()).toBe("")
  })

  it("publishes nothing on mount even where no position was declared", async () => {
    await mount()

    expect(published()).toBe("")
  })

  /**
   * The reader's first move is what the property is for, and it is published
   * whole — not as a delta from wherever the control happened to rest.
   */
  it("publishes from the reader's first move onward", async () => {
    declareResting("35")
    await mount()

    await dragTo(60)
    expect(published()).toBe("60")

    await dragTo(35)
    expect(published()).toBe("35")
  })

  /**
   * The position a reader cannot ask for is the one the control already rests
   * at, and that costs nothing — which is worth asserting rather than assuming,
   * because it is the one case where "publishes only when moved" could have left
   * a page wrong. A press that does not change the input's value fires no
   * `input` event, in a browser or in React, so nothing is published and the
   * primitive's own fallback is still what the divider reads: 35, which is the
   * number the reader was asking for. The two routes to 35 differ in which
   * declaration supplies it and in nothing a reader can see.
   */
  it("needs no publication to sit at the position it already rests at", async () => {
    declareResting("35")
    await mount()

    await dragTo(35)

    expect(slider()?.value).toBe("35")
    expect(published()).toBe("")
  })

  /**
   * And once a reader has been somewhere else, coming back is an ordinary move
   * with an ordinary value — the property is not sticky in one direction.
   */
  it("publishes the declared position again once the reader has left it", async () => {
    declareResting("35")
    await mount()

    await dragTo(70)
    await dragTo(35)

    expect(published()).toBe("35")
  })
})

describe("where an adjust control starts", () => {
  /**
   * `build` receives a node's text and its content, not its props, which is
   * 0086's shape and not an omission. So the number arrives through the DOM
   * instead, off the one element the primitive already chose by deciding where
   * to place the control — the same route `present` and `dismiss` agree by.
   */
  it("starts at the position the primitive declared on the element it was placed in", async () => {
    declareResting("35")
    await mount()

    expect(slider()?.value).toBe("35")
  })

  it("starts at the runtime's resting point where a primitive declared none", async () => {
    await mount()

    expect(slider()?.value).toBe(String(ADJUST_RESTING))
  })

  /**
   * A custom property is a cascaded value, so a primitive may declare this in a
   * rule as readily as in a style attribute, and it inherits — which is the
   * same reach `--loom-adjust` has in the other direction.
   */
  it("reads a declared position out of a stylesheet, not just a style attribute", async () => {
    const sheet = document.createElement("style")

    sheet.textContent = `.rests-at-20 { ${ADJUST_RESTING_PROPERTY}: 20 }`
    document.head.appendChild(sheet)
    container.className = "rests-at-20"

    await mount()

    expect(slider()?.value).toBe("20")

    sheet.remove()
  })

  /**
   * The range is the runtime's (0096), so a number outside it is not a position
   * this control can take. Clamped rather than refused: the comparison is the
   * thing that ships, and the still version is right there in the `var()`
   * fallback.
   */
  it("clamps a declared position into the range the runtime owns", async () => {
    declareResting("140")
    await mount()

    expect(slider()?.value).toBe(String(ADJUST_MAXIMUM))
  })

  it("clamps a negative declared position to the bottom of the range", async () => {
    declareResting("-10")
    await mount()

    expect(slider()?.value).toBe(String(ADJUST_MINIMUM))
  })

  /**
   * A step-1 input cannot hold a fraction, so state and thumb would disagree
   * from the first frame if this were taken as given.
   */
  it("rounds a fractional declared position to something the input can hold", async () => {
    declareResting("35.6")
    await mount()

    expect(slider()?.value).toBe("36")
  })

  /**
   * A control that refused to render because a stylesheet said `thirty` would be
   * a missing comparison. Falling back is the same answer a primitive declaring
   * nothing gets.
   */
  it("falls back to the runtime's resting point when the declaration is not a number", async () => {
    declareResting("thirty")
    await mount()

    expect(slider()?.value).toBe(String(ADJUST_RESTING))
  })

  /**
   * Read once, at mount. Where the slider goes after that is the reader's, and a
   * primitive that re-declared its resting position mid-life would otherwise
   * drag the control out from under somebody's hand.
   */
  it("does not follow a declaration that changes after it has started", async () => {
    declareResting("35")
    await mount()

    await act(async () => {
      declareResting("80")
    })

    expect(slider()?.value).toBe("35")
  })
})

describe("the classes and display an adjust control carries", () => {
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
