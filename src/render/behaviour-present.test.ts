// @vitest-environment jsdom

import { act, createElement, Fragment } from "react"
import { createRoot, type Root } from "react-dom/client"
import { renderToStaticMarkup } from "react-dom/server"
import { afterEach, beforeEach, describe, expect, it } from "vitest"

import { DISMISS_EVENT, PRESENTED_ATTRIBUTE } from "./behaviour.js"
import { DismissControl, PresentControl } from "./behaviour-present.js"
import { controlClass } from "./control.js"

/**
 * The fourth and fifth controls that need a browser to be tested, and the first
 * suite that has to mount two of them at once.
 *
 * What is specific to this pair is the *contract*, and it has two halves that a
 * stylesheet author and a primitive author respectively depend on: an attribute
 * on the element the trigger was placed in, and the fact that a cross anywhere
 * inside that element closes what the trigger opened. Both are asserted by their
 * exported names and as the literal strings someone else will type, because
 * those are the things that break a page if they change.
 */

declare global {
  // eslint-disable-next-line no-var
  var IS_REACT_ACT_ENVIRONMENT: boolean | undefined
}

let container: HTMLDivElement
let root: Root

const mountTrigger = async (label = "Open"): Promise<void> => {
  await act(async () => {
    root.render(createElement(PresentControl, { label }))
  })
}

/**
 * The shape a primitive that presents a region actually renders: the trigger and
 * the region as siblings inside one box, with the cross somewhere down inside
 * the region rather than beside the trigger. Nested deliberately — a pair that
 * only worked when the two controls were siblings would pass a flatter test and
 * fail on the first real dialog.
 */
const mountPair = async (): Promise<void> => {
  await act(async () => {
    root.render(
      createElement(
        Fragment,
        null,
        createElement(PresentControl, { key: "trigger", label: "Open" }),
        createElement(
          "div",
          { key: "region", className: "region" },
          createElement("div", null, createElement(DismissControl, { label: "Close" }))
        )
      )
    )
  })
}

const trigger = (): HTMLButtonElement | null =>
  container.querySelector(`.${controlClass("present").split(" ")[1] ?? ""}`)

const closer = (): HTMLButtonElement | null =>
  container.querySelector(`.${controlClass("dismiss").split(" ")[1] ?? ""}`)

const press = async (element: Element | null): Promise<void> => {
  await act(async () => {
    element?.dispatchEvent(new MouseEvent("click", { bubbles: true }))
  })
}

const escape = async (): Promise<void> => {
  await act(async () => {
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }))
  })
}

const pointerDownOn = async (target: EventTarget): Promise<void> => {
  await act(async () => {
    target.dispatchEvent(new MouseEvent("pointerdown", { bubbles: true }))
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

describe("the presentation control", () => {
  /**
   * The failure this ordering exists to prevent is the same one the disclosure
   * control names and is sharper here, because the region an overlay hides is
   * the whole of what the primitive was placed for: a trigger in the server's
   * markup that scripting never arrives to drive is a dead button with a panel
   * behind it and no way to reach it.
   */
  it("renders nothing on the server", () => {
    expect(renderToStaticMarkup(createElement(PresentControl, { label: "Open" }))).toBe("")
  })

  it("shows itself, under its declared name, once scripting has run", async () => {
    await mountTrigger()

    expect(trigger()?.textContent).toBe("Open")
    expect(trigger()?.getAttribute("type")).toBe("button")
  })

  /**
   * The half that differs from `disclose`, and the reason this member exists.
   * The state is on the **parent**, so a primitive's descendant selector reaches
   * a region that is not the trigger's sibling.
   */
  it("publishes its state on the element it was placed in, not on its own button", async () => {
    await mountTrigger()

    expect(container.getAttribute(PRESENTED_ATTRIBUTE)).toBe("false")
    expect(trigger()?.hasAttribute(PRESENTED_ATTRIBUTE)).toBe(false)
  })

  it("starts closed, so the region it opens is hidden on arrival", async () => {
    await mountTrigger()

    expect(container.getAttribute(PRESENTED_ATTRIBUTE)).toBe("false")
    expect(trigger()?.getAttribute("aria-expanded")).toBe("false")
  })

  it("opens and closes again from its own button", async () => {
    await mountTrigger()
    await press(trigger())

    expect(container.getAttribute(PRESENTED_ATTRIBUTE)).toBe("true")
    expect(trigger()?.getAttribute("aria-expanded")).toBe("true")

    await press(trigger())

    expect(container.getAttribute(PRESENTED_ATTRIBUTE)).toBe("false")
    expect(trigger()?.getAttribute("aria-expanded")).toBe("false")
  })

  it("keeps the same name open and closed", async () => {
    await mountTrigger()
    const closed = trigger()?.textContent

    await press(trigger())

    expect(trigger()?.textContent).toBe(closed)
  })

  /**
   * The exact selector the seam's documentation tells a primitive to write, so
   * the contract is checked as CSS rather than as two strings that agree.
   */
  it("is hidden by the rule the contract documents, and only while closed", async () => {
    await mountTrigger()
    container.classList.add("box")

    expect(container.matches(`[${PRESENTED_ATTRIBUTE}="false"]`)).toBe(true)

    await press(trigger())

    expect(container.matches(`[${PRESENTED_ATTRIBUTE}="false"]`)).toBe(false)
  })

  it("closes on Escape", async () => {
    await mountTrigger()
    await press(trigger())
    await escape()

    expect(container.getAttribute(PRESENTED_ATTRIBUTE)).toBe("false")
  })

  it("ignores every other key", async () => {
    await mountTrigger()
    await press(trigger())

    await act(async () => {
      document.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }))
    })

    expect(container.getAttribute(PRESENTED_ATTRIBUTE)).toBe("true")
  })

  it("closes on a press outside the element it was placed in", async () => {
    await mountTrigger()
    await press(trigger())
    await pointerDownOn(document.body)

    expect(container.getAttribute(PRESENTED_ATTRIBUTE)).toBe("false")
  })

  /**
   * The other half of the same rule, and the one that is easy to lose: a press
   * on the panel the control exists to show must not close it, or a reader
   * cannot use what they opened.
   */
  it("stays open on a press inside it", async () => {
    await mountPair()
    await press(trigger())
    await pointerDownOn(container.querySelector(".region") as Element)

    expect(container.getAttribute(PRESENTED_ATTRIBUTE)).toBe("true")
  })

  /**
   * Nothing listens while the region is closed, so a stray press on the page
   * costs nothing and — more to the point — cannot re-open anything.
   */
  it("hears nothing while closed", async () => {
    await mountTrigger()
    await escape()
    await pointerDownOn(document.body)

    expect(container.getAttribute(PRESENTED_ATTRIBUTE)).toBe("false")
  })

  /**
   * A stale attribute is worse than none: the primitive's rule would keep
   * matching on a box whose control has gone, leaving a region hidden by a
   * button that no longer exists.
   */
  it("takes its state off the page when it unmounts", async () => {
    await mountTrigger()

    expect(container.hasAttribute(PRESENTED_ATTRIBUTE)).toBe(true)

    await act(async () => root.unmount())

    expect(container.hasAttribute(PRESENTED_ATTRIBUTE)).toBe(false)
  })
})

describe("the dismiss control", () => {
  it("renders nothing on the server", () => {
    expect(renderToStaticMarkup(createElement(DismissControl, { label: "Close" }))).toBe("")
  })

  /**
   * The one control in the vocabulary whose declared name is not rendered as
   * text. The guarantee the text seam makes is unchanged and is what makes that
   * safe, so both halves are asserted together: the name is on the button, and
   * the cross is what an eye is shown.
   */
  it("wears its declared name as a label rather than as text", async () => {
    await mountPair()

    expect(closer()?.getAttribute("aria-label")).toBe("Close")
    expect(closer()?.textContent).toBe("×")
  })

  it("hides its glyph from a screen reader, which already has the name", async () => {
    await mountPair()

    expect(closer()?.querySelector("[aria-hidden]")?.textContent).toBe("×")
  })

  /**
   * The whole of the pair's contract, and the thing no earlier member of the
   * vocabulary could do: a control closes a region a *different* control opened,
   * from inside it, with nothing shared between them but the DOM.
   */
  it("closes the presentation it sits inside", async () => {
    await mountPair()
    await press(trigger())

    expect(container.getAttribute(PRESENTED_ATTRIBUTE)).toBe("true")

    await press(closer())

    expect(container.getAttribute(PRESENTED_ATTRIBUTE)).toBe("false")
  })

  it("asks by the name the contract exports, and asks upwards", async () => {
    await mountPair()
    const heard: string[] = []
    container.addEventListener(DISMISS_EVENT, (event) => heard.push(event.type))

    await press(closer())

    expect(heard).toEqual([DISMISS_EVENT])
  })

  /**
   * It publishes nothing and knows nothing. A dismiss control that had grown its
   * own state would be a second place for the answer to live, and the two would
   * disagree the first time the trigger closed the region.
   */
  it("carries no state of its own", async () => {
    await mountPair()

    expect(closer()?.hasAttribute(PRESENTED_ATTRIBUTE)).toBe(false)
    expect(closer()?.hasAttribute("aria-expanded")).toBe(false)
  })

  /**
   * A cross with no presentation above it is refused at registration, so this is
   * the shape that cannot reach a page. Asserted anyway, because what it must do
   * is *nothing* — a stray dismiss that threw would take the page down with it.
   */
  it("does nothing at all when nothing above it is listening", async () => {
    await act(async () => {
      root.render(createElement(DismissControl, { label: "Close" }))
    })

    await press(closer())

    expect(container.hasAttribute(PRESENTED_ATTRIBUTE)).toBe(false)
  })
})
