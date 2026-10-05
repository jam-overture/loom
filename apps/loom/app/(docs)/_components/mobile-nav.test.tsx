import { fireEvent, render, screen } from "@testing-library/react"
import type { ReactNode } from "react"
import { describe, expect, it, vi } from "vitest"

import { docsOrder } from "@/app/(docs)/_lib/nav"

import { MobileNav } from "./mobile-nav"

/**
 * The only navigation a phone has, rendered and driven.
 *
 * The desktop rail is always on the page; this is the whole of how a reader on
 * a 390-pixel screen reaches a second page of the documentation, and nothing
 * looked at it until now. Three things are held below, in increasing order of
 * how badly they would be missed:
 *
 * 1. It opens and closes, and the closed state leaves the rail out of the
 *    document rather than merely out of sight — a hidden list of forty links is
 *    forty tab stops.
 * 2. **What it opens is the whole site.** The component's own argument is that
 *    it mounts the same `Sidebar` rather than keeping a second list, so the
 *    links in it are held against `docsOrder` here too. A mobile rail that had
 *    drifted would be a phone reader reaching fewer pages than a desktop one.
 * 3. **A navigation closes it, however the reader navigated.** That is the
 *    defect this file was written to catch, and it is in the first `describe`
 *    below rather than last because it is the one a reader meets.
 */

const pathname = vi.hoisted(() => ({ current: "/docs/getting-started/introduction" }))

vi.mock("next/navigation", () => ({ usePathname: () => pathname.current }))

const menuAt = (href: string) => {
  pathname.current = href

  return render(<MobileNav />)
}

const toggle = () => screen.getByRole("button")

const rail = () => screen.queryByRole("navigation", { name: "Documentation" })

const linksIn = (): readonly HTMLAnchorElement[] =>
  [...(rail()?.querySelectorAll<HTMLAnchorElement>("a[href]") ?? [])]

/**
 * jsdom will not follow a link, and says so on stderr for every press. The
 * component's handler is on the React root above this node, so preventing the
 * default here stops the warning and changes nothing about what runs.
 */
const press = (element: Element) => {
  element.addEventListener("click", (event) => event.preventDefault(), { once: true })
  fireEvent.click(element)
}

/**
 * A client-side navigation, as this component experiences one.
 *
 * The documentation layout is preserved across a route change and re-rendered
 * with the new path, so there is nothing here but a new `usePathname` and a
 * render — which is the point: the component is handed no event, and must not
 * need one.
 */
const arriveAt = (href: string, { rerender }: { readonly rerender: (ui: ReactNode) => void }) => {
  pathname.current = href
  rerender(<MobileNav />)
}

describe("the menu a phone reader browses from", () => {
  it("starts closed, and says so to a screen reader as well as in words", () => {
    menuAt("/docs/getting-started/introduction")

    expect(toggle().getAttribute("aria-expanded")).toBe("false")
    expect(toggle().textContent).toContain("Browse the documentation")
    expect(rail()).toBeNull()
  })

  it("opens on a press, and closes on the next one", () => {
    menuAt("/docs/getting-started/introduction")

    press(toggle())
    expect(toggle().getAttribute("aria-expanded")).toBe("true")
    expect(toggle().textContent).toContain("Close")
    expect(rail()).not.toBeNull()

    press(toggle())
    expect(toggle().getAttribute("aria-expanded")).toBe("false")
    expect(rail()).toBeNull()
  })

  /**
   * The closed menu is **absent**, not hidden. Forty links behind
   * `display: none` would still be reachable by a screen reader on some
   * configurations and would be forty tab stops on none of them worth having.
   */
  it("leaves no links in the document while it is closed", () => {
    const { container } = menuAt("/docs/getting-started/introduction")

    expect(container.querySelectorAll("a")).toHaveLength(0)
  })

  it("keeps the glyph out of what is read aloud", () => {
    menuAt("/docs/getting-started/introduction")

    for (const state of ["closed", "open"]) {
      const glyph = toggle().querySelector("span")

      expect(glyph?.getAttribute("aria-hidden"), state).not.toBeNull()
      expect(glyph?.textContent, state).toMatch(/^[×☰]$/u)
      press(toggle())
    }
  })
})

/**
 * What it opens.
 *
 * `Sidebar` has its own file of assertions and these are not a second copy of
 * them: what is held here is that this component mounts *that* rail, which is
 * the claim its docblock makes and the reason there is only one `nav.ts`.
 */
describe("the rail inside it", () => {
  it("is the whole site, in reading order", () => {
    menuAt("/docs/getting-started/introduction")
    press(toggle())

    expect(docsOrder.length).toBeGreaterThan(1)
    expect(linksIn().map((link) => link.getAttribute("href"))).toEqual(
      docsOrder.map((entry) => entry.href)
    )
  })

  it("marks the page the reader is on, like the rail on a wide screen does", () => {
    const here = docsOrder[4]?.href ?? ""

    menuAt(here)
    press(toggle())

    const marked = linksIn().filter((link) => link.getAttribute("aria-current"))

    expect(marked).toHaveLength(1)
    expect(marked[0]?.getAttribute("href")).toBe(here)
  })

  /**
   * Every link, rather than one: the handler that dismisses the menu is spread
   * in two places inside `Sidebar` — a section's own name and a page under it —
   * and a reader who taps the one that was missed navigates and cannot see that
   * they did.
   */
  it("closes the menu when any link in it is pressed", () => {
    for (const [at, entry] of docsOrder.entries()) {
      const { unmount } = menuAt("/docs/getting-started/introduction")

      press(toggle())
      const link = linksIn()[at]

      expect(link?.getAttribute("href"), `${entry.href} is not in the menu`).toBe(entry.href)
      press(link as HTMLAnchorElement)

      expect(rail(), `pressing "${entry.page.title}" left the menu open`).toBeNull()
      unmount()
    }
  })
})

/**
 * **The defect this file found.**
 *
 * The menu was a boolean, and this component is mounted by the documentation
 * layout, so the boolean outlived every navigation inside the documentation.
 * `onNavigate` covered the one case where the reader navigated *from the menu*
 * and nothing covered the rest — and on a phone the rest is most of them: the
 * search dialog in the header, a cross-reference in the prose, the pager at the
 * foot of the page, the wordmark. In each the reader arrives at the page they
 * asked for with the menu still over the top of it, and the only control in
 * reach is the one that closes a menu they did not know was open.
 *
 * It is now a path rather than a flag, so the condition below is the whole fix:
 * the menu is open on the page it was opened on, and nowhere else.
 */
describe("a navigation the menu had no part in", () => {
  it("closes it", () => {
    const [first, second] = docsOrder
    const open = menuAt(first?.href ?? "")

    press(toggle())
    expect(rail()).not.toBeNull()

    arriveAt(second?.href ?? "", open)

    expect(rail()).toBeNull()
    expect(toggle().getAttribute("aria-expanded")).toBe("false")
  })

  it("opens again on the page it landed on, marking that page", () => {
    const [first, second] = docsOrder
    const open = menuAt(first?.href ?? "")

    press(toggle())
    arriveAt(second?.href ?? "", open)
    press(toggle())

    expect(rail()).not.toBeNull()

    const marked = linksIn().filter((link) => link.getAttribute("aria-current"))

    expect(marked.map((link) => link.getAttribute("href"))).toEqual([second?.href])
  })
})
