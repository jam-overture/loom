import { fireEvent, render, screen } from "@testing-library/react"
import { renderToStaticMarkup } from "react-dom/server"
import { afterEach, beforeEach, describe, expect, it } from "vitest"

import { SITE_BAR, THEME_COLOR_NAME, THEME_STORAGE_KEY } from "@/app/(docs)/_lib/theme"

import { ThemeToggle } from "./theme-toggle"

/**
 * The one control on this site that changes what every page looks like.
 *
 * Nothing rendered it until now, and the component's docblock makes four claims
 * a reader would notice the loss of: that there are **three** states rather than
 * two, that `system` *follows the operating system*, that the first render is
 * identical to the server's so a reader who chose dark is never shown light, and
 * that the choice survives a reload. The first and the last were true. The
 * other two were not, and the two tests that say so are marked below.
 *
 * Two things have to be stood in for, because jsdom has neither: the operating
 * system's answer, and storage a reader has turned off.
 */

/** The operating system's current answer, and a way to change its mind. */
const system = (() => {
  let dark = false
  const listeners = new Set<() => void>()

  return {
    set: (next: boolean) => {
      dark = next
    },
    /** What the browser does when the reader switches their machine to dark. */
    flipTo: (next: boolean) => {
      dark = next
      for (const listener of [...listeners]) listener()
    },
    install: () => {
      Object.defineProperty(window, "matchMedia", {
        configurable: true,
        writable: true,
        value: (query: string) => ({
          media: query,
          get matches() {
            return query.includes("dark") && dark
          },
          addEventListener: (_: string, listener: () => void) => listeners.add(listener),
          removeEventListener: (_: string, listener: () => void) => listeners.delete(listener),
        }),
      })
    },
    listening: () => listeners.size,
  }
})()

/**
 * Storage a reader has blocked, as this repository already defines it.
 *
 * `tools/specimen/start-state.ts` blocks storage by replacing the accessor with
 * one that throws a `SecurityError`, because that is what a browser with site
 * data blocked does: it is not an empty store, it is a property that cannot be
 * read. Matching it exactly is the point — a test that handed back `null`
 * instead would pass against a component that cannot survive the real thing.
 */
const blockStorage = (): void => {
  Object.defineProperty(window, "localStorage", {
    configurable: true,
    get: () => {
      throw new DOMException("access to storage is denied for this document", "SecurityError")
    },
  })
}

const realStorage = Object.getOwnPropertyDescriptor(window, "localStorage")

const restoreStorage = (): void => {
  if (realStorage !== undefined) Object.defineProperty(window, "localStorage", realStorage)
}

const toggle = () => screen.getByRole("button")

const name = (): string => toggle().getAttribute("aria-label") ?? ""

const painted = (): string | undefined => document.documentElement.dataset["theme"]

/**
 * The browser's bar, as the layout serves it: a meta with the light color on
 * it, because that is what the server renders.
 *
 * Stood in for here rather than imported, because the element belongs to the
 * root layout and the toggle only ever finds it. A test that rendered the
 * layout to get one would be testing the layout.
 */
const serveBar = (): void => {
  const meta = document.createElement("meta")
  meta.setAttribute("name", THEME_COLOR_NAME)
  meta.setAttribute("content", SITE_BAR.light)
  document.head.append(meta)
}

const bar = (): string | null =>
  document.head.querySelector(`meta[name="${THEME_COLOR_NAME}"]`)?.getAttribute("content") ?? null

const stored = (): string | null => window.localStorage.getItem(THEME_STORAGE_KEY)

beforeEach(() => {
  restoreStorage()
  window.localStorage.clear()
  delete document.documentElement.dataset["theme"]
  document.head.innerHTML = ""
  serveBar()
  system.install()
  system.set(false)
})

afterEach(restoreStorage)

describe("the three states, and that there are three", () => {
  it("starts on system, which is a state and not the absence of one", () => {
    render(<ThemeToggle />)

    expect(name()).toBe("Color theme: System. Switch to Light.")
    expect(toggle().getAttribute("title")).toBe("Theme: System")
  })

  it("cycles system, light, dark and back to system", () => {
    render(<ThemeToggle />)

    const seen: string[] = []

    for (let press = 0; press < 4; press += 1) {
      seen.push(toggle().getAttribute("title") ?? "")
      fireEvent.click(toggle())
    }

    expect(seen).toEqual(["Theme: System", "Theme: Light", "Theme: Dark", "Theme: System"])
  })

  it("says where the next press goes, so the label is a promise rather than a report", () => {
    render(<ThemeToggle />)

    fireEvent.click(toggle())
    expect(name()).toBe("Color theme: Light. Switch to Dark.")

    fireEvent.click(toggle())
    expect(name()).toBe("Color theme: Dark. Switch to System.")
  })

  it("is named by its label and not by its glyph", () => {
    render(<ThemeToggle />)

    expect(toggle().querySelector("span")?.getAttribute("aria-hidden")).toBe("true")
    expect(screen.getByRole("button", { name: "Color theme: System. Switch to Light." })).toBe(toggle())
  })
})

describe("what the reader's choice does", () => {
  it("paints the document and remembers the choice", () => {
    render(<ThemeToggle />)

    fireEvent.click(toggle())
    expect(painted()).toBe("light")
    expect(stored()).toBe("light")

    fireEvent.click(toggle())
    expect(painted()).toBe("dark")
    expect(stored()).toBe("dark")
  })

  it("forgets the choice on the way back to system rather than storing the word", () => {
    render(<ThemeToggle />)

    fireEvent.click(toggle())
    fireEvent.click(toggle())
    fireEvent.click(toggle())

    expect(stored()).toBeNull()
  })

  it("resolves system through the machine rather than defaulting to light", () => {
    system.set(true)
    render(<ThemeToggle />)

    fireEvent.click(toggle())
    fireEvent.click(toggle())
    fireEvent.click(toggle())

    expect(painted()).toBe("dark")
  })

  it("comes back as the reader left it", () => {
    window.localStorage.setItem(THEME_STORAGE_KEY, "dark")
    render(<ThemeToggle />)

    expect(name()).toBe("Color theme: Dark. Switch to System.")
  })

  it("writes nothing on arrival, because the inline script has already decided", () => {
    window.localStorage.setItem(THEME_STORAGE_KEY, "dark")
    document.documentElement.dataset["theme"] = "dark"

    render(<ThemeToggle />)

    expect(stored()).toBe("dark")
    expect(painted()).toBe("dark")
  })

  /**
   * The reason the stored value is read in an effect rather than at render.
   *
   * The server cannot read storage, so a toggle that read it at render would
   * produce different markup on the two sides of hydration — and the reader it
   * would be wrong for is exactly the reader who chose something.
   */
  it("renders the same markup on the server whatever the reader chose", () => {
    window.localStorage.setItem(THEME_STORAGE_KEY, "dark")

    expect(renderToStaticMarkup(<ThemeToggle />)).toContain("Color theme: System")
  })
})

/**
 * **The first defect.** `system` is documented as following the operating
 * system and did so once, at the moment the page loaded. A reader on `system`
 * whose machine went dark at sunset kept a light page until they reloaded —
 * which is the one state whose whole meaning is that they do not have to.
 */
describe("system, while it is the choice", () => {
  it("follows the machine when the machine changes its mind", () => {
    render(<ThemeToggle />)

    system.flipTo(true)
    expect(painted()).toBe("dark")

    system.flipTo(false)
    expect(painted()).toBe("light")
  })

  it("stops following once the reader has chosen for themselves", () => {
    render(<ThemeToggle />)

    fireEvent.click(toggle())
    expect(painted()).toBe("light")

    system.flipTo(true)
    expect(painted()).toBe("light")
  })

  it("follows again when the reader hands the decision back", () => {
    render(<ThemeToggle />)

    fireEvent.click(toggle())
    fireEvent.click(toggle())
    fireEvent.click(toggle())

    system.flipTo(true)
    expect(painted()).toBe("dark")
  })

  it("lets go of the machine when it leaves the page", () => {
    const { unmount } = render(<ThemeToggle />)

    expect(system.listening()).toBe(1)
    unmount()
    expect(system.listening()).toBe(0)
  })
})

/**
 * **The second defect, and the expensive one.** Reading `window.localStorage`
 * throws where a reader has blocked site data, and the read was unguarded
 * inside an effect. An effect that throws is not a control that does not work:
 * it reaches the route's error boundary, so every documentation page became an
 * error screen for that reader. The inline script in the root layout has
 * defended against this since it was written; the toggle reading the same key
 * did not.
 */
describe("a reader who has blocked storage", () => {
  it("gets the page, and a toggle that starts on system", () => {
    blockStorage()

    expect(() => render(<ThemeToggle />)).not.toThrow()
    expect(name()).toBe("Color theme: System. Switch to Light.")
  })

  it("can still change the theme, and is simply not remembered", () => {
    blockStorage()
    render(<ThemeToggle />)

    expect(() => fireEvent.click(toggle())).not.toThrow()
    expect(painted()).toBe("light")
    expect(name()).toBe("Color theme: Light. Switch to Dark.")
  })
})

/**
 * **The third thing a press has to move, which it did not.**
 *
 * The strip of browser above the page is not styled by any stylesheet. It is
 * told its color by a `<meta name="theme-color">`, and until this change
 * nothing on this site wrote one — so a reader pressing Dark got a dark page
 * under a white address bar, and the toggle worked everywhere except the one
 * part of the screen that is not the page.
 *
 * *The bar above your page* on the theming page is the recipe. These are the
 * assertions that this site follows it, and the reason they are here rather
 * than only in `browser-bar-chrome.test.ts` is that the transcription being
 * right and the control applying it are two different things.
 */
describe("the browser's bar, on a press", () => {
  it("moves with the page on every state of the cycle", () => {
    render(<ThemeToggle />)

    fireEvent.click(toggle())
    expect([painted(), bar()]).toEqual(["light", SITE_BAR.light])

    fireEvent.click(toggle())
    expect([painted(), bar()]).toEqual(["dark", SITE_BAR.dark])
  })

  /**
   * `system` is resolved rather than passed through, which is the case a
   * component writing the choice straight into the meta would get wrong: there
   * is no bar color for "system", only for what system currently means.
   */
  it("resolves system to what the machine says rather than to a third color", () => {
    system.set(true)
    render(<ThemeToggle />)

    fireEvent.click(toggle())
    fireEvent.click(toggle())
    fireEvent.click(toggle())

    expect(painted()).toBe("dark")
    expect(bar()).toBe(SITE_BAR.dark)
  })

  /**
   * The sunset case, for the bar. `paint` is one function for both, so this
   * holds that the machine changing its mind under `system` repaints the bar as
   * well — the defect a click-handler-only fix would have left behind.
   */
  it("follows the machine under system, which the page already does", () => {
    render(<ThemeToggle />)

    expect(bar()).toBe(SITE_BAR.light)

    system.flipTo(true)

    expect(painted()).toBe("dark")
    expect(bar()).toBe(SITE_BAR.dark)
  })

  it("leaves the bar alone once the reader has chosen against the machine", () => {
    render(<ThemeToggle />)

    fireEvent.click(toggle())
    expect(bar()).toBe(SITE_BAR.light)

    system.flipTo(true)

    expect(painted()).toBe("light")
    expect(bar()).toBe(SITE_BAR.light)
  })

  /**
   * A document with no meta in it. A press has to keep working: the bar is the
   * least important thing this control does, and an exception here would come
   * out of a click handler and take the page with it.
   */
  it("still paints the page when there is no meta to move", () => {
    document.head.innerHTML = ""
    render(<ThemeToggle />)

    expect(() => fireEvent.click(toggle())).not.toThrow()
    expect(painted()).toBe("light")
    expect(bar()).toBe(null)
  })

  /**
   * And a reader who blocked storage still gets the bar, for the same reason
   * they still get the page: the meta is not storage and has nothing to do with
   * whether the choice can be kept.
   */
  it("moves the bar for a reader whose choice cannot be remembered", () => {
    blockStorage()
    render(<ThemeToggle />)

    fireEvent.click(toggle())
    fireEvent.click(toggle())

    expect(painted()).toBe("dark")
    expect(bar()).toBe(SITE_BAR.dark)
  })
})
