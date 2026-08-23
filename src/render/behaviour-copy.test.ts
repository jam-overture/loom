// @vitest-environment jsdom

import { act, createElement } from "react"
import { createRoot, type Root } from "react-dom/client"
import { renderToStaticMarkup } from "react-dom/server"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { CopyControl } from "./behaviour-copy.js"

/**
 * The one part of the runtime that needs a browser to be tested, because it is
 * the one part that runs in one. Everything the seam does around it —
 * declaring, checking, placing — is covered without a DOM in `behaviour.test.ts`.
 */

declare global {
  // eslint-disable-next-line no-var
  var IS_REACT_ACT_ENVIRONMENT: boolean | undefined
}

const CONFIRMATION_MS = 2000

type Clipboard = { readonly writeText: (value: string) => Promise<void> }

const withClipboard = (writeText: (value: string) => Promise<void>): void => {
  Object.defineProperty(navigator, "clipboard", {
    value: { writeText } satisfies Clipboard,
    configurable: true,
  })
}

const withoutClipboard = (): void => {
  Object.defineProperty(navigator, "clipboard", { value: undefined, configurable: true })
}

let container: HTMLDivElement
let root: Root

const mount = async (value = "pnpm add @loom/runtime"): Promise<void> => {
  await act(async () => {
    root.render(createElement(CopyControl, { value, label: "Copy", copiedLabel: "Copied" }))
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
  vi.useRealTimers()
  withoutClipboard()
})

describe("the copy control", () => {
  /**
   * The property the finding this closes insisted on: a button that looks like
   * it copies and does not is worse for a visitor than no button, and an
   * insecure origin is an ordinary way to get one.
   */
  it("renders nothing where there is no clipboard to write to", async () => {
    withoutClipboard()
    await mount()

    expect(container.innerHTML).toBe("")
  })

  /**
   * The server has no `navigator` to ask, so the first paint is empty either
   * way — which is also what makes the appearance from an effect free of a
   * hydration mismatch.
   */
  it("renders nothing on the server", () => {
    const markup = renderToStaticMarkup(
      createElement(CopyControl, { value: "x", label: "Copy", copiedLabel: "Copied" })
    )

    expect(markup).toBe("")
  })

  it("shows itself, under its declared name, once the clipboard is there", async () => {
    withClipboard(async () => undefined)
    await mount()

    expect(button()?.textContent).toBe("Copy")
    expect(button()?.getAttribute("type")).toBe("button")
  })

  it("writes what it was given, and says so", async () => {
    const writeText = vi.fn(async () => undefined)
    withClipboard(writeText)
    await mount("pnpm add @loom/runtime")
    await click()

    expect(writeText).toHaveBeenCalledWith("pnpm add @loom/runtime")
    expect(button()?.textContent).toBe("Copied")
  })

  it("goes back to its name after the confirmation, so a second copy is visible", async () => {
    vi.useFakeTimers()
    withClipboard(async () => undefined)
    await mount()
    await click()

    expect(button()?.textContent).toBe("Copied")

    await act(async () => {
      vi.advanceTimersByTime(CONFIRMATION_MS)
    })

    expect(button()?.textContent).toBe("Copy")
  })

  /**
   * A denied permission or a document that lost focus rejects the write. The
   * control says nothing rather than announcing a copy that did not happen.
   */
  it("does not claim a copy the clipboard refused", async () => {
    withClipboard(async () => {
      throw new Error("not allowed")
    })
    await mount()
    await click()

    expect(button()?.textContent).toBe("Copy")
  })

  it("announces the change politely rather than interrupting", async () => {
    withClipboard(async () => undefined)
    await mount()

    expect(container.querySelector("[aria-live]")?.getAttribute("aria-live")).toBe("polite")
  })
})
