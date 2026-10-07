import { render } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it } from "vitest"

import { SITE_BAR, THEME_COLOR_NAME, THEME_STORAGE_KEY } from "@/app/(docs)/_lib/theme"

import { ThemeScript } from "./theme-script"

/**
 * This exists because of a real bug, and it is the kind that only shows up in a
 * browser: the storage key was exported from the toggle, which is a client
 * component, and importing a plain constant from one into a server component
 * gave `undefined`. The site shipped `localStorage.getItem(undefined)` — no
 * error, no warning, and a stored dark preference silently ignored on every
 * load. Asserting on the emitted text is what catches it without a browser.
 *
 * **The second half of this file runs the script instead of reading it**, and
 * the reason is the one thing the first half cannot see. This is a string, so
 * nothing typechecks it and nothing parses it: a stray bracket in it is a
 * `SyntaxError` at the top of every document on the site, which takes the theme
 * attribute and the bar with it and leaves a page that merely looks like one
 * nobody had set a preference on. Every assertion below that reads a result out
 * of the document is also an assertion that the thing parses.
 */
const sourceOf = (): string => {
  const { container } = render(<ThemeScript />)

  return container.querySelector("script")?.innerHTML ?? ""
}

describe("the theme script, as text", () => {
  it("reads the key the toggle writes", () => {
    const source = sourceOf()

    expect(source).toContain(JSON.stringify(THEME_STORAGE_KEY))
    expect(source).not.toContain("undefined")
  })

  it("falls back to the system preference when nothing was stored", () => {
    expect(sourceOf()).toContain("prefers-color-scheme: dark")
  })

  /**
   * Both colors, because the script has to be able to reach either. A script
   * carrying one of them would be a bar that is right in one theme, which is
   * the bug this whole change is about.
   */
  it("carries both of the colors the bar can be", () => {
    const source = sourceOf()

    expect(source).toContain(JSON.stringify(SITE_BAR.light))
    expect(source).toContain(JSON.stringify(SITE_BAR.dark))
  })
})

/**
 * The document as the script finds it: a meta the layout rendered, carrying the
 * light color, and an `<html>` with no theme on it yet.
 */
const asServed = (): HTMLMetaElement => {
  document.documentElement.removeAttribute("data-theme")

  const meta = document.createElement("meta")
  meta.setAttribute("name", THEME_COLOR_NAME)
  meta.setAttribute("content", SITE_BAR.light)
  document.head.append(meta)

  return meta
}

/** Run the emitted script the way a document runs it. */
const runIt = (): void => {
  new Function(sourceOf())()
}

const painted = (): { readonly theme: string | null; readonly bar: string | null } => ({
  theme: document.documentElement.getAttribute("data-theme"),
  bar: document.head.querySelector(`meta[name="${THEME_COLOR_NAME}"]`)?.getAttribute("content") ?? null,
})

describe("the theme script, run", () => {
  beforeEach(() => {
    document.head.innerHTML = ""
    window.localStorage.clear()
  })

  afterEach(() => {
    document.documentElement.removeAttribute("data-theme")
  })

  it("leaves both on light when nothing was stored and the machine is light", () => {
    asServed()
    runIt()

    expect(painted()).toEqual({ theme: "light", bar: SITE_BAR.light })
  })

  /**
   * The case the change exists for. Before it, this assertion could only have
   * been made about `data-theme`: the bar stayed white over a `#0a0a0a` page.
   */
  it("moves the bar as well as the page when dark was stored", () => {
    asServed()
    window.localStorage.setItem(THEME_STORAGE_KEY, "dark")
    runIt()

    expect(painted()).toEqual({ theme: "dark", bar: SITE_BAR.dark })
  })

  it("keeps both on light when light was stored", () => {
    asServed()
    window.localStorage.setItem(THEME_STORAGE_KEY, "light")
    runIt()

    expect(painted()).toEqual({ theme: "light", bar: SITE_BAR.light })
  })

  /**
   * A stored value that is neither word is not a third preference, and the
   * script treats it as *nothing stored* rather than as a reason to throw. The
   * bar has to follow the same branch the page does, which is the assertion
   * that fails if the two are ever decided separately.
   */
  it("treats a stored value it does not recognise as no preference at all", () => {
    asServed()
    window.localStorage.setItem(THEME_STORAGE_KEY, "sepia")
    runIt()

    expect(painted()).toEqual({ theme: "light", bar: SITE_BAR.light })
  })

  /**
   * Storage a reader has blocked, produced the way `tools/specimen/start-state.ts`
   * produces it for a screenshot: the property's getter throws, which is what a
   * browser does and is not the same thing as an empty store.
   *
   * The assertion that matters is that **both** land on light. A bar that
   * followed a preference the page did not get would be the one state worse
   * than no bar at all.
   */
  it("puts both on light where the reader has blocked site data", () => {
    const meta = asServed()
    const real = Object.getOwnPropertyDescriptor(window, "localStorage")

    Object.defineProperty(window, "localStorage", {
      configurable: true,
      get: () => {
        throw new DOMException("denied", "SecurityError")
      },
    })

    try {
      runIt()

      expect(painted()).toEqual({ theme: "light", bar: SITE_BAR.light })
      expect(meta.getAttribute("content")).toBe(SITE_BAR.light)
    } finally {
      if (real !== undefined) Object.defineProperty(window, "localStorage", real)
    }
  })

  /**
   * The catch's own write, which the fallback above cannot see.
   *
   * In an ordinary document the meta already carries the light color, so a
   * `catch` that skipped setting it would leave the right answer behind and
   * every assertion above would still pass. The guarantee the line makes is
   * *put the bar on light*, not *leave the bar alone*, so the way to hold it is
   * to start the bar somewhere else and watch it come back.
   */
  it("puts the bar back on light from wherever it was, when storage throws", () => {
    const meta = asServed()
    meta.setAttribute("content", SITE_BAR.dark)

    const real = Object.getOwnPropertyDescriptor(window, "localStorage")

    Object.defineProperty(window, "localStorage", {
      configurable: true,
      get: () => {
        throw new DOMException("denied", "SecurityError")
      },
    })

    try {
      runIt()

      expect(painted()).toEqual({ theme: "light", bar: SITE_BAR.light })
    } finally {
      if (real !== undefined) Object.defineProperty(window, "localStorage", real)
    }
  })

  /**
   * A document with no meta in it. The script sets the attribute and moves on
   * rather than throwing, because an exception here is the whole page: this is
   * the one script that runs before paint, and it has no error boundary above
   * it the way a component does.
   */
  it("still themes the page when the meta is missing", () => {
    window.localStorage.setItem(THEME_STORAGE_KEY, "dark")

    expect(() => runIt()).not.toThrow()
    expect(painted()).toEqual({ theme: "dark", bar: null })
  })
})
