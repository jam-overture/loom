// @vitest-environment jsdom

import { act, createElement } from "react"
import { createRoot, type Root } from "react-dom/client"
import { renderToStaticMarkup } from "react-dom/server"
import { afterEach, beforeEach, describe, expect, it } from "vitest"

import { DISCLOSED_ATTRIBUTE } from "./behaviour.js"
import { DiscloseControl } from "./behaviour-disclose.js"

/**
 * The second control that needs a browser to be tested, for the reason the copy
 * control's suite gives: everything the seam does around it — declaring,
 * checking, placing — is covered without a DOM in `behaviour.test.ts`.
 *
 * What is specific to this one is the *contract*, which is an attribute a
 * stylesheet somebody else writes will select on. So these tests assert the
 * attribute by its exported name and assert the states as the literal strings
 * a CSS author would type, because that is the thing that breaks a page if it
 * changes.
 */

declare global {
  // eslint-disable-next-line no-var
  var IS_REACT_ACT_ENVIRONMENT: boolean | undefined
}

let container: HTMLDivElement
let root: Root

const mount = async (label = "Menu"): Promise<void> => {
  await act(async () => {
    root.render(createElement(DiscloseControl, { label }))
  })
}

const button = (): HTMLButtonElement | null => container.querySelector("button")

const click = async (): Promise<void> => {
  await act(async () => {
    button()?.dispatchEvent(new MouseEvent("click", { bubbles: true }))
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

describe("the disclosure control", () => {
  /**
   * The failure this ordering exists to prevent, and it is worse than the copy
   * control's: a button in the server's markup that scripting never arrives to
   * animate is a dead control with the whole menu hidden behind it, because the
   * primitive's rule keys off the closed state.
   */
  it("renders nothing on the server", () => {
    const markup = renderToStaticMarkup(createElement(DiscloseControl, { label: "Menu" }))

    expect(markup).toBe("")
  })

  it("shows itself, under its declared name, once scripting has run", async () => {
    await mount()

    expect(button()?.textContent).toContain("Menu")
    expect(button()?.getAttribute("type")).toBe("button")
  })

  it("starts closed, so the region it names is collapsed on arrival", async () => {
    await mount()

    expect(button()?.getAttribute(DISCLOSED_ATTRIBUTE)).toBe("false")
    expect(button()?.getAttribute("aria-expanded")).toBe("false")
  })

  it("opens and closes again, on its own element", async () => {
    await mount()
    await click()

    expect(button()?.getAttribute(DISCLOSED_ATTRIBUTE)).toBe("true")
    expect(button()?.getAttribute("aria-expanded")).toBe("true")

    await click()

    expect(button()?.getAttribute(DISCLOSED_ATTRIBUTE)).toBe("false")
    expect(button()?.getAttribute("aria-expanded")).toBe("false")
  })

  /**
   * The disclosure pattern as the ARIA practices state it: one name, and
   * `aria-expanded` carries the state. A control that renamed itself on open
   * would be saying the state twice and differently.
   */
  it("keeps the same name open and closed", async () => {
    await mount()
    const closed = button()?.textContent

    await click()

    expect(button()?.textContent).toBe(closed)
  })

  /**
   * The control owns one element and nothing else. If it ever grew a wrapper,
   * every sibling selector a primitive had written against it would stop
   * matching — silently, because the button would still be there and still
   * toggle.
   */
  it("renders one element, with the state on the element a selector will reach", async () => {
    await mount()

    expect(container.children).toHaveLength(1)
    expect(container.firstElementChild?.tagName).toBe("BUTTON")
    expect(container.querySelector(`[${DISCLOSED_ATTRIBUTE}]`)).toBe(button())
  })

  /**
   * The exact selector the seam's documentation tells a primitive to write.
   * Asserting it here means the contract is checked as CSS rather than as two
   * strings that happen to agree.
   */
  it("is selectable by the closed-state rule the seam documents", async () => {
    const region = document.createElement("ul")
    await mount()
    container.appendChild(region)

    expect(container.querySelector(`[${DISCLOSED_ATTRIBUTE}="false"] ~ ul`)).toBe(region)

    await click()

    expect(container.querySelector(`[${DISCLOSED_ATTRIBUTE}="false"] ~ ul`)).toBeNull()
  })

  it("hides its glyph from a screen reader, which already has the name", async () => {
    await mount()

    expect(button()?.querySelector("[aria-hidden]")).not.toBeNull()
  })
})
