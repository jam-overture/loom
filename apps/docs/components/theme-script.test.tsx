import { render } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { THEME_STORAGE_KEY } from "@/lib/theme"

import { ThemeScript } from "./theme-script"

/**
 * This exists because of a real bug, and it is the kind that only shows up in a
 * browser: the storage key was exported from the toggle, which is a client
 * component, and importing a plain constant from one into a server component
 * gave `undefined`. The site shipped `localStorage.getItem(undefined)` — no
 * error, no warning, and a stored dark preference silently ignored on every
 * load. Asserting on the emitted text is what catches it without a browser.
 */
describe("the theme script", () => {
  it("reads the key the toggle writes", () => {
    const { container } = render(<ThemeScript />)
    const source = container.querySelector("script")?.innerHTML ?? ""

    expect(source).toContain(JSON.stringify(THEME_STORAGE_KEY))
    expect(source).not.toContain("undefined")
  })

  it("falls back to the system preference when nothing was stored", () => {
    const { container } = render(<ThemeScript />)

    expect(container.querySelector("script")?.innerHTML).toContain("prefers-color-scheme: dark")
  })
})
